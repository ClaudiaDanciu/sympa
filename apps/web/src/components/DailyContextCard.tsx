import { useEffect, useState } from "react";
import "./DailyContextCard.css";

type DailyContext = {
  id: number;
  context_date: string;
  sleep_hours: number | null;
  created_at: string;
  updated_at: string;
};

type DailyContextCardProps = {
  refreshKey: number;
};

export function DailyContextCard({
  refreshKey,
}: DailyContextCardProps) {
  const [context, setContext] =
    useState<DailyContext | null>(null);

  const [sleepHours, setSleepHours] =
    useState<number>(7);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      setLoading(true);
      setError(null);

      try {
        const timezoneOffset =
          -new Date().getTimezoneOffset();

        const response = await fetch(
          `http://127.0.0.1:8000/daily-contexts/today?timezone_offset=${timezoneOffset}`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load today's context"
          );
        }

        const data: DailyContext | null =
          await response.json();

        setContext(data);

        if (data?.sleep_hours !== null &&
            data?.sleep_hours !== undefined) {
          setSleepHours(data.sleep_hours);
        }
      } catch (error) {
        console.error(
          "Unable to load daily context:",
          error
        );

        setError(
          "Unable to load today's sleep."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadContext();
  }, [refreshKey]);

  async function saveSleep() {
    setSaving(true);
    setError(null);

    try {
      const timezoneOffset =
        -new Date().getTimezoneOffset();

      const response = await fetch(
        `http://127.0.0.1:8000/daily-contexts/today?timezone_offset=${timezoneOffset}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sleep_hours: sleepHours,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to save today's sleep"
        );
      }

      const data: DailyContext =
        await response.json();

      setContext(data);
    } catch (error) {
      console.error(
        "Unable to save daily context:",
        error
      );

      setError(
        "Unable to save sleep. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="daily-context-card">
        <p>Loading today's context...</p>
      </section>
    );
  }

  return (
    <section className="daily-context-card">
      <div className="daily-context-header">
        <div>
          <p className="eyebrow">
            Today's context
          </p>

          <h2>Last night's sleep</h2>

          <p className="daily-context-description">
            Add this once for the day. Your
            check-ins will use it as context.
          </p>
        </div>

        {context && (
          <span className="daily-context-saved">
            Saved
          </span>
        )}
      </div>

      <div className="daily-context-controls">
        <label className="daily-context-field">
          <span>Sleep</span>

          <div className="daily-context-input">
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={sleepHours}
              onChange={(event) =>
                setSleepHours(
                  Number(event.target.value)
                )
              }
            />

            <span>hours</span>
          </div>
        </label>

        <button
          type="button"
          className="primary-button"
          onClick={saveSleep}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : context
              ? "Update sleep"
              : "Save sleep"}
        </button>
      </div>

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}