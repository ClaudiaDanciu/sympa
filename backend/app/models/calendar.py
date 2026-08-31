from datetime import datetime

from pydantic import BaseModel, Field


class CalendarEventCreate(BaseModel):
    provider: str = "google"
    provider_event_id: str

    title: str = Field(
        min_length=1,
        max_length=255,
    )

    start_at: datetime
    end_at: datetime

    location: str | None = None
    description: str | None = None


class CalendarEventResponse(BaseModel):
    id: int

    provider: str
    provider_event_id: str
    title: str

    start_at: datetime
    end_at: datetime

    location: str | None
    description: str | None

    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class FollowUpPromptResponse(BaseModel):
    id: int
    calendar_event_id: int

    prompt_type: str
    due_at: datetime
    status: str

    snoozed_until: datetime | None
    completed_check_in_id: int | None

    created_at: datetime
    updated_at: datetime

    event: CalendarEventResponse | None = None

    model_config = {
        "from_attributes": True
    }


class SnoozePromptRequest(BaseModel):
    minutes: int = Field(
        default=30,
        ge=5,
        le=1440,
    )


class CompletePromptRequest(BaseModel):
    check_in_id: int