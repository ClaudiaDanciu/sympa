from datetime import datetime, time
from pydantic import BaseModel, Field


class MedicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    dosage: str | None = None
    instructions: str | None = None


class MedicationScheduleCreate(BaseModel):
    time_of_day: time
    days_of_week: str = "0,1,2,3,4,5,6"
    reminder_enabled: bool = True


class MedicationLogCreate(BaseModel):
    action: str
    scheduled_for: datetime | None = None
    taken_at: datetime | None = None
    snoozed_until: datetime | None = None
    note: str | None = None


class AllergyCreate(BaseModel):
    substance: str = Field(min_length=1, max_length=255)
    reaction: str | None = None
    severity: str | None = None


class SymptomCreate(BaseModel):
    symptom: str = Field(min_length=1, max_length=255)
    severity: int | None = Field(default=None, ge=1, le=10)
    note: str | None = None
    occurred_at: datetime


class IngredientCreate(BaseModel):
    ingredient: str = Field(min_length=1, max_length=255)
    amount: str | None = None


class MealCreate(BaseModel):
    meal_type: str | None = None
    title: str | None = None
    note: str | None = None
    eaten_at: datetime
    ingredients: list[IngredientCreate] = []


class SafetyRuleCreate(BaseModel):
    rule_type: str
    subject_a: str
    subject_b: str
    severity: str = "info"
    message: str
    source_name: str
    source_url: str | None = None
    source_updated_at: datetime | None = None
