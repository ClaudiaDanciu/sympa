from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import Meal, MealIngredient
from app.models.health import MealCreate

router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("", status_code=201)
def create_meal(payload: MealCreate, db: Session = Depends(get_db)):
    values = payload.model_dump(exclude={"ingredients"})
    meal = Meal(**values)
    db.add(meal)
    db.flush()

    for ingredient in payload.ingredients:
        db.add(
            MealIngredient(
                meal_id=meal.id,
                **ingredient.model_dump(),
            )
        )

    db.commit()
    db.refresh(meal)
    return meal


@router.get("")
def list_meals(db: Session = Depends(get_db)):
    meals = db.scalars(
        select(Meal).order_by(Meal.eaten_at.desc()).limit(100)
    ).all()

    result = []
    for meal in meals:
        ingredients = db.scalars(
            select(MealIngredient).where(MealIngredient.meal_id == meal.id)
        ).all()
        result.append(
            {
                "id": meal.id,
                "meal_type": meal.meal_type,
                "title": meal.title,
                "note": meal.note,
                "eaten_at": meal.eaten_at,
                "ingredients": ingredients,
            }
        )
    return result
