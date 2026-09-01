from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.calendar import router as calendar_router
from app.api.checkins import router as checkins_router
from app.api.daily_context import router as daily_contexts_router
from app.core.database import Base, engine
from app.db import models


# Create database tables registered with SQLAlchemy metadata.
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="SYMPA API",
    version="0.1.0",
)


# Allow the local React/Vite frontend to communicate with FastAPI.
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


# API routes
app.include_router(checkins_router)
app.include_router(daily_contexts_router)
app.include_router(calendar_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}