from fastapi import APIRouter

router = APIRouter(
    prefix="/calendar",
    tags=["calendar"],
)


@router.get("/health")
def calendar_health():
    return {
        "status": "ok",
        "service": "calendar",
    }