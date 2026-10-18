"""
End-to-end pipeline: synoptic PDF -> FHIR Bundle -> CQL evaluation -> report.

    python3 -m engine.run_pipeline sample_data/sample_fl_case_advanced_high_burden.pdf
"""

import json
import sys

from extraction.pdf_extractor import extract_fields
from fhir_mapping.mapper import build_patient_bundle
from engine.cql_lite_fl import classify_fl

EVALUATE_VIA = "python_reference"


def run(pdf_path: str) -> dict:
    fields = extract_fields(pdf_path)
    bundle = build_patient_bundle(fields)

    if EVALUATE_VIA == "python_reference":
        result = classify_fl(bundle)
    else:
        raise NotImplementedError(
            "cql_execution integration is not wired up in this sandbox. "
            "See engine/js/evaluate_via_cql_execution.js for the intended call shape."
        )

    unparsed_fields = [k for k, f in fields.items() if f.status == "unparsed"]
    missing_fields = [k for k, f in fields.items() if f.status == "missing"]

    report = {
        "source_pdf": pdf_path,
        "cql_library": "NCG_FL_2020 v0.1.0 (via NCGCommon v0.1.0)",
        "evaluated_via": EVALUATE_VIA,
        "treatment_group": result.treatment_group,
        "recommended_regimens": result.recommended_regimens,
        "rationale": result.rationale,
        "data_quality_warnings": result.data_quality_warnings,
        "extraction_summary": {
            "unparsed_fields": unparsed_fields,
            "missing_fields": missing_fields,
        },
        "requires_human_review": result.treatment_group == "needs-review" or bool(unparsed_fields),
    }
    return report, bundle


def _print_human_readable(report: dict):
    print("=" * 78)
    print("NCG Follicular Lymphoma Pathway - Recommendation Report")
    print(f"Source: {report['source_pdf']}")
    print("=" * 78)
    print(f"Treatment group : {report['treatment_group'].upper()}")
    print("Regimen options :")
    for r in report["recommended_regimens"]:
        print(f"  - {r}")
    print("\nRationale (per NCG_FL_2020.cql 'ClassificationRationale'):")
    for line in report["rationale"]:
        print(f"  - {line}")
    if report["data_quality_warnings"]:
        print("\n/!\\ DATA QUALITY & SAFETY WARNINGS:")
        for w in report["data_quality_warnings"]:
            print(f"  - {w}")
    if report["extraction_summary"]["unparsed_fields"]:
        print(f"\nUnparsed fields (raw text preserved, not guessed): "
              f"{report['extraction_summary']['unparsed_fields']}")
    print(f"\nRequires human review: {report['requires_human_review']}")
    print("=" * 78)


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "sample_data/sample_fl_case_advanced_high_burden.pdf"
    report, bundle = run(path)
    _print_human_readable(report)

    if "--json" in sys.argv:
        print(json.dumps(report, indent=2))
    if "--bundle" in sys.argv:
        print(json.dumps(bundle, indent=2))
