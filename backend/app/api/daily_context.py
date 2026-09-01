from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models import DailyContext
from app.models.daily_context import (
    DailyContextResponse,
    DailyContextUpdate,
)


router = APIRouter(
    prefix="/daily-contexts",
    tags=["daily-contexts"],
)


@router.get(
    "/today",
    response_model=DailyContextResponse | None,
)
def get_today_daily_context(
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
        description="Timezone offset from UTC in minutes",
    ),
    db: Session = Depends(get_db),
):
    user_timezone = timezone(
        timedelta(minutes=timezone_offset)
    )

    today = datetime.now(user_timezone).date()

    statement = select(DailyContext).where(
        DailyContext.context_date == today
    )

    return db.scalar(statement)


@router.put(
    "/today",
    response_model=DailyContextResponse,
)
def upsert_today_daily_context(
    payload: DailyContextUpdate,
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
        description="Timezone offset from UTC in minutes",
    ),
    db: Session = Depends(get_db),
) -> DailyContext:
    user_timezone = timezone(
        timedelta(minutes=timezone_offset)
    )

    today = datetime.now(user_timezone).date()

    statement = select(DailyContext).where(
        DailyContext.context_date == today
    )

    context = db.scalar(statement)

    if context is None:
        context = DailyContext(
            context_date=today,
            sleep_hours=payload.sleep_hours,
        )

        db.add(context)
    else:
        context.sleep_hours = payload.sleep_hours

    db.commit()
    db.refresh(context)

    return context


@router.get(
    "/{context_date}",
    response_model=DailyContextResponse,
)
def get_daily_context(
    context_date: date,
    db: Session = Depends(get_db),
) -> DailyContext:
    statement = select(DailyContext).where(
        DailyContext.context_date == context_date
    )

    context = db.scalar(statement)

    if context is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily context not found",
        )

    return context