from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import Meal, Medication, MedicationLog, Symptom
from app.db.models import CalendarEvent, DailyCheckIn, DailyContext

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("")
def timeline(
    days: int = Query(default=7, ge=1, le=90),
    timezone_offset: int = Query(default=0, ge=-840, le=840),
    db: Session = Depends(get_db),
):
    user_timezone = timezone(timedelta(minutes=timezone_offset))
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(user_timezone)

    start_local = now_local - timedelta(days=days)
    start_utc = start_local.astimezone(timezone.utc)
    start_date = start_local.date()

    rows: list[dict] = []

    # ---------------------------------------------------------
    # Calendar events
    # ---------------------------------------------------------

    events = db.scalars(
        select(CalendarEvent)
        .where(CalendarEvent.start_at >= start_utc)
        .order_by(CalendarEvent.start_at.desc())
    ).all()

    for event in events:
        rows.append(
            {
                "type": "calendar_event",
                "occurred_at": event.start_at,
                "title": event.title,
                "detail": event.location,
                "source_id": event.id,
            }
        )

    # ---------------------------------------------------------
    # Check-ins
    # ---------------------------------------------------------

    check_ins = db.scalars(
        select(DailyCheckIn)
        .where(DailyCheckIn.created_at >= start_utc)
        .order_by(DailyCheckIn.created_at.desc())
    ).all()

    for check_in in check_ins:
        detail_parts = [
            f"Energy {check_in.energy}/10",
            f"Mood {check_in.mood}",
            f"Stress {check_in.stress}/10",
            f"Focus {check_in.focus}/10",
        ]

        if check_in.exercise_minutes:
            detail_parts.append(
                f"Movement {check_in.exercise_minutes} min"
            )

        if check_in.social_energy is not None:
            detail_parts.append(
                f"Social energy {check_in.social_energy}/10"
            )

        if check_in.notes:
            detail_parts.append(check_in.notes)

        rows.append(
            {
                "type": "check_in",
                "occurred_at": check_in.created_at,
                "title": "Check-in",
                "detail": " · ".join(detail_parts),
                "source_id": check_in.id,
            }
        )

    # ---------------------------------------------------------
    # Daily sleep context
    # ---------------------------------------------------------

    daily_contexts = db.scalars(
        select(DailyContext)
        .where(DailyContext.context_date >= start_date)
        .order_by(DailyContext.context_date.desc())
    ).all()

    for context in daily_contexts:
        if context.sleep_hours is None:
            continue

        # Sleep belongs to a calendar day rather than an exact event time.
        # Noon local time keeps it grouped safely with that local date.
        local_noon = datetime.combine(
            context.context_date,
            time(hour=12),
            tzinfo=user_timezone,
        )

        rows.append(
            {
                "type": "sleep",
                "occurred_at": local_noon.astimezone(timezone.utc),
                "title": "Sleep",
                "detail": f"{context.sleep_hours:g} hours",
                "source_id": context.id,
            }
        )

    # ---------------------------------------------------------
    # Symptoms
    # ---------------------------------------------------------

    symptoms = db.scalars(
        select(Symptom)
        .where(Symptom.occurred_at >= start_utc)
        .order_by(Symptom.occurred_at.desc())
    ).all()

    for symptom in symptoms:
        detail_parts = []

        if symptom.severity is not None:
            detail_parts.append(
                f"Severity {symptom.severity}/10"
            )

        if symptom.note:
            detail_parts.append(symptom.note)

        rows.append(
            {
                "type": "symptom",
                "occurred_at": symptom.occurred_at,
                "title": symptom.symptom,
                "detail": (
                    " · ".join(detail_parts)
                    if detail_parts
                    else None
                ),
                "source_id": symptom.id,
            }
        )

    # ---------------------------------------------------------
    # Meals
    # ---------------------------------------------------------

    meals = db.scalars(
        select(Meal)
        .where(Meal.eaten_at >= start_utc)
        .order_by(Meal.eaten_at.desc())
    ).all()

    for meal in meals:
        rows.append(
            {
                "type": "meal",
                "occurred_at": meal.eaten_at,
                "title": meal.title or meal.meal_type or "Meal",
                "detail": meal.note,
                "source_id": meal.id,
            }
        )

    # ---------------------------------------------------------
    # Medication activity
    # ---------------------------------------------------------

    medication_logs = db.scalars(
        select(MedicationLog)
        .where(MedicationLog.created_at >= start_utc)
        .order_by(MedicationLog.created_at.desc())
    ).all()

    for log in medication_logs:
        medication = db.get(
            Medication,
            log.medication_id,
        )

        occurred_at = (
            log.taken_at
            or log.snoozed_until
            or log.scheduled_for
            or log.created_at
        )

        detail_parts = [
            log.action.capitalize()
        ]

        if medication and medication.dosage:
            detail_parts.append(medication.dosage)

        if log.note:
            detail_parts.append(log.note)

        rows.append(
            {
                "type": "medication",
                "occurred_at": occurred_at,
                "title": (
                    medication.name
                    if medication
                    else "Medication"
                ),
                "detail": " · ".join(detail_parts),
                "source_id": log.id,
            }
        )

    # ---------------------------------------------------------
    # Final chronological order
    # ---------------------------------------------------------

    rows.sort(
        key=lambda row: row["occurred_at"],
        reverse=True,
    )

    return rows