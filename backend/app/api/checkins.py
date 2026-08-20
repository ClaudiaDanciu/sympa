from fastapi import APIRouter

from app.models.checkin import DailyCheckInCreate


router = APIRouter(prefix="/check-ins", tags=["check-ins"])


@router.post("")
def create_check_in(
    check_in: DailyCheckInCreate,
) -> DailyCheckInCreate:
    return check_in