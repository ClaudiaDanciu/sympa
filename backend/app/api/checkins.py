from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import date, datetime, time, timedelta, timezone
from collections import Counter

from app.core.database import get_db
from app.db.models import DailyCheckIn

from app.models.checkin import (
    DailyCheckInCreate,
    DailyCheckInDayResponse,
    DailyCheckInResponse,
    DailySummary,
    DailySummaryListItem,
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
    "/today",
    response_model=DailyCheckInResponse | None,
)
def get_today_check_in(
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
        description="Timezone offset from UTC in minutes",
    ),
    db: Session = Depends(get_db),
):
    user_timezone = timezone(timedelta(minutes=timezone_offset))
    now_local = datetime.now(user_timezone)

    start_local = now_local.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    end_local = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)

    statement = (
        select(DailyCheckIn)
        .where(
            DailyCheckIn.created_at >= start_utc,
            DailyCheckIn.created_at < end_utc,
        )
        .order_by(DailyCheckIn.created_at.desc())
        .limit(1)
    )

    return db.scalar(statement)

@router.get(
    "/day",
    response_model=DailyCheckInDayResponse,
)
def get_check_ins_for_day(
    target_date: date = Query(alias="date"),
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
        description="Timezone offset from UTC in minutes",
    ),
    db: Session = Depends(get_db),
) -> DailyCheckInDayResponse:
    user_timezone = timezone(timedelta(minutes=timezone_offset))

    start_local = datetime.combine(
        target_date,
        time.min,
        tzinfo=user_timezone,
    )

    end_local = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)

    statement = (
        select(DailyCheckIn)
        .where(
            DailyCheckIn.created_at >= start_utc,
            DailyCheckIn.created_at < end_utc,
        )
        .order_by(DailyCheckIn.created_at.asc())
    )

    entries = list(db.scalars(statement).all())

    if not entries:
        return DailyCheckInDayResponse(
            date=target_date,
            entry_count=0,
            summary=DailySummary(
                average_energy=None,
                average_stress=None,
                average_focus=None,
                average_social_energy=None,
                total_exercise_minutes=0,
                dominant_mood=None,
                sleep_hours=None,
            ),
            entries=[],
        )

    social_values = [
        entry.social_energy
        for entry in entries
        if entry.social_energy is not None
    ]

    mood_counts = Counter(entry.mood for entry in entries)
    dominant_mood = mood_counts.most_common(1)[0][0]

    summary = DailySummary(
        average_energy=round(
            sum(entry.energy for entry in entries) / len(entries),
            1,
        ),
        average_stress=round(
            sum(entry.stress for entry in entries) / len(entries),
            1,
        ),
        average_focus=round(
            sum(entry.focus for entry in entries) / len(entries),
            1,
        ),
        average_social_energy=(
            round(sum(social_values) / len(social_values), 1)
            if social_values
            else None
        ),
        total_exercise_minutes=sum(
            entry.exercise_minutes for entry in entries
        ),
        dominant_mood=dominant_mood,
        sleep_hours=entries[-1].sleep_hours,
    )

    return DailyCheckInDayResponse(
        date=target_date,
        entry_count=len(entries),
        summary=summary,
        entries=entries,
    )

@router.get(
    "/days",
    response_model=list[DailySummaryListItem],
)
def get_check_in_days(
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
        description="Timezone offset from UTC in minutes",
    ),
    db: Session = Depends(get_db),
) -> list[DailySummaryListItem]:
    user_timezone = timezone(
        timedelta(minutes=timezone_offset)
    )

    statement = select(DailyCheckIn).order_by(
        DailyCheckIn.created_at.desc()
    )

    entries = list(db.scalars(statement).all())

    grouped_entries: dict[date, list[DailyCheckIn]] = {}

    for entry in entries:
        local_datetime = entry.created_at.astimezone(
            user_timezone
        )

        local_date = local_datetime.date()

        grouped_entries.setdefault(
            local_date,
            [],
        ).append(entry)

    results: list[DailySummaryListItem] = []

    for day, day_entries in grouped_entries.items():
        social_values = [
            entry.social_energy
            for entry in day_entries
            if entry.social_energy is not None
        ]

        mood_counts = Counter(
            entry.mood for entry in day_entries
        )

        dominant_mood = (
            mood_counts.most_common(1)[0][0]
            if mood_counts
            else None
        )

        summary = DailySummary(
            average_energy=round(
                sum(
                    entry.energy
                    for entry in day_entries
                )
                / len(day_entries),
                1,
            ),
            average_stress=round(
                sum(
                    entry.stress
                    for entry in day_entries
                )
                / len(day_entries),
                1,
            ),
            average_focus=round(
                sum(
                    entry.focus
                    for entry in day_entries
                )
                / len(day_entries),
                1,
            ),
            average_social_energy=(
                round(
                    sum(social_values)
                    / len(social_values),
                    1,
                )
                if social_values
                else None
            ),
            total_exercise_minutes=sum(
                entry.exercise_minutes
                for entry in day_entries
            ),
            dominant_mood=dominant_mood,
            sleep_hours=day_entries[0].sleep_hours,
        )

        results.append(
            DailySummaryListItem(
                date=day,
                entry_count=len(day_entries),
                summary=summary,
            )
        )

    results.sort(
        key=lambda item: item.date,
        reverse=True,
    )

    return results

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