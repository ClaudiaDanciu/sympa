# SYMPA

Personal health and wellness tracking app with contextual check-ins,
health logging, timeline, insights, safety guidance, and clinician-ready
reports.

## Current Stack

-   Frontend: React + TypeScript + Vite
-   Backend: FastAPI + SQLAlchemy
-   Database: PostgreSQL
-   External data: openFDA
-   Local development: macOS + VS Code

## Design

-   Visual direction: clean, modern, and friendly — soft cards, generous spacing, and a calm teal accent.
-   Fonts: Inter system stack (used across web and mobile).
-   Tokens: color/spacing/radius variables are defined in the web styles and used to keep a consistent look.
-   Goal: create a polished cross-platform experience for both `apps/web` and `apps/mobile`.

## Run locally

Web

```bash
cd apps/web
npm install
npm run dev
```

Mobile (Expo)

```bash
cd apps/mobile
npm install
npm run start
```

Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
python -m uvicorn app.main:app --reload --reload-dir app
```

## Deployment notes

- Backend: production should run behind a process manager (systemd, supervisord) and a reverse proxy (nginx), using `uvicorn --workers` or Gunicorn with Uvicorn workers. Ensure `DATABASE_URL` and `OPENFDA_API_KEY` are provided as environment variables.
- Database: use managed PostgreSQL and run Alembic migrations found in the `backend` folder.
- Frontend: build the web app with `npm run build` and serve under a CDN or static site host. For mobile, produce App Store / Play Store builds using Expo build pipelines.
- Secrets: never commit API keys; use a secrets manager in production.

## Currently Built

### Core tracking

-   Multiple check-ins per day
-   Energy, mood, stress, focus, movement, social energy, notes
-   Daily sleep/context stored separately
-   Daily summaries
-   Deterministic SYMPA reflections
-   Cross-day patterns and trends
-   History/day detail

### Health logging

-   Medications and schedules
-   Taken / Skip / Snooze logs
-   Symptoms
-   Meals and ingredients
-   Allergies

### Calendar

-   Google Calendar connection
-   Calendar events on Today
-   Post-event follow-up check-ins
-   Snooze / dismiss follow-up prompts

### Timeline

-   Unified health timeline
-   Compact day grouping
-   3 / 7 / 14 / 30 day ranges
-   Morning / Afternoon / Evening grouping

### Safety

-   Allergy storage
-   Safety-rule infrastructure
-   `/safety/medication-guidance`
-   Live openFDA drug-label lookup
-   Improved drug matching
-   API keys backend-only

### Reports

-   Health summary endpoint
-   Active medications
-   Medication action counts
-   Symptom counts
-   Meal count
-   Medical disclaimer

### Navigation

Today · Log · Timeline · Insights · Safety · Report

## Working / Tested

-   Backend + Swagger
-   PostgreSQL health tables
-   Sleep
-   Check-ins
-   Symptoms
-   Meals + ingredients
-   Medication actions
-   Timeline
-   Compact Timeline
-   Frontend production build

## Needs To Be Achieved

### 1. Live medication interaction data --- PRIORITY

-   Remove hardcoded medical interaction evidence
-   Add structured live interaction provider
-   Preferred provider: DrugBank
-   Reliably identify medications/supplements
-   Return live severity, evidence, description, management guidance, and sources
-   Keep openFDA for supporting FDA label data
-   Never use an LLM to invent safety conclusions and always provide the fact that this is just an advice and to discuss it further with a professional.

### 2. Medication guidance UI

-   Show useful interaction/timing guidance
-   Separate interaction results from generic FDA warnings
-   Show provider/source/evidence
-   Physician/pharmacist confirmation disclaimer

### 3. Food + medication safety

-   Dynamic medication-food interaction checking
-   Ingredient-level checks
-   Allergy warnings
-   Dynamic food-food interaction as well
-   Calories atention as well as balanced meals or how to balance it, quick winn what to add to your place

### 4. Meal/menu scanning

-   Take/upload menu or food photo
-   Extract foods/ingredients
-   User confirms/edits before save
-   Run confirmed ingredients through safety checks
-   Calories atention as well as balanced meals or how to balance it, quick winn what to add to your place

### 5. Timeline retention

-   Latest \~30 days detailed
-   Older data summarized monthly
-   Monthly drill-down and health metrics

### 6. Finish UI testing

-   Insights
-   Safety
-   Report
-   Full calendar flow
-   Medication guidance after live provider integration

### 7. Finish touch
- Make the app to be able to interact with voice as you can interact with ai
- Create a time scheduled in the day when for example, a user is driving and is calling you to update his profile, or whenever wants to mention somthing to chat.
- Clean the user interface so it can be easy to use and catchy
- Make a catchier insights so a user will return and check his progress, what improved his health, energy, mental health and wealth, and what decreased it.
- Add information and measurements to see how can everything that we know influenced his wealth as well and what did not. 


### 8.  Production / later

-   Push notifications
-   Medication reminders with app closed
-   Authentication/users: login/signup and separate accounts so multiple people can use SYMPA and each person only sees their own health data.
-   Privacy/security hardening: protecting sensitive health data properly: authentication, authorization, encryption, secure secrets/API keys, access controls, logging policies, backups, etc.
-   Production interaction-provider licensing: if we use something like DrugBank for live medication interactions, a deployed commercial product may require a paid/commercial API license. This is separate from writing the integration.
-   Clinician report export: generate a clean PDF or similar report the user can download/share with their doctor: symptoms, medications, sleep, trends, adherence, meals, etc.

## Target Medication Data Flow

User medications/supplements\
→ normalize/identify substances\
→ live structured interaction API\
→ interaction + evidence\
→ openFDA supporting label data\
→ SYMPA concise guidance + source

## Safety Rule

SYMPA provides sourced health information, not diagnosis or personalized
medical clearance. Medication, supplement, food, and timing guidance
must come from authoritative/validated data and recommend confirmation
with a physician or pharmacist.
