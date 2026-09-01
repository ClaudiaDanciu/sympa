from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import Meal, Medication, MedicationLog, Symptom
from app.db.models import CalendarEvent

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("")
def timeline(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    start = datetime.now(timezone.utc) - timedelta(days=days)
    rows: list[dict] = []

    for event in db.scalars(
        select(CalendarEvent)
        .where(CalendarEvent.start_at >= start)
        .order_by(CalendarEvent.start_at.desc())
    ).all():
        rows.append(
            {
                "type": "calendar_event",
                "occurred_at": event.start_at,
                "title": event.title,
                "detail": event.location,
                "source_id": event.id,
            }
        )

    for symptom in db.scalars(
        select(Symptom)
        .where(Symptom.occurred_at >= start)
        .order_by(Symptom.occurred_at.desc())
    ).all():
        rows.append(
            {
                "type": "symptom",
                "occurred_at": symptom.occurred_at,
                "title": symptom.symptom,
                "detail": (
                    f"Severity {symptom.severity}/10"
                    if symptom.severity is not None else symptom.note
                ),
                "source_id": symptom.id,
            }
        )

    for meal in db.scalars(
        select(Meal)
        .where(Meal.eaten_at >= start)
        .order_by(Meal.eaten_at.desc())
    ).all():
        rows.append(
            {
                "type": "meal",
                "occurred_at": meal.eaten_at,
                "title": meal.title or meal.meal_type or "Meal",
                "detail": meal.note,
                "source_id": meal.id,
            }
        )

    logs = db.scalars(
        select(MedicationLog)
        .where(MedicationLog.created_at >= start)
        .order_by(MedicationLog.created_at.desc())
    ).all()
    for log in logs:
        med = db.get(Medication, log.medication_id)
        rows.append(
            {
                "type": "medication",
                "occurred_at": log.taken_at or log.created_at,
                "title": med.name if med else "Medication",
                "detail": log.action,
                "source_id": log.id,
            }
        )

    rows.sort(key=lambda row: row["occurred_at"], reverse=True)
    return rows
