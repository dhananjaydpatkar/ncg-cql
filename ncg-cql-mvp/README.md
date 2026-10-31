# Hematology-Oncology CQL Execution & Point-of-Care Decision Support Engine

A production-grade implementation of **HL7 Clinical Quality Language (CQL 1.4/1.5)** and **FHIR R4** clinical decision support for hematologic malignancies.

This package connects **visual guideline authoring** from **Clinical Guideline Studio** to a real **HL7 execution pipeline**:
1. Evaluates generated CQL libraries (`NCG_LYMPHOMA_WORKUP_2020.cql`, `NCG_FL_2020.cql`, `NCGCommon.cql`) compiled into Expression Logical Model (ELM) JSON.
2. Tests execution against **24 synthetic FHIR R4 Bundles** covering all lymphoma subtypes, clinical prognostic scores (**aaIPI**, **IPI**, **FLIPI**, **MIPI**, **IPS**), and provenance safety gates.
3. Enforces ABDM-aligned **data provenance gating** (`ncg-extension-data-provenance`) — ensuring unparsed external referral text blocks treatment calculation and routes safely to multidisciplinary review.

---

## Standard Specifications & References

- **HL7 CQL 1.4 / 1.5 Specification**: [https://cql.hl7.org](https://cql.hl7.org)
- **HL7 FHIR R4 (v4.0.1)**: [https://hl7.org/fhir/R4/](https://hl7.org/fhir/R4/)
- **HL7 cql-execution JavaScript Engine**: [https://github.com/cqframework/cql-execution](https://github.com/cqframework/cql-execution)
- **HL7 cql-exec-fhir Patient Source**: [https://github.com/cqframework/cql-exec-fhir](https://github.com/cqframework/cql-exec-fhir)
- **ABDM FHIR Implementation Guide (India)**: [https://nrces.in/ndhm/fhir/r4/](https://nrces.in/ndhm/fhir/r4/)
- **HL7 CDS Hooks**: [https://cds-hooks.hl7.org](https://cds-hooks.hl7.org)

---

## Repository Structure

```text
ncg-cql-mvp/
├── cql/                               # Author-generated CQL libraries & shared helpers
│   ├── NCG_LYMPHOMA_WORKUP_2020.cql  # Generated Lymphoma Workup Flowchart (with aaIPI, IPI, FLIPI...)
│   ├── NCG_FL_2020.cql               # Generated Follicular Lymphoma First-Line Treatment Pathway
│   ├── NCGCommon.cql                 # Shared data-provenance & clinical calculations (IsUsable)
│   └── FHIRHelpers.cql               # HL7 FHIRHelpers 4.0.1 type-mapping functions
│
├── elm/                               # Compiled Expression Logical Model (ELM JSON)
│   ├── NCG_LYMPHOMA_WORKUP_2020.json # Compiled ELM (v1.2.0)
│   ├── NCG_FL_2020.json              # Compiled ELM (v0.2.0)
│   ├── NCGCommon.json                # Compiled ELM (v0.1.0)
│   └── FHIRHelpers.json              # Compiled ELM (v4.0.1)
│
├── sample_data/
│   ├── fhir_bundles/                 # 47 synthetic FHIR R4 test patient bundles across 4 guidelines
│   │   ├── lymphoma_workup/          # 17 cases (DLBCL, aaIPI, CLL, Hodgkin, MTX, HBV...)
│   │   ├── follicular/               # 7 cases (GELF high/low burden, contiguous, transformed)
│   │   ├── dlbcl_treatment/          # 16 cases (Pola-R-CHP, R-CHOP, CNS prophylaxis, cardiac, frail...)
│   │   ├── dlbcl_relapsed_refractory/# 14 cases (CAR-T, ASCT, Glofitamab, Pola-BR, palliative...)
│   │   └── manifest.json             # Manifest catalog linking test cases to outcomes
│   ├── build_fhir_bundles.mjs        # Generator translating authoring test cases into FHIR bundles
│   └── generate_sample_pdf.py        # PDF synoptic intake benchmark generator
│
├── engine/
│   ├── js/
│   │   └── evaluate_via_cql_execution.js # Production CQL execution module & CLI tool
│   ├── cql_lite_fl.py                # Reference evaluator for FL Python pipeline
│   └── run_pipeline.py               # Synoptic PDF -> FHIR -> CQL end-to-end pipeline
│
└── tests/
    ├── test_cql_execution.mjs        # 67-assertion automated Node.js CQL test suite across 4 guidelines
    ├── test_cql_engine.py            # Python pytest integration tests for CQL engine
    └── test_pipeline.py              # End-to-end PDF intake pipeline tests
```

---

## Quick Start: Interactive Web Dashboard & CQL Execution

### 1. Launch the Web Application & CDS Server

Start the interactive clinical decision support web dashboard and REST API:

```bash
npm start
# or: node server.js
```

Then open [**http://localhost:3000**](http://localhost:3000) in your browser.

#### Features Available in the Web App:
- **Tri-Modal Clinical Intake**:
  1. 📦 **FHIR R4 Bundle Mode**: Load any of the 47 pre-built patient cases across all 4 guidelines, quick scenarios (Advanced DLBCL aaIPI=2, High-Burden FL, PMBCL, Unparsed gate), or edit/paste custom FHIR JSON.
  2. 📝 **Manual Clinical Entry**: Oncology intake form (Patient Demographics, Ann Arbor Staging, LDH, ECOG, Bone Marrow, Organ Sites, Viral Serology) with an ABDM Data Provenance toggle to test verified vs unparsed referral gate triggers.
  3. 📄 **Synoptic OCR / Report Intake**: Pathology report template matching, normalizer, and structured field extraction with provenance tags.
- **Live HL7 CQL Execution**: Real-time evaluation via official `cql-execution` engine against compiled ELM libraries.
- **Clinical Outputs**: Primary Guideline Determination, Recommended Regimens, Prognostic Score Breakdown (aaIPI, IPI, FLIPI, MIPI), Classification Rationale, Evaluated Expression Inspector, and CDS Hooks Card JSON.
- **REST API**: External systems can POST to `http://localhost:3000/api/evaluate`.

---

### 2. Run Automated Regression Test Suite (Node.js)

Executes all 47 synthetic FHIR bundles across all 4 guidelines against the compiled CQL libraries and verifies 67 clinical assertions:

```bash
npm test
```

Sample output:
```text
Running HL7 CQL Execution Test Suite...

============================================================
Testing NCG_LYMPHOMA_WORKUP_2020 (Lymphoma Workup Flowchart)
============================================================
  ✓ 01_tc1_circulating-lymphocytosis -> pathway-flow-cytometry-clpd (expected: pathway-flow-cytometry-clpd)
  ...
  ✓ 17_tc17_advanced-dlbcl-in-48m-wi -> pathway-staging-pet-ct-omit-bm (expected: pathway-staging-pet-ct-omit-bm)

--- Specific Clinical Scenario Checks (Lymphoma) ---
  ✓ Case 17: aaIPI score calculated as 2 (Stage IV + elevated LDH)
  ✓ Case 17: aaIPI risk group classified as high-intermediate
  ✓ Case 17: Standard IPI score calculated as 2
  ✓ Case 10: Unparsed referral text triggers needs-review
  ✓ Case 10: Requires human review is true
  ✓ Case 10: aaIPI score is null due to missing/unverified inputs
  ✓ Case 16: Age > 40 on high-dose MTX triggers DTPA-GFR clearance protocol
  ✓ Case 16: DTPA GFR clearance regimen included

============================================================
Testing NCG_DLBCL_TREATMENT_2020 (DLBCL & PMBCL First-Line)
============================================================
  ✓ 01_t1_limited-stage-aaipi-0-non- -> dlbcl-fit-limited-aai0-nonbulky
  ...
  ✓ 16_t16_unassessed-disease-stage- -> needs-review

============================================================
Testing NCG_DLBCL_RR_2020 (Relapsed/Refractory DLBCL Pathways)
============================================================
  ✓ 01_t1_late-relapse-18-mo-post-r- -> rr-pathway-a-salvage-fit
  ...
  ✓ 14_t14_single-residual-site-post -> rr-consolidative-radiotherapy

============================================================
Results: 67 passed, 0 failed (67 total)
============================================================
```

### 2. Run Single FHIR Bundle CLI Evaluation

Run any synthetic patient bundle through the CQL engine to produce a structured recommendation report:

```bash
# Evaluate an Advanced DLBCL patient (aaIPI = 2, High-Intermediate risk)
node engine/js/evaluate_via_cql_execution.js sample_data/fhir_bundles/lymphoma_workup/17_tc17_advanced-dlbcl-in-48m-with-high-aaipi-score-2-ldh-stage-iv.json

# Evaluate an unparsed referral report (safety gate demonstration)
node engine/js/evaluate_via_cql_execution.js sample_data/fhir_bundles/lymphoma_workup/10_tc10_referral-note-with-unparsed-text-safety-provenance-gate.json

# Evaluate a Follicular Lymphoma patient
node engine/js/evaluate_via_cql_execution.js sample_data/fhir_bundles/follicular/01_t1_advanced-high-burden-fit.json NCG_FL_2020 0.2.0
```

#### JSON Output Mode (for Microservices & Pipelines)

Add `--json` or pipe through standard input:

```bash
cat sample_data/fhir_bundles/lymphoma_workup/17_tc17_advanced-dlbcl-in-48m-with-high-aaipi-score-2-ldh-stage-iv.json \
  | node engine/js/evaluate_via_cql_execution.js - --json \
  | jq .calculated_scores.aaIPI
```

Output:
```json
{
  "score": 2,
  "riskGroup": "high-intermediate",
  "riskLabel": "High-Intermediate Risk (~50-55% 5-yr OS)"
}
```

---

## Python Integration Tests

Run the Python pytest suite connecting Python to the CQL execution engine:

```bash
./.venv/bin/pytest tests/ -v
```

Includes:
- `tests/test_cql_engine.py`: Tests `evaluate_via_cql_execution.js` from Python via JSON subprocess pipe, validating `aaIPI` score calculations and provenance safety gates.
- `tests/test_pipeline.py`: Tests the synoptic PDF intake and extraction pipeline.

---

## Regenerating FHIR Bundles & Re-compiling CQL

### Re-generating Synthetic FHIR Bundles

To refresh or regenerate the 24 FHIR R4 bundles directly from the authoring studio's test cases:

```bash
npm run build:bundles
# or: node sample_data/build_fhir_bundles.mjs
```

### Re-compiling CQL to ELM

If you edit or export new CQL files from the Authoring Studio, compile them to ELM using the HL7 translator:

```bash
npm run translate
```
