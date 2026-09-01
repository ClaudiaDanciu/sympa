from __future__ import annotations

from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    dosage: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    medication_id: Mapped[int] = mapped_column(
        ForeignKey("medications.id", ondelete="CASCADE"), index=True
    )
    time_of_day: Mapped[time] = mapped_column(Time)
    days_of_week: Mapped[str] = mapped_column(
        String(50), default="0,1,2,3,4,5,6"
    )
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    medication_id: Mapped[int] = mapped_column(
        ForeignKey("medications.id", ondelete="CASCADE"), index=True
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(30), index=True)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    snoozed_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Allergy(Base):
    __tablename__ = "allergies"

    id: Mapped[int] = mapped_column(primary_key=True)
    substance: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    reaction: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Symptom(Base):
    __tablename__ = "symptoms"

    id: Mapped[int] = mapped_column(primary_key=True)
    symptom: Mapped[str] = mapped_column(String(255), index=True)
    severity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(primary_key=True)
    meal_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    eaten_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MealIngredient(Base):
    __tablename__ = "meal_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    meal_id: Mapped[int] = mapped_column(
        ForeignKey("meals.id", ondelete="CASCADE"), index=True
    )
    ingredient: Mapped[str] = mapped_column(String(255), index=True)
    amount: Mapped[str | None] = mapped_column(String(100), nullable=True)


class SafetyRule(Base):
    __tablename__ = "safety_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    rule_type: Mapped[str] = mapped_column(String(50), index=True)
    subject_a: Mapped[str] = mapped_column(String(255), index=True)
    subject_b: Mapped[str] = mapped_column(String(255), index=True)
    severity: Mapped[str] = mapped_column(String(30), default="info")
    message: Mapped[str] = mapped_column(Text)
    source_name: Mapped[str] = mapped_column(String(255))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
