from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.health_models import Allergy, Medication, SafetyRule
from app.models.health import AllergyCreate, SafetyRuleCreate
from app.services.medication_guidance import build_medication_guidance

router = APIRouter(prefix="/safety", tags=["safety"])


@router.get("/allergies")
def list_allergies(db: Session = Depends(get_db)):
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
def list_safety_rules(db: Session = Depends(get_db)):
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
    rule = SafetyRule(**payload.model_dump())

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


@router.get("/medication-guidance")
def medication_guidance(
    db: Session = Depends(get_db),
):
    """
    Return FDA-label-backed guidance for the user's active medications.

    The endpoint keeps the frontend response shape stable while replacing
    the old dependency on locally seeded safety_rules.
    """

    medications = list(
        db.scalars(
            select(Medication)
            .where(Medication.active.is_(True))
            .order_by(Medication.name)
        ).all()
    )

    if not medications:
        return {
            "active_medications": [],
            "guidance": [],
            "unavailable": [],
            "provider": "openFDA",
            "disclaimer": (
                "No active medications are recorded. Medication guidance "
                "should always be confirmed with a physician or pharmacist."
            ),
        }

    active_names = [
        medication.name.strip()
        for medication in medications
        if medication.name.strip()
    ]

    result = build_medication_guidance(active_names)

    guidance = []

    for index, item in enumerate(result["guidance"], start=1):
        effective_time = item.get("effective_time")

        guidance.append(
            {
                # Keep the existing frontend contract stable.
                "id": index,
                "rule_type": item.get("category", "safety_context"),
                "subject_a": item.get("medication", ""),
                "subject_b": item.get("matched_name") or "",
                "severity": item.get("severity", "info"),
                "message": item.get("message", ""),
                "source_name": item.get(
                    "source_name",
                    "openFDA Drug Labeling",
                ),
                "source_url": item.get("source_url"),
                "source_updated_at": effective_time,

                # Additional provider-backed fields for newer UI versions.
                "title": item.get("title"),
                "medication": item.get("medication"),
                "matched_name": item.get("matched_name"),
                "category": item.get("category"),
            }
        )

    return {
        "active_medications": [
            {
                "id": medication.id,
                "name": medication.name,
                "dosage": medication.dosage,
            }
            for medication in medications
        ],
        "guidance": guidance,
        "unavailable": result.get("unavailable", []),
        "provider": "openFDA",
        "disclaimer": result["disclaimer"],
    }
