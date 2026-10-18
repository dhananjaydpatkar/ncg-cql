"""
Generates the NCG-Heme Observation/Condition profile StructureDefinitions
from a single data-dictionary table for Follicular Lymphoma.
"""

import json
import os

BASE_OBSERVATION = "http://hl7.org/fhir/StructureDefinition/Observation"
BASE_CONDITION = "http://hl7.org/fhir/StructureDefinition/Condition"
NCG_SD_BASE = "http://ncgindia.org/fhir/StructureDefinition"

OUT_DIR = os.path.dirname(__file__)

# id -> (title, description, tier, base)
PROFILES = {
    "ncg-condition-heme-malignancy": (
        "NCG Hematolymphoid Malignancy Condition",
        "Condition profile for a hematolymphoid malignancy diagnosis (e.g. Follicular Lymphoma, DLBCL), coded via ICD-O-3 morphology/topography per EHR Standards for India.",
        "essential",
        BASE_CONDITION,
    ),
    "ncg-observation-lymphoma-histology": (
        "NCG Lymphoma Histology and Grade Observation",
        "Biopsy and immunohistochemistry finding: Grade I/II, Grade IIIa, Grade IIIb, or Duodenal-type FL.",
        "essential",
        BASE_OBSERVATION,
    ),
    "ncg-observation-ann-arbor-stage": (
        "NCG Ann Arbor Stage Observation",
        "Staging observation: Stage I to IV with nodal contiguity assessment for Stage II.",
        "essential",
        BASE_OBSERVATION,
    ),
    "ncg-observation-gelf-burden": (
        "NCG GELF Tumour Burden Observation",
        "Tumour burden assessment per Groupe d'Etude des Lymphomes Folliculaires (GELF) criteria.",
        "essential",
        BASE_OBSERVATION,
    ),
    "ncg-observation-flipi-score": (
        "NCG FLIPI Prognostic Score Observation",
        "Follicular Lymphoma International Prognostic Index (FLIPI) score (0-5) and risk group.",
        "optimal",
        BASE_OBSERVATION,
    ),
    "ncg-observation-fitness-flag": (
        "NCG Clinical Fitness Flag Observation",
        "Boolean clinical flags (fit for bendamustine, fit for anthracycline, fit for RT, bone marrow clearance).",
        "essential",
        BASE_OBSERVATION,
    ),
    "ncg-observation-performance-status": (
        "NCG Performance Status Observation",
        "ECOG performance status, LOINC-coded.",
        "essential",
        BASE_OBSERVATION,
    ),
    "ncg-observation-renal-function": (
        "NCG Renal Function Observation",
        "Serum creatinine / calculated creatinine clearance, LOINC-coded.",
        "essential",
        BASE_OBSERVATION,
    ),
}


def build_structure_definition(profile_id: str, title: str, description: str, tier: str, base: str) -> dict:
    resource_type = "Condition" if base == BASE_CONDITION else "Observation"
    return {
        "resourceType": "StructureDefinition",
        "id": profile_id,
        "url": f"{NCG_SD_BASE}/{profile_id}",
        "version": "0.1.0-draft",
        "name": "".join(w.capitalize() for w in profile_id.replace("ncg-", "").split("-")),
        "title": title,
        "status": "draft",
        "description": description,
        "purpose": f"NCG data-dictionary tier: {tier}. See fhir-profiles/generate_profiles.py PROFILES table.",
        "fhirVersion": "4.0.1",
        "kind": "resource",
        "abstract": False,
        "type": resource_type,
        "baseDefinition": base,
        "derivation": "constraint",
        "differential": {
            "element": [
                {
                    "id": f"{resource_type}",
                    "path": resource_type,
                    "mustSupport": True,
                },
                {
                    "id": f"{resource_type}.extension:dataProvenance",
                    "path": f"{resource_type}.extension",
                    "sliceName": "dataProvenance",
                    "min": 1,
                    "max": "1",
                    "type": [
                        {
                            "code": "Extension",
                            "profile": [f"{NCG_SD_BASE}/ncg-extension-data-provenance"],
                        }
                    ],
                    "mustSupport": True,
                }
            ]
        },
    }


def main():
    for profile_id, (title, description, tier, base) in PROFILES.items():
        sd = build_structure_definition(profile_id, title, description, tier, base)
        out_path = os.path.join(OUT_DIR, f"StructureDefinition-{profile_id}.json")
        with open(out_path, "w") as f:
            json.dump(sd, f, indent=2)
        print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
