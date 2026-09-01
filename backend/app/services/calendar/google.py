from __future__ import annotations

from datetime import datetime, timezone
from os import getenv

from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

load_dotenv()

GOOGLE_CLIENT_ID = getenv("GOOGLE_CALENDAR_CLIENT_ID")
GOOGLE_CLIENT_SECRET = getenv("GOOGLE_CALENDAR_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = getenv(
    "GOOGLE_CALENDAR_REDIRECT_URI",
    "http://127.0.0.1:8000/calendar/google/callback",
)

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events.readonly",
]


def _require_config() -> None:
    missing = []
    if not GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CALENDAR_CLIENT_ID")
    if not GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CALENDAR_CLIENT_SECRET")
    if not GOOGLE_REDIRECT_URI:
        missing.append("GOOGLE_CALENDAR_REDIRECT_URI")
    if missing:
        raise RuntimeError("Missing Google OAuth env vars: " + ", ".join(missing))


def build_google_flow(state: str | None = None) -> Flow:
    _require_config()
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
        state=state,
    )


def get_google_authorization_url() -> tuple[str, str]:
    flow = build_google_flow()
    return flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )


def exchange_google_code(code: str, state: str | None = None) -> Credentials:
    flow = build_google_flow(state=state)
    flow.fetch_token(code=code)
    return flow.credentials


def credentials_from_connection(connection) -> Credentials:
    _require_config()
    return Credentials(
        token=connection.access_token,
        refresh_token=connection.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=GOOGLE_SCOPES,
        expiry=connection.token_expires_at,
    )


def list_google_events(
    credentials: Credentials,
    time_min: datetime,
    time_max: datetime,
) -> list[dict]:
    service = build("calendar", "v3", credentials=credentials)
    response = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=time_min.astimezone(timezone.utc).isoformat(),
            timeMax=time_max.astimezone(timezone.utc).isoformat(),
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )
    return response.get("items", [])
