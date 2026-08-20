from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models import DailyCheckIn
from app.models.checkin import (
    DailyCheckInCreate,
    DailyCheckInResponse,
)

router = APIRouter(
    prefix="/check-ins",
    tags=["check-ins"],
)


@router.post(
    "",
    response_model=DailyCheckInResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_check_in(
    check_in: DailyCheckInCreate,
    db: Session = Depends(get_db),
) -> DailyCheckIn:
    db_check_in = DailyCheckIn(
        sleep_hours=check_in.sleep_hours,
        energy=check_in.energy,
        mood=check_in.mood.value,
        stress=check_in.stress,
        focus=check_in.focus,
        exercise_minutes=check_in.exercise_minutes,
        social_energy=check_in.social_energy,
        notes=check_in.notes,
    )

    db.add(db_check_in)
    db.commit()
    db.refresh(db_check_in)

    return db_check_in


@router.get(
    "",
    response_model=list[DailyCheckInResponse],
)
def get_check_ins(
    db: Session = Depends(get_db),
) -> list[DailyCheckIn]:
    statement = select(DailyCheckIn).order_by(
        DailyCheckIn.created_at.desc()
    )

    return list(db.scalars(statement).all())


@router.get(
    "/{check_in_id}",
    response_model=DailyCheckInResponse,
)
def get_check_in(
    check_in_id: int,
    db: Session = Depends(get_db),
) -> DailyCheckIn:
    check_in = db.get(DailyCheckIn, check_in_id)

    if check_in is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check-in not found",
        )

    return check_in