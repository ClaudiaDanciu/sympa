import { useEffect, useState } from "react";
import "./CheckInHistory.css";

type DailySummary = {
    average_energy: number | null;
    average_stress: number | null;
    average_focus: number | null;
    average_social_energy: number | null;
    total_exercise_minutes: number;
    dominant_mood: string | null;
    sleep_hours: number | null;
};

type DailySummaryItem = {
    date: string;
    entry_count: number;
    summary: DailySummary;
};

type CheckInHistoryProps = {
    refreshKey: number;
    onSelectDay: (date: string) => void;
};

export function CheckInHistory({
    refreshKey,
    onSelectDay,
}: CheckInHistoryProps) {
    const [days, setDays] = useState<DailySummaryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            setLoading(true);

            try {
                const timezoneOffset = -new Date().getTimezoneOffset();

                const response = await fetch(
                    `http://127.0.0.1:8000/check-ins/days?timezone_offset=${timezoneOffset}`
                );

                if (!response.ok) {
                    throw new Error("Unable to load daily history");
                }

                const data: DailySummaryItem[] = await response.json();
                setDays(data);
            } catch (error) {
                console.error("Unable to load history:", error);
            } finally {
                setLoading(false);
            }
        }

        void loadHistory();
    }, [refreshKey]);

    if (loading) {
        return (
            <section className="history-section">
                <p>Loading your journey...</p>
            </section>
        );
    }

    if (days.length === 0) {
        return (
            <section className="history-section">
                <div className="section-heading">
                    <p className="eyebrow">Your journey</p>
                    <h2>Recent days</h2>
                </div>

                <section className="card">
                    <p>Your history will appear here as you check in.</p>
                </section>
            </section>
        );
    }

    return (
        <section className="history-section">
            <div className="section-heading">
                <p className="eyebrow">Your journey</p>
                <h2>Recent days</h2>
            </div>

            <div className="history-list">
                {days.map((day) => (
                    <article className="history-card" key={day.date}>
                        <div className="history-card-header">
                            <div>
                                <p className="history-date">
                                    {formatDay(day.date)}
                                </p>

                                <p className="history-entry-count">
                                    {day.entry_count}{" "}
                                    {day.entry_count === 1 ? "check-in" : "check-ins"}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="history-link"
                                onClick={() => onSelectDay(day.date)}
                            >
                                View day
                            </button>
                        </div>

                        <div className="history-metrics">
                            <HistoryMetric
                                label="Mood"
                                value={
                                    day.summary.dominant_mood
                                        ? formatMood(day.summary.dominant_mood)
                                        : "—"
                                }
                            />

                            <HistoryMetric
                                label="Energy"
                                value={formatScore(day.summary.average_energy)}
                            />

                            <HistoryMetric
                                label="Stress"
                                value={formatScore(day.summary.average_stress)}
                            />

                            <HistoryMetric
                                label="Focus"
                                value={formatScore(day.summary.average_focus)}
                            />

                            <HistoryMetric
                                label="Sleep"
                                value={
                                    day.summary.sleep_hours !== null
                                        ? `${day.summary.sleep_hours} h`
                                        : "—"
                                }
                            />

                            <HistoryMetric
                                label="Movement"
                                value={`${day.summary.total_exercise_minutes} min`}
                            />
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

function HistoryMetric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="history-metric">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function formatScore(value: number | null) {
    return value !== null ? `${value}/10` : "—";
}

function formatMood(mood: string) {
    return mood
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function formatDay(date: string) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
    }).format(new Date(`${date}T12:00:00`));
}