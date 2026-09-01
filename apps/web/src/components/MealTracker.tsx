import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./MealTracker.css";

const API = "http://127.0.0.1:8000";

type Ingredient = {
  id: number;
  meal_id: number;
  ingredient: string;
  amount: string | null;
};

type Meal = {
  id: number;
  meal_type: string | null;
  title: string | null;
  note: string | null;
  eaten_at: string;
  created_at: string;
  ingredients?: Ingredient[];
};

type IngredientDraft = {
  ingredient: string;
  amount: string;
};

function getLocalDateTimeValue() {
  const now = new Date();

  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000
  );

  return local.toISOString().slice(0, 16);
}

export function MealTracker() {
  const [meals, setMeals] = useState<Meal[]>([]);

  const [mealType, setMealType] = useState("meal");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [eatenAt, setEatenAt] = useState(
    getLocalDateTimeValue()
  );

  const [ingredients, setIngredients] = useState<
    IngredientDraft[]
  >([
    {
      ingredient: "",
      amount: "",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMeals() {
    try {
      setError("");

      const response = await fetch(`${API}/meals`);

      if (!response.ok) {
        throw new Error("Could not load meals.");
      }

      const data = await response.json();

      setMeals(data);
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
    loadMeals();
  }, []);

  function updateIngredient(
    index: number,
    field: keyof IngredientDraft,
    value: string
  ) {
    setIngredients((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      {
        ingredient: "",
        amount: "",
      },
    ]);
  }

  function removeIngredient(index: number) {
    setIngredients((current) => {
      if (current.length === 1) {
        return [
          {
            ingredient: "",
            amount: "",
          },
        ];
      }

      return current.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  }

  async function submitMeal(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const cleanedIngredients = ingredients
      .map((item) => ({
        ingredient: item.ingredient.trim(),
        amount: item.amount.trim() || null,
      }))
      .filter(
        (item) => item.ingredient.length > 0
      );

    try {
      const response = await fetch(`${API}/meals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_type: mealType || null,
          title: title.trim() || null,
          note: note.trim() || null,
          eaten_at: new Date(eatenAt).toISOString(),
          ingredients: cleanedIngredients,
        }),
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Could not save meal."
        );
      }

      setMealType("meal");
      setTitle("");
      setNote("");
      setEatenAt(getLocalDateTimeValue());

      setIngredients([
        {
          ingredient: "",
          amount: "",
        },
      ]);

      await loadMeals();
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

  return (
    <section className="meal-tracker">
      <div className="meal-tracker__header">
        <p className="meal-tracker__eyebrow">
          Meals
        </p>

        <h2>Log meals and ingredients</h2>

        <p className="meal-tracker__muted">
          Record what you ate so SYMPA can later compare
          meals with symptoms, medications, sleep, and
          check-ins.
        </p>
      </div>

      <form
        className="meal-tracker__form"
        onSubmit={submitMeal}
      >
        <div className="meal-tracker__grid">
          <div className="meal-tracker__field">
            <label htmlFor="meal-type">
              Type
            </label>

            <select
              id="meal-type"
              value={mealType}
              onChange={(event) =>
                setMealType(event.target.value)
              }
            >
              <option value="breakfast">
                Breakfast
              </option>

              <option value="lunch">
                Lunch
              </option>

              <option value="dinner">
                Dinner
              </option>

              <option value="snack">
                Snack
              </option>

              <option value="meal">
                Meal
              </option>
            </select>
          </div>

          <div className="meal-tracker__field">
            <label htmlFor="meal-title">
              Title
            </label>

            <input
              id="meal-title"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Yogurt and berries"
            />
          </div>

          <div className="meal-tracker__field">
            <label htmlFor="meal-date">
              When
            </label>

            <input
              id="meal-date"
              type="datetime-local"
              value={eatenAt}
              onChange={(event) =>
                setEatenAt(event.target.value)
              }
              required
            />
          </div>
        </div>

        <div className="meal-tracker__field">
          <label htmlFor="meal-note">
            Note
          </label>

          <input
            id="meal-note"
            value={note}
            onChange={(event) =>
              setNote(event.target.value)
            }
            placeholder="Optional note"
          />
        </div>

        <div className="meal-tracker__ingredients">
          <div className="meal-tracker__section-heading">
            <strong>Ingredients</strong>

            <button
              type="button"
              onClick={addIngredient}
            >
              + Add ingredient
            </button>
          </div>

          {ingredients.map((item, index) => (
            <div
              className="meal-ingredient-row"
              key={index}
            >
              <input
                value={item.ingredient}
                onChange={(event) =>
                  updateIngredient(
                    index,
                    "ingredient",
                    event.target.value
                  )
                }
                placeholder="Ingredient"
              />

              <input
                value={item.amount}
                onChange={(event) =>
                  updateIngredient(
                    index,
                    "amount",
                    event.target.value
                  )
                }
                placeholder="Amount"
              />

              <button
                type="button"
                onClick={() =>
                  removeIngredient(index)
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          className="meal-tracker__primary"
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Log meal"}
        </button>
      </form>

      {error && (
        <div className="meal-tracker__error">
          {error}
        </div>
      )}

      <div className="meal-tracker__history">
        <h3>Recent meals</h3>

        {loading ? (
          <p className="meal-tracker__muted">
            Loading meals...
          </p>
        ) : meals.length === 0 ? (
          <p className="meal-tracker__muted">
            No meals logged yet.
          </p>
        ) : (
          <div className="meal-tracker__list">
            {meals.map((meal) => (
              <article
                className="meal-card"
                key={meal.id}
              >
                <p className="meal-card__type">
                  {meal.meal_type || "Meal"}
                </p>

                <h4>
                  {meal.title || "Untitled meal"}
                </h4>

                <time>
                  {new Date(
                    meal.eaten_at
                  ).toLocaleString()}
                </time>

                {meal.ingredients &&
                  meal.ingredients.length > 0 && (
                    <div className="meal-card__ingredients">
                      {meal.ingredients.map(
                        (ingredient) => (
                          <span key={ingredient.id}>
                            {ingredient.ingredient}
                            {ingredient.amount
                              ? ` · ${ingredient.amount}`
                              : ""}
                          </span>
                        )
                      )}
                    </div>
                  )}

                {meal.note && (
                  <p>{meal.note}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}