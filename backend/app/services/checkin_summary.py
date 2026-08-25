from collections import Counter

from app.db.models import DailyCheckIn
from app.models.checkin import DailySummary


def build_daily_summary(
    entries: list[DailyCheckIn],
) -> DailySummary:
    if not entries:
        return DailySummary(
            average_energy=None,
            average_stress=None,
            average_focus=None,
            average_social_energy=None,
            total_exercise_minutes=0,
            dominant_mood=None,
            sleep_hours=None,
        )

    ordered_entries = sorted(
        entries,
        key=lambda entry: entry.created_at,
    )

    social_values = [
        entry.social_energy
        for entry in ordered_entries
        if entry.social_energy is not None
    ]

    mood_counts = Counter(
        entry.mood
        for entry in ordered_entries
    )

    dominant_mood = (
        mood_counts.most_common(1)[0][0]
        if mood_counts
        else None
    )

    return DailySummary(
        average_energy=round(
            sum(
                entry.energy
                for entry in ordered_entries
            )
            / len(ordered_entries),
            1,
        ),
        average_stress=round(
            sum(
                entry.stress
                for entry in ordered_entries
            )
            / len(ordered_entries),
            1,
        ),
        average_focus=round(
            sum(
                entry.focus
                for entry in ordered_entries
            )
            / len(ordered_entries),
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
            for entry in ordered_entries
        ),
        dominant_mood=dominant_mood,
        sleep_hours=ordered_entries[-1].sleep_hours,
    )