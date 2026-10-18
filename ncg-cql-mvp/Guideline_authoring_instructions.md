# Author's Guide: NCG Pathway Studio (Authoring MVP)

The **NCG Pathway Studio** is an interactive, clinician-friendly authoring workbench (inspired by CMS/ONC's MADiE) designed for the National Cancer Grid (NCG). It bridges narrative clinical guidelines and executable healthcare standards, allowing hematologists, oncologists, and clinical informaticians to author, test, and package **FHIR R4 PlanDefinitions** and **CQL 1.4 logic libraries** without needing manual CQL coding.

---

## 1. How Guideline Authors Use the Workbench

The workbench is organized into four integrated studios:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NCG PATHWAY STUDIO                              │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│  Decision Tree  │   CQL Preview   │   Terminology    │  Test Workspace │
│ (Visual Flow)   │ (Live CQL 1.4)  │ (SNOMED / LOINC) │ (Patient Evals) │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

### A. Decision Tree (`flow` tab)
* **Visual Pathway Graph:** View clinical decision gates (e.g., Histology Grade → Staging & Contiguity → GELF Tumor Burden → Fitness) and outcome branches.
* **Node Inspector:** Click any decision gate to inspect:
  * Clinical criteria and WHO/AJCC definitions.
  * Target FHIR Observation profiles and ValueSets.
  * Define-for-define equivalent CQL statements.
* **Clinician Guardrail Toggles:** Switch guideline policies on or off (e.g., *Require Bone Marrow Biopsy Clearance for Stage I*, or *Enforce Provenance Gate*). The tree and CQL update automatically.
* **Regimen Shortlist Configurator:** Add, edit, or remove chemoimmunotherapy, radiation, or targeted regimens for any treatment group.

### B. CQL Preview (`cql` tab)
* **Live Specification Code:** Review spec-compliant CQL 1.4 generated in real time from the visual tree and settings.
* **Provenance Verification:** Verify that all decision defines wrap input observations with `NCGCommon.IsUsable()` to ensure untrusted lab text cannot trigger treatments.
* **Export / Copy:** Copy generated CQL for local compilation with the HL7 `cql-to-elm` CLI.

### C. Terminology Studio (`terminology` tab)
* **Interim NCG CodeSystems:** Explore standardized codes for histology, staging, tumor burden, and clinical flags.
* **National Coding Alignment:** Cross-reference NCG interim codes with **SNOMED CT-IN** (NRCeS India release) and **LOINC**.
* **Data-Quality Tiers:** Inspect the four data-provenance tiers (`source-coded`, `nlp-extracted-high-confidence`, `unparsed`, `missing`).

### D. Test Workspace (`tests` tab)
* **Test-Driven Authoring:** Validate the pathway against benchmark synthetic clinical cases before publishing.
* **Interactive Patient Inspector:** Modify patient parameters (stage, histology, bone marrow status, fitness) and provenance tags in real time.
* **Live Execution Trace:** Inspect each evaluation step, the final treatment group, recommended regimens, and safety warnings.
* **Safety Traps:** Test edge cases (e.g., ambiguous referral lab text) to verify that the patient safely routes to `needs-review`.

### E. One-Click Standard Export
Click **"Export FHIR Package"** in the top navigation bar to generate:
* **FHIR R4 Library** (`Library-ncg-*.json`) containing base64-encoded CQL logic.
* **FHIR R4 PlanDefinition** (`PlanDefinition-ncg-*-pathway.json`) ready for EHR Clinical Decision Support (CDS Hooks).
* **Mermaid Diagram** (`.mmd`) for visual inclusion in NCG guideline PDF/HTML publications.

---

## 2. Updating an Existing Guideline

To update an existing guideline (e.g., updating regimens, adjusting staging criteria, or modifying guardrails in `src/data/defaultGuideline.js`):

### Scenario A: Updating Treatment Regimens (via UI or Code)
1. In the **Decision Tree** tab, select the target treatment group in the **Treatment Group Regimens** dropdown (e.g., *Advanced High Burden Systemic*).
2. Type the new regimen (e.g., `Obinutuzumab + Bendamustine`) and click **Add**.
3. In code, update the `regimens` dictionary in `src/data/defaultGuideline.js`:
   ```javascript
   "advanced-high-burden-systemic": [
     { id: "reg-br6", name: "Bendamustine + Rituximab (BR) x 6 cycles", category: "Standard" },
     { id: "reg-g-benda", name: "Obinutuzumab + Bendamustine (G-Benda)", category: "Alternative Anti-CD20" }
   ]
   ```

### Scenario B: Adding or Modifying a Clinician Guardrail
1. Add the boolean flag to `settings` in `src/data/defaultGuideline.js`:
   ```javascript
   settings: {
     requireBoneMarrowForStage1: true,
     allowPetCtOmissionInResourceLimited: false
   }
   ```
2. In `src/utils/cqlGenerator.js`, reflect the setting in the generated `define "TreatmentGroup"` case block.
3. In `src/utils/cqlEvaluator.js`, evaluate the setting so in-browser testing reflects the change immediately.

---

## 3. Adding a New Disease Pathway (e.g., DLBCL or Multiple Myeloma)

To add a completely new guideline to the authoring workbench, follow this 5-step pattern:

### Step 1: Create the Guideline Model
Create a new file (e.g., `src/data/guidelines/dlbclGuideline.js`) structured according to the guideline schema:

```javascript
export const DLBCL_GUIDELINE = {
  id: "NCG_DLBCL_2022",
  version: "0.1.0",
  title: "Diffuse Large B-Cell Lymphoma (DLBCL) Pathway",
  organization: "National Cancer Grid (India)",
  sourceGuideline: "NCG Adult Hematolymphoid Guidelines: DLBCL",
  status: "draft",
  settings: {
    enforceProvenanceGate: true,
    requireFishForDoubleHit: true
  },
  nodes: [ /* Gate 1: Histology/Subtype, Gate 2: Staging, Gate 3: IPI Score, Gate 4: Cardiac Fitness */ ],
  regimens: {
    "limited-stage-fit": [ { name: "R-CHOP x 3-4 + ISRT" } ],
    "advanced-stage-fit": [ { name: "R-CHOP x 6" }, { name: "Polatuzumab-R-CHP" } ],
    "double-hit-high-risk": [ { name: "Dose-adjusted EPOCH-R" } ],
    "cardiac-unfit": [ { name: "R-CEOP (Etoposide substitution)" }, { name: "R-miniCHOP" } ],
    "needs-review": []
  },
  terminology: [ /* CodeSystems, ValueSets, and SNOMED mappings */ ],
  testCases: [ /* Golden standard patient cases */ ]
};
```

### Step 2: Bind Interim CodeSystems
In `terminology`, define the discrete codes needed for branching:
* **Disease Subtype:** `gcb`, `non-gcb-abc`, `double-hit-myc-bcl2`
* **Staging / Risk:** `ipi-low`, `ipi-intermediate`, `ipi-high`
* **Cardiac / Anthracycline Fitness:** `fit-anthracycline`, `unfit-cardiac-ef-low`

### Step 3: Implement CQL & Evaluator Generators
1. In `src/utils/cqlGenerator.js`, map the decision tree to CQL expressions:
   * **Retrieves:** `Observation: "DoubleHitFinding"`, `Observation: "CardiacFitnessFlag"`
   * **Provenance Gates:** `NCGCommon.IsUsable(...)`
   * **Treatment Groups:** `case when ... then ... end`
2. In `src/utils/cqlEvaluator.js`, mirror the evaluation logic for instant browser testing.

### Step 4: Add Benchmark Test Cases
Add at least four benchmark test cases covering:
1. Standard first-line presentation (Fit / Standard therapy)
2. High-risk biomarker presentation (e.g., double hit / intensive therapy)
3. Comorbid / Organ dysfunction presentation (e.g., low LVEF / alternative regimen)
4. Data quality trap (e.g., unparsed referral text → `needs-review`)

### Step 5: Enable Guideline Switching
In `src/App.jsx`, add a guideline selector in the navigation bar to allow switching between **Follicular Lymphoma** and the new pathway.

---

## 4. Key Best Practices for Guideline Authors

> [!IMPORTANT]
> **Never Allow Free Text to Drive Automated Treatment Branches**
> Always wrap clinical observations with `NCGCommon.IsUsable()`. If an intake laboratory report has `provenance: "unparsed"` or `"missing"`, route the patient to `needs-review`.

> [!TIP]
> **Use Benchmark Cases to Resolve Clinical Panel Debates**
> When expert panels disagree on thresholds (e.g., whether to require TP53 sequencing before chemoimmunotherapy, or whether to mandate bone marrow biopsy in early-stage disease), create a toggle switch in `settings`. The workbench allows the panel to evaluate benchmark cohorts under both settings and see the exact shift in patient allocations in real time.
