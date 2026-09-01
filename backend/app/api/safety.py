from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import Allergy, SafetyRule
from app.models.health import AllergyCreate, SafetyRuleCreate


router = APIRouter(prefix="/safety", tags=["safety"])


@router.get("/allergies")
def list_allergies(
    db: Session = Depends(get_db),
):
    return list(
        db.scalars(
            select(Allergy).order_by(Allergy.substance)
        ).all()
    )


@router.post("/allergies", status_code=201)
def create_allergy(
    payload: AllergyCreate,
    db: Session = Depends(get_db),
):
    substance = payload.substance.strip()

    existing = db.scalar(
        select(Allergy).where(
            Allergy.substance.ilike(substance)
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="This allergy is already recorded.",
        )

    allergy = Allergy(
        substance=substance,
        reaction=payload.reaction,
        severity=payload.severity,
    )

    db.add(allergy)
    db.commit()
    db.refresh(allergy)

    return allergy


@router.delete("/allergies/{allergy_id}", status_code=204)
def delete_allergy(
    allergy_id: int,
    db: Session = Depends(get_db),
):
    allergy = db.get(Allergy, allergy_id)

    if allergy is None:
        raise HTTPException(
            status_code=404,
            detail="Allergy not found.",
        )

    db.delete(allergy)
    db.commit()


@router.get("/rules")
def list_safety_rules(
    db: Session = Depends(get_db),
):
    return list(
        db.scalars(
            select(SafetyRule).order_by(
                SafetyRule.severity.desc(),
                SafetyRule.subject_a,
            )
        ).all()
    )


@router.post("/rules", status_code=201)
def create_safety_rule(
    payload: SafetyRuleCreate,
    db: Session = Depends(get_db),
):
    rule = SafetyRule(
        **payload.model_dump()
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule


@router.get("/rules/search")
def search_safety_rules(
    term: str,
    db: Session = Depends(get_db),
):
    value = term.strip()

    if not value:
        return []

    return list(
        db.scalars(
            select(SafetyRule)
            .where(
                or_(
                    SafetyRule.subject_a.ilike(
                        f"%{value}%"
                    ),
                    SafetyRule.subject_b.ilike(
                        f"%{value}%"
                    ),
                )
            )
            .order_by(
                SafetyRule.severity.desc(),
                SafetyRule.subject_a,
            )
        ).all()
    )