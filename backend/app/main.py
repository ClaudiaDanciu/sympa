from fastapi import FastAPI

from app.api.checkins import router as checkins_router


app = FastAPI(
    title="SYMPA API",
    version="0.1.0",
)

app.include_router(checkins_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}