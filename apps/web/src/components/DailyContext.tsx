import { useEffect, useState } from "react";
import "./DailyContext.css";
import { DailyContextCard } from "./DailyContextCard";

export type DailyContextData = {
  id: number;
  context_date: string;
  sleep_hours: number | null;
  created_at: string;
  updated_at: string;
};

type DailyContextProps = {
  refreshKey?: number;
};

export function DailyContext({
  refreshKey = 0,
}: DailyContextProps) {
  const [context, setContext] =
    useState<DailyContextData | null>(null);

  const [sleepHours, setSleepHours] =
    useState<number>(7);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      setLoading(true);
      setError(null);

      try {
        const timezoneOffset =
          -new Date().getTimezoneOffset();

        const response = await fetch(
          `http://127.0.0.1:8000/daily-contexts/today?timezone_offset=${timezoneOffset}`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load today's context"
          );
        }

        const data: DailyContextData | null =
          await response.json();

        setContext(data);

        if (
          data?.sleep_hours !== null &&
          data?.sleep_hours !== undefined
        ) {
          setSleepHours(data.sleep_hours);
        }
      } catch (error) {
        console.error(
          "Unable to load daily context:",
          error
        );

        setError(
          "Unable to load today's sleep."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadContext();
  }, [refreshKey]);

  async function saveSleep() {
    setSaving(true);
    setError(null);

    try {
      const timezoneOffset =
        -new Date().getTimezoneOffset();

      const response = await fetch(
        `http://127.0.0.1:8000/daily-contexts/today?timezone_offset=${timezoneOffset}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sleep_hours: sleepHours,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to save today's sleep"
        );
      }

      const data: DailyContextData =
        await response.json();

      setContext(data);
      setSleepHours(
        data.sleep_hours ?? sleepHours
      );
    } catch (error) {
      console.error(
        "Unable to save daily context:",
        error
      );

      setError(
        "Unable to save sleep. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DailyContextCard
      context={context}
      sleepHours={sleepHours}
      loading={loading}
      saving={saving}
      error={error}
      onSleepHoursChange={setSleepHours}
      onSave={saveSleep}
    />
  );
}