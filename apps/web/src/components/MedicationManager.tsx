import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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

type MedicationGuidanceItem = {
  id: number;
  rule_type:
    | "medication_medication"
    | "medication_food"
    | "medication_supplement"
    | "medication_timing"
    | string;
  subject_a: string;
  subject_b: string;
  severity: string;
  message: string;
  source_name: string;
  source_url: string | null;
  source_updated_at: string | null;
};

type MedicationGuidanceResponse = {
  active_medications: Array<{
    id: number;
    name: string;
    dosage: string | null;
  }>;
  guidance: MedicationGuidanceItem[];
  disclaimer: string;
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

function guidanceTypeLabel(ruleType: string) {
  if (ruleType === "medication_medication") {
    return "Medication interaction";
  }

  if (ruleType === "medication_food") {
    return "Food consideration";
  }

  if (ruleType === "medication_supplement") {
    return "Supplement consideration";
  }

  if (ruleType === "medication_timing") {
    return "Timing consideration";
  }

  return "Safety consideration";
}

function guidanceSeverityClass(severity: string) {
  const normalized = severity.trim().toLowerCase();

  if (
    normalized === "high" ||
    normalized === "severe" ||
    normalized === "critical"
  ) {
    return "medication-guidance-card--high";
  }

  if (
    normalized === "warning" ||
    normalized === "moderate" ||
    normalized === "medium"
  ) {
    return "medication-guidance-card--warning";
  }

  return "medication-guidance-card--info";
}

function formatSourceDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MedicationManager() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<
    Record<number, MedicationSchedule[]>
  >({});
  const [recentLogs, setRecentLogs] = useState<MedicationLog[]>([]);
  const [guidance, setGuidance] =
    useState<MedicationGuidanceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [guidanceLoading, setGuidanceLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [guidanceError, setGuidanceError] = useState("");

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scheduleTimes, setScheduleTimes] = useState<
    Record<number, string>
  >({});

  const logByMedication = useMemo(() => {
    const map: Record<number, MedicationLog | undefined> = {};

    for (const log of recentLogs) {
      if (!map[log.medication_id]) {
        map[log.medication_id] = log;
      }
    }

    return map;
  }, [recentLogs]);

  async function loadGuidance() {
    setGuidanceLoading(true);
    setGuidanceError("");

    try {
      const response = await fetch(
        `${API}/safety/medication-guidance`
      );

      if (!response.ok) {
        throw new Error(
          "Could not load medication safety guidance."
        );
      }

      const data: MedicationGuidanceResponse =
        await response.json();

      setGuidance(data);
    } catch (err) {
      setGuidanceError(
        err instanceof Error
          ? err.message
          : "Could not load medication safety guidance."
      );
    } finally {
      setGuidanceLoading(false);
    }
  }

  async function loadData() {
    setError("");

    try {
      const [medicationsResponse, logsResponse] =
        await Promise.all([
          fetch(`${API}/medications`),
          fetch(`${API}/medications/logs/recent`),
        ]);

      if (!medicationsResponse.ok) {
        throw new Error("Could not load medications.");
      }

      const medicationData: Medication[] =
        await medicationsResponse.json();

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
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshMedicationArea() {
    await Promise.all([loadData(), loadGuidance()]);
  }

  useEffect(() => {
    void refreshMedicationArea();
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

      await refreshMedicationArea();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
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
          <p className="medication-manager__eyebrow">
            Medications
          </p>

          <h2>Your medication routine</h2>

          <p className="medication-manager__muted">
            Track what you take and when. Verified medication
            guidance appears below when SYMPA finds a matching
            safety rule with source provenance.
          </p>
        </div>
      </div>

      <form
        className="medication-manager__form"
        onSubmit={addMedication}
      >
        <div className="medication-manager__field">
          <label htmlFor="medication-name">
            Medication
          </label>

          <input
            id="medication-name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Metformin"
            required
          />
        </div>

        <div className="medication-manager__field">
          <label htmlFor="medication-dosage">
            Dosage
          </label>

          <input
            id="medication-dosage"
            value={dosage}
            onChange={(event) =>
              setDosage(event.target.value)
            }
            placeholder="e.g. 500 mg"
          />
        </div>

        <div className="medication-manager__field medication-manager__field--wide">
          <label htmlFor="medication-instructions">
            Instructions
          </label>

          <input
            id="medication-instructions"
            value={instructions}
            onChange={(event) =>
              setInstructions(event.target.value)
            }
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

            const lastLog =
              logByMedication[medication.id];

            return (
              <article
                className="medication-card"
                key={medication.id}
              >
                <div className="medication-card__top">
                  <div>
                    <h3>{medication.name}</h3>

                    <p>
                      {medication.dosage ||
                        "Dosage not added"}
                    </p>

                    {medication.instructions && (
                      <small>
                        {medication.instructions}
                      </small>
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
                      {medicationSchedules.map(
                        (schedule) => (
                          <span
                            className="medication-time"
                            key={schedule.id}
                          >
                            {formatTime(
                              schedule.time_of_day
                            )}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="medication-manager__muted">
                      No reminder time yet.
                    </p>
                  )}

                  <div className="medication-card__add-time">
                    <input
                      type="time"
                      value={
                        scheduleTimes[
                          medication.id
                        ] ?? ""
                      }
                      onChange={(event) =>
                        setScheduleTimes(
                          (current) => ({
                            ...current,
                            [medication.id]:
                              event.target.value,
                          })
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        addSchedule(medication.id)
                      }
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
                      logAction(
                        medication.id,
                        "taken"
                      )
                    }
                  >
                    Taken
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      logAction(
                        medication.id,
                        "snoozed"
                      )
                    }
                  >
                    Snooze 30 min
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      logAction(
                        medication.id,
                        "skipped"
                      )
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

      <section className="medication-guidance">
        <div className="medication-guidance__header">
          <div>
            <p className="medication-manager__eyebrow">
              Safety guidance
            </p>

            <h3>Medication considerations</h3>

            <p className="medication-manager__muted">
              SYMPA only shows guidance stored in the verified
              safety-rule database. It does not generate
              medication interaction advice itself.
            </p>
          </div>
        </div>

        {guidanceLoading ? (
          <p className="medication-manager__muted">
            Checking verified guidance…
          </p>
        ) : guidanceError ? (
          <div className="medication-manager__error">
            {guidanceError}
          </div>
        ) : guidance &&
          guidance.guidance.length > 0 ? (
          <div className="medication-guidance__list">
            {guidance.guidance.map((item) => {
              const sourceDate = formatSourceDate(
                item.source_updated_at
              );

              return (
                <article
                  className={`medication-guidance-card ${guidanceSeverityClass(
                    item.severity
                  )}`}
                  key={item.id}
                >
                  <div className="medication-guidance-card__top">
                    <div>
                      <p className="medication-guidance-card__type">
                        {guidanceTypeLabel(
                          item.rule_type
                        )}
                      </p>

                      <h4>
                        {item.subject_a} +{" "}
                        {item.subject_b}
                      </h4>
                    </div>

                    <span className="medication-guidance-card__severity">
                      {item.severity}
                    </span>
                  </div>

                  <p className="medication-guidance-card__message">
                    {item.message}
                  </p>

                  <div className="medication-guidance-card__source">
                    <span>
                      Source: {item.source_name}
                      {sourceDate
                        ? ` · updated ${sourceDate}`
                        : ""}
                    </span>

                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View source
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="medication-guidance__empty">
            <strong>
              No matching verified guidance found.
            </strong>

            <p>
              That does not mean there are no possible
              interactions. It only means SYMPA does not
              currently have a matching verified rule stored
              for the active medications.
            </p>
          </div>
        )}

        {guidance?.disclaimer && (
          <p className="medication-guidance__disclaimer">
            {guidance.disclaimer}
          </p>
        )}
      </section>
    </section>
  );
}
