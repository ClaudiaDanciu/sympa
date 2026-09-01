import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./SymptomTracker.css";

const API = "http://127.0.0.1:8000";

type Symptom = {
  id: number;
  symptom: string;
  severity: number | null;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

export function SymptomTracker() {
  const [items, setItems] = useState<Symptom[]>([]);
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState(5);
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadSymptoms() {
    setError("");

    try {
      const response = await fetch(`${API}/symptoms`);

      if (!response.ok) {
        throw new Error("Could not load symptoms.");
      }

      setItems(await response.json());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSymptoms();
  }, []);

  async function addSymptom(event: FormEvent) {
    event.preventDefault();

    if (!symptom.trim()) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API}/symptoms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symptom: symptom.trim(),
          severity,
          note: note.trim() || null,
          occurred_at: new Date(occurredAt).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save symptom.");
      }

      setSymptom("");
      setSeverity(5);
      setNote("");

      const now = new Date();
      const local = new Date(
        now.getTime() - now.getTimezoneOffset() * 60_000
      );
      setOccurredAt(local.toISOString().slice(0, 16));

      await loadSymptoms();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="symptom-tracker">
      <div className="symptom-tracker__header">
        <div>
          <p className="symptom-tracker__eyebrow">Symptoms</p>
          <h2>Log what you notice</h2>
          <p className="symptom-tracker__muted">
            Record symptoms and their intensity so SYMPA can later look for
            non-causal patterns across sleep, meals, medications, meetings,
            and check-ins.
          </p>
        </div>
      </div>

      <form
        className="symptom-tracker__form"
        onSubmit={addSymptom}
      >
        <div className="symptom-tracker__field">
          <label htmlFor="symptom-name">Symptom</label>
          <input
            id="symptom-name"
            value={symptom}
            onChange={(event) => setSymptom(event.target.value)}
            placeholder="e.g. Headache"
            required
          />
        </div>

        <div className="symptom-tracker__field">
          <label htmlFor="symptom-severity">
            Severity: {severity}/10
          </label>
          <input
            id="symptom-severity"
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(event) => setSeverity(Number(event.target.value))}
          />
        </div>

        <div className="symptom-tracker__field">
          <label htmlFor="symptom-occurred-at">When</label>
          <input
            id="symptom-occurred-at"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
          />
        </div>

        <div className="symptom-tracker__field symptom-tracker__field--wide">
          <label htmlFor="symptom-note">Note</label>
          <input
            id="symptom-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything else worth remembering?"
          />
        </div>

        <button
          className="symptom-tracker__primary"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving…" : "Log symptom"}
        </button>
      </form>

      {error && (
        <div className="symptom-tracker__error">
          {error}
        </div>
      )}

      <div className="symptom-tracker__history">
        <div className="symptom-tracker__section-title">
          <h3>Recent symptoms</h3>
        </div>

        {loading ? (
          <p className="symptom-tracker__muted">Loading symptoms…</p>
        ) : items.length === 0 ? (
          <div className="symptom-tracker__empty">
            <strong>No symptoms logged yet.</strong>
            <p>Your recent symptom history will appear here.</p>
          </div>
        ) : (
          <div className="symptom-tracker__list">
            {items.map((item) => (
              <article
                className="symptom-card"
                key={item.id}
              >
                <div className="symptom-card__top">
                  <div>
                    <h4>{item.symptom}</h4>
                    <time>
                      {new Date(item.occurred_at).toLocaleString()}
                    </time>
                  </div>

                  {item.severity !== null && (
                    <span className="symptom-card__severity">
                      {item.severity}/10
                    </span>
                  )}
                </div>

                {item.note && (
                  <p className="symptom-card__note">
                    {item.note}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
