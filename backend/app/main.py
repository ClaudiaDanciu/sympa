from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.checkins import router as checkins_router
from app.api.daily_contexts import router as daily_contexts_router
from app.core.database import Base, engine
from app.db import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SYMPA API",
    version="0.1.0",
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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}