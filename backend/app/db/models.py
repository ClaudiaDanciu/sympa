from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DailyCheckIn(Base):
    __tablename__ = "daily_check_ins"

    id: Mapped[int] = mapped_column(primary_key=True)

    sleep_hours: Mapped[float] = mapped_column(Float)
    energy: Mapped[int] = mapped_column(Integer)
    mood: Mapped[str] = mapped_column(String(20))
    stress: Mapped[int] = mapped_column(Integer)
    focus: Mapped[int] = mapped_column(Integer)

    exercise_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    social_energy: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )