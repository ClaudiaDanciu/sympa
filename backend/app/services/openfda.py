from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"
OPENFDA_PUBLIC_SOURCE_URL = "https://open.fda.gov/apis/drug/label/"

SAFETY_FIELDS = (
    "boxed_warning",
    "warnings",
    "warnings_and_cautions",
    "drug_interactions",
    "contraindications",
    "precautions",
    "information_for_patients",
    "patient_medication_information",
)

# Common salt/form words that should not prevent a plain ingredient match.
FORM_WORDS = {
    "hydrochloride",
    "hcl",
    "sodium",
    "potassium",
    "calcium",
    "magnesium",
    "acetate",
    "succinate",
    "tartrate",
    "citrate",
    "phosphate",
    "sulfate",
    "sulphate",
    "fumarate",
    "maleate",
    "mesylate",
    "besylate",
    "monohydrate",
    "dihydrate",
    "anhydrous",
}


class OpenFDAError(RuntimeError):
    pass


@dataclass
class DrugLabelResult:
    query: str
    matched_name: str | None
    brand_names: list[str]
    generic_names: list[str]
    safety_sections: dict[str, list[str]]
    effective_time: str | None
    source_name: str
    source_url: str
    disclaimer: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "query": self.query,
            "matched_name": self.matched_name,
            "brand_names": self.brand_names,
            "generic_names": self.generic_names,
            "safety_sections": self.safety_sections,
            "effective_time": self.effective_time,
            "source_name": self.source_name,
            "source_url": self.source_url,
            "disclaimer": self.disclaimer,
        }


def get_drug_label(medication_name: str) -> DrugLabelResult | None:
    """
    Look up an FDA drug-label record by generic or brand name.

    Matching is deliberately conservative:
    - fetch several candidate labels;
    - prefer an exact single-ingredient generic match;
    - then prefer an exact brand match;
    - reject combination products when the query names only one ingredient.

    The function returns FDA label text. It does not decide whether a
    medication combination is safe and does not generate treatment advice.
    """

    name = medication_name.strip()
    if not name:
        return None

    api_key = os.getenv("OPENFDA_API_KEY", "").strip()
    if not api_key:
        raise OpenFDAError("OPENFDA_API_KEY is not configured.")

    candidates: list[dict[str, Any]] = []

    for field in ("openfda.generic_name", "openfda.brand_name"):
        candidates.extend(
            _request_candidates(
                api_key=api_key,
                field=field,
                medication_name=name,
            )
        )

    best = _choose_best_candidate(name, candidates)
    if best is None:
        return None

    return _build_result(name, best)


def _request_candidates(
    *,
    api_key: str,
    field: str,
    medication_name: str,
) -> list[dict[str, Any]]:
    escaped_name = medication_name.replace("\\", "\\\\").replace('"', '\\"')
    search = f'{field}:"{escaped_name}"'

    params = {
        "api_key": api_key,
        "search": search,
        "limit": 20,
    }

    url = f"{OPENFDA_LABEL_URL}?{urlencode(params)}"

    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "SYMPA/0.2",
        },
    )

    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code == 404:
            return []

        if exc.code in {401, 403}:
            raise OpenFDAError("openFDA rejected the API key.") from exc

        if exc.code == 429:
            raise OpenFDAError("openFDA rate limit reached.") from exc

        raise OpenFDAError(
            f"openFDA returned HTTP {exc.code}."
        ) from exc
    except (URLError, TimeoutError) as exc:
        raise OpenFDAError("Could not reach openFDA.") from exc
    except json.JSONDecodeError as exc:
        raise OpenFDAError("openFDA returned invalid JSON.") from exc

    return payload.get("results") or []


def _choose_best_candidate(
    query: str,
    candidates: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not candidates:
        return None

    query_core = _core_tokens(query)
    if not query_core:
        return None

    scored: list[tuple[int, dict[str, Any]]] = []

    for label in candidates:
        openfda = label.get("openfda") or {}
        generic_names = _string_list(openfda.get("generic_name"))
        brand_names = _string_list(openfda.get("brand_name"))

        score = _candidate_score(
            query=query,
            query_core=query_core,
            generic_names=generic_names,
            brand_names=brand_names,
        )

        if score > 0:
            scored.append((score, label))

    if not scored:
        return None

    scored.sort(key=lambda item: item[0], reverse=True)
    return scored[0][1]


def _candidate_score(
    *,
    query: str,
    query_core: set[str],
    generic_names: list[str],
    brand_names: list[str],
) -> int:
    best = 0
    query_normalized = _normalize_text(query)

    for generic in generic_names:
        generic_normalized = _normalize_text(generic)
        generic_core = _core_tokens(generic)

        # Strongest match: same active-ingredient core.
        # "metformin" matches "metformin hydrochloride".
        if generic_core == query_core:
            best = max(best, 100)

        # Exact textual generic match.
        if generic_normalized == query_normalized:
            best = max(best, 110)

        # Reject a combination product for a single-ingredient query.
        if query_core < generic_core:
            continue

    for brand in brand_names:
        if _normalize_text(brand) == query_normalized:
            best = max(best, 90)

    return best


def _build_result(
    medication_name: str,
    label: dict[str, Any],
) -> DrugLabelResult:
    openfda = label.get("openfda") or {}

    brand_names = _string_list(openfda.get("brand_name"))
    generic_names = _string_list(openfda.get("generic_name"))

    safety_sections: dict[str, list[str]] = {}
    for field in SAFETY_FIELDS:
        values = _string_list(label.get(field))
        if values:
            safety_sections[field] = values

    matched_name = (
        generic_names[0]
        if generic_names
        else brand_names[0]
        if brand_names
        else None
    )

    return DrugLabelResult(
        query=medication_name,
        matched_name=matched_name,
        brand_names=brand_names,
        generic_names=generic_names,
        safety_sections=safety_sections,
        effective_time=label.get("effective_time"),
        source_name="openFDA Drug Labeling",
        # Intentionally never return the request URL because it contains
        # the private API key.
        source_url=OPENFDA_PUBLIC_SOURCE_URL,
        disclaimer=(
            "FDA label information is provided as safety context only. "
            "Do not use SYMPA or openFDA alone to make medical-care "
            "decisions. Confirm medication and supplement decisions with "
            "a physician or pharmacist."
        ),
    )


def _normalize_text(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def _core_tokens(value: str) -> set[str]:
    tokens = set(_normalize_text(value).split())
    return {token for token in tokens if token not in FORM_WORDS}


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        text = value.strip()
        return [text] if text else []

    if isinstance(value, list):
        return [
            item.strip()
            for item in value
            if isinstance(item, str) and item.strip()
        ]

    return []
