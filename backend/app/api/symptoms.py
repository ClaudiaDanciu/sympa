from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import Symptom
from app.models.health import SymptomCreate

router = APIRouter(prefix="/symptoms", tags=["symptoms"])


@router.post("", status_code=201)
def create_symptom(payload: SymptomCreate, db: Session = Depends(get_db)):
    item = Symptom(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("")
def list_symptoms(db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(Symptom).order_by(Symptom.occurred_at.desc()).limit(200)
        ).all()
    )
