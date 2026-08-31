from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import date, datetime, time, timedelta, timezone

from app.core.database import get_db
from app.services.checkin_summary import build_daily_summary
from app.db.models import DailyCheckIn, DailyContext

from app.models.checkin import (
    DailyCheckInCreate,
    DailyCheckInDayResponse,
    DailyCheckInResponse,
    DailyInsightResponse,
    DailySummaryListItem,
    CrossDayPatternsResponse,
    PatternObservation,
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
    user_timezone = timezone(
        timedelta(minutes=timezone_offset)
    )

    now_local = datetime.now(user_timezone)

    start_local = now_local.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    end_local = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(
        timezone.utc
    )

    end_utc = end_local.astimezone(
        timezone.utc
    )

    statement = (
        select(DailyCheckIn)
        .where(
            DailyCheckIn.created_at >= start_utc,
            DailyCheckIn.created_at < end_utc,
        )
        .order_by(
            DailyCheckIn.created_at.desc()
        )
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
    user_timezone = timezone(
        timedelta(minutes=timezone_offset)
    )

    start_local = datetime.combine(
        target_date,
        time.min,
        tzinfo=user_timezone,
    )

    end_local = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(
        timezone.utc
    )

    end_utc = end_local.astimezone(
        timezone.utc
    )

    statement = (
        select(DailyCheckIn)
        .where(
            DailyCheckIn.created_at >= start_utc,
            DailyCheckIn.created_at < end_utc,
        )
        .order_by(
            DailyCheckIn.created_at.asc()
        )
    )

    entries = list(
        db.scalars(statement).all()
    )

    context_statement = select(
        DailyContext
    ).where(
        DailyContext.context_date == target_date
    )

    daily_context = db.scalar(
        context_statement
    )

    summary = build_daily_summary(
        entries,
        sleep_hours=(
            daily_context.sleep_hours
            if daily_context is not None
            else None
        ),
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

    statement = select(
        DailyCheckIn
    ).order_by(
        DailyCheckIn.created_at.desc()
    )

    entries = list(
        db.scalars(statement).all()
    )

    grouped_entries: dict[
        date,
        list[DailyCheckIn],
    ] = {}

    for entry in entries:
        local_datetime = (
            entry.created_at.astimezone(
                user_timezone
            )
        )

        local_date = local_datetime.date()

        grouped_entries.setdefault(
            local_date,
            [],
        ).append(entry)

    results: list[
        DailySummaryListItem
    ] = []

    for day, day_entries in grouped_entries.items():
        context_statement = select(
            DailyContext
        ).where(
            DailyContext.context_date == day
        )

        daily_context = db.scalar(
            context_statement
        )

        summary = build_daily_summary(
            day_entries,
            sleep_hours=(
                daily_context.sleep_hours
                if daily_context is not None
                else None
            ),
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
    "/day/insights",
    response_model=DailyInsightResponse,
)
def get_day_insights(
    target_date: date = Query(alias="date"),
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
        description="Timezone offset from UTC in minutes",
    ),
    db: Session = Depends(get_db),
) -> DailyInsightResponse:
    user_timezone = timezone(
        timedelta(minutes=timezone_offset)
    )

    start_local = datetime.combine(
        target_date,
        time.min,
        tzinfo=user_timezone,
    )

    end_local = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(
        timezone.utc
    )

    end_utc = end_local.astimezone(
        timezone.utc
    )

    statement = (
        select(DailyCheckIn)
        .where(
            DailyCheckIn.created_at >= start_utc,
            DailyCheckIn.created_at < end_utc,
        )
        .order_by(
            DailyCheckIn.created_at.asc()
        )
    )

    entries = list(
        db.scalars(statement).all()
    )

    if not entries:
        return DailyInsightResponse(
            headline="No data yet",
            summary=(
                "There are no check-ins recorded "
                "for this day."
            ),
            highlights=[],
            possible_patterns=[],
        )

    highlights: list[str] = []
    possible_patterns: list[str] = []

    energies = [
        entry.energy
        for entry in entries
    ]

    stresses = [
        entry.stress
        for entry in entries
    ]

    focuses = [
        entry.focus
        for entry in entries
    ]

    moods = [
        entry.mood
        for entry in entries
    ]

    average_energy = (
        sum(energies) / len(energies)
    )

    average_stress = (
        sum(stresses) / len(stresses)
    )

    average_focus = (
        sum(focuses) / len(focuses)
    )

    if max(energies) - min(energies) <= 1:
        highlights.append(
            (
                "Energy stayed fairly stable around "
                f"{round(average_energy, 1)}/10."
            )
        )
    else:
        highlights.append(
            (
                f"Energy varied from {min(energies)}/10 "
                f"to {max(energies)}/10."
            )
        )

    if average_stress <= 3:
        highlights.append(
            "Stress stayed relatively low."
        )
    elif average_stress >= 7:
        highlights.append(
            "Stress was elevated across the day."
        )
    else:
        highlights.append(
            (
                "Stress stayed around a moderate "
                f"{round(average_stress, 1)}/10."
            )
        )

    if average_focus >= 7:
        highlights.append(
            "Focus was strong overall."
        )
    elif average_focus <= 4:
        highlights.append(
            "Focus was relatively low overall."
        )

    if len(set(moods)) == 1:
        highlights.append(
            (
                "Mood stayed consistently "
                f"{format_mood_for_text(moods[0])}."
            )
        )
    else:
        possible_patterns.append(
            (
                "Mood changed during the day, which "
                "may be useful to compare with "
                "activities, people, meals, sleep, "
                "or events."
            )
        )

    if len(entries) >= 2:
        first = entries[0]
        last = entries[-1]

        if last.energy >= first.energy + 2:
            possible_patterns.append(
                (
                    "Energy improved meaningfully "
                    "from the first check-in to the last."
                )
            )
        elif last.energy <= first.energy - 2:
            possible_patterns.append(
                (
                    "Energy declined meaningfully "
                    "over the course of the day."
                )
            )

        if last.stress <= first.stress - 2:
            possible_patterns.append(
                (
                    "Stress decreased noticeably "
                    "during the day."
                )
            )
        elif last.stress >= first.stress + 2:
            possible_patterns.append(
                (
                    "Stress increased noticeably "
                    "during the day."
                )
            )

    movement_total = sum(
        entry.exercise_minutes
        for entry in entries
    )

    if movement_total > 0:
        highlights.append(
            (
                f"You recorded {movement_total} "
                "minutes of movement."
            )
        )

    if len(entries) == 1:
        headline = "A first snapshot"

        summary = (
            "This day has one check-in so far. "
            "SYMPA can describe the moment, "
            "but it needs more observations before "
            "identifying how the day changed."
        )

    elif (
        max(energies) - min(energies) <= 1
        and max(stresses) - min(stresses) <= 1
    ):
        headline = "A steady day"

        summary = (
            "Your recorded energy and stress stayed "
            "relatively stable across "
            f"{len(entries)} check-ins."
        )

    else:
        headline = "A changing day"

        summary = (
            "Your check-ins show meaningful variation "
            "during the day. These shifts become more "
            "useful when compared with context such as "
            "sleep, movement, meals, social "
            "interactions, and events."
        )

    return DailyInsightResponse(
        headline=headline,
        summary=summary,
        highlights=highlights,
        possible_patterns=possible_patterns,
    )


def format_mood_for_text(
    mood: str,
) -> str:
    return mood.replace("_", " ")


def calculate_correlation(
    x_values: list[float],
    y_values: list[float],
) -> float | None:
    if len(x_values) != len(y_values):
        return None

    if len(x_values) < 3:
        return None

    x_mean = (
        sum(x_values) / len(x_values)
    )

    y_mean = (
        sum(y_values) / len(y_values)
    )

    numerator = sum(
        (x - x_mean) * (y - y_mean)
        for x, y in zip(
            x_values,
            y_values,
        )
    )

    x_variance = sum(
        (x - x_mean) ** 2
        for x in x_values
    )

    y_variance = sum(
        (y - y_mean) ** 2
        for y in y_values
    )

    denominator = (
        x_variance * y_variance
    ) ** 0.5

    if denominator == 0:
        return None

    return numerator / denominator


def evidence_level(
    days_analyzed: int,
) -> str:
    if days_analyzed >= 14:
        return "higher"

    if days_analyzed >= 7:
        return "growing"

    return "early"


def correlation_strength(
    correlation: float,
) -> str:
    absolute = abs(correlation)

    if absolute >= 0.7:
        return "strong"

    if absolute >= 0.4:
        return "moderate"

    return "weak"


@router.get(
    "/patterns",
    response_model=CrossDayPatternsResponse,
)
def get_cross_day_patterns(
    timezone_offset: int = Query(
        default=0,
        ge=-720,
        le=840,
        description="Timezone offset from UTC in minutes",
    ),
    db: Session = Depends(get_db),
) -> CrossDayPatternsResponse:
    user_timezone = timezone(
        timedelta(minutes=timezone_offset)
    )

    statement = select(
        DailyCheckIn
    ).order_by(
        DailyCheckIn.created_at.asc()
    )

    entries = list(
        db.scalars(statement).all()
    )

    grouped_entries: dict[
        date,
        list[DailyCheckIn],
    ] = {}

    for entry in entries:
        local_datetime = (
            entry.created_at.astimezone(
                user_timezone
            )
        )

        local_date = local_datetime.date()

        grouped_entries.setdefault(
            local_date,
            [],
        ).append(entry)

    days_analyzed = len(
        grouped_entries
    )

    if days_analyzed < 3:
        return CrossDayPatternsResponse(
            days_analyzed=days_analyzed,
            enough_data=False,
            headline="Still learning your patterns",
            summary=(
                "SYMPA needs at least 3 recorded days "
                "before it starts comparing relationships "
                "between your daily signals."
            ),
            patterns=[],
        )

    sleep_values: list[float] = []
    sleep_energy_values: list[float] = []
    energy_values: list[float] = []
    stress_values: list[float] = []
    focus_values: list[float] = []
    movement_values: list[float] = []
    social_values: list[float] = []
    social_energy_values: list[float] = []

    for day_entries in grouped_entries.values():
        average_energy = sum(
            entry.energy
            for entry in day_entries
        ) / len(day_entries)

        average_stress = sum(
            entry.stress
            for entry in day_entries
        ) / len(day_entries)

        average_focus = sum(
            entry.focus
            for entry in day_entries
        ) / len(day_entries)

        total_movement = sum(
            entry.exercise_minutes
            for entry in day_entries
        )

        day = (
            day_entries[0]
            .created_at
            .astimezone(user_timezone)
            .date()
        )

        context_statement = select(
            DailyContext
        ).where(
            DailyContext.context_date == day
        )

        daily_context = db.scalar(
            context_statement
        )

        if (
            daily_context is not None
            and daily_context.sleep_hours is not None
        ):
            sleep_values.append(
                daily_context.sleep_hours
            )

            sleep_energy_values.append(
                average_energy
            )

        energy_values.append(
            average_energy
        )

        stress_values.append(
            average_stress
        )

        focus_values.append(
            average_focus
        )

        movement_values.append(
            float(total_movement)
        )

        day_social_values = [
            entry.social_energy
            for entry in day_entries
            if entry.social_energy is not None
        ]

        if day_social_values:
            social_values.append(
                sum(day_social_values)
                / len(day_social_values)
            )

            social_energy_values.append(
                average_energy
            )

    patterns: list[
        PatternObservation
    ] = []

    sleep_energy = calculate_correlation(
    sleep_values,
    sleep_energy_values,
)

    if sleep_energy is not None:
        if sleep_energy > 0.25:
            patterns.append(
                PatternObservation(
                    title=(
                        "Sleep and energy "
                        "move together"
                    ),
                    description=(
                        "On days with more recorded sleep, "
                        "your energy has tended to be higher."
                    ),
                    strength=correlation_strength(
                        sleep_energy
                    ),
                    evidence=evidence_level(
                        days_analyzed
                    ),
                )
            )

        elif sleep_energy < -0.25:
            patterns.append(
                PatternObservation(
                    title=(
                        "Sleep and energy show "
                        "an unexpected pattern"
                    ),
                    description=(
                        "More recorded sleep has not "
                        "corresponded with higher energy "
                        "in your current data. More days "
                        "may clarify this."
                    ),
                    strength=correlation_strength(
                        sleep_energy
                    ),
                    evidence=evidence_level(
                        days_analyzed
                    ),
                )
            )

    stress_focus = calculate_correlation(
        stress_values,
        focus_values,
    )

    if stress_focus is not None:
        if stress_focus < -0.25:
            patterns.append(
                PatternObservation(
                    title=(
                        "Stress may relate to "
                        "lower focus"
                    ),
                    description=(
                        "Higher-stress days have tended "
                        "to coincide with lower focus."
                    ),
                    strength=correlation_strength(
                        stress_focus
                    ),
                    evidence=evidence_level(
                        days_analyzed
                    ),
                )
            )

        elif stress_focus > 0.25:
            patterns.append(
                PatternObservation(
                    title=(
                        "Stress and focus "
                        "move together"
                    ),
                    description=(
                        "Your current data shows focus "
                        "rising alongside stress on some "
                        "days. This is worth observing "
                        "over more time."
                    ),
                    strength=correlation_strength(
                        stress_focus
                    ),
                    evidence=evidence_level(
                        days_analyzed
                    ),
                )
            )

    movement_energy = calculate_correlation(
        movement_values,
        energy_values,
    )

    if movement_energy is not None:
        if movement_energy > 0.25:
            patterns.append(
                PatternObservation(
                    title=(
                        "Movement may support "
                        "higher-energy days"
                    ),
                    description=(
                        "Days with more recorded movement "
                        "have tended to coincide with "
                        "higher energy."
                    ),
                    strength=correlation_strength(
                        movement_energy
                    ),
                    evidence=evidence_level(
                        days_analyzed
                    ),
                )
            )

    social_energy = calculate_correlation(
        social_values,
        social_energy_values,
    )

    if social_energy is not None:
        if social_energy > 0.25:
            patterns.append(
                PatternObservation(
                    title=(
                        "Social energy and overall "
                        "energy move together"
                    ),
                    description=(
                        "Days with higher social energy "
                        "have also tended to be "
                        "higher-energy days."
                    ),
                    strength=correlation_strength(
                        social_energy
                    ),
                    evidence=evidence_level(
                        days_analyzed
                    ),
                )
            )

    if not patterns:
        headline = "No clear pattern yet"

        summary = (
            f"SYMPA compared {days_analyzed} "
            "recorded days, but the current signals "
            "do not show a clear relationship yet."
        )

    else:
        headline = "Early patterns are emerging"

        summary = (
            f"SYMPA compared {days_analyzed} "
            "recorded days "
            f"and found {len(patterns)} relationship"
            f"{'s' if len(patterns) != 1 else ''} "
            "worth watching. These are observations, "
            "not proof of cause and effect."
        )

    return CrossDayPatternsResponse(
        days_analyzed=days_analyzed,
        enough_data=True,
        headline=headline,
        summary=summary,
        patterns=patterns,
    )


@router.get(
    "/{check_in_id}",
    response_model=DailyCheckInResponse,
)
def get_check_in(
    check_in_id: int,
    db: Session = Depends(get_db),
) -> DailyCheckIn:
    check_in = db.get(
        DailyCheckIn,
        check_in_id,
    )

    if check_in is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Check-in not found",
        )

    return check_in