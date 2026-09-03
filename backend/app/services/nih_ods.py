from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


ODS_SOURCE_NAME = "NIH Office of Dietary Supplements"

# Curated, provenance-backed supplement evidence.
# Keep this dataset small and explicit. Add new entries only after reviewing
# an authoritative source and preserving the source URL.
PAIR_EVIDENCE: dict[frozenset[str], dict[str, str]] = {
    frozenset({"calcium", "iron"}): {
        "title": "Take calcium and iron at different times",
        "message": (
            "Calcium may interfere with iron absorption. NIH Office of "
            "Dietary Supplements recommends taking calcium and iron "
            "supplements at different times of day."
        ),
        "source_url": "https://ods.od.nih.gov/factsheets/Iron-Consumer/",
        "reviewed_on": "2026-09-01",
    },
}


@dataclass
class SupplementEvidence:
    supplement: str
    counterpart: str
    title: str
    message: str
    source_name: str
    source_url: str
    reviewed_on: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "supplement": self.supplement,
            "counterpart": self.counterpart,
            "title": self.title,
            "message": self.message,
            "source_name": self.source_name,
            "source_url": self.source_url,
            "reviewed_on": self.reviewed_on,
        }


def get_pair_guidance(
    supplement_a: str,
    supplement_b: str,
) -> SupplementEvidence | None:
    """
    Return curated NIH ODS evidence for a supplement pair.

    This provider does not make live NIH requests. It only returns
    evidence that has been explicitly reviewed and stored with provenance.
    """

    a = _normalize_name(supplement_a)
    b = _normalize_name(supplement_b)

    if not a or not b or a == b:
        return None

    evidence = PAIR_EVIDENCE.get(frozenset({a, b}))
    if evidence is None:
        return None

    return SupplementEvidence(
        supplement=_display_name(a),
        counterpart=_display_name(b),
        title=evidence["title"],
        message=evidence["message"],
        source_name=ODS_SOURCE_NAME,
        source_url=evidence["source_url"],
        reviewed_on=evidence.get("reviewed_on"),
    )


def is_supported_supplement(name: str) -> bool:
    normalized = _normalize_name(name)

    return any(
        normalized in pair
        for pair in PAIR_EVIDENCE
    )


def _normalize_name(value: str) -> str:
    value = value.casefold().strip()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def _display_name(value: str) -> str:
    return " ".join(
        word.capitalize()
        for word in value.split()
    )
