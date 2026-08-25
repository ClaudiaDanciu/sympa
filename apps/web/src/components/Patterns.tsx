import { useEffect, useState } from "react";

type PatternObservation = {
  title: string;
  description: string;
  strength: string;
};

type CrossDayPatternsResponse = {
  days_analyzed: number;
  enough_data: boolean;
  headline: string;
  summary: string;
  patterns: PatternObservation[];
};

type PatternsProps = {
  refreshKey: number;
};

export function Patterns({
  refreshKey,
}: PatternsProps) {
  const [data, setData] =
    useState<CrossDayPatternsResponse | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatterns() {
      setLoading(true);

      try {
        const timezoneOffset =
          -new Date().getTimezoneOffset();

        const response = await fetch(
          `http://127.0.0.1:8000/check-ins/patterns?timezone_offset=${timezoneOffset}`
        );

        if (!response.ok) {
          throw new Error("Unable to load patterns");
        }

        const result: CrossDayPatternsResponse =
          await response.json();

        setData(result);
      } catch (error) {
        console.error(
          "Unable to load patterns:",
          error
        );

        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void loadPatterns();
  }, [refreshKey]);

  if (loading) {
    return (
      <section className="patterns-section">
        <p>Looking for patterns...</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="patterns-section">
      <div className="section-heading">
        <p className="eyebrow">Your patterns</p>

        <h2>{data.headline}</h2>

        <p className="patterns-summary">
          {data.summary}
        </p>
      </div>

      {!data.enough_data ? (
        <div className="pattern-learning-card">
          <p>
            Keep checking in. Patterns become more
            meaningful as SYMPA learns from more days.
          </p>
        </div>
      ) : data.patterns.length === 0 ? (
        <div className="pattern-learning-card">
          <p>
            There is enough history to compare your days,
            but no clear relationship stands out yet.
          </p>
        </div>
      ) : (
        <div className="patterns-grid">
          {data.patterns.map((pattern) => (
            <article
              className="pattern-card"
              key={pattern.title}
            >
              <div className="pattern-card-top">
                <span className="pattern-strength">
                  {formatStrength(pattern.strength)}
                </span>
              </div>

              <h3>{pattern.title}</h3>

              <p>{pattern.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatStrength(strength: string) {
  return (
    strength.charAt(0).toUpperCase() +
    strength.slice(1)
  );
}