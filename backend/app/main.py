from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.calendar import router as calendar_router
from app.api.checkins import router as checkins_router
from app.api.daily_context import router as daily_contexts_router
from app.api.meals import router as meals_router
from app.api.medications import router as medications_router
from app.api.reports import router as reports_router
from app.api.safety import router as safety_router
from app.api.symptoms import router as symptoms_router
from app.api.timeline import router as timeline_router

from app.core.database import Base, engine
from app.db import health_models, models


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="SYMPA API",
    version="0.2.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(checkins_router)
app.include_router(daily_contexts_router)
app.include_router(calendar_router)
app.include_router(medications_router)
app.include_router(symptoms_router)
app.include_router(meals_router)
app.include_router(timeline_router)
app.include_router(safety_router)
app.include_router(reports_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}