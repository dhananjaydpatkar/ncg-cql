## Objective
- This is an attempt to create a framework for developing NCG (National Cancer Grid) guidelines based on HL7 standards (CQL, FHIR)
- Following key aspects considered during this attempt
    - Authoring guidelines in a very simple and understandable manner for clinicians 
    - Generating executable CQL and FHIR PlanDefinitions and Libraries from the guidelines
    - Generating FHIR CodeSystems and ValueSets from the guidelines
    - Generating Flowcharts for visual representation of the guidelines


## Vision

- Use this as a Clinical Decision Support System (CDSS) hook to push guideline recommendations into EHRs, to ensure we have uniformed NCG(National Cancer Grid) recommended treatment protocol across all NCG members**

- Use this as a evaluation/validation tool for health insurance and government to ensure that the treatment protocol is being followed and approved treatment is being given to the patient**

- This evaluation frameowrk can be used in retrospective manner to measure quality of care and adherence to the NCG guidelines, which can be used to improve the guidelines and make them more effective and efficient**


## References & Standard Specifications

To understand the underlying specifications and get familiar with computable guideline standards:

- **HL7 Clinical Quality Language (CQL)**
  - [CQL Official Specification & Documentation](https://cql.hl7.org/) — Authoritative specification for clinical logic expressions
  - [CQL Author's Guide](https://cql.hl7.org/02-authorsguide.html) — Getting started guide for writing clinical queries, operators, and functions

- **HL7 Fast Healthcare Interoperability Resources (FHIR)**
  - [HL7 FHIR Overview](https://hl7.org/fhir/) — Healthcare interoperability standard overview
  - [FHIR R4 Specification](https://hl7.org/fhir/R4/) — Core Release 4 documentation
  - [PlanDefinition Resource](https://hl7.org/fhir/R4/plandefinition.html) — Computable definition of clinical protocols, recommendations, and rules
  - [Library Resource](https://hl7.org/fhir/R4/library.html) — Logic containers encapsulating CQL scripts and data requirements
  - [FHIR Terminology Module](https://hl7.org/fhir/R4/terminology-module.html) — Specifications for CodeSystem and ValueSet resources

- **Clinical Practice Guidelines on FHIR (CPG-on-FHIR)**
  - [HL7 FHIR CPG Implementation Guide](https://hl7.org/fhir/uv/cpg/) — Standard architectural patterns for computable and executable guidelines

- **Clinical Decision Support (CDS Hooks)**
  - [CDS Hooks Specification](https://cds-hooks.hl7.org/) — Vendor-agnostic EHR integration triggers for clinical decision support

