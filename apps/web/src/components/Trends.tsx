import { useEffect, useState } from "react";
import "./Trends.css";

type DailySummary = {
  average_energy: number | null;
  average_stress: number | null;
  average_focus: number | null;
  average_social_energy: number | null;
  total_exercise_minutes: number;
  dominant_mood: string | null;
  sleep_hours: number | null;
};

type DailySummaryItem = {
  date: string;
  entry_count: number;
  summary: DailySummary;
};

type TrendsProps = {
  refreshKey: number;
};

type TrendCardProps = {
  title: string;
  days: DailySummaryItem[];
  getValue: (day: DailySummaryItem) => number | null;
  suffix: string;
  maxValue: number;
};

export function Trends({
  refreshKey,
}: TrendsProps) {
  const [days, setDays] = useState<DailySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadTrends() {
      setLoading(true);
      setError(false);

      try {
        const timezoneOffset =
          -new Date().getTimezoneOffset();

        const response = await fetch(
          `http://127.0.0.1:8000/check-ins/days?timezone_offset=${timezoneOffset}`
        );

        if (!response.ok) {
          throw new Error("Unable to load trends");
        }

        const data: DailySummaryItem[] =
          await response.json();

        setDays(data.slice(0, 7).reverse());
      } catch (error) {
        console.error("Unable to load trends:", error);

        setError(true);
        setDays([]);
      } finally {
        setLoading(false);
      }
    }

    void loadTrends();
  }, [refreshKey]);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <section className="trends-section">
        <div className="section-heading">
          <p className="eyebrow">Recent trends</p>
          <h2>Unable to load trends</h2>
        </div>

        <div className="card">
          <p>
            Recent trend data could not be loaded.
            Please try again shortly.
          </p>
        </div>
      </section>
    );
  }

  if (days.length < 2) {
    return null;
  }

  return (
    <section className="trends-section">
      <div className="section-heading">
        <p className="eyebrow">Recent trends</p>

        <h2>
          Your last {days.length} recorded days
        </h2>
      </div>

      <div className="trend-grid">
  <TrendCard
    title="Energy"
    days={days}
    getValue={(day) =>
      day.summary.average_energy
    }
    suffix="/10"
    maxValue={10}
  />

  <TrendCard
    title="Stress"
    days={days}
    getValue={(day) =>
      day.summary.average_stress
    }
    suffix="/10"
    maxValue={10}
  />

  <TrendCard
    title="Focus"
    days={days}
    getValue={(day) =>
      day.summary.average_focus
    }
    suffix="/10"
    maxValue={10}
  />

  <TrendCard
    title="Sleep"
    days={days}
    getValue={(day) =>
      day.summary.sleep_hours
    }
    suffix=" h"
    maxValue={12}
  />

  <TrendCard
    title="Movement"
    days={days}
    getValue={(day) =>
      day.summary.total_exercise_minutes
    }
    suffix=" min"
    maxValue={180}
  />

  <TrendCard
    title="Social energy"
    days={days}
    getValue={(day) =>
      day.summary.average_social_energy
    }
    suffix="/10"
    maxValue={10}
  />
</div>
    </section>
  );
}

function TrendCard({
  title,
  days,
  getValue,
  suffix,
  maxValue,
}: TrendCardProps) {
  return (
    <article className="trend-card">
      <h3>{title}</h3>

      <div className="trend-values">
        {days.map((day) => {
          const value = getValue(day);

          const percentage =
            value === null
              ? 0
              : Math.min(
                  Math.max((value / maxValue) * 100, 0),
                  100
                );

          return (
            <div
              className="trend-row"
              key={day.date}
            >
              <div className="trend-row-top">
                <span>
                  {formatShortDate(day.date)}
                </span>

                <strong>
                  {value !== null
                    ? `${formatValue(value)}${suffix}`
                    : "—"}
                </strong>
              </div>

              <div
                className="trend-track"
                role="progressbar"
                aria-label={`${title} on ${formatShortDate(day.date)}`}
                aria-valuemin={0}
                aria-valuemax={maxValue}
                aria-valuenow={value ?? 0}
              >
                <div
                  className="trend-fill"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function formatValue(value: number) {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(1);
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}