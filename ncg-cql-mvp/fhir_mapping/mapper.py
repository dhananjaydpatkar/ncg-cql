"""
Structured Follicular Lymphoma fields -> FHIR Bundle.

Conforms to NCG-Heme profile package in fhir-profiles/ (derived from ABDM FHIR IG R4).
Every Observation carries ncg-extension-data-provenance gating NCG_FL_2020.cql's
IsUsable() verification check.
"""

import uuid
from datetime import datetime, timezone
from terminology.termservice import TerminologyService

NCG_PROFILE_BASE = "http://ncgindia.org/fhir/StructureDefinition"
NCG_EXTENSION_PROVENANCE = f"{NCG_PROFILE_BASE}/ncg-extension-data-provenance"

_PROVENANCE_MAP = {
    "structured-capture": "structured-capture",
    "nlp-extracted-high-confidence": "nlp-extracted-high-confidence",
    "nlp-extracted-low-confidence": "nlp-extracted-low-confidence",
    "unparsed": "unparsed",
    "missing": "missing",
}

term = TerminologyService()


def _provenance_extension(status: str) -> dict:
    provenance_code = _PROVENANCE_MAP.get(status, "missing")
    coding = term.to_coding("data-provenance", provenance_code)
    return {
        "url": NCG_EXTENSION_PROVENANCE,
        "valueCodeableConcept": {"coding": [coding]},
    }


def _new_id() -> str:
    return str(uuid.uuid4())


def _obs_shell(profile: str, code_coding: list, subject_ref: str, provenance_status: str) -> dict:
    return {
        "resourceType": "Observation",
        "id": _new_id(),
        "meta": {"profile": [profile]},
        "status": "final" if provenance_status not in ("missing",) else "unknown",
        "extension": [_provenance_extension(provenance_status)],
        "code": {"coding": code_coding},
        "subject": {"reference": subject_ref},
    }


def build_patient_bundle(fields: dict, patient_id: str = None) -> dict:
    """
    Takes extracted fields dict from extraction/pdf_extractor.py and builds
    an ABDM-aligned FHIR Bundle (type=collection).
    """
    patient_id = patient_id or _new_id()
    subject_ref = f"Patient/{patient_id}"
    now = datetime.now(timezone.utc).isoformat()

    entries = []

    # 1. Patient Resource
    abha_f = fields.get("abha_id")
    name_f = fields.get("patient_name")
    age_f = fields.get("age")
    gender_f = fields.get("gender")

    patient_resource = {
        "resourceType": "Patient",
        "id": patient_id,
        "identifier": [
            {
                "system": "https://healthid.ndhm.gov.in",
                "value": abha_f.value if abha_f and abha_f.value else "ABHA-UNASSIGNED",
            }
        ],
        "name": [
            {
                "use": "official",
                "text": name_f.value if name_f and name_f.value else "Anonymous Patient",
            }
        ],
        "gender": (gender_f.value.lower() if gender_f and gender_f.value in ("male", "female", "other") else "unknown"),
    }
    entries.append({"resource": patient_resource})

    # 2. Primary Condition: Follicular Lymphoma
    entries.append(
        {
            "resource": {
                "resourceType": "Condition",
                "id": _new_id(),
                "meta": {"profile": [f"{NCG_PROFILE_BASE}/ncg-condition-heme-malignancy"]},
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "55342001",
                            "display": "Follicular lymphoma (disorder)",
                        }
                    ]
                },
                "subject": {"reference": subject_ref},
                "recordedDate": now,
            }
        }
    )

    # 3. Observation: Lymphoma Histology & Grade
    hist_f = fields.get("histology_grade")
    if hist_f:
        hist_code = hist_f.value if hist_f.value else "fl-grade-1-2"
        obs = _obs_shell(
            f"{NCG_PROFILE_BASE}/ncg-observation-lymphoma-histology",
            [term.to_coding("lymphoma-histology", hist_code)],
            subject_ref,
            hist_f.status,
        )
        if hist_f.raw_text:
            obs["note"] = [{"text": hist_f.raw_text}]
        entries.append({"resource": obs})

    # 4. Observation: Ann Arbor Stage
    stage_f = fields.get("ann_arbor_stage")
    if stage_f:
        stage_code = stage_f.value if stage_f.value else "stage-3"
        obs = _obs_shell(
            f"{NCG_PROFILE_BASE}/ncg-observation-ann-arbor-stage",
            [term.to_coding("ann-arbor-stage", stage_code)],
            subject_ref,
            stage_f.status,
        )
        entries.append({"resource": obs})

    # 5. Observation: Stage II Contiguity (if applicable)
    cont_f = fields.get("stage_2_contiguity")
    if cont_f and cont_f.value:
        obs = _obs_shell(
            f"{NCG_PROFILE_BASE}/ncg-observation-ann-arbor-stage",
            [term.to_coding("stage-2-contiguity", cont_f.value)],
            subject_ref,
            cont_f.status,
        )
        entries.append({"resource": obs})

    # 6. Observation: GELF Tumour Burden
    gelf_f = fields.get("gelf_tumour_burden")
    if gelf_f:
        gelf_code = gelf_f.value if gelf_f.value else "high-burden"
        obs = _obs_shell(
            f"{NCG_PROFILE_BASE}/ncg-observation-gelf-burden",
            [term.to_coding("gelf-tumour-burden", gelf_code)],
            subject_ref,
            gelf_f.status,
        )
        entries.append({"resource": obs})

    # 7. Clinical Flags: Fit for RT, Fit for Bendamustine, Fit for Anthracycline, Bone Marrow Cleared
    flags_map = [
        ("bone_marrow_cleared", "bone-marrow-cleared"),
        ("fit_for_radiotherapy", "fit-for-radiotherapy"),
        ("fit_for_bendamustine", "fit-for-bendamustine"),
        ("fit_for_anthracycline", "fit-for-anthracycline"),
        ("serum_ldh_elevated", "high-ldh-or-proliferation"),
        ("b_symptoms", "b-symptoms-present"),
        ("bulky_mass_gt_7cm", "bulky-mass-gt-7cm"),
    ]

    for field_key, flag_code in flags_map:
        f_obj = fields.get(field_key)
        if f_obj and f_obj.status != "missing":
            obs = _obs_shell(
                f"{NCG_PROFILE_BASE}/ncg-observation-fitness-flag",
                [term.to_coding("clinical-flag", flag_code)],
                subject_ref,
                f_obj.status,
            )
            obs["valueBoolean"] = bool(f_obj.value)
            entries.append({"resource": obs})

    # 8. Observation: Performance Status (ECOG)
    ecog_f = fields.get("ecog_ps")
    if ecog_f and ecog_f.value is not None:
        obs = _obs_shell(
            f"{NCG_PROFILE_BASE}/ncg-observation-performance-status",
            [
                {
                    "system": "http://loinc.org",
                    "code": "89247-1",
                    "display": "ECOG Performance Status",
                }
            ],
            subject_ref,
            ecog_f.status,
        )
        obs["valueInteger"] = int(ecog_f.value)
        entries.append({"resource": obs})

    return {
        "resourceType": "Bundle",
        "id": f"bundle-{patient_id}",
        "type": "collection",
        "timestamp": now,
        "entry": entries,
    }
