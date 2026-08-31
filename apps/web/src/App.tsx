import { useEffect, useState } from "react";
import "./App.css";
import { CheckInForm } from "./components/CheckInForm";
import { CheckInHistory } from "./components/CheckInHistory";
import { DayDetail } from "./components/DayDetail";
import { Patterns } from "./components/Patterns";
import { Trends } from "./components/Trends";
import { DailyContext } from "./components/DailyContext";
import { CalendarToday } from "./components/CalendarToday";

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

function App() {
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  async function loadToday() {
    setLoading(true);

    try {
      const timezoneOffset = -new Date().getTimezoneOffset();

      const response = await fetch(
        `http://127.0.0.1:8000/check-ins/today?timezone_offset=${timezoneOffset}`
      );

      if (!response.ok) {
        throw new Error("Failed to load today's check-in");
      }

      const data: DailyCheckIn | null = await response.json();
      setCheckIn(data);
    } catch (error) {
      console.error("Unable to load today's check-in:", error);
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

    setHistoryVersion((version) => version + 1);
  }

  function handleSelectDay(date: string) {
    setShowForm(false);
    setSelectedDate(date);
  }

  function handleBackToHistory() {
    setSelectedDate(null);
  }

  return (
    <main className="app-shell">
      <div className="container">
        <header className="header">
          <div>
            <div className="brand">sympa.</div>

            <p className="subtitle">
              Your personal intelligence companion
            </p>
          </div>

          <div className="avatar">S</div>
        </header>

        {selectedDate ? (
          <DayDetail
            date={selectedDate}
            onBack={handleBackToHistory}
          />
        ) : (
          <>
            <section className="hero">
              <p className="eyebrow">Today</p>

              <h1>How are you feeling?</h1>

              <p>
                Build awareness of the patterns that help you feel and perform
                better.
              </p>
            </section>


            <DailyContext refreshKey={historyVersion} />
            <CalendarToday />
            {showForm ? (
              <CheckInForm
                onCancel={() => setShowForm(false)}
                onSaved={handleCheckInSaved}
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
                    value={formatMood(checkIn.mood)}
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

                  {checkIn.social_energy !== null && (
                    <Metric
                      label="Social energy"
                      value={`${checkIn.social_energy}/10`}
                    />
                  )}
                </section>

                <section className="card note-card">
                  <p className="card-label">Today's note</p>

                  <p className="note">
                    {checkIn.notes || "No notes added today."}
                  </p>
                </section>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(true)}
                >
                  Add another check-in
                </button>
              </>
            ) : (
              <section className="card empty-state">
                <p className="card-label">
                  No check-in yet
                </p>

                <h2>Take a minute for yourself.</h2>

                <p>
                  Add today's check-in so SYMPA can start learning what helps
                  you.
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                >
                  Check in
                </button>
              </section>
            )}

            <Patterns refreshKey={historyVersion} />

            <Trends refreshKey={historyVersion} />

            <CheckInHistory
              refreshKey={historyVersion}
              onSelectDay={handleSelectDay}
            />
          </>
        )}
      </div>
    </main>
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

function formatMood(mood: string) {
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