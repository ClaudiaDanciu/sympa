import { useEffect, useMemo, useState } from "react";
import "./HealthReport.css";

const API = "http://127.0.0.1:8000";

type MedicationSummary = {
  name: string;
  dosage: string | null;
  instructions: string | null;
};

type HealthSummary = {
  period_days: number;
  active_medications: MedicationSummary[];
  medication_log_counts: Record<string, number>;
  symptom_counts: Record<string, number>;
  meal_count: number;
  note: string;
};

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function HealthReport() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport(selectedDays = days) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/reports/health-summary?days=${selectedDays}`
      );

      if (!response.ok) {
        throw new Error("Could not load health report.");
      }

      setReport(await response.json());
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

  useEffect(() => {
    loadReport(days);
  }, [days]);

  const medicationActions = useMemo(
    () => Object.entries(report?.medication_log_counts ?? {}),
    [report]
  );

  const symptoms = useMemo(
    () =>
      Object.entries(report?.symptom_counts ?? {}).sort(
        (a, b) => b[1] - a[1]
      ),
    [report]
  );

  return (
    <section className="health-report">
      <div className="health-report__header">
        <div>
          <p className="health-report__eyebrow">
            Report
          </p>

          <h2>Health summary</h2>

          <p className="health-report__muted">
            A simple summary of information you recorded in SYMPA.
          </p>
        </div>

        <label className="health-report__range">
          <span>Period</span>

          <select
            value={days}
            onChange={(event) =>
              setDays(Number(event.target.value))
            }
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="health-report__error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="health-report__panel">
          <p className="health-report__muted">
            Loading report...
          </p>
        </div>
      ) : !report ? (
        <div className="health-report__panel">
          <p className="health-report__muted">
            No report available.
          </p>
        </div>
      ) : (
        <>
          <div className="health-report__stats">
            <article className="report-stat">
              <span>Period</span>
              <strong>{report.period_days} days</strong>
            </article>

            <article className="report-stat">
              <span>Active medications</span>
              <strong>
                {report.active_medications.length}
              </strong>
            </article>

            <article className="report-stat">
              <span>Meals logged</span>
              <strong>{report.meal_count}</strong>
            </article>

            <article className="report-stat">
              <span>Symptoms logged</span>
              <strong>
                {Object.values(
                  report.symptom_counts
                ).reduce(
                  (total, count) => total + count,
                  0
                )}
              </strong>
            </article>
          </div>

          <section className="health-report__panel">
            <div className="health-report__section-heading">
              <div>
                <p className="health-report__eyebrow">
                  Medications
                </p>

                <h3>Active medications</h3>
              </div>
            </div>

            {report.active_medications.length === 0 ? (
              <p className="health-report__muted">
                No active medications recorded.
              </p>
            ) : (
              <div className="report-list">
                {report.active_medications.map(
                  (medication, index) => (
                    <article
                      className="report-list__item"
                      key={`${medication.name}-${index}`}
                    >
                      <strong>{medication.name}</strong>

                      {medication.dosage && (
                        <span>{medication.dosage}</span>
                      )}

                      {medication.instructions && (
                        <p>
                          {medication.instructions}
                        </p>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <section className="health-report__panel">
            <div className="health-report__section-heading">
              <div>
                <p className="health-report__eyebrow">
                  Medication activity
                </p>

                <h3>Recorded actions</h3>
              </div>
            </div>

            {medicationActions.length === 0 ? (
              <p className="health-report__muted">
                No medication activity in this period.
              </p>
            ) : (
              <div className="report-chip-list">
                {medicationActions.map(
                  ([action, count]) => (
                    <div
                      className="report-chip"
                      key={action}
                    >
                      <span>{titleCase(action)}</span>
                      <strong>{count}</strong>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <section className="health-report__panel">
            <div className="health-report__section-heading">
              <div>
                <p className="health-report__eyebrow">
                  Symptoms
                </p>

                <h3>Most recorded symptoms</h3>
              </div>
            </div>

            {symptoms.length === 0 ? (
              <p className="health-report__muted">
                No symptoms recorded in this period.
              </p>
            ) : (
              <div className="report-list">
                {symptoms.map(([symptom, count]) => (
                  <article
                    className="report-list__item report-list__item--row"
                    key={symptom}
                  >
                    <strong>{symptom}</strong>
                    <span>{count}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="health-report__notice">
            <strong>Important</strong>
            <p>{report.note}</p>
          </div>
        </>
      )}
    </section>
  );
}
