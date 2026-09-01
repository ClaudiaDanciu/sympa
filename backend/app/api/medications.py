from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import (
    Allergy,
    Medication,
    MedicationLog,
    MedicationSchedule,
)
from app.models.health import (
    AllergyCreate,
    MedicationCreate,
    MedicationLogCreate,
    MedicationScheduleCreate,
)

router = APIRouter(prefix="/medications", tags=["medications"])


@router.get("")
def list_medications(db: Session = Depends(get_db)):
    meds = db.scalars(
        select(Medication).where(Medication.active.is_(True)).order_by(Medication.name)
    ).all()
    return meds


@router.post("", status_code=201)
def create_medication(payload: MedicationCreate, db: Session = Depends(get_db)):
    med = Medication(**payload.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@router.post("/{medication_id}/schedules", status_code=201)
def create_schedule(
    medication_id: int,
    payload: MedicationScheduleCreate,
    db: Session = Depends(get_db),
):
    if db.get(Medication, medication_id) is None:
        raise HTTPException(404, "Medication not found.")
    item = MedicationSchedule(medication_id=medication_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{medication_id}/schedules")
def list_schedules(medication_id: int, db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(MedicationSchedule)
            .where(MedicationSchedule.medication_id == medication_id)
            .order_by(MedicationSchedule.time_of_day)
        ).all()
    )


@router.post("/{medication_id}/logs", status_code=201)
def log_medication(
    medication_id: int,
    payload: MedicationLogCreate,
    db: Session = Depends(get_db),
):
    if db.get(Medication, medication_id) is None:
        raise HTTPException(404, "Medication not found.")

    action = payload.action.lower().strip()
    if action not in {"taken", "skipped", "snoozed"}:
        raise HTTPException(400, "action must be taken, skipped, or snoozed")

    values = payload.model_dump()
    values["action"] = action
    if action == "taken" and values["taken_at"] is None:
        values["taken_at"] = datetime.now(timezone.utc)

    log = MedicationLog(medication_id=medication_id, **values)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/logs/recent")
def recent_logs(db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(MedicationLog)
            .order_by(MedicationLog.created_at.desc())
            .limit(100)
        ).all()
    )


@router.get("/allergies/list")
def list_allergies(db: Session = Depends(get_db)):
    return list(db.scalars(select(Allergy).order_by(Allergy.substance)).all())


@router.post("/allergies", status_code=201)
def create_allergy(payload: AllergyCreate, db: Session = Depends(get_db)):
    allergy = Allergy(**payload.model_dump())
    db.add(allergy)
    db.commit()
    db.refresh(allergy)
    return allergy
