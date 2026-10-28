# NCG Clinical Quality Language (CQL) & Computable Guidelines Framework

A framework for developing and operationalizing National Cancer Grid (NCG India) evidence-based cancer practice guidelines as computable, executable clinical decision support artifacts based on international healthcare standards ([HL7 CQL](https://cql.hl7.org/) and [HL7 FHIR R4](https://hl7.org/fhir/R4/)).

---

## Workspace Structure

* **[`ncg-cql-authoring-mvp-v2/`](ncg-cql-authoring-mvp-v2/)** — **NCG Guideline Studio (v2)**
  * A no-code, web-based authoring environment designed for oncologists and clinical panels to build, test, and publish computable guidelines.
  * Features a 7-stage visual pipeline: Details & Safety Gate, Findings, Score Functions, Outcomes, Visual Decision Ladder, Patient Test Bench, and Multi-Standard Export.
  * Includes a **Cross-Guideline Reusable Clinical Catalog & Search Engine** and points-based **Clinical Score Function** authoring (aaIPI, FLIPI, CLL-IPI, etc.).
  * See the [Studio Documentation & Screenshots](ncg-cql-authoring-mvp-v2/README.md).

* **[`ncg-cql-mvp/`](ncg-cql-mvp/)** — **Execution & CQL Engine Test Harness**
  * Node.js test harness and CLI runners executing compiled CQL/ELM logic against synthetic FHIR R4 patient bundles using the official HL7 `cql-execution` engine.
  * Contains disease-specific CQL files (`NCG_LYMPHOMA_WORKUP_2020.cql`, `NCG_FL_2020.cql`, `NCGCommon.cql`).


---

## Key Framework Objectives

1. **Clinician-Friendly Authoring:** Enable clinical panels to define findings, scoring matrices, and treatment decision rules without writing code.
2. **Standard-Compliant Code Generation:** Automatically compile clinical rules into spec-compliant HL7 CQL 1.4, FHIR R4 PlanDefinitions, and FHIR Libraries.
3. **Data Provenance Safety Gate:** Enforce that unverified, missing, or unparsed referral text safely halts automated execution and routes to a "Needs clinician review" gate.
4. **Reusable Clinical Knowledge Assets:** Provide a shared catalog of standardized oncology findings, prognostic indices, and regimens that can be searched and reused across multiple guidelines.
5. **Interactive Flowcharts:** Automatically generate Mermaid decision flowcharts directly from authoring logic.

---

## Vision & Use Cases

* **EHR Clinical Decision Support (CDS Hooks):** Embed guideline recommendations directly into hospital EHR workflows at order-entry or staging consultation to standardize treatment protocols across all NCG member hospitals.
* **Insurance & Government Pre-Authorization:** Serve as an objective, automated validation tool for health insurance payers and government schemes (e.g. Ayushman Bharat / PM-JAY) to verify protocol adherence before treatment approvals.
* **Quality of Care & Adherence Auditing:** Enable retrospective auditing of clinical records against NCG guidelines to measure protocol concordance and improve guideline effectiveness.

---

## References & Standard Specifications

To understand the underlying specifications and get familiar with computable guideline standards:

* **[HL7 Clinical Quality Language (CQL 1.4 / 1.5)](https://cql.hl7.org/)** — Authoritative specification for computable clinical logic expressions and functions.
  * [CQL Author's Guide](https://cql.hl7.org/02-authorsguide.html) — Guide for writing clinical queries, operators, and functions.
  * [CQL-to-ELM Specification](https://github.com/cqframework/clinical_quality_language) — Reference compiler for Expression Logical Model (ELM) translation.
* **[HL7 Fast Healthcare Interoperability Resources (FHIR R4)](https://hl7.org/fhir/R4/)** — Core health data standards.
  * [PlanDefinition Resource](https://hl7.org/fhir/R4/plandefinition.html) — Computable definition of clinical protocols, recommendations, and rules.
  * [Library Resource](https://hl7.org/fhir/R4/library.html) — Logic containers encapsulating CQL scripts and data requirements.
  * [FHIR Terminology Module](https://hl7.org/fhir/R4/terminology-module.html) — Specifications for CodeSystem and ValueSet resources.
  * [Clinical Reasoning Module](https://hl7.org/fhir/R4/clinicalreasoning-module.html) — Architecture for knowledge artifacts and automated decision support.
* **[Clinical Practice Guidelines on FHIR (CPG-on-FHIR)](https://hl7.org/fhir/uv/cpg/)** — Standard architectural patterns for computable and executable guidelines.
* **[Clinical Decision Support (CDS Hooks)](https://cds-hooks.hl7.org/)** — Vendor-agnostic EHR integration triggers for clinical decision support.
* **[National Cancer Grid (NCG India)](https://tmc.gov.in/ncg/)** — Evidence-based cancer management guidelines.
