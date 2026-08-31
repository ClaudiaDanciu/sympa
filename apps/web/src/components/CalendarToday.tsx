import { useCallback, useEffect, useState } from "react";
import "./CalendarToday.css";

type CalendarEvent = {
  id: number;
  provider: string;
  provider_event_id: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type FollowUpPrompt = {
  id: number;
  calendar_event_id: number;
  prompt_type: string;
  due_at: string;
  status: string;
  snoozed_until: string | null;
  completed_check_in_id: number | null;
  created_at: string;
  updated_at: string;
  event: CalendarEvent | null;
};

type CalendarTodayProps = {
  onCheckInRequested?: (
    prompt: FollowUpPrompt
  ) => void;
};

export function CalendarToday({
  onCheckInRequested,
}: CalendarTodayProps) {
  const [events, setEvents] = useState<
    CalendarEvent[]
  >([]);

  const [duePrompt, setDuePrompt] =
    useState<FollowUpPrompt | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  const loadCalendar = useCallback(
    async () => {
      setError(null);

      try {
        const timezoneOffset =
          -new Date().getTimezoneOffset();

        const [eventsResponse, promptsResponse] =
          await Promise.all([
            fetch(
              `http://127.0.0.1:8000/calendar/today?timezone_offset=${timezoneOffset}`
            ),
            fetch(
              "http://127.0.0.1:8000/calendar/follow-ups/due"
            ),
          ]);

        if (!eventsResponse.ok) {
          throw new Error(
            "Unable to load today's calendar"
          );
        }

        if (!promptsResponse.ok) {
          throw new Error(
            "Unable to load follow-up prompts"
          );
        }

        const eventsData: CalendarEvent[] =
          await eventsResponse.json();

        const promptsData: FollowUpPrompt[] =
          await promptsResponse.json();

        setEvents(eventsData);

        setDuePrompt(
          promptsData.length > 0
            ? promptsData[0]
            : null
        );
      } catch (error) {
        console.error(
          "Unable to load calendar:",
          error
        );

        setError(
          "Unable to load your calendar right now."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCalendar();

    const interval = window.setInterval(
      () => {
        void loadCalendar();
      },
      60_000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadCalendar]);

  async function snoozePrompt() {
    if (!duePrompt) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/calendar/follow-ups/${duePrompt.id}/snooze`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            minutes: 30,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to snooze prompt"
        );
      }

      setDuePrompt(null);
    } catch (error) {
      console.error(
        "Unable to snooze follow-up:",
        error
      );

      setError(
        "Unable to snooze this reminder."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function dismissPrompt() {
    if (!duePrompt) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/calendar/follow-ups/${duePrompt.id}/dismiss`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to dismiss prompt"
        );
      }

      setDuePrompt(null);
    } catch (error) {
      console.error(
        "Unable to dismiss follow-up:",
        error
      );

      setError(
        "Unable to dismiss this reminder."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(new Date(value));
  }

  const now = new Date();

  const upcomingEvents = events.filter(
    (event) =>
      new Date(event.end_at).getTime() >
      now.getTime()
  );

  const nextEvent =
    upcomingEvents.length > 0
      ? upcomingEvents[0]
      : null;

  return (
    <>
      <section className="calendar-today">
        <div className="calendar-today-header">
          <div>
            <p className="eyebrow">
              Coming up
            </p>

            <h2>Your day</h2>
          </div>

          {events.length > 0 && (
            <span className="calendar-count">
              {events.length}{" "}
              {events.length === 1
                ? "event"
                : "events"}
            </span>
          )}
        </div>

        {loading ? (
          <p className="calendar-muted">
            Loading your calendar...
          </p>
        ) : error ? (
          <p className="form-error">
            {error}
          </p>
        ) : nextEvent ? (
          <div className="calendar-next-event">
            <div className="calendar-time">
              {formatTime(
                nextEvent.start_at
              )}
            </div>

            <div className="calendar-event-copy">
              <strong>
                {nextEvent.title}
              </strong>

              <span>
                {formatTime(
                  nextEvent.start_at
                )}
                {" – "}
                {formatTime(
                  nextEvent.end_at
                )}
              </span>

              {nextEvent.location && (
                <span>
                  {nextEvent.location}
                </span>
              )}
            </div>
          </div>
        ) : events.length > 0 ? (
          <p className="calendar-muted">
            Your events for today are
            finished.
          </p>
        ) : (
          <p className="calendar-muted">
            Nothing scheduled for today.
          </p>
        )}
      </section>

      {duePrompt && (
        <div
          className="follow-up-overlay"
          role="presentation"
        >
          <section
            className="follow-up-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="follow-up-title"
          >
            <p className="eyebrow">
              A moment to check in
            </p>

            <h2 id="follow-up-title">
              How do you feel after this
              meeting?
            </h2>

            {duePrompt.event && (
              <div className="follow-up-event">
                <strong>
                  {duePrompt.event.title}
                </strong>

                <span>
                  Ended at{" "}
                  {formatTime(
                    duePrompt.event.end_at
                  )}
                </span>
              </div>
            )}

            <p className="follow-up-description">
              Take a moment to notice your
              energy, stress, mood and focus
              after the event.
            </p>

            <div className="follow-up-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  if (
                    onCheckInRequested
                  ) {
                    onCheckInRequested(
                      duePrompt
                    );
                  }
                }}
                disabled={actionLoading}
              >
                Check in now
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  void snoozePrompt()
                }
                disabled={actionLoading}
              >
                Snooze 30 min
              </button>

              <button
                type="button"
                className="follow-up-dismiss"
                onClick={() =>
                  void dismissPrompt()
                }
                disabled={actionLoading}
              >
                Dismiss
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}