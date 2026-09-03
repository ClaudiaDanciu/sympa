import { useEffect, useMemo, useState } from "react";
import "./UnifiedTimeline.css";

const API = "http://127.0.0.1:8000";

type TimelineKind =
  | "calendar_event"
  | "check_in"
  | "sleep"
  | "symptom"
  | "meal"
  | "medication";

type TimelineItem = {
  id?: number | string;
  type?: TimelineKind | string;
  item_type?: TimelineKind | string;
  occurred_at?: string;
  timestamp?: string;
  created_at?: string;
  title?: string;
  subtitle?: string | null;
  detail?: string | null;
  details?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

type DayGroup = {
  key: string;
  date: Date;
  items: TimelineItem[];
};

type Period = "morning" | "afternoon" | "evening";

type PeriodGroup = {
  period: Period;
  items: TimelineItem[];
};

export function UnifiedTimeline() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [selectedDays, setSelectedDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    async function loadTimeline() {
      setLoading(true);
      setError(null);

      try {
        const timezoneOffset = -new Date().getTimezoneOffset();

        const response = await fetch(
          `${API}/timeline?days=${selectedDays}&timezone_offset=${timezoneOffset}`
        );

        if (!response.ok) {
          throw new Error("Unable to load timeline");
        }

        const data = (await response.json()) as TimelineItem[];
        setItems(Array.isArray(data) ? data : []);
      } catch (loadError) {
        console.error("Unable to load timeline:", loadError);
        setError("Unable to load your timeline.");
      } finally {
        setLoading(false);
      }
    }

    void loadTimeline();
  }, [selectedDays]);

  const days = useMemo(() => groupByDay(items), [items]);

  useEffect(() => {
    if (days.length === 0) {
      return;
    }

    setExpandedDays((current) => {
      if (current.size > 0) {
        return current;
      }

      return new Set([days[0].key]);
    });
  }, [days]);

  function toggleDay(dayKey: string) {
    setExpandedDays((current) => {
      const next = new Set(current);

      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }

      return next;
    });
  }

  function togglePeriod(key: string) {
    setExpandedPeriods((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  return (
    <section className="smart-timeline">
      <div className="smart-timeline__toolbar">
        <div>
          <p className="smart-timeline__eyebrow">Daily digest</p>
          <h2>See the day at a glance</h2>
          <p className="smart-timeline__description">
            Events are grouped by day and part of day, so repeated activity
            does not take over the timeline.
          </p>
        </div>

        <label className="smart-timeline__range">
          <span>Show</span>
          <select
            value={selectedDays}
            onChange={(event) =>
              setSelectedDays(Number(event.target.value))
            }
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="smart-timeline__state">Loading timeline...</div>
      ) : error ? (
        <div className="smart-timeline__state smart-timeline__state--error">
          {error}
        </div>
      ) : days.length === 0 ? (
        <div className="smart-timeline__state">
          No timeline activity yet.
        </div>
      ) : (
        <div className="smart-timeline__days">
          {days.map((day) => {
            const isExpanded = expandedDays.has(day.key);
            const periods = groupByPeriod(day.items);
            const summary = summarizeKinds(day.items);

            return (
              <article className="smart-day" key={day.key}>
                <button
                  type="button"
                  className="smart-day__header"
                  onClick={() => toggleDay(day.key)}
                  aria-expanded={isExpanded}
                >
                  <div>
                    <div className="smart-day__title-row">
                      <h3>{formatDayHeading(day.date)}</h3>
                      <span className="smart-day__count">
                        {day.items.length}{" "}
                        {day.items.length === 1 ? "event" : "events"}
                      </span>
                    </div>

                    <p className="smart-day__summary">{summary}</p>
                  </div>

                  <span className="smart-day__toggle" aria-hidden="true">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="smart-day__body">
                    {periods.map((periodGroup) => {
                      const periodKey = `${day.key}-${periodGroup.period}`;
                      const periodExpanded =
                        expandedPeriods.has(periodKey);
                      const previewItems = periodExpanded
                        ? periodGroup.items
                        : periodGroup.items.slice(0, 3);
                      const hasMore = periodGroup.items.length > 3;

                      return (
                        <section
                          className="smart-period"
                          key={periodKey}
                        >
                          <div className="smart-period__header">
                            <div>
                              <h4>{periodLabel(periodGroup.period)}</h4>
                              <p>
                                {summarizeKinds(periodGroup.items)}
                              </p>
                            </div>

                            <span className="smart-period__count">
                              {periodGroup.items.length}
                            </span>
                          </div>

                          <div className="smart-period__items">
                            {previewItems.map((item, index) => (
                              <CompactTimelineRow
                                key={itemKey(item, index)}
                                item={item}
                              />
                            ))}
                          </div>

                          {hasMore && (
                            <button
                              type="button"
                              className="smart-period__more"
                              onClick={() => togglePeriod(periodKey)}
                            >
                              {periodExpanded
                                ? "Show less"
                                : `Show ${
                                    periodGroup.items.length - 3
                                  } more`}
                            </button>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CompactTimelineRow({ item }: { item: TimelineItem }) {
  const kind = getKind(item);

  return (
    <div className={`compact-event compact-event--${kind}`}>
      <span className="compact-event__time">
        {formatTime(getTimestamp(item))}
      </span>

      <div className="compact-event__main">
        <div className="compact-event__title-row">
          <span className="compact-event__badge">
            {typeLabel(kind)}
          </span>

          <strong>{getTitle(item)}</strong>
        </div>

        {getDetail(item) && (
          <p className="compact-event__detail">{getDetail(item)}</p>
        )}
      </div>
    </div>
  );
}

function getKind(item: TimelineItem): TimelineKind {
  const value = String(item.type ?? item.item_type ?? "");

  if (
    value === "calendar_event" ||
    value === "check_in" ||
    value === "sleep" ||
    value === "symptom" ||
    value === "meal" ||
    value === "medication"
  ) {
    return value;
  }

  return "calendar_event";
}

function getTimestamp(item: TimelineItem): string {
  const value =
    item.occurred_at ?? item.timestamp ?? item.created_at ?? "";

  return typeof value === "string" ? value : "";
}

function getTitle(item: TimelineItem): string {
  const directTitle = item.title;

  if (typeof directTitle === "string" && directTitle.trim()) {
    return directTitle;
  }

  const kind = getKind(item);

  if (kind === "check_in") return "Check-in";
  if (kind === "sleep") return "Sleep";
  if (kind === "symptom") return "Symptom";
  if (kind === "meal") return "Meal";
  if (kind === "medication") return "Medication";

  return "Calendar event";
}

function getDetail(item: TimelineItem): string | null {
  const candidates = [
    item.subtitle,
    item.detail,
    item.details,
    item.description,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function itemKey(item: TimelineItem, index: number): string {
  return `${getKind(item)}-${String(item.id ?? index)}-${getTimestamp(item)}`;
}

function groupByDay(items: TimelineItem[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  const sorted = [...items].sort(
    (a, b) =>
      toDate(getTimestamp(b)).getTime() -
      toDate(getTimestamp(a)).getTime()
  );

  for (const item of sorted) {
    const date = toDate(getTimestamp(item));
    const key = localDateKey(date);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        date,
        items: [],
      });
    }

    groups.get(key)?.items.push(item);
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}

function groupByPeriod(items: TimelineItem[]): PeriodGroup[] {
  const groups: Record<Period, TimelineItem[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const item of items) {
    const date = toDate(getTimestamp(item));
    const hour = date.getHours();

    if (hour < 12) {
      groups.morning.push(item);
    } else if (hour < 18) {
      groups.afternoon.push(item);
    } else {
      groups.evening.push(item);
    }
  }

  return (["morning", "afternoon", "evening"] as Period[])
    .map((period) => ({
      period,
      items: groups[period].sort(
        (a, b) =>
          toDate(getTimestamp(b)).getTime() -
          toDate(getTimestamp(a)).getTime()
      ),
    }))
    .filter((group) => group.items.length > 0);
}

function summarizeKinds(items: TimelineItem[]): string {
  const order: TimelineKind[] = [
    "medication",
    "symptom",
    "meal",
    "check_in",
    "sleep",
    "calendar_event",
  ];

  const counts = new Map<TimelineKind, number>();

  for (const item of items) {
    const kind = getKind(item);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }

  const parts = order.flatMap((kind) => {
    const count = counts.get(kind) ?? 0;

    if (count === 0) {
      return [];
    }

    return [`${count} ${typeSummaryLabel(kind, count)}`];
  });

  return parts.join(" · ");
}

function typeSummaryLabel(kind: TimelineKind, count: number): string {
  if (kind === "calendar_event") {
    return count === 1 ? "calendar event" : "calendar events";
  }

  if (kind === "check_in") {
    return count === 1 ? "check-in" : "check-ins";
  }

  if (kind === "medication") {
    return count === 1 ? "medication" : "medications";
  }

  if (kind === "symptom") {
    return count === 1 ? "symptom" : "symptoms";
  }

  if (kind === "meal") {
    return count === 1 ? "meal" : "meals";
  }

  return "sleep";
}

function typeLabel(kind: TimelineKind): string {
  if (kind === "calendar_event") return "Event";
  if (kind === "check_in") return "Check-in";
  if (kind === "sleep") return "Sleep";
  if (kind === "symptom") return "Symptom";
  if (kind === "meal") return "Meal";
  return "Medication";
}

function periodLabel(period: Period): string {
  if (period === "morning") return "Morning";
  if (period === "afternoon") return "Afternoon";
  return "Evening";
}

function formatDayHeading(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const key = localDateKey(date);

  if (key === localDateKey(today)) {
    return "Today";
  }

  if (key === localDateKey(yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value: string): string {
  if (!value) {
    return "";
  }

  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function localDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDate(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date(0);
  }

  return date;
}
