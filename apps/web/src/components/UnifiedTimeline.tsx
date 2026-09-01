import { useEffect, useMemo, useState } from "react";
import "./UnifiedTimeline.css";

const API = "http://127.0.0.1:8000";

type TimelineItem = {
  type:
      | "calendar_event"
      | "check_in"
      | "sleep"
      | "symptom"
      | "meal"
      | "medication"
      | string;  
  occurred_at: string;
  title: string;
  detail: string | null;
  source_id: number;
};

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeLabel(type: string) {
  switch (type) {
    case "calendar_event":
      return "Calendar";
    case "check_in":
      return "Check-in";
    case "sleep":
      return "Sleep";
    case "symptom":
      return "Symptom";
    case "meal":
      return "Meal";
    case "medication":
      return "Medication";
    default:
      return type.replaceAll("_", " ");
  }
}

export function UnifiedTimeline() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTimeline(selectedDays = days) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/timeline?days=${selectedDays}`);

      if (!response.ok) {
        throw new Error("Could not load timeline.");
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
    loadTimeline(days);
  }, [days]);

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: TimelineItem[] }[] = [];
    const index = new Map<string, number>();

    for (const item of items) {
      const key = dayKey(item.occurred_at);

      if (!index.has(key)) {
        index.set(key, groups.length);
        groups.push({
          key,
          label: dayLabel(item.occurred_at),
          items: [],
        });
      }

      groups[index.get(key)!].items.push(item);
    }

    return groups;
  }, [items]);

  return (
    <section className="unified-timeline">
      <div className="unified-timeline__header">
        <div>
          <p className="unified-timeline__eyebrow">Timeline</p>
          <h2>Your health context, in order</h2>
          <p className="unified-timeline__muted">
            A chronological view of meetings, medications, meals, and symptoms.
          </p>
        </div>

        <label className="unified-timeline__range">
          <span>Show</span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={1}>Today</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="unified-timeline__error">{error}</div>
      )}

      {loading ? (
        <div className="unified-timeline__panel">
          <p className="unified-timeline__muted">Loading timeline…</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="unified-timeline__panel">
          <strong>No timeline activity yet.</strong>
          <p className="unified-timeline__muted">
            Logged meals, symptoms, medication actions, and calendar events
            will appear here.
          </p>
        </div>
      ) : (
        <div className="unified-timeline__days">
          {grouped.map((group) => (
            <section className="timeline-day" key={group.key}>
              <h3>{group.label}</h3>

              <div className="timeline-day__items">
                {group.items.map((item) => (
                  <article
                    className={`timeline-item timeline-item--${item.type}`}
                    key={`${item.type}-${item.source_id}-${item.occurred_at}`}
                  >
                    <div className="timeline-item__rail">
                      <span className="timeline-item__dot" />
                      <span className="timeline-item__line" />
                    </div>

                    <div className="timeline-item__time">
                      {timeLabel(item.occurred_at)}
                    </div>

                    <div className="timeline-item__card">
                      <div className="timeline-item__top">
                        <span className="timeline-item__type">
                          {typeLabel(item.type)}
                        </span>
                      </div>

                      <h4>{item.title}</h4>

                      {item.detail && (
                        <p>{item.detail}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
