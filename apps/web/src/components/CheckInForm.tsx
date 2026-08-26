import { useState, type FormEvent } from "react";
import "./CheckInForm.css";

type CheckInFormProps = {
  onSaved: () => void;
  onCancel: () => void;
};

export function CheckInForm({
  onSaved,
  onCancel,
}: CheckInFormProps) {
  const [energy, setEnergy] = useState(5);
  const [mood, setMood] = useState("neutral");
  const [stress, setStress] = useState(5);
  const [focus, setFocus] = useState(5);
  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [socialEnergy, setSocialEnergy] = useState(5);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/check-ins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          energy,
          mood,
          stress,
          focus,
          exercise_minutes: exerciseMinutes,
          social_energy: socialEnergy,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save check-in");
      }

      onSaved();
    } catch (error) {
      console.error(error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="checkin-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div>
          <p className="card-label">Daily check-in</p>
          <h2>How are you doing today?</h2>
        </div>

        <button
          type="button"
          className="text-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>

      <div className="form-grid">
        <NumberField
            label="Movement since last check-in"
            value={exerciseMinutes}
            min={0}
            max={300}
            suffix="min"
            onChange={setExerciseMinutes}
        />

        <NumberField
          label="Energy"
          value={energy}
          min={1}
          max={10}
          suffix="/ 10"
          onChange={setEnergy}
        />

        <NumberField
          label="Stress"
          value={stress}
          min={1}
          max={10}
          suffix="/ 10"
          onChange={setStress}
        />

        <NumberField
          label="Focus"
          value={focus}
          min={1}
          max={10}
          suffix="/ 10"
          onChange={setFocus}
        />

        <NumberField
          label="Social energy"
          value={socialEnergy}
          min={1}
          max={10}
          suffix="/ 10"
          onChange={setSocialEnergy}
        />
      </div>

      <label className="field full-width">
        <span>Mood</span>
        <select
          value={mood}
          onChange={(event) => setMood(event.target.value)}
        >
          <option value="very_low">Very low</option>
          <option value="low">Low</option>
          <option value="neutral">Okay</option>
          <option value="good">Good</option>
          <option value="great">Great</option>
        </select>
      </label>

      <label className="field full-width">
        <span>Notes</span>
        <textarea
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What happened since your last check-in? People, food, work, movement, symptoms, events..."
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button
        type="submit"
        className="primary-button"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save check-in"}
      </button>
    </form>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
};

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>

      <div className="number-input">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />

        <span>{suffix}</span>
      </div>
    </label>
  );
}