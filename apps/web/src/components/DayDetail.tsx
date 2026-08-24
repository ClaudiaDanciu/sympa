import { useEffect, useState } from "react";

type DailyCheckIn = {
  id: number;
  sleep_hours: number;
  energy: number;
  mood: string;
  stress: number;
  focus: number;
  exercise_minutes: number;
  social_energy: number | null;
  notes: string | null;
  created_at: string;
};

type DailySummary = {
  average_energy: number | null;
  average_stress: number | null;
  average_focus: number | null;
  average_social_energy: number | null;
  total_exercise_minutes: number;
  dominant_mood: string | null;
  sleep_hours: number | null;
};

type DailyCheckInDayResponse = {
  date: string;
  entry_count: number;
  summary: DailySummary;
  entries: DailyCheckIn[];
};

type DayDetailProps = {
  date: string;
  onBack: () => void;
};

export function DayDetail({
  date,
  onBack,
}: DayDetailProps) {
  const [day, setDay] = useState<DailyCheckInDayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDay() {
      setLoading(true);

      try {
        const timezoneOffset = -new Date().getTimezoneOffset();

        const response = await fetch(
          `http://127.0.0.1:8000/check-ins/day?date=${date}&timezone_offset=${timezoneOffset}`
        );

        if (!response.ok) {
          throw new Error("Unable to load day");
        }

        const data: DailyCheckInDayResponse = await response.json();
        setDay(data);
      } catch (error) {
        console.error("Unable to load day:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDay();
  }, [date]);

  if (loading) {
    return (
      <section className="day-detail">
        <p>Loading day...</p>
      </section>
    );
  }

  if (!day) {
    return (
      <section className="day-detail">
        <button className="history-link" onClick={onBack}>
          ← Back
        </button>
        <p>Unable to load this day.</p>
      </section>
    );
  }

  return (
    <section className="day-detail">
      <button className="history-link day-back" onClick={onBack}>
        ← Back to history
      </button>

      <div className="day-detail-heading">
        <p className="eyebrow">Daily summary</p>
        <h2>{formatDay(day.date)}</h2>
        <p>
          {day.entry_count}{" "}
          {day.entry_count === 1 ? "check-in" : "check-ins"} recorded
        </p>
      </div>

      <div className="day-summary-grid">
        <DayMetric
          label="Mood"
          value={
            day.summary.dominant_mood
              ? formatMood(day.summary.dominant_mood)
              : "—"
          }
        />

        <DayMetric
          label="Energy"
          value={formatScore(day.summary.average_energy)}
        />

        <DayMetric
          label="Stress"
          value={formatScore(day.summary.average_stress)}
        />

        <DayMetric
          label="Focus"
          value={formatScore(day.summary.average_focus)}
        />

        <DayMetric
          label="Sleep"
          value={
            day.summary.sleep_hours !== null
              ? `${day.summary.sleep_hours} h`
              : "—"
          }
        />

        <DayMetric
          label="Movement"
          value={`${day.summary.total_exercise_minutes} min`}
        />

        <DayMetric
          label="Social energy"
          value={formatScore(day.summary.average_social_energy)}
        />
      </div>

      <div className="timeline-section">
        <div className="section-heading">
          <p className="eyebrow">Timeline</p>
          <h3>How the day unfolded</h3>
        </div>

        <div className="timeline-list">
          {day.entries.map((entry) => (
            <article className="timeline-entry" key={entry.id}>
              <div className="timeline-time">
                {formatTime(entry.created_at)}
              </div>

              <div className="timeline-content">
                <div className="timeline-topline">
                  <strong>{formatMood(entry.mood)}</strong>
                  <span>
                    Energy {entry.energy}/10 · Stress {entry.stress}/10
                  </span>
                </div>

                <div className="timeline-secondary">
                  Focus {entry.focus}/10 · Social{" "}
                  {entry.social_energy !== null
                    ? `${entry.social_energy}/10`
                    : "—"}{" "}
                  · Movement {entry.exercise_minutes} min
                </div>

                {entry.notes && (
                  <p className="timeline-note">{entry.notes}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DayMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="day-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatScore(value: number | null) {
  return value !== null ? `${value}/10` : "—";
}

function formatMood(mood: string) {
  return mood
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}