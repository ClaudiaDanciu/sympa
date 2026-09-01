from collections import Counter
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import Meal, Medication, MedicationLog, Symptom

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/health-summary")
def health_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    start = datetime.now(timezone.utc) - timedelta(days=days)

    meds = db.scalars(
        select(Medication).where(Medication.active.is_(True)).order_by(Medication.name)
    ).all()

    logs = db.scalars(
        select(MedicationLog).where(MedicationLog.created_at >= start)
    ).all()

    symptoms = db.scalars(
        select(Symptom).where(Symptom.occurred_at >= start)
    ).all()

    meals = db.scalars(
        select(Meal).where(Meal.eaten_at >= start)
    ).all()

    symptom_counts = Counter(s.symptom for s in symptoms)
    action_counts = Counter(log.action for log in logs)

    return {
        "period_days": days,
        "active_medications": [
            {"name": m.name, "dosage": m.dosage, "instructions": m.instructions}
            for m in meds
        ],
        "medication_log_counts": dict(action_counts),
        "symptom_counts": dict(symptom_counts),
        "meal_count": len(meals),
        "note": (
            "This report summarizes recorded information and does not establish "
            "medical causation or diagnosis."
        ),
    }
