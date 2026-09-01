from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
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

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    provider: Mapped[str] = mapped_column(
        String(30),
        default="google",
    )

    provider_event_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255)
    )

    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    end_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class FollowUpPrompt(Base):
    __tablename__ = "follow_up_prompts"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    calendar_event_id: Mapped[int] = mapped_column(
        ForeignKey("calendar_events.id"),
        index=True,
    )

    prompt_type: Mapped[str] = mapped_column(
        String(50),
        default="post_event_checkin",
    )

    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        index=True,
    )

    snoozed_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_check_in_id: Mapped[int | None] = mapped_column(
        ForeignKey("daily_check_ins.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

class CalendarConnection(Base):
    __tablename__ = "calendar_connections"

    id: Mapped[int] = mapped_column(primary_key=True)

    provider: Mapped[str] = mapped_column(
        String(30),
        index=True,
    )

    account_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    access_token: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    refresh_token: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    provider_calendar_id: Mapped[str] = mapped_column(
        String(255),
        default="primary",
    )

    sync_token: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )