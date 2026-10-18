"""
Synoptic PDF -> structured field extractor.

Because synoptic reporting is assumed already in place, extraction is
deterministic template matching against known labels -- NOT general
NLP/LLM extraction over narrative text. Each line of the PDF is checked
against the known label set for the template; the text after the label
is normalized against that field's closed value set.

If a value cannot be normalized (doesn't match the expected set), the
field is emitted with status="unparsed" and value=None, carrying the
raw text forward for human review -- it is never silently coerced into
a default. This is the concrete, code-level implementation of the
"never let unverified data silently drive a branch" rule from the MVP
plan's guardrails section.

For genuinely unstructured narrative documents (discharge summaries,
free-text pathology notes) this module would need to be replaced/
supplemented by an NLP or LLM extraction stage that emits the SAME
output shape (value + status + raw_text), just with status values of
"nlp-extracted-high-confidence" / "nlp-extracted-low-confidence"
instead of "structured-capture" / "unparsed". That swap point is
called out explicitly in fhir_mapping/mapper.py.
"""

from dataclasses import dataclass
from typing import Optional, Any
import pdfplumber

from .synoptic_templates import FL_INITIAL_WORKUP_TEMPLATE


@dataclass
class ExtractedField:
    key: str
    raw_text: Optional[str]
    value: Any
    status: str  # "structured-capture" | "unparsed" | "missing"


def _extract_lines(pdf_path: str):
    lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            lines.extend(text.split("\n"))
    return lines


def extract_fields(pdf_path: str, template: dict = None) -> dict:
    """
    Returns {field_key: ExtractedField}, one entry per field defined in
    the template (fields not found in the document are status="missing").
    """
    template = template or FL_INITIAL_WORKUP_TEMPLATE
    lines = _extract_lines(pdf_path)

    # Build a reverse index: label text -> field key, for quick matching.
    label_to_field = {}
    for field_key, spec in template["fields"].items():
        for label in spec["labels"]:
            label_to_field[label] = field_key

    found = {}
    for line in lines:
        line = line.strip()
        for label, field_key in label_to_field.items():
            if line.startswith(label):
                raw_value = line[len(label):].strip()
                found[field_key] = raw_value
                break

    results = {}
    for field_key, spec in template["fields"].items():
        raw = found.get(field_key)
        if raw is None:
            results[field_key] = ExtractedField(field_key, None, None, "missing")
            continue

        normalizer = spec.get("normalizer")
        if normalizer is None:
            # Free-text / quantity fields: pass through, lightly typed.
            value = raw
            if spec["value_type"] == "quantity":
                try:
                    value = float(raw)
                except ValueError:
                    results[field_key] = ExtractedField(field_key, raw, None, "unparsed")
                    continue
            results[field_key] = ExtractedField(field_key, raw, value, "structured-capture")
            continue

        normalized = normalizer(raw)
        if normalized is None:
            # Value didn't match the field's expected value set -- flag,
            # don't guess. (e.g. "Sample under processing, report awaited
            # from referral lab" for a FISH result.)
            results[field_key] = ExtractedField(field_key, raw, None, "unparsed")
        else:
            results[field_key] = ExtractedField(field_key, raw, normalized, "structured-capture")

    return results


if __name__ == "__main__":
    import sys
    import json

    path = sys.argv[1] if len(sys.argv) > 1 else "sample_data/sample_fl_case_advanced_high_burden.pdf"
    fields = extract_fields(path)
    for k, f in fields.items():
        print(f"{k:30s} status={f.status:12s} value={f.value!r:20} raw={f.raw_text!r}")
