# NCG-Heme CQL MVP: PDF Synoptic Report -> FHIR -> CQL Pathway

A working implementation for the **National Cancer Grid (NCG) Follicular Lymphoma**
guideline pathway (from `Follicular_Lymphoma_Treatment_Workflow.docx.pdf` and `Lymphoma_Workup_Flowchart.docx.pdf`):
takes a **synoptic report PDF** (structured intake), maps it to **FHIR resources conforming
to an NCG-Heme profile package** (aligned with ABDM FHIR IG), binds
findings to **interim NCG valuesets** with documented cross-maps to
SNOMED CT-IN / LOINC / ICD-O, evaluates the clinical decision logic (authored in real **CQL 1.4**),
and returns a regimen shortlist with a traceable rationale.

## Why this exists / what it proves

This demonstrates the **data-quality-aware CQL pattern** end to end:
a clinical value only drives a treatment-pathway branch if
its `ncg-extension-data-provenance` marks it as trustworthy. A field that
doesn't parse cleanly (see `sample_fl_case_ambiguous_referral.pdf`, where histology
and GELF burden are conflicting or unconfirmed from an external referral lab)
is carried forward with its raw text intact and routes the patient to `needs-review` -- never guessed.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 sample_data/generate_sample_pdf.py         # generates the 4 benchmark synthetic PDFs
python3 -m engine.run_pipeline sample_data/sample_fl_case_advanced_high_burden.pdf
python3 -m engine.run_pipeline sample_data/sample_fl_case_stage1_limited.pdf
python3 -m engine.run_pipeline sample_data/sample_fl_case_ambiguous_referral.pdf --json
pytest tests/ -v
```

## How to run

Run all commands from the repository root. Requires Python 3.9+.

1. **Set up an environment and install dependencies**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run the pipeline on a sample synoptic report**

   ```bash
   .venv/bin/python3 -m engine.run_pipeline sample_data/sample_fl_case_advanced_high_burden.pdf
   ```

   This prints a human-readable report: extracted fields, the CQL
   classification (Treatment group or `needs-review`), the regimen shortlist and
   the rationale.

3. **Optional flags**

   | Flag       | Effect                                       |
   |------------|----------------------------------------------|
   | `--json`   | Also print the result as JSON                |
   | `--bundle` | Also print the generated FHIR Bundle         |

   ```bash
   .venv/bin/python3 -m engine.run_pipeline sample_data/sample_fl_case_stage1_limited.pdf --json
   ```

4. **Run the test suite**

   ```bash
   .venv/bin/python3 -m pytest tests/ -v
   ```

## Translating CQL to ELM

The CQL files in `cql/` (`NCGCommon.cql` and `NCG_FL_2020.cql`) are written in
standard CQL 1.4. To compile them to ELM (Expression Logical Model) XML or JSON:

1. **Prerequisites**
   Install Java (JRE or JDK 11+) and download the HL7 CQL-to-ELM CLI compiler:
   ```bash
   curl -L -O https://github.com/cqframework/clinical_quality_language/releases/download/v2.11.0/cql-to-elm-cli-2.11.0.jar
   ```

2. **Run compilation**
   ```bash
   java -jar cql-to-elm-cli-2.11.0.jar \
     --input cql/ \
     --output elm/ \
     --format JSON \
     --signatures
   ```

3. **Evaluate via JavaScript engine (optional)**
   With compiled ELM in `elm/`:
   ```bash
   cd engine/js && npm install
   node evaluate_via_cql_execution.js ../../sample_data/sample_fl_case_advanced_high_burden.pdf.bundle.json
   ```

## Visualizing CQL Decision Logic

The repository includes a decision-graph generator that parses CQL statements into Mermaid flowcharts:

```bash
.venv/bin/python3 visualization/cql_to_flowchart.py
```

Outputs:
- `visualization/treatment_group_flow.generated.mmd`: Auto-extracted branching logic from `cql/NCG_FL_2020.cql`.
- `visualization/clinical_flow.mmd`: Human-authored clinical diagram summarizing the Follicular Lymphoma pathway.

## Clinical Pathway Architecture (NCG Follicular Lymphoma 2020)

```text
Synoptic PDF Report (Pathology, Staging, GELF, BM)
      │
      ▼
Regex & Provenance Extractor (extraction/pdf_extractor.py)
  - Records raw string, normalized code, confidence, provenance status
      │
      ▼
FHIR R4 Bundle Mapper (fhir_mapping/mapper.py)
  - Patient, DiagnosticReport, Condition, Observation, ServiceRequest
  - Enriched with ncg-extension-data-provenance
      │
      ▼
CQL Decision Engine (cql/NCG_FL_2020.cql & engine/cql_lite_fl.py)
  ├── 1. Histology Gate:
  │      - Grade 3b / Transformed -> Treat as DLBCL (R-CHOP x 6)
  │      - Duodenal FL -> Watchful waiting / ISRT if symptomatic
  │      - Grade 1, 2, 3a -> Low-grade FL pathway
  │
  ├── 2. Staging Gate:
  │      - Stage I (negative BM) -> ISRT 24 Gy (curative intent)
  │      - Stage II Contiguous -> IFRT / ISRT
  │      - Stage II Non-contiguous or Stage III / IV -> Advanced Stage
  │
  ├── 3. Tumor Burden Gate (GELF Criteria):
  │      - Low Burden -> Watch and Wait (Observation) / single-agent Rituximab
  │      - High Burden (symptomatic / bulky disease / cytopenias):
  │          • Fit: Bendamustine + Rituximab (BR) x 6, R-CHOP x 6, or R-Lenalidomide
  │          • Frail/Unfit: Rituximab single-agent weekly x 4, or attenuated BR
  │
  └── 4. Provenance Fallback:
         - Any unconfirmed / contradictory / free-text field routes to 'needs-review'
```
