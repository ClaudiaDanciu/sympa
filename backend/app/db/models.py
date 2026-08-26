from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DailyContext(Base):
    __tablename__ = "daily_contexts"

    __table_args__ = (
        UniqueConstraint(
            "context_date",
            name="uq_daily_contexts_context_date",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    context_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    sleep_hours: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class DailyCheckIn(Base):
    __tablename__ = "daily_check_ins"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Keep this temporarily so the existing API and data
    # continue to work while we migrate sleep into DailyContext.
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