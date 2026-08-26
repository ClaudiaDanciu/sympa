from datetime import date, datetime

from pydantic import BaseModel, Field


class DailyContextUpdate(BaseModel):
    sleep_hours: float | None = Field(
        default=None,
        ge=0,
        le=24,
    )


class DailyContextResponse(BaseModel):
    id: int
    context_date: date
    sleep_hours: float | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }