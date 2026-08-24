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

type CheckInHistoryProps = {
  refreshKey: number;
};

export function CheckInHistory({
  refreshKey,
}: CheckInHistoryProps) {
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function loadHistory() {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/check-ins"
      );

      if (!response.ok) {
        throw new Error("Unable to load check-in history");
      }

      const data: DailyCheckIn[] = await response.json();
      setCheckIns(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  void loadHistory();
}, [refreshKey]);

  if (loading) {
    return <p>Loading history...</p>;
  }

  if (checkIns.length === 0) {
    return (
      <section className="card">
        <p>No check-ins yet.</p>
      </section>
    );
  }

  return (
    <section className="history-section">
      <div className="section-heading">
        <p className="eyebrow">Your journey</p>
        <h2>Recent check-ins</h2>
      </div>

      <div className="history-list">
        {checkIns.map((checkIn) => (
          <article className="history-card" key={checkIn.id}>
            <div className="history-date">
              {formatDate(checkIn.created_at)}
            </div>

            <div className="history-metrics">
              <HistoryMetric
                label="Mood"
                value={formatMood(checkIn.mood)}
              />

              <HistoryMetric
                label="Energy"
                value={`${checkIn.energy}/10`}
              />

              <HistoryMetric
                label="Sleep"
                value={`${checkIn.sleep_hours}h`}
              />

              <HistoryMetric
                label="Stress"
                value={`${checkIn.stress}/10`}
              />
            </div>

            {checkIn.notes && (
              <p className="history-note">{checkIn.notes}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function HistoryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMood(mood: string) {
  return mood
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}