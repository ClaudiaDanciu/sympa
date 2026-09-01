from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models import CalendarConnection, CalendarEvent, FollowUpPrompt
from app.models.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CompletePromptRequest,
    SnoozePromptRequest,
)
from app.services.calendar.google import (
    credentials_from_connection,
    exchange_google_code,
    get_google_authorization_url,
    list_google_events,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/health")
def calendar_health():
    return {"status": "ok", "service": "calendar"}


def _parse_google_time(block: dict) -> datetime | None:
    if block.get("dateTime"):
        return datetime.fromisoformat(block["dateTime"].replace("Z", "+00:00"))
    if block.get("date"):
        return datetime.fromisoformat(block["date"]).replace(tzinfo=timezone.utc)
    return None


def _upsert_follow_up(db: Session, event: CalendarEvent) -> None:
    prompt = db.scalar(
        select(FollowUpPrompt).where(
            FollowUpPrompt.calendar_event_id == event.id,
            FollowUpPrompt.prompt_type == "post_event_checkin",
        )
    )
    if prompt is None:
        db.add(
            FollowUpPrompt(
                calendar_event_id=event.id,
                prompt_type="post_event_checkin",
                due_at=event.end_at,
                status="pending",
            )
        )
    elif prompt.status == "pending":
        prompt.due_at = event.end_at


@router.post("/events", response_model=CalendarEventResponse, status_code=201)
def create_or_update_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
):
    event = db.scalar(
        select(CalendarEvent).where(
            CalendarEvent.provider_event_id == payload.provider_event_id
        )
    )
    if event is None:
        event = CalendarEvent(**payload.model_dump())
        db.add(event)
        db.flush()
    else:
        for key, value in payload.model_dump().items():
            setattr(event, key, value)

    _upsert_follow_up(db, event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/today", response_model=list[CalendarEventResponse])
def today(
    timezone_offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    tz = timezone(timedelta(minutes=timezone_offset))
    local_now = datetime.now(timezone.utc).astimezone(tz)
    start_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)

    items = db.scalars(
        select(CalendarEvent)
        .where(
            CalendarEvent.start_at < end_local.astimezone(timezone.utc),
            CalendarEvent.end_at > start_local.astimezone(timezone.utc),
        )
        .order_by(CalendarEvent.start_at.asc())
    ).all()
    return list(items)


@router.get("/follow-ups/due")
def due_follow_ups(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    prompts = db.scalars(
        select(FollowUpPrompt)
        .where(
            FollowUpPrompt.status == "pending",
            FollowUpPrompt.due_at <= now,
            or_(
                FollowUpPrompt.snoozed_until.is_(None),
                FollowUpPrompt.snoozed_until <= now,
            ),
        )
        .order_by(FollowUpPrompt.due_at.asc())
    ).all()

    result = []
    for prompt in prompts:
        event = db.get(CalendarEvent, prompt.calendar_event_id)
        result.append(
            {
                "id": prompt.id,
                "calendar_event_id": prompt.calendar_event_id,
                "prompt_type": prompt.prompt_type,
                "due_at": prompt.due_at,
                "status": prompt.status,
                "snoozed_until": prompt.snoozed_until,
                "completed_check_in_id": prompt.completed_check_in_id,
                "event": (
                    {
                        "id": event.id,
                        "title": event.title,
                        "start_at": event.start_at,
                        "end_at": event.end_at,
                        "location": event.location,
                    }
                    if event else None
                ),
            }
        )
    return result


@router.post("/follow-ups/{prompt_id}/snooze")
def snooze(
    prompt_id: int,
    payload: SnoozePromptRequest,
    db: Session = Depends(get_db),
):
    prompt = db.get(FollowUpPrompt, prompt_id)
    if prompt is None:
        raise HTTPException(404, "Follow-up prompt not found.")
    prompt.snoozed_until = datetime.now(timezone.utc) + timedelta(
        minutes=payload.minutes
    )
    db.commit()
    return {"status": "snoozed", "prompt_id": prompt.id}


@router.post("/follow-ups/{prompt_id}/complete")
def complete(
    prompt_id: int,
    payload: CompletePromptRequest,
    db: Session = Depends(get_db),
):
    prompt = db.get(FollowUpPrompt, prompt_id)
    if prompt is None:
        raise HTTPException(404, "Follow-up prompt not found.")
    prompt.status = "completed"
    prompt.completed_check_in_id = payload.check_in_id
    prompt.snoozed_until = None
    db.commit()
    return {"status": "completed", "prompt_id": prompt.id}


@router.post("/follow-ups/{prompt_id}/dismiss")
def dismiss(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.get(FollowUpPrompt, prompt_id)
    if prompt is None:
        raise HTTPException(404, "Follow-up prompt not found.")
    prompt.status = "dismissed"
    prompt.snoozed_until = None
    db.commit()
    return {"status": "dismissed", "prompt_id": prompt.id}


@router.get("/google/connect")
def google_connect():
    url, state = get_google_authorization_url()
    response = RedirectResponse(url=url, status_code=302)
    response.set_cookie(
        "google_oauth_state",
        state,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=600,
    )
    return response


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        raise HTTPException(400, f"Google authorization failed: {error}")
    if not code:
        raise HTTPException(400, "Google did not return an authorization code.")

    expected = request.cookies.get("google_oauth_state")
    if not expected or not state or expected != state:
        raise HTTPException(400, "Invalid OAuth state.")

    credentials = exchange_google_code(code, state=state)
    expiry = credentials.expiry
    if expiry is not None and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    connection = db.scalar(
        select(CalendarConnection).where(CalendarConnection.provider == "google")
    )
    if connection is None:
        connection = CalendarConnection(
            provider="google",
            provider_calendar_id="primary",
        )
        db.add(connection)

    connection.access_token = credentials.token
    if credentials.refresh_token:
        connection.refresh_token = credentials.refresh_token
    connection.token_expires_at = expiry
    connection.connected_at = datetime.now(timezone.utc)

    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    response = RedirectResponse(
        f"{frontend_url}?calendar=google-connected",
        status_code=302,
    )
    response.delete_cookie("google_oauth_state")
    return response


@router.post("/google/sync")
def google_sync(
    days_back: int = Query(default=1, ge=0, le=30),
    days_forward: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    connection = db.scalar(
        select(CalendarConnection).where(CalendarConnection.provider == "google")
    )
    if connection is None or not connection.access_token:
        raise HTTPException(400, "Google Calendar is not connected.")

    credentials = credentials_from_connection(connection)
    now = datetime.now(timezone.utc)
    raw_events = list_google_events(
        credentials,
        now - timedelta(days=days_back),
        now + timedelta(days=days_forward),
    )

    synced = 0
    for raw in raw_events:
        if raw.get("status") == "cancelled" or not raw.get("id"):
            continue

        start_at = _parse_google_time(raw.get("start", {}))
        end_at = _parse_google_time(raw.get("end", {}))
        if not start_at or not end_at:
            continue

        event = db.scalar(
            select(CalendarEvent).where(
                CalendarEvent.provider_event_id == raw["id"]
            )
        )
        if event is None:
            event = CalendarEvent(
                provider="google",
                provider_event_id=raw["id"],
                title=raw.get("summary") or "Untitled event",
                start_at=start_at,
                end_at=end_at,
                location=raw.get("location"),
                description=raw.get("description"),
            )
            db.add(event)
            db.flush()
        else:
            event.title = raw.get("summary") or "Untitled event"
            event.start_at = start_at
            event.end_at = end_at
            event.location = raw.get("location")
            event.description = raw.get("description")

        _upsert_follow_up(db, event)
        synced += 1

    connection.last_synced_at = datetime.now(timezone.utc)
    if credentials.token:
        connection.access_token = credentials.token
    if credentials.expiry:
        connection.token_expires_at = credentials.expiry

    db.commit()
    return {"status": "ok", "events_synced": synced}
