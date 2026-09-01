import { FormEvent, useEffect, useMemo, useState } from "react";
import "./MedicationManager.css";

const API = "http://127.0.0.1:8000";

type Medication = {
  id: number;
  name: string;
  dosage: string | null;
  instructions: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type MedicationSchedule = {
  id: number;
  medication_id: number;
  time_of_day: string;
  days_of_week: string;
  reminder_enabled: boolean;
};

type MedicationLog = {
  id: number;
  medication_id: number;
  scheduled_for: string | null;
  action: "taken" | "skipped" | "snoozed";
  taken_at: string | null;
  snoozed_until: string | null;
  note: string | null;
  created_at: string;
};

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourText), Number(minuteText), 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MedicationManager() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Record<number, MedicationSchedule[]>>({});
  const [recentLogs, setRecentLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scheduleTimes, setScheduleTimes] = useState<Record<number, string>>({});

  const logByMedication = useMemo(() => {
    const map: Record<number, MedicationLog | undefined> = {};

    for (const log of recentLogs) {
      if (!map[log.medication_id]) {
        map[log.medication_id] = log;
      }
    }

    return map;
  }, [recentLogs]);

  async function loadData() {
    setError("");

    try {
      const [medicationsResponse, logsResponse] = await Promise.all([
        fetch(`${API}/medications`),
        fetch(`${API}/medications/logs/recent`),
      ]);

      if (!medicationsResponse.ok) {
        throw new Error("Could not load medications.");
      }

      const medicationData: Medication[] = await medicationsResponse.json();
      setMedications(medicationData);

      if (logsResponse.ok) {
        setRecentLogs(await logsResponse.json());
      }

      const scheduleEntries = await Promise.all(
        medicationData.map(async (medication) => {
          const response = await fetch(
            `${API}/medications/${medication.id}/schedules`
          );

          const data: MedicationSchedule[] = response.ok
            ? await response.json()
            : [];

          return [medication.id, data] as const;
        })
      );

      setSchedules(Object.fromEntries(scheduleEntries));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addMedication(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API}/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          dosage: dosage.trim() || null,
          instructions: instructions.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save medication.");
      }

      setName("");
      setDosage("");
      setInstructions("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addSchedule(medicationId: number) {
    const time = scheduleTimes[medicationId];

    if (!time) return;

    setError("");

    const response = await fetch(
      `${API}/medications/${medicationId}/schedules`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time_of_day: time,
          days_of_week: "0,1,2,3,4,5,6",
          reminder_enabled: true,
        }),
      }
    );

    if (!response.ok) {
      setError("Could not add reminder time.");
      return;
    }

    setScheduleTimes((current) => ({
      ...current,
      [medicationId]: "",
    }));

    await loadData();
  }

  async function logAction(
    medicationId: number,
    action: "taken" | "skipped" | "snoozed"
  ) {
    setError("");

    const body: Record<string, string | null> = {
      action,
      scheduled_for: null,
      taken_at: null,
      snoozed_until: null,
      note: null,
    };

    if (action === "snoozed") {
      body.snoozed_until = new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString();
    }

    const response = await fetch(
      `${API}/medications/${medicationId}/logs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      setError(`Could not mark medication as ${action}.`);
      return;
    }

    await loadData();
  }

  return (
    <section className="medication-manager">
      <div className="medication-manager__header">
        <div>
          <p className="medication-manager__eyebrow">Medications</p>
          <h2>Your medication routine</h2>
          <p className="medication-manager__muted">
            Track what you take and when. Safety information is shown
            separately and should always be verified with a clinician or
            pharmacist.
          </p>
        </div>
      </div>

      <form
        className="medication-manager__form"
        onSubmit={addMedication}
      >
        <div className="medication-manager__field">
          <label htmlFor="medication-name">Medication</label>
          <input
            id="medication-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Metformin"
            required
          />
        </div>

        <div className="medication-manager__field">
          <label htmlFor="medication-dosage">Dosage</label>
          <input
            id="medication-dosage"
            value={dosage}
            onChange={(event) => setDosage(event.target.value)}
            placeholder="e.g. 500 mg"
          />
        </div>

        <div className="medication-manager__field medication-manager__field--wide">
          <label htmlFor="medication-instructions">Instructions</label>
          <input
            id="medication-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="e.g. Take with food"
          />
        </div>

        <button
          className="medication-manager__primary"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving…" : "Add medication"}
        </button>
      </form>

      {error && (
        <div className="medication-manager__error">
          {error}
        </div>
      )}

      {loading ? (
        <p className="medication-manager__muted">
          Loading medications…
        </p>
      ) : medications.length === 0 ? (
        <div className="medication-manager__empty">
          <strong>No medications yet.</strong>
          <p>Add your first medication above.</p>
        </div>
      ) : (
        <div className="medication-manager__list">
          {medications.map((medication) => {
            const medicationSchedules =
              schedules[medication.id] ?? [];
            const lastLog = logByMedication[medication.id];

            return (
              <article
                className="medication-card"
                key={medication.id}
              >
                <div className="medication-card__top">
                  <div>
                    <h3>{medication.name}</h3>
                    <p>
                      {medication.dosage || "Dosage not added"}
                    </p>
                    {medication.instructions && (
                      <small>{medication.instructions}</small>
                    )}
                  </div>

                  {lastLog && (
                    <span
                      className={`medication-status medication-status--${lastLog.action}`}
                    >
                      {lastLog.action}
                    </span>
                  )}
                </div>

                <div className="medication-card__schedule">
                  <strong>Reminder times</strong>

                  {medicationSchedules.length > 0 ? (
                    <div className="medication-card__times">
                      {medicationSchedules.map((schedule) => (
                        <span
                          className="medication-time"
                          key={schedule.id}
                        >
                          {formatTime(schedule.time_of_day)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="medication-manager__muted">
                      No reminder time yet.
                    </p>
                  )}

                  <div className="medication-card__add-time">
                    <input
                      type="time"
                      value={scheduleTimes[medication.id] ?? ""}
                      onChange={(event) =>
                        setScheduleTimes((current) => ({
                          ...current,
                          [medication.id]: event.target.value,
                        }))
                      }
                    />

                    <button
                      type="button"
                      onClick={() => addSchedule(medication.id)}
                    >
                      Add time
                    </button>
                  </div>
                </div>

                <div className="medication-card__actions">
                  <button
                    className="medication-manager__primary"
                    type="button"
                    onClick={() =>
                      logAction(medication.id, "taken")
                    }
                  >
                    Taken
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      logAction(medication.id, "snoozed")
                    }
                  >
                    Snooze 30 min
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      logAction(medication.id, "skipped")
                    }
                  >
                    Skip
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
