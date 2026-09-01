import { type FormEvent, useEffect, useMemo, useState } from "react";
import "./SafetyCenter.css";

const API = "http://127.0.0.1:8000";

type Allergy = {
  id: number;
  substance: string;
  reaction: string | null;
  severity: string | null;
  created_at: string;
};

type SafetyRule = {
  id: number;
  rule_type: string;
  subject_a: string;
  subject_b: string;
  severity: string;
  message: string;
  source_name: string;
  source_url: string | null;
  source_updated_at: string | null;
  created_at: string;
};

function severityClass(value: string | null) {
  const normalized = (value || "info").toLowerCase();

  if (["high", "severe", "critical", "danger"].includes(normalized)) {
    return "safety-badge--high";
  }

  if (["medium", "moderate", "warning"].includes(normalized)) {
    return "safety-badge--medium";
  }

  return "safety-badge--info";
}

export function SafetyCenter() {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [rules, setRules] = useState<SafetyRule[]>([]);
  const [substance, setSubstance] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");

    try {
      const [allergyResponse, rulesResponse] = await Promise.all([
        fetch(`${API}/safety/allergies`),
        fetch(`${API}/safety/rules`),
      ]);

      if (!allergyResponse.ok) {
        throw new Error("Could not load allergies.");
      }

      if (!rulesResponse.ok) {
        throw new Error("Could not load safety rules.");
      }

      setAllergies(await allergyResponse.json());
      setRules(await rulesResponse.json());
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

  async function addAllergy(event: FormEvent) {
    event.preventDefault();

    if (!substance.trim()) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API}/safety/allergies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          substance: substance.trim(),
          reaction: reaction.trim() || null,
          severity: severity || null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);

        throw new Error(
          body?.detail || "Could not save allergy."
        );
      }

      setSubstance("");
      setReaction("");
      setSeverity("moderate");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeAllergy(id: number) {
    setError("");

    const response = await fetch(`${API}/safety/allergies/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Could not remove allergy.");
      return;
    }

    await loadData();
  }

  const visibleRules = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return rules;

    return rules.filter((rule) =>
      [
        rule.subject_a,
        rule.subject_b,
        rule.message,
        rule.rule_type,
        rule.source_name,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [rules, search]);

  return (
    <section className="safety-center">
      <div className="safety-center__header">
        <div>
          <p className="safety-center__eyebrow">Safety</p>
          <h2>Allergies and verified safety information</h2>
          <p className="safety-center__muted">
            SYMPA should only show medication or food safety warnings from
            verified rules that include their source. This screen does not
            diagnose conditions or invent interaction claims.
          </p>
        </div>
      </div>

      <section className="safety-panel">
        <div className="safety-panel__heading">
          <div>
            <h3>Allergies</h3>
            <p className="safety-center__muted">
              Record substances you want SYMPA to flag during future meal
              and safety checks.
            </p>
          </div>
        </div>

        <form className="safety-form" onSubmit={addAllergy}>
          <div className="safety-field">
            <label htmlFor="allergy-substance">Substance</label>
            <input
              id="allergy-substance"
              value={substance}
              onChange={(event) => setSubstance(event.target.value)}
              placeholder="e.g. Peanuts"
              required
            />
          </div>

          <div className="safety-field">
            <label htmlFor="allergy-reaction">Reaction</label>
            <input
              id="allergy-reaction"
              value={reaction}
              onChange={(event) => setReaction(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="safety-field">
            <label htmlFor="allergy-severity">Severity</label>
            <select
              id="allergy-severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>

          <button
            className="safety-center__primary"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving…" : "Add allergy"}
          </button>
        </form>

        {allergies.length === 0 ? (
          <div className="safety-empty">
            No allergies recorded.
          </div>
        ) : (
          <div className="allergy-list">
            {allergies.map((allergy) => (
              <article className="allergy-card" key={allergy.id}>
                <div>
                  <div className="allergy-card__title">
                    <strong>{allergy.substance}</strong>
                    <span
                      className={`safety-badge ${severityClass(
                        allergy.severity
                      )}`}
                    >
                      {allergy.severity || "unspecified"}
                    </span>
                  </div>

                  {allergy.reaction && (
                    <p>{allergy.reaction}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeAllergy(allergy.id)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="safety-panel">
        <div className="safety-panel__heading safety-panel__heading--rules">
          <div>
            <h3>Verified safety rules</h3>
            <p className="safety-center__muted">
              Rules appear here only after they have been added to SYMPA with
              source provenance.
            </p>
          </div>

          <input
            className="safety-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search medication, food, or source"
          />
        </div>

        {error && (
          <div className="safety-center__error">
            {error}
          </div>
        )}

        {loading ? (
          <p className="safety-center__muted">Loading safety data…</p>
        ) : visibleRules.length === 0 ? (
          <div className="safety-empty">
            No verified safety rules are stored yet.
          </div>
        ) : (
          <div className="safety-rule-list">
            {visibleRules.map((rule) => (
              <article className="safety-rule-card" key={rule.id}>
                <div className="safety-rule-card__top">
                  <span
                    className={`safety-badge ${severityClass(rule.severity)}`}
                  >
                    {rule.severity}
                  </span>

                  <span className="safety-rule-card__type">
                    {rule.rule_type.replaceAll("_", " ")}
                  </span>
                </div>

                <h4>
                  {rule.subject_a} + {rule.subject_b}
                </h4>

                <p>{rule.message}</p>

                <div className="safety-rule-card__source">
                  <strong>Source:</strong> {rule.source_name}
                  {rule.source_updated_at && (
                    <>
                      {" · "}
                      updated{" "}
                      {new Date(
                        rule.source_updated_at
                      ).toLocaleDateString()}
                    </>
                  )}
                </div>

                {rule.source_url && (
                  <a
                    href={rule.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View source
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
