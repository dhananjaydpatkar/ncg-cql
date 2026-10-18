# NCG Guideline Studio (v2) - No-Code Clinical Pathway Authoring

A standalone authoring environment designed specifically for **medical experts, oncologists, and guideline panels** to create, edit, test, and publish National Cancer Grid (NCG) clinical decision pathways **without writing any code**.

The clinical author only defines findings, treatment outcomes, and decision rules in plain clinical language. The studio automatically generates:
1. **Spec-compliant CQL 1.4 logic libraries** (with automatic data-provenance gates).
2. **FHIR R4 PlanDefinitions and Libraries** ready for EHR Clinical Decision Support (CDS Hooks).
3. **FHIR R4 CodeSystems and ValueSets**.
4. **Interactive Mermaid decision flowcharts**.
5. **Portable Guideline JSON packages** for sharing and revision tracking.

---

## Why this exists

In earlier iterations, adding a new disease guideline required writing JavaScript data files, updating hardcoded CQL generator logic, and modifying evaluator functions. 

**NCG Guideline Studio (v2) removes all code dependencies.** A senior oncologist can:
* Click **"+ New"** to start a brand new disease guideline from scratch.
* Define clinical inputs (e.g. *Histology*, *Ann Arbor Stage*, *GELF Burden*, *Fitness*).
* Define treatment groups, regimens, and clinical rationales.
* Build ordered decision rules using a visual **IF ... THEN ...** interface.
* Create synthetic patient test cases and immediately see rule execution traces.
* Toggle the **Safety Gate** to automatically enforce that unparsed referral text routes to a review outcome rather than blindly triggering systemic treatments.

---

## Quick Start

```bash
cd ncg-cql-authoring-mvp-v2
npm install
npm run dev -- --port 5174
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

---

## Authoring Workflow (The 6 Tabs)

```
┌───────────┐   ┌────────────┐   ┌────────────┐   ┌─────────┐   ┌────────────┐   ┌─────────────────┐
│ 1 Details │ → │ 2 Findings │ → │ 3 Outcomes │ → │ 4 Rules │ → │ 5 Patients │ → │ 6 Export & CQL │
└───────────┘   └────────────┘   └────────────┘   └─────────┘   └────────────┘   └─────────────────┘
```

1. **Details:** Title, organization, source guideline citation, and the safety provenance gate toggle.
2. **Findings:** Clinical parameters (e.g. *Stage*, *Grade*, *Biomarker*) and their valid values.
3. **Outcomes:** Treatment groups (curative RT, systemic chemoimmunotherapy, watchful waiting, clinician review) and their regimen shortlists.
4. **Rules:** Ordered clinical logic checked top-to-bottom. The first rule whose conditions match determines the outcome.
5. **Test cases:** Benchmark patient cases evaluated live against the rules with detailed execution traces.
6. **Review & export:** Visual decision ladder and one-click downloads for CQL, FHIR PlanDefinition, FHIR Library, CodeSystems, and portable JSON.

---

## Directory Structure

```text
ncg-cql-authoring-mvp-v2/
├── src/
│   ├── components/
│   │   ├── Setup.jsx        # Tab 1: Metadata & safety checks
│   │   ├── Findings.jsx     # Tab 2: Clinical inputs & values editor
│   │   ├── Outcomes.jsx     # Tab 3: Treatment groups & regimens
│   │   ├── Rules.jsx        # Tab 4: Visual IF/THEN rule builder
│   │   ├── Tests.jsx        # Tab 5: Patient test bench & execution trace
│   │   ├── Publish.jsx      # Tab 6: Pathway decision ladder & export
│   │   └── ui.jsx           # Reusable UI primitives
│   ├── lib/
│   │   ├── model.js         # Generic data schema & utilities
│   │   ├── evaluate.js      # Disease-agnostic rule evaluation engine
│   │   ├── cql.js           # Generic CQL 1.4 generator
│   │   ├── fhir.js          # Generic FHIR R4 resource generator
│   │   ├── validate.js      # Clinical consistency checker
│   │   └── store.js         # Browser persistence & file I/O
│   ├── data/
│   │   └── seed.js          # Pre-loaded Follicular Lymphoma guideline
│   ├── App.jsx              # Main shell, tabs & guideline switcher
│   └── index.css            # Clean institutional design system
└── package.json
```
