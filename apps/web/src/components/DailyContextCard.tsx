import type { DailyContextData } from "./DailyContext";
import "./DailyContextCard.css";

type DailyContextCardProps = {
  context: DailyContextData | null;
  sleepHours: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onSleepHoursChange: (value: number) => void;
  onSave: () => void;
};

export function DailyContextCard({
  context,
  sleepHours,
  loading,
  saving,
  error,
  onSleepHoursChange,
  onSave,
}: DailyContextCardProps) {
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
                onSleepHoursChange(
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
          onClick={onSave}
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