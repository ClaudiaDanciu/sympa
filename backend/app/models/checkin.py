from datetime import datetime
from datetime import date

from enum import Enum

from pydantic import BaseModel, Field


class Mood(str, Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    NEUTRAL = "neutral"
    GOOD = "good"
    GREAT = "great"


class DailyCheckInCreate(BaseModel):
    sleep_hours: float = Field(ge=0, le=24)
    energy: int = Field(ge=1, le=10)
    mood: Mood
    stress: int = Field(ge=1, le=10)
    focus: int = Field(ge=1, le=10)
    exercise_minutes: int = Field(default=0, ge=0)
    social_energy: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


class DailyCheckInResponse(DailyCheckInCreate):
    id: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class DailySummary(BaseModel):
    average_energy: float | None
    average_stress: float | None
    average_focus: float | None
    average_social_energy: float | None
    total_exercise_minutes: int
    dominant_mood: str | None
    sleep_hours: float | None

class DailySummaryListItem(BaseModel):
    date: date
    entry_count: int
    summary: DailySummary

class DailyCheckInDayResponse(BaseModel):
    date: date
    entry_count: int
    summary: DailySummary
    entries: list[DailyCheckInResponse]

class DailyInsightResponse(BaseModel):
    headline: str
    summary: str
    highlights: list[str]
    possible_patterns: list[str]