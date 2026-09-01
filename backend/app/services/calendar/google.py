from datetime import datetime, timezone
from os import getenv

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from dotenv import load_dotenv

load_dotenv()


GOOGLE_CLIENT_ID = getenv("GOOGLE_CALENDAR_CLIENT_ID")
GOOGLE_CLIENT_SECRET = getenv("GOOGLE_CALENDAR_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = getenv("GOOGLE_CALENDAR_REDIRECT_URI")

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events.readonly",
]


def build_google_flow() -> Flow:
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
    )


def get_google_authorization_url() -> tuple[str, str]:
    flow = build_google_flow()

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    return authorization_url, state


def exchange_google_code(code: str) -> Credentials:
    flow = build_google_flow()
    flow.fetch_token(code=code)

    return flow.credentials


def build_google_calendar_service(credentials: Credentials):
    return build(
        "calendar",
        "v3",
        credentials=credentials,
    )


def list_google_events(
    credentials: Credentials,
    time_min: datetime,
    time_max: datetime,
):
    service = build_google_calendar_service(credentials)

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