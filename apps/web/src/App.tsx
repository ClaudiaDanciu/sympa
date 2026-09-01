import { useEffect, useState } from "react";
import "./App.css";

import { CheckInForm } from "./components/CheckInForm";
import { CheckInHistory } from "./components/CheckInHistory";
import { DayDetail } from "./components/DayDetail";
import { Patterns } from "./components/Patterns";
import { Trends } from "./components/Trends";
import { DailyContext } from "./components/DailyContext";
import { CalendarToday } from "./components/CalendarToday";
import { MedicationManager } from "./components/MedicationManager";
import { SymptomTracker } from "./components/SymptomTracker";
import { MealTracker } from "./components/MealTracker";
import { UnifiedTimeline } from "./components/UnifiedTimeline";
import { SafetyCenter } from "./components/SafetyCenter";
import { HealthReport } from "./components/HealthReport";

type DailyCheckIn = {
  id: number;
  energy: number;
  mood: string;
  stress: number;
  focus: number;
  exercise_minutes: number;
  social_energy: number | null;
  notes: string | null;
  created_at: string;
};

type AppView =
  | "today"
  | "log"
  | "timeline"
  | "insights"
  | "safety"
  | "report";

function App() {
  const [activeView, setActiveView] =
    useState<AppView>("today");

  const [checkIn, setCheckIn] =
    useState<DailyCheckIn | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [historyVersion, setHistoryVersion] =
    useState(0);

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  async function loadToday() {
    setLoading(true);

    try {
      const timezoneOffset =
        -new Date().getTimezoneOffset();

      const response = await fetch(
        `http://127.0.0.1:8000/check-ins/today?timezone_offset=${timezoneOffset}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load today's check-in"
        );
      }

      const data: DailyCheckIn | null =
        await response.json();

      setCheckIn(data);
    } catch (error) {
      console.error(
        "Unable to load today's check-in:",
        error
      );

      setCheckIn(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadToday();
  }, []);

  async function handleCheckInSaved() {
    setShowForm(false);

    await loadToday();

    setHistoryVersion(
      (version) => version + 1
    );
  }

  function handleSelectDay(date: string) {
    setShowForm(false);
    setSelectedDate(date);
  }

  function handleBackToHistory() {
    setSelectedDate(null);
  }

  function changeView(view: AppView) {
    setSelectedDate(null);
    setShowForm(false);
    setActiveView(view);
  }

  return (
    <main className="app-shell">
      <div className="container">
        <header className="header">
          <div>
            <button
              type="button"
              className="brand brand-button"
              onClick={() => changeView("today")}
            >
              sympa.
            </button>

            <p className="subtitle">
              Your personal intelligence companion
            </p>
          </div>

          <div className="avatar">
            S
          </div>
        </header>

        <nav
          className="main-nav"
          aria-label="Main navigation"
        >
          <NavButton
            label="Today"
            active={activeView === "today"}
            onClick={() =>
              changeView("today")
            }
          />

          <NavButton
            label="Log"
            active={activeView === "log"}
            onClick={() =>
              changeView("log")
            }
          />

          <NavButton
            label="Timeline"
            active={activeView === "timeline"}
            onClick={() =>
              changeView("timeline")
            }
          />

          <NavButton
            label="Insights"
            active={activeView === "insights"}
            onClick={() =>
              changeView("insights")
            }
          />

          <NavButton
            label="Safety"
            active={activeView === "safety"}
            onClick={() =>
              changeView("safety")
            }
          />

          <NavButton
            label="Report"
            active={activeView === "report"}
            onClick={() =>
              changeView("report")
            }
          />
        </nav>

        {selectedDate ? (
          <DayDetail
            date={selectedDate}
            onBack={handleBackToHistory}
          />
        ) : (
          <>
            {activeView === "today" && (
              <TodayView
                checkIn={checkIn}
                loading={loading}
                showForm={showForm}
                historyVersion={
                  historyVersion
                }
                onShowForm={() =>
                  setShowForm(true)
                }
                onHideForm={() =>
                  setShowForm(false)
                }
                onSaved={
                  handleCheckInSaved
                }
                onContextSaved={() =>
                  setHistoryVersion(
                    (version) => version + 1
                  )
                }
              />
            )}

            {activeView === "log" && (
              <LogView
                showForm={showForm}
                onShowForm={() =>
                  setShowForm(true)
                }
                onHideForm={() =>
                  setShowForm(false)
                }
                onSaved={
                  handleCheckInSaved
                }
              />
            )}

            {activeView ===
              "timeline" && (
              <>
                <PageIntro
                  eyebrow="Timeline"
                  title="Your health context over time"
                  description="See your meetings, check-ins, sleep, medications, meals, and symptoms together."
                />

                <UnifiedTimeline />
              </>
            )}

            {activeView ===
              "insights" && (
              <>
                <PageIntro
                  eyebrow="Insights"
                  title="Notice what changes over time"
                  description="Explore trends, recurring patterns, and your previous check-ins."
                />

                <Patterns
                  refreshKey={
                    historyVersion
                  }
                />

                <Trends
                  refreshKey={
                    historyVersion
                  }
                />

                <CheckInHistory
                  refreshKey={
                    historyVersion
                  }
                  onSelectDay={
                    handleSelectDay
                  }
                />
              </>
            )}

            {activeView === "safety" && (
              <>
                <PageIntro
                  eyebrow="Safety"
                  title="Keep important health context visible"
                  description="Record allergies and review safety information that has verified source provenance."
                />

                <SafetyCenter />
              </>
            )}

            {activeView === "report" && (
              <>
                <PageIntro
                  eyebrow="Report"
                  title="A clearer health summary"
                  description="Review the information you recorded across medications, symptoms, and meals."
                />

                <HealthReport />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function TodayView({
  checkIn,
  loading,
  showForm,
  historyVersion,
  onShowForm,
  onHideForm,
  onSaved,
  onContextSaved,
}: {
  checkIn: DailyCheckIn | null;
  loading: boolean;
  showForm: boolean;
  historyVersion: number;
  onShowForm: () => void;
  onHideForm: () => void;
  onSaved: () => Promise<void>;
  onContextSaved: () => void;
}) {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">
          Today
        </p>

        <h1>
          How are you feeling?
        </h1>

        <p>
          Build awareness of the patterns
          that help you feel and perform
          better.
        </p>
      </section>

      <DailyContext
        refreshKey={historyVersion}
        onSaved={onContextSaved}
      />

      <CalendarToday />

      {showForm ? (
        <CheckInForm
          onCancel={onHideForm}
          onSaved={onSaved}
        />
      ) : loading ? (
        <section className="card">
          <p>Loading today...</p>
        </section>
      ) : checkIn ? (
        <>
          <section className="metrics">
            <Metric
              label="Energy"
              value={`${checkIn.energy}/10`}
            />

            <Metric
              label="Mood"
              value={formatMood(
                checkIn.mood
              )}
            />

            <Metric
              label="Stress"
              value={`${checkIn.stress}/10`}
            />

            <Metric
              label="Focus"
              value={`${checkIn.focus}/10`}
            />

            <Metric
              label="Movement"
              value={`${checkIn.exercise_minutes} min`}
            />

            {checkIn.social_energy !==
              null && (
              <Metric
                label="Social energy"
                value={`${checkIn.social_energy}/10`}
              />
            )}
          </section>

          <section className="card note-card">
            <p className="card-label">
              Latest note
            </p>

            <p className="note">
              {checkIn.notes ||
                "No notes added."}
            </p>
          </section>

          <button
            type="button"
            className="secondary-button"
            onClick={onShowForm}
          >
            Add another check-in
          </button>
        </>
      ) : (
        <section className="card empty-state">
          <p className="card-label">
            No check-in yet
          </p>

          <h2>
            Take a minute for yourself.
          </h2>

          <p>
            Add a check-in so SYMPA can
            start building your personal
            context.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={onShowForm}
          >
            Check in
          </button>
        </section>
      )}
    </>
  );
}

function LogView({
  showForm,
  onShowForm,
  onHideForm,
  onSaved,
}: {
  showForm: boolean;
  onShowForm: () => void;
  onHideForm: () => void;
  onSaved: () => Promise<void>;
}) {
  return (
    <>
      <PageIntro
        eyebrow="Log"
        title="Record what matters"
        description="Add a check-in, medication, symptom, or meal without cluttering your Today view."
      />

      <section className="quick-log">
        <div>
          <p className="card-label">
            Check-in
          </p>

          <h2>
            How do you feel right now?
          </h2>

          <p>
            Record energy, mood, stress,
            focus, movement, and social
            energy.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            className="primary-button"
            onClick={onShowForm}
          >
            Add check-in
          </button>
        )}
      </section>

      {showForm && (
        <CheckInForm
          onCancel={onHideForm}
          onSaved={onSaved}
        />
      )}

      <MedicationManager />

      <SymptomTracker />

      <MealTracker />
    </>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro">
      <p className="eyebrow">
        {eyebrow}
      </p>

      <h1>{title}</h1>

      <p>{description}</p>
    </section>
  );
}

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`main-nav__button ${
        active
          ? "main-nav__button--active"
          : ""
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMood(
  mood: string
) {
  return mood
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default App;