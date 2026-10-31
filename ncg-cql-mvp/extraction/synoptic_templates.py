"""
Synoptic report field schemas for Follicular Lymphoma Initial Workup.

Source: Hematolymphoid Clinical Management Guidelines:
  - Follicular Lymphoma Treatment Workflow
  - Lymphoma Workup Flowchart & Annexure Synoptic Reporting Format

Normalizers extract structured values from synoptic lines. If a value
does not match the expected set, it is emitted as status='unparsed'
with raw text intact, triggering safety guardrails.
"""


def _histology_normalizer(raw: str):
    t = raw.strip().lower()
    if "transformed" in t or "dlbcl" in t:
        return "transformed-dlbcl"
    if "3b" in t or "iiib" in t:
        return "fl-grade-3b"
    if "3a" in t or "iiia" in t:
        return "fl-grade-3a"
    if "grade 1-2" in t or "grade 1" in t or "grade 2" in t or "grade i" in t or "grade ii" in t or "low grade" in t:
        return "fl-grade-1-2"
    if "duodenal" in t:
        return "fl-duodenal"
    return None  # Unparsed -- flags needs review


def _stage_normalizer(raw: str):
    t = raw.strip().lower()
    if "iv" in t or "stage 4" in t or "stage iv" in t:
        return "stage-4"
    if "iii" in t or "stage 3" in t or "stage iii" in t:
        return "stage-3"
    if "ii" in t or "stage 2" in t or "stage ii" in t:
        return "stage-2"
    if "i" in t or "stage 1" in t or "stage i" in t:
        return "stage-1"
    return None


def _contiguity_normalizer(raw: str):
    t = raw.strip().lower()
    if "non-contiguous" in t or "noncontiguous" in t or "disparate" in t:
        return "non-contiguous"
    if "contiguous" in t or "single field" in t or "yes" in t:
        return "contiguous"
    return None


def _gelf_burden_normalizer(raw: str):
    t = raw.strip().lower()
    if "high" in t or "high-burden" in t or "yes" in t:
        return "high-burden"
    if "low" in t or "low-burden" in t or "no" in t:
        return "low-burden"
    return None


def _bm_biopsy_normalizer(raw: str):
    t = raw.strip().lower()
    if "negative" in t or "uninvolved" in t or "cleared" in t or "normal" in t or "no lymphoma" in t:
        return True
    if "positive" in t or "involved" in t or "infiltrate" in t:
        return False
    return None  # unparsed / not done


def _yes_no_normalizer(raw: str):
    t = raw.strip().lower()
    if t in ("yes", "y", "true", "present", "fit", "cleared"):
        return True
    if t in ("no", "n", "false", "absent", "unfit", "involved"):
        return False
    return None


FL_INITIAL_WORKUP_TEMPLATE = {
    "template_id": "ncg-fl-initial-workup-v1",
    "fields": {
        "abha_id": {
            "labels": ["ABHA ID:"],
            "value_type": "string",
        },
        "patient_name": {
            "labels": ["Patient Name:"],
            "value_type": "string",
        },
        "age": {
            "labels": ["Age:"],
            "value_type": "quantity",
            "unit": "years",
        },
        "gender": {
            "labels": ["Gender:"],
            "value_type": "string",
        },
        "report_date": {
            "labels": ["Report Date:"],
            "value_type": "string",
        },
        "histology_grade": {
            "labels": ["Histological Subtype & Grade:", "Histology & Grade:", "Diagnosis:"],
            "value_type": "code",
            "codesystem": "lymphoma-histology",
            "normalizer": _histology_normalizer,
        },
        "ann_arbor_stage": {
            "labels": ["Ann Arbor Stage:", "Stage:"],
            "value_type": "code",
            "codesystem": "ann-arbor-stage",
            "normalizer": _stage_normalizer,
        },
        "stage_2_contiguity": {
            "labels": ["Stage II Nodal Contiguity:", "Nodal Contiguity:"],
            "value_type": "code",
            "codesystem": "stage-2-contiguity",
            "normalizer": _contiguity_normalizer,
        },
        "bone_marrow_cleared": {
            "labels": ["Bone Marrow Biopsy:", "Bone Marrow Status:"],
            "value_type": "boolean",
            "normalizer": _bm_biopsy_normalizer,
        },
        "gelf_tumour_burden": {
            "labels": ["GELF Tumour Burden:", "Tumour Burden (GELF):"],
            "value_type": "code",
            "codesystem": "gelf-tumour-burden",
            "normalizer": _gelf_burden_normalizer,
        },
        "b_symptoms": {
            "labels": ["B Symptoms (fever/sweats/weight loss):", "B Symptoms:"],
            "value_type": "boolean",
            "normalizer": _yes_no_normalizer,
        },
        "bulky_mass_gt_7cm": {
            "labels": ["Bulky Mass (> 7 cm):"],
            "value_type": "boolean",
            "normalizer": _yes_no_normalizer,
        },
        "serum_ldh_elevated": {
            "labels": ["Serum LDH Elevated (>ULN):", "Serum LDH:"],
            "value_type": "boolean",
            "normalizer": _yes_no_normalizer,
        },
        "fit_for_radiotherapy": {
            "labels": ["Fit and Suitable for RT (ISRT/IFRT):", "Fit for RT:"],
            "value_type": "boolean",
            "normalizer": _yes_no_normalizer,
        },
        "fit_for_bendamustine": {
            "labels": ["Fit for Bendamustine (BR):", "Fit for Bendamustine:"],
            "value_type": "boolean",
            "normalizer": _yes_no_normalizer,
        },
        "fit_for_anthracycline": {
            "labels": ["Fit for Anthracycline / R-CHOP:", "Fit for R-CHOP:"],
            "value_type": "boolean",
            "normalizer": _yes_no_normalizer,
        },
        "ecog_ps": {
            "labels": ["ECOG Performance Status:"],
            "value_type": "quantity",
            "unit": "score",
        },
    },
}
