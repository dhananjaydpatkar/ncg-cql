"""
Generates FHIR CodeSystem / ValueSet / ConceptMap resources from
terminology/codesystems.py -- the single source of truth also used
directly by the Python pipeline (terminology/termservice.py) and
referenced by the CQL libraries' valueset declarations.

Run from the project root: python fhir-profiles/generate_terminology.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from terminology.codesystems import ALL_CODESYSTEMS  # noqa: E402

OUT_DIR = os.path.dirname(__file__)
NCG_VS_BASE = "http://ncgindia.org/fhir/ValueSet"
NCG_CM_BASE = "http://ncgindia.org/fhir/ConceptMap"


def build_codesystem(key: str, cs: dict) -> dict:
    return {
        "resourceType": "CodeSystem",
        "id": f"ncg-{key}",
        "url": cs["system"],
        "version": "0.1.0-draft",
        "name": "".join(w.capitalize() for w in key.split("-")),
        "status": "draft",
        "content": "complete",
        "concept": [
            {"code": code, "display": concept["display"]}
            for code, concept in cs["concepts"].items()
        ],
    }


def build_valueset(key: str, cs: dict) -> dict:
    return {
        "resourceType": "ValueSet",
        "id": f"ncg-{key}",
        "url": f"{NCG_VS_BASE}/ncg-{key}",
        "version": "0.1.0-draft",
        "name": "".join(w.capitalize() for w in key.split("-")) + "ValueSet",
        "status": "draft",
        "compose": {
            "include": [
                {
                    "system": cs["system"],
                    "concept": [
                        {"code": code, "display": concept["display"]}
                        for code, concept in cs["concepts"].items()
                    ],
                }
            ]
        },
    }


def build_conceptmap(key: str, cs: dict) -> dict | None:
    """Only emit a ConceptMap for code systems that declare cross_map hints."""
    elements = []
    for code, concept in cs["concepts"].items():
        cross = concept.get("cross_map")
        if not cross:
            continue
        elements.append(
            {
                "code": code,
                "display": concept["display"],
                "target": [
                    {
                        "code": cross["code"],
                        "equivalence": "equivalent" if cross["code"] != "PENDING-VERIFICATION" else "unmatched",
                        "comment": (
                            "Illustrative mapping pending confirmation against the live "
                            "SNOMED CT-IN / LOINC release -- see terminology/codesystems.py docstring."
                            if cross["code"] == "PENDING-VERIFICATION"
                            else None
                        ),
                    }
                ],
            }
        )
    if not elements:
        return None
    return {
        "resourceType": "ConceptMap",
        "id": f"ncg-{key}-to-national-terminology",
        "url": f"{NCG_CM_BASE}/ncg-{key}-to-national-terminology",
        "version": "0.1.0-draft",
        "status": "draft",
        "sourceUri": cs["system"],
        "group": [
            {
                "source": cs["system"],
                "target": "http://snomed.info/sct (India Edition) / http://loinc.org",
                "element": elements,
            }
        ],
    }


def main():
    for key, cs in ALL_CODESYSTEMS.items():
        codesystem = build_codesystem(key, cs)
        with open(os.path.join(OUT_DIR, f"CodeSystem-ncg-{key}.json"), "w") as f:
            json.dump(codesystem, f, indent=2)
        print(f"wrote CodeSystem-ncg-{key}.json")

        valueset = build_valueset(key, cs)
        with open(os.path.join(OUT_DIR, f"ValueSet-ncg-{key}.json"), "w") as f:
            json.dump(valueset, f, indent=2)
        print(f"wrote ValueSet-ncg-{key}.json")

        conceptmap = build_conceptmap(key, cs)
        if conceptmap:
            with open(os.path.join(OUT_DIR, f"ConceptMap-ncg-{key}-to-national-terminology.json"), "w") as f:
                json.dump(conceptmap, f, indent=2)
            print(f"wrote ConceptMap-ncg-{key}-to-national-terminology.json")


if __name__ == "__main__":
    main()
