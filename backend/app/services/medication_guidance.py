from __future__ import annotations

import re
from dataclasses import dataclass
from itertools import combinations
from typing import Any

from app.services.nih_ods import get_pair_guidance
from app.services.openfda import OpenFDAError, get_drug_label


MAX_GUIDANCE_ITEMS_PER_MEDICATION = 4
MAX_TEXT_LENGTH = 700


@dataclass
class GuidanceItem:
    medication: str
    matched_name: str | None
    category: str
    title: str
    message: str
    severity: str
    source_name: str
    source_url: str
    effective_time: str | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "medication": self.medication,
            "matched_name": self.matched_name,
            "category": self.category,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "source_name": self.source_name,
            "source_url": self.source_url,
            "effective_time": self.effective_time,
        }


def build_medication_guidance(
    medication_names: list[str],
) -> dict[str, Any]:
    """
    Build deterministic guidance from authoritative providers.

    - Curated NIH ODS evidence is checked for supplement/supplement pairs.
    - openFDA is checked for FDA drug-label safety sections.

    The service does not invent interaction conclusions. It only surfaces
    guidance supported by the source returned by each provider.
    """

    cleaned_names = _unique_names(medication_names)
    guidance: list[GuidanceItem] = []
    unavailable: list[dict[str, str]] = []

    # First: pairwise supplement guidance from curated NIH ODS evidence.
    for name_a, name_b in combinations(cleaned_names, 2):
        evidence = get_pair_guidance(name_a, name_b)

        if evidence is not None:
            guidance.append(
                GuidanceItem(
                    medication=f"{name_a} + {name_b}",
                    matched_name=(
                        f"{evidence.supplement} + "
                        f"{evidence.counterpart}"
                    ),
                    category="supplement_timing",
                    title=evidence.title,
                    message=_clean_and_limit(
                        evidence.message
                    ),
                    severity="attention",
                    source_name=evidence.source_name,
                    source_url=evidence.source_url,
                    effective_time=None,
                )
            )

    # Second: FDA label context for names openFDA can resolve.
    for medication_name in cleaned_names:
        try:
            label = get_drug_label(medication_name)
        except OpenFDAError as exc:
            unavailable.append(
                {
                    "medication": medication_name,
                    "reason": str(exc),
                }
            )
            continue

        if label is None:
            continue

        items = _guidance_from_label(
            medication_name=medication_name,
            label=label,
        )

        guidance.extend(
            items[:MAX_GUIDANCE_ITEMS_PER_MEDICATION]
        )

    guidance = _deduplicate_guidance(guidance)

    return {
        "active_medications": cleaned_names,
        "guidance": [
            item.as_dict()
            for item in guidance
        ],
        "unavailable": unavailable,
        "providers": [
            "NIH ODS curated evidence",
            "openFDA",
        ],
        "disclaimer": (
            "SYMPA is showing information extracted from authoritative "
            "health sources. It does not determine whether a medication "
            "or supplement combination is safe for you. Confirm medication, "
            "supplement, food, and timing decisions with a physician or "
            "pharmacist."
        ),
    }


def _guidance_from_label(
    *,
    medication_name: str,
    label: Any,
) -> list[GuidanceItem]:
    sections = label.safety_sections
    items: list[GuidanceItem] = []

    interaction_texts = sections.get(
        "drug_interactions",
        [],
    )
    interaction_items = _extract_interaction_items(
        interaction_texts
    )

    for title, message in interaction_items:
        items.append(
            GuidanceItem(
                medication=medication_name,
                matched_name=label.matched_name,
                category="drug_interactions",
                title=title,
                message=_clean_and_limit(message),
                severity="attention",
                source_name=label.source_name,
                source_url=label.source_url,
                effective_time=label.effective_time,
            )
        )

    if not items:
        for field, title in (
            (
                "warnings_and_cautions",
                "FDA label warning",
            ),
            (
                "warnings",
                "FDA label warning",
            ),
            (
                "contraindications",
                "FDA label contraindication information",
            ),
        ):
            values = sections.get(field, [])

            if not values:
                continue

            summary = _first_meaningful_sentences(
                values[0],
                sentence_count=2,
            )

            if summary:
                items.append(
                    GuidanceItem(
                        medication=medication_name,
                        matched_name=label.matched_name,
                        category=field,
                        title=title,
                        message=_clean_and_limit(
                            summary
                        ),
                        severity="attention",
                        source_name=label.source_name,
                        source_url=label.source_url,
                        effective_time=label.effective_time,
                    )
                )
                break

    return items


def _extract_interaction_items(
    interaction_texts: list[str],
) -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []

    for raw_text in interaction_texts:
        text = _normalize_whitespace(
            raw_text
        )

        structured = _extract_clinical_impact_blocks(
            text
        )

        if structured:
            items.extend(structured)
            continue

        fallback = _first_meaningful_sentences(
            text,
            sentence_count=3,
        )

        if fallback:
            items.append(
                (
                    "FDA label interaction information",
                    fallback,
                )
            )

    return _deduplicate_items(items)


def _extract_clinical_impact_blocks(
    text: str,
) -> list[tuple[str, str]]:
    marker = "Clinical Impact:"

    if marker.casefold() not in text.casefold():
        return []

    pattern = re.compile(
        r"(?P<title>"
        r"[A-Z][A-Za-z0-9 /(),+\-]{2,100}?"
        r")\s+Clinical Impact:\s*"
        r"(?P<impact>.*?)"
        r"(?:\s+Intervention:\s*(?P<intervention>.*?))?"
        r"(?:\s+Examples?:\s*(?P<examples>.*?))?"
        r"(?="
        r"\s+[A-Z][A-Za-z0-9 /(),+\-]{2,100}?"
        r"\s+Clinical Impact:"
        r"|$"
        r")",
        flags=re.IGNORECASE | re.DOTALL,
    )

    results: list[tuple[str, str]] = []

    for match in pattern.finditer(text):
        title = _normalize_whitespace(
            match.group("title")
        )
        impact = _normalize_whitespace(
            match.group("impact") or ""
        )
        intervention = _normalize_whitespace(
            match.group("intervention") or ""
        )
        examples = _normalize_whitespace(
            match.group("examples") or ""
        )

        parts: list[str] = []

        if impact:
            parts.append(impact)

        if intervention:
            parts.append(
                f"FDA label guidance: {intervention}"
            )

        if examples:
            parts.append(
                f"Examples listed: {examples}"
            )

        message = " ".join(parts).strip()

        if message:
            results.append(
                (
                    title
                    or "FDA label interaction information",
                    message,
                )
            )

    return results


def _first_meaningful_sentences(
    text: str,
    *,
    sentence_count: int,
) -> str:
    text = _normalize_whitespace(text)

    text = re.sub(
        r"^\d+\s+[A-Z][A-Z\s/&,\-]+",
        "",
        text,
    ).strip()

    sentences = re.split(
        r"(?<=[.!?])\s+",
        text,
    )

    selected: list[str] = []

    for sentence in sentences:
        sentence = sentence.strip()

        if len(sentence) < 20:
            continue

        selected.append(sentence)

        if len(selected) >= sentence_count:
            break

    return " ".join(selected)


def _clean_and_limit(text: str) -> str:
    text = _normalize_whitespace(text)

    if len(text) <= MAX_TEXT_LENGTH:
        return text

    shortened = text[:MAX_TEXT_LENGTH].rsplit(
        " ",
        1,
    )[0]
    return f"{shortened}…"


def _normalize_whitespace(
    text: str,
) -> str:
    return " ".join(text.split())


def _unique_names(
    names: list[str],
) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()

    for value in names:
        name = value.strip()
        key = name.casefold()

        if not name or key in seen:
            continue

        seen.add(key)
        result.append(name)

    return result


def _deduplicate_items(
    items: list[tuple[str, str]],
) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for title, message in items:
        key = (
            title.casefold().strip(),
            message.casefold().strip(),
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(
            (title, message)
        )

    return result


def _deduplicate_guidance(
    items: list[GuidanceItem],
) -> list[GuidanceItem]:
    result: list[GuidanceItem] = []
    seen: set[
        tuple[str, str, str]
    ] = set()

    for item in items:
        key = (
            item.title.casefold().strip(),
            item.message.casefold().strip(),
            item.source_name.casefold().strip(),
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(item)

    return result
