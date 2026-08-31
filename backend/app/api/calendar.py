from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models import (
    CalendarEvent,
    FollowUpPrompt,
)
from app.models.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CompletePromptRequest,
    FollowUpPromptResponse,
    SnoozePromptRequest,
)


router = APIRouter(
    prefix="/calendar",
    tags=["calendar"],
)


def create_follow_up_if_needed(
    event: CalendarEvent,
    db: Session,
) -> FollowUpPrompt:
    statement = select(
        FollowUpPrompt
    ).where(
        FollowUpPrompt.calendar_event_id
        == event.id
    )

    existing = db.scalar(statement)

    if existing is not None:
        return existing

    prompt = FollowUpPrompt(
        calendar_event_id=event.id,
        prompt_type="post_event_checkin",
        due_at=event.end_at,
        status="pending",
    )

    db.add(prompt)

    return prompt


@router.post(
    "/events",
    response_model=CalendarEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_or_update_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
) -> CalendarEvent:
    statement = select(
        CalendarEvent
    ).where(
        CalendarEvent.provider_event_id
        == payload.provider_event_id
    )

    event = db.scalar(statement)

    if event is None:
        event = CalendarEvent(
            provider=payload.provider,
            provider_event_id=(
                payload.provider_event_id
            ),
            title=payload.title,
            start_at=payload.start_at,
            end_at=payload.end_at,
            location=payload.location,
            description=payload.description,
        )

        db.add(event)
        db.flush()

    else:
        event.provider = payload.provider
        event.title = payload.title
        event.start_at = payload.start_at
        event.end_at = payload.end_at
        event.location = payload.location
        event.description = payload.description

    create_follow_up_if_needed(
        event,
        db,
    )

    db.commit()
    db.refresh(event)

    return event


@router.get(
    "/today",
    response_model=list[CalendarEventResponse],
)
def get_today_events(
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
    ),
    db: Session = Depends(get_db),
) -> list[CalendarEvent]:
    user_timezone = timezone(
        timedelta(
            minutes=timezone_offset
        )
    )

    now_local = datetime.now(
        user_timezone
    )

    start_local = now_local.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    end_local = (
        start_local
        + timedelta(days=1)
    )

    start_utc = start_local.astimezone(
        timezone.utc
    )

    end_utc = end_local.astimezone(
        timezone.utc
    )

    statement = (
        select(CalendarEvent)
        .where(
            CalendarEvent.start_at
            >= start_utc,
            CalendarEvent.start_at
            < end_utc,
        )
        .order_by(
            CalendarEvent.start_at.asc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


@router.get(
    "/upcoming",
    response_model=list[CalendarEventResponse],
)
def get_upcoming_events(
    hours: int = Query(
        default=24,
        ge=1,
        le=168,
    ),
    db: Session = Depends(get_db),
) -> list[CalendarEvent]:
    now = datetime.now(
        timezone.utc
    )

    until = (
        now
        + timedelta(hours=hours)
    )

    statement = (
        select(CalendarEvent)
        .where(
            CalendarEvent.start_at >= now,
            CalendarEvent.start_at <= until,
        )
        .order_by(
            CalendarEvent.start_at.asc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


@router.get(
    "/follow-ups/due",
    response_model=list[
        FollowUpPromptResponse
    ],
)
def get_due_follow_ups(
    db: Session = Depends(get_db),
):
    now = datetime.now(
        timezone.utc
    )

    statement = (
        select(FollowUpPrompt)
        .where(
            FollowUpPrompt.status
            == "pending",
            FollowUpPrompt.due_at
            <= now,
        )
        .order_by(
            FollowUpPrompt.due_at.asc()
        )
    )

    prompts = list(
        db.scalars(statement).all()
    )

    results = []

    for prompt in prompts:
        if (
            prompt.snoozed_until
            is not None
            and prompt.snoozed_until
            > now
        ):
            continue

        event = db.get(
            CalendarEvent,
            prompt.calendar_event_id,
        )

        results.append(
            FollowUpPromptResponse(
                id=prompt.id,
                calendar_event_id=(
                    prompt.calendar_event_id
                ),
                prompt_type=(
                    prompt.prompt_type
                ),
                due_at=prompt.due_at,
                status=prompt.status,
                snoozed_until=(
                    prompt.snoozed_until
                ),
                completed_check_in_id=(
                    prompt.completed_check_in_id
                ),
                created_at=prompt.created_at,
                updated_at=prompt.updated_at,
                event=event,
            )
        )

    return results


@router.post(
    "/follow-ups/{prompt_id}/snooze",
    response_model=FollowUpPromptResponse,
)
def snooze_follow_up(
    prompt_id: int,
    payload: SnoozePromptRequest,
    db: Session = Depends(get_db),
):
    prompt = db.get(
        FollowUpPrompt,
        prompt_id,
    )

    if prompt is None:
        raise HTTPException(
            status_code=404,
            detail="Follow-up prompt not found",
        )

    prompt.snoozed_until = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=payload.minutes
        )
    )

    prompt.status = "pending"

    db.commit()
    db.refresh(prompt)

    event = db.get(
        CalendarEvent,
        prompt.calendar_event_id,
    )

    return FollowUpPromptResponse(
        id=prompt.id,
        calendar_event_id=(
            prompt.calendar_event_id
        ),
        prompt_type=prompt.prompt_type,
        due_at=prompt.due_at,
        status=prompt.status,
        snoozed_until=(
            prompt.snoozed_until
        ),
        completed_check_in_id=(
            prompt.completed_check_in_id
        ),
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
        event=event,
    )


@router.post(
    "/follow-ups/{prompt_id}/complete",
    response_model=FollowUpPromptResponse,
)
def complete_follow_up(
    prompt_id: int,
    payload: CompletePromptRequest,
    db: Session = Depends(get_db),
):
    prompt = db.get(
        FollowUpPrompt,
        prompt_id,
    )

    if prompt is None:
        raise HTTPException(
            status_code=404,
            detail="Follow-up prompt not found",
        )

    prompt.status = "completed"

    prompt.completed_check_in_id = (
        payload.check_in_id
    )

    prompt.snoozed_until = None

    db.commit()
    db.refresh(prompt)

    event = db.get(
        CalendarEvent,
        prompt.calendar_event_id,
    )

    return FollowUpPromptResponse(
        id=prompt.id,
        calendar_event_id=(
            prompt.calendar_event_id
        ),
        prompt_type=prompt.prompt_type,
        due_at=prompt.due_at,
        status=prompt.status,
        snoozed_until=(
            prompt.snoozed_until
        ),
        completed_check_in_id=(
            prompt.completed_check_in_id
        ),
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
        event=event,
    )


@router.post(
    "/follow-ups/{prompt_id}/dismiss",
    response_model=FollowUpPromptResponse,
)
def dismiss_follow_up(
    prompt_id: int,
    db: Session = Depends(get_db),
):
    prompt = db.get(
        FollowUpPrompt,
        prompt_id,
    )

    if prompt is None:
        raise HTTPException(
            status_code=404,
            detail="Follow-up prompt not found",
        )

    prompt.status = "dismissed"
    prompt.snoozed_until = None

    db.commit()
    db.refresh(prompt)

    event = db.get(
        CalendarEvent,
        prompt.calendar_event_id,
    )

    return FollowUpPromptResponse(
        id=prompt.id,
        calendar_event_id=(
            prompt.calendar_event_id
        ),
        prompt_type=prompt.prompt_type,
        due_at=prompt.due_at,
        status=prompt.status,
        snoozed_until=(
            prompt.snoozed_until
        ),
        completed_check_in_id=(
            prompt.completed_check_in_id
        ),
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
        event=event,
    )