"""
Interim NCG CodeSystems for Follicular Lymphoma & Lymphoma Workup.

Source: National Cancer Grid (NCG) Adult Hematolymphoid Management Guidelines:
  - Follicular Lymphoma Treatment Workflow (Low-grade I/II/IIIa, High-grade IIIb, Duodenal)
  - Lymphoma Workup & Prognostic Scoring (FLIPI, GELF, Immunophenotyping)

Cross-maps to Indian national terminology:
  - SNOMED CT-IN (Histology, Staging, Regimens)
  - LOINC (LDH, Hemoglobin, Biomarkers)
  - ICD-O-3 (Oncology Morphology)
"""

NCG_CODESYSTEM_BASE = "http://ncgindia.org/fhir/CodeSystem"

# ---------------------------------------------------------------------------
# Lymphoma Histological Subtypes & Grades
# ---------------------------------------------------------------------------
LYMPHOMA_HISTOLOGY = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-lymphoma-histology",
    "concepts": {
        "fl-grade-1-2": {
            "display": "Follicular lymphoma, grade 1-2 (low grade)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "26274007", "icd_o": "9695/3"},
        },
        "fl-grade-3a": {
            "display": "Follicular lymphoma, grade 3a (low grade)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "89369001", "icd_o": "9698/3"},
        },
        "fl-grade-3b": {
            "display": "Follicular lymphoma, grade 3b (high grade - treat as DLBCL)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "89369001", "icd_o": "9698/3"},
        },
        "fl-duodenal": {
            "display": "Duodenal-type follicular lymphoma (mucosal, indolent)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "443831000124108", "icd_o": "9695/3"},
        },
        "transformed-dlbcl": {
            "display": "Histological transformation to DLBCL",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "63449009", "icd_o": "9680/3"},
        },
    },
}

# ---------------------------------------------------------------------------
# Ann Arbor Staging (Stage I to IV + Contiguity for Stage II)
# ---------------------------------------------------------------------------
ANN_ARBOR_STAGE = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-ann-arbor-stage",
    "concepts": {
        "stage-1": {
            "display": "Stage I (single nodal region or localized single extranodal site IE)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "261645007"},
        },
        "stage-2": {
            "display": "Stage II (>= 2 nodal regions on same side of diaphragm)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "261646008"},
        },
        "stage-3": {
            "display": "Stage III (nodal regions on both sides of diaphragm)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "261647004"},
        },
        "stage-4": {
            "display": "Stage IV (diffuse or disseminated organ involvement)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "261648009"},
        },
    },
}

STAGE_2_CONTIGUITY = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-stage-2-contiguity",
    "concepts": {
        "contiguous": {
            "display": "Contiguous nodal areas (coverable by single radiation field)",
            "cross_map": None,
        },
        "non-contiguous": {
            "display": "Non-contiguous nodal areas (cannot be covered by single field)",
            "cross_map": None,
        },
    },
}

# ---------------------------------------------------------------------------
# GELF Criteria (Tumour Burden Assessment)
# ---------------------------------------------------------------------------
GELF_TUMOUR_BURDEN = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-gelf-tumour-burden",
    "concepts": {
        "high-burden": {
            "display": "High tumour burden per GELF criteria (any 1 criterion met)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "PENDING-VERIFICATION"},
        },
        "low-burden": {
            "display": "Low tumour burden per GELF criteria (none of criteria met)",
            "cross_map": {"system": "SNOMED-CT-IN", "code": "PENDING-VERIFICATION"},
        },
    },
}

# ---------------------------------------------------------------------------
# Clinical & Diagnostic Flags
# ---------------------------------------------------------------------------
CLINICAL_FLAGS = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-clinical-flag",
    "concepts": {
        "fit-for-bendamustine": {"display": "Fit for Bendamustine-based therapy"},
        "fit-for-anthracycline": {"display": "Fit for Anthracycline-based therapy (Normal ECHO)"},
        "fit-for-radiotherapy": {"display": "Fit and suitable for involved-site radiation therapy"},
        "bone-marrow-cleared": {"display": "Bone marrow aspirate and trephine negative for lymphoma"},
        "high-ldh-or-proliferation": {"display": "Elevated serum LDH (>ULN) or high Ki-67/MIB proliferation index"},
        "b-symptoms-present": {"display": "Systemic B symptoms present (fever, sweats, >10% weight loss)"},
        "bulky-mass-gt-7cm": {"display": "Single nodal or extranodal mass > 7 cm"},
        "multiple-masses-gte-3cm": {"display": ">= 3 distinct nodal sites each > 3 cm"},
        "spleen-enlarged-below-umbilicus": {"display": "Splenomegaly extending below umbilical line"},
        "compressive-organ-dysfunction": {"display": "Compressive symptoms causing organ compromise"},
        "effusion-present": {"display": "Pleural or peritoneal effusions present"},
        "cytopenias-gelf": {"display": "GELF cytopenia (ANC < 1000/mm3 or Platelets < 100,000/mm3)"},
        "circulating-cells-gt-5000": {"display": "Circulating lymphoma cells > 5000/mm3 in peripheral blood"},
    },
}

# ---------------------------------------------------------------------------
# NCG Follicular Lymphoma Treatment Group (CQL Output Vocabulary)
# ---------------------------------------------------------------------------
FL_TREATMENT_GROUP = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-fl-treatment-group",
    "concepts": {
        "stage-1-rt-fit": {"display": "Stage I: Fit for RT -> ISRT/IFRT 24 Gy (Optimal)"},
        "stage-1-rt-unsuitable": {"display": "Stage I: RT refused/toxic site -> Watchful waiting or Rituximab x4"},
        "stage-2-contiguous": {"display": "Stage II: Contiguous nodes -> IFRT 24 Gy or Watchful waiting"},
        "stage-2-non-contiguous": {"display": "Stage II: Non-contiguous -> Observation or Rituximab x4"},
        "advanced-low-burden": {"display": "Stage III/IV Low Burden -> Watchful waiting (Observation)"},
        "advanced-high-burden-br": {"display": "Stage III/IV High Burden -> BR (Bendamustine + Rituximab) x 6"},
        "advanced-high-burden-rchop": {"display": "Stage III/IV High Burden -> R-CHOP x 6 (High LDH / aggressive)"},
        "advanced-high-burden-rlen": {"display": "Stage III/IV High Burden -> R + Lenalidomide (Unfit for bendamustine)"},
        "advanced-high-burden-frail": {"display": "Stage III/IV High Burden -> Single-agent Rituximab (Frail palliative)"},
        "grade-3b-dlbcl": {"display": "Grade IIIb: High-grade FL -> Treat as DLBCL (R-CHOP protocol)"},
        "transformed-dlbcl": {"display": "Transformation: Histologically transformed to DLBCL -> R-CHOP -> ASCT"},
        "duodenal-asymptomatic": {"display": "Duodenal FL (Asymptomatic): Observation / Endoscopic resection"},
        "duodenal-symptomatic": {"display": "Duodenal FL (Symptomatic): Single-agent Rituximab x 4 or ISRT 24 Gy"},
        "needs-review": {"display": "Insufficient / unverified data - refer to multidisciplinary tumour board"},
    },
}

# ---------------------------------------------------------------------------
# Result qualifiers -- reused across pathology and tests
# ---------------------------------------------------------------------------
FINDING_QUALIFIER = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-finding-qualifier",
    "concepts": {
        "positive": {"display": "Positive", "cross_map": {"system": "SNOMED-CT", "code": "10828004"}},
        "negative": {"display": "Negative", "cross_map": {"system": "SNOMED-CT", "code": "260385009"}},
        "not-done": {"display": "Not done", "cross_map": {"system": "SNOMED-CT", "code": "272125009"}},
        "indeterminate": {"display": "Indeterminate / unparsed free text", "cross_map": None},
    },
}

# ---------------------------------------------------------------------------
# Data provenance -- the extension vocabulary that gates CQL decision logic
# ---------------------------------------------------------------------------
DATA_PROVENANCE = {
    "system": f"{NCG_CODESYSTEM_BASE}/ncg-data-provenance",
    "concepts": {
        "source-coded": {"display": "Coded at source system (e.g. LIS/HIS discrete field)"},
        "structured-capture": {"display": "Captured via structured synoptic report / SDC form"},
        "nlp-extracted-high-confidence": {"display": "Extracted from free text, high confidence"},
        "nlp-extracted-low-confidence": {"display": "Extracted from free text, low confidence"},
        "unparsed": {"display": "Value present but did not match expected value set"},
        "missing": {"display": "Not captured / omitted"},
    },
}

ALL_CODESYSTEMS = {
    "lymphoma-histology": LYMPHOMA_HISTOLOGY,
    "ann-arbor-stage": ANN_ARBOR_STAGE,
    "stage-2-contiguity": STAGE_2_CONTIGUITY,
    "gelf-tumour-burden": GELF_TUMOUR_BURDEN,
    "clinical-flag": CLINICAL_FLAGS,
    "fl-treatment-group": FL_TREATMENT_GROUP,
    "finding-qualifier": FINDING_QUALIFIER,
    "data-provenance": DATA_PROVENANCE,
}
