// Reusable Clinical Catalog for Clinical Guideline Authoring Studio.
// Standardized Findings, Score Functions, and Outcomes that can be searched,
// shared, and reused across multiple clinical guidelines.

const STORAGE_KEY = 'clinical-catalog-v2';

// ---------------------------------------------------------------------------
// 1. STANDARD BUILT-IN FINDINGS
// ---------------------------------------------------------------------------
export const STANDARD_FINDINGS = [
  {
    id: 'lymphoma-category',
    label: 'Lymphoma subtype / category',
    category: 'Histology & Pathology',
    help: 'Definitive histological diagnosis per WHO / ICC classification.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-lymphoma-category',
    values: [
      { code: 'dlbcl', label: 'Diffuse Large B-Cell Lymphoma (DLBCL)' },
      { code: 'follicular', label: 'Follicular Lymphoma (FL)' },
      { code: 'mantle-cell', label: 'Mantle Cell Lymphoma (MCL)' },
      { code: 'cll-sll', label: 'Chronic Lymphocytic Leukemia / SLL' },
      { code: 'marginal-zone', label: 'Marginal Zone Lymphoma (MALT / SMZL / NMZL)' },
      { code: 'hodgkin', label: 'Classic Hodgkin Lymphoma (cHL)' },
      { code: 'burkitt', label: 'Burkitt Lymphoma' },
      { code: 'ptcl', label: 'Peripheral T-Cell Lymphoma (PTCL)' },
      { code: 'cutaneous-tcell', label: 'Cutaneous T-Cell Lymphoma (MF / Sézary)' },
    ],
  },
  {
    id: 'histology',
    label: 'Follicular histology / grade',
    category: 'Histology & Pathology',
    help: 'WHO histological grading from excisional or core needle lymph node biopsy.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-histology',
    values: [
      { code: 'fl-grade-1-2', label: 'FL grade 1-2 (indolent)' },
      { code: 'fl-grade-3a', label: 'FL grade 3a' },
      { code: 'fl-grade-3b', label: 'FL grade 3b (aggressive)' },
      { code: 'fl-duodenal', label: 'Primary duodenal FL (localised)' },
      { code: 'transformed-dlbcl', label: 'Transformed to DLBCL' },
    ],
  },
  {
    id: 'staging-extent',
    label: 'Ann Arbor staging extent',
    category: 'Staging & Anatomy',
    help: 'Clinical and radiological anatomical disease extent validated by PET-CT or CECT.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-staging-extent',
    values: [
      { code: 'stage-1-2-limited', label: 'Stage I-II Limited (single region or single side of diaphragm)' },
      { code: 'stage-3-4-advanced', label: 'Stage III-IV Advanced (both sides of diaphragm or extranodal dissemination)' },
    ],
  },
  {
    id: 'stage',
    label: 'Ann Arbor anatomical stage',
    category: 'Staging & Anatomy',
    help: 'Anatomical stage classification (Stage I through IV).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-stage',
    values: [
      { code: 'stage-1', label: 'Stage I (Single lymph node region)' },
      { code: 'stage-2', label: 'Stage II (Two or more regions on same side of diaphragm)' },
      { code: 'stage-3', label: 'Stage III (Lymph node regions on both sides of diaphragm)' },
      { code: 'stage-4', label: 'Stage IV (Diffuse or disseminated organ involvement)' },
    ],
  },
  {
    id: 'stage2-contiguity',
    label: 'Stage II contiguity',
    category: 'Staging & Anatomy',
    help: 'For Stage II disease: whether involved nodal groups are contiguous (treatable in single radiation field).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-stage2-contiguity',
    values: [
      { code: 'contiguous', label: 'Contiguous nodal disease' },
      { code: 'non-contiguous', label: 'Non-contiguous nodal disease' },
    ],
  },
  {
    id: 'bone-marrow',
    label: 'Bone marrow biopsy status',
    category: 'Staging & Anatomy',
    help: 'Marrow involvement upstages patient to Stage IV and mandates systemic therapy.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-bone-marrow',
    values: [
      { code: 'cleared', label: 'Negative / cleared (no lymphomatous infiltration)' },
      { code: 'involved', label: 'Involved (clonal infiltration confirmed by morphology/IHC/flow)' },
    ],
  },
  {
    id: 'gelf',
    label: 'GELF tumor burden criteria',
    category: 'Prognosis & Burden',
    help: 'High if: bulky mass > 7 cm, 3 nodal sites > 3 cm, symptomatic splenomegaly, cytopenias, or B symptoms.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-gelf',
    values: [
      { code: 'low-burden', label: 'Low tumor burden (no GELF criteria)' },
      { code: 'high-burden', label: 'High tumor burden (at least 1 GELF criterion met)' },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness for systemic therapy',
    category: 'Performance & Fitness',
    help: 'Physiological fitness for full-dose anthracycline / bendamustine chemoimmunotherapy.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-fitness',
    values: [
      { code: 'fit', label: 'Fit (ambulatory, preserved organ function, candidate for full-dose regimen)' },
      { code: 'frail', label: 'Frail / comorbid (candidate for dose-attenuated or non-anthracycline regimen)' },
    ],
  },
  {
    id: 'ecog-ps',
    label: 'ECOG performance status',
    category: 'Performance & Fitness',
    help: 'Eastern Cooperative Oncology Group functional status score.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-ecog-ps',
    values: [
      { code: 'ecog-0-1', label: 'ECOG 0-1 (Fully active or restricted in strenuous activity but ambulatory)' },
      { code: 'ecog-2-4', label: 'ECOG 2-4 (Capable of limited self-care or confined to bed/chair > 50% of waking hours)' },
    ],
  },
  {
    id: 'serum-ldh',
    label: 'Serum LDH (Lactate Dehydrogenase)',
    category: 'Labs & Biomarkers',
    help: 'Pre-treatment serum LDH level relative to institutional upper limit of normal (ULN).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-serum-ldh',
    values: [
      { code: 'ldh-normal', label: 'Normal (<= institutional upper limit of normal)' },
      { code: 'ldh-elevated', label: 'Elevated (> institutional upper limit of normal)' },
    ],
  },
  {
    id: 'extranodal-sites',
    label: 'Extranodal involvement sites',
    category: 'Staging & Anatomy',
    help: 'Number of documented extranodal disease sites (excluding bone marrow / spleen).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-extranodal-sites',
    values: [
      { code: 'extranodal-0-1', label: '0 or 1 extranodal disease site' },
      { code: 'extranodal-gt-1', label: 'Greater than 1 extranodal disease site (> 1 site)' },
    ],
  },
  {
    id: 'age-group',
    label: 'Patient age bracket (IPI cutoff)',
    category: 'Demographics',
    help: 'Standard prognostic cutoff for age-adjusted and standard prognostic indices (60 years).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-age-group',
    values: [
      { code: 'age-le-60', label: 'Age <= 60 years' },
      { code: 'age-gt-60', label: 'Age > 60 years' },
    ],
  },
  {
    id: 'b-symptoms',
    label: 'B symptoms (Systemic constitutional)',
    category: 'Clinical Symptoms',
    help: 'Unexplained fevers > 38°C, drenching night sweats, or unexplained weight loss > 10% in 6 months.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-b-symptoms',
    values: [
      { code: 'absent', label: 'Absent (No B symptoms documented)' },
      { code: 'present', label: 'Present (Documented B symptoms)' },
    ],
  },
  {
    id: 'bulky-mass',
    label: 'Bulky disease dimension',
    category: 'Staging & Anatomy',
    help: 'Single largest mass diameter on PET-CT / CECT imaging.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-bulky-mass',
    values: [
      { code: 'non-bulky', label: 'Non-bulky (< 7.0 cm)' },
      { code: 'bulky-gte-7cm', label: 'Bulky (>= 7.0 cm and < 10.0 cm)' },
      { code: 'bulky-gte-10cm', label: 'Massive bulky mass (>= 10.0 cm)' },
    ],
  },
  {
    id: 'double-hit-fish',
    label: 'MYC, BCL2, BCL6 FISH (Double-Hit)',
    category: 'Cytogenetics & Molecular',
    help: 'Interphase dual-color breakapart FISH on diagnostic biopsy for high-grade B-cell lymphoma.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-double-hit-fish',
    values: [
      { code: 'dhl-negative', label: 'Negative for double/triple hit rearrangement' },
      { code: 'dhl-positive', label: 'Confirmed MYC + BCL2 and/or BCL6 rearrangement (DHL/THL)' },
    ],
  },
  {
    id: 'tp53-del17p',
    label: 'TP53 mutation / del(17p) status',
    category: 'Cytogenetics & Molecular',
    help: 'TP53 disruption by Sanger/NGS sequencing or del(17p13.1) by interphase FISH.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-tp53-del17p',
    values: [
      { code: 'wild-type', label: 'Wild-type / negative (intact TP53 allele)' },
      { code: 'disrupted', label: 'Disrupted (TP53 mutation and/or del(17p) detected)' },
    ],
  },
  {
    id: 'cns-risk-factors',
    label: 'CNS relapse high-risk anatomical sites',
    category: 'Prognosis & Risk',
    help: 'High-risk anatomical involvement: testicular, renal, adrenal, epidural, or CNS-IPI score >= 4.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-cns-risk-factors',
    values: [
      { code: 'cns-standard-risk', label: 'Standard CNS relapse risk (no high-risk sites)' },
      { code: 'cns-high-risk', label: 'High CNS relapse risk (testicular, renal, adrenal, epidural, or >= 3 sites)' },
    ],
  },
  {
    id: 'tls-metabolic-risk',
    label: 'Tumor Lysis Syndrome metabolic risk',
    category: 'Safety & Comorbidities',
    help: 'Howard / Cairo-Bishop criteria risk assessment for spontaneous or treatment-induced TLS.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-tls-metabolic-risk',
    values: [
      { code: 'tls-standard-risk', label: 'Standard / low metabolic risk' },
      { code: 'tls-high-risk', label: 'High metabolic risk (Burkitt, bulky DLBCL, WBC > 50k, LDH > 2x ULN)' },
    ],
  },
  {
    id: 'viral-screening-hbv',
    label: 'Hepatitis B serology (HBsAg / Anti-HBc)',
    category: 'Infectious & Safety',
    help: 'Mandatory before anti-CD20 monoclonal antibody therapy to prevent fatal viral reactivation.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-viral-screening-hbv',
    values: [
      { code: 'hbv-negative', label: 'HBsAg negative and anti-HBc negative' },
      { code: 'hbv-positive', label: 'HBsAg positive or anti-HBc positive (reactivation risk)' },
    ],
  },
  {
    id: 'viral-screening-hcv',
    label: 'Hepatitis C serology (Anti-HCV)',
    category: 'Infectious & Safety',
    help: 'Serological antibody screening for active or past Hepatitis C virus infection.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-viral-screening-hcv',
    values: [
      { code: 'hcv-negative', label: 'Anti-HCV antibody negative' },
      { code: 'hcv-positive', label: 'Anti-HCV antibody positive (requires HCV RNA reflex)' },
    ],
  },
  {
    id: 'viral-screening-hiv',
    label: 'HIV screening serology',
    category: 'Infectious & Safety',
    help: 'HIV-1/2 4th generation antigen/antibody combo test.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-viral-screening-hiv',
    values: [
      { code: 'hiv-negative', label: 'HIV 1/2 antibody and p24 antigen non-reactive' },
      { code: 'hiv-positive', label: 'HIV confirmed positive (requires CD4 count and viral load coordination)' },
    ],
  },
  {
    id: 'serum-beta2-microglobulin',
    label: 'Serum Beta-2 Microglobulin (B2M)',
    category: 'Labs & Biomarkers',
    help: 'Prognostic tumor marker in CLL, myeloma, and indolent lymphomas (cutoff 3.0 mg/L or 3.5 mg/L).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-beta2-microglobulin',
    values: [
      { code: 'b2m-normal', label: 'Normal (<= 3.0 mg/L)' },
      { code: 'b2m-elevated', label: 'Elevated (> 3.0 mg/L)' },
    ],
  },
  {
    id: 'presentation-smear',
    label: 'Peripheral blood smear presentation',
    category: 'Morphology & Hematology',
    help: 'Distinguishes primary leukemic phase lymphocytosis from isolated solid nodal lymphoma mass.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-presentation-smear',
    values: [
      { code: 'no-lymphocytosis', label: 'No circulating lymphocytosis (solid lymphadenopathy)' },
      { code: 'circulating-lymphocytosis', label: 'Circulating abnormal lymphocytosis on peripheral smear' },
    ],
  },
  {
    id: 'biopsy-confirmation',
    label: 'Histopathology tissue biopsy status',
    category: 'Diagnostics',
    help: 'Definitive tissue diagnosis confirmation from surgical excisional or core biopsy.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-biopsy-confirmation',
    values: [
      { code: 'biopsy-confirmed', label: 'Biopsy confirmed (formal histopathology & IHC report complete)' },
      { code: 'pending-biopsy', label: 'Biopsy pending / FNAC only (core or excisional biopsy mandatory)' },
    ],
  },
  {
    id: 'cll-treatment-indication',
    label: 'iwCLL active treatment indication',
    category: 'Clinical Indication',
    help: 'Presence of progressive bone marrow failure, massive splenomegaly/nodes, or B symptoms.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-cll-treatment-indication',
    values: [
      { code: 'no-indication', label: 'Asymptomatic / early stage (no iwCLL active treatment indication)' },
      { code: 'treatment-indicated', label: 'Treatment indicated (progressive cytopenias, massive nodes, B symptoms)' },
    ],
  },
  {
    id: 'hd-mtx-planned',
    label: 'High-dose Methotrexate therapy planned',
    category: 'Treatment Planning',
    help: 'Planned HD-MTX (> 1 g/m2) for CNS lymphoma or systemic prophylaxis.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-hd-mtx-planned',
    values: [
      { code: 'not-planned', label: 'HD-MTX not planned' },
      { code: 'planned', label: 'HD-MTX planned (requires mandatory 99mTc-DTPA clearance GFR test)' },
    ],
  },
  {
    id: 'anthracycline-fitness',
    label: 'Anthracycline (R-CHOP) fitness status',
    category: 'Performance & Fitness',
    help: 'Cardiopulmonary fitness and comorbidity evaluation: normal LVEF >= 50%, age < 70, absence of severe uncontrolled organ failure.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-anthracycline-fitness',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-anthracycline-fitness',
    values: [
      { code: 'fit-r-chop', label: 'Fit for standard R-CHOP (LVEF >= 50%, Age < 70, controlled comorbidities)' },
      { code: 'unfit-cardiac', label: 'Cardiac dysfunction / CAD / RWMA / prior anthracycline toxicity (LVEF < 50%)' },
      { code: 'unfit-elderly-frail', label: 'Elderly with significant frailty / comorbid (Age > 70 with frailty)' },
      { code: 'unfit-anthra-ineligible', label: 'Severe hepatic / renal / systemic contraindication to anthracyclines' },
      { code: 'frail-palliative', label: 'Frail / advanced decline (candidate for palliative / low-intensity therapy only)' },
    ],
  },
  {
    id: 'dlbcl-stage',
    label: 'Ann Arbor anatomical disease stage',
    category: 'Staging & Anatomy',
    help: 'Anatomical stage classification validated by baseline whole-body 18F-FDG PET-CT.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-dlbcl-stage',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-dlbcl-stage',
    values: [
      { code: 'stage-1-2-limited', label: 'Limited Stage (Stage I & II)' },
      { code: 'stage-3-4-advanced', label: 'Advanced Stage (Stage III & IV)' },
    ],
  },
  {
    id: 'bulky-status',
    label: 'Bulky disease status (>= 7.5 cm)',
    category: 'Staging & Anatomy',
    help: 'Single largest contiguous tumor mass dimension on PET-CT (cutoff >= 7.5 cm per clinical guideline).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-bulky-status',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-bulky-status',
    values: [
      { code: 'non-bulky', label: 'Non-bulky disease (largest lesion < 7.5 cm)' },
      { code: 'bulky-gte-7-5cm', label: 'Bulky disease (largest lesion >= 7.5 cm)' },
    ],
  },
  {
    id: 'cell-of-origin',
    label: 'DLBCL cell-of-origin (IHC Hans algorithm)',
    category: 'Histology & Pathology',
    help: 'Immunohistochemical subtyping (CD10, BCL6, MUM1): Germinal Center B-cell (GCB) vs Non-GCB / Activated B-cell (ABC).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-cell-of-origin',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-cell-of-origin',
    values: [
      { code: 'gcb', label: 'GCB (Germinal Center B-cell phenotype)' },
      { code: 'non-gcb', label: 'Non-GCB / ABC (Activated B-cell phenotype)' },
    ],
  },
  {
    id: 'cns-risk-sites',
    label: 'CNS high-risk anatomical involvement',
    category: 'Prognosis & Risk',
    help: 'High-risk anatomical sites: testicular, breast, adnexa, adrenal, renal involvement, or confirmed Double-Hit Lymphoma (DHL).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-cns-risk-sites',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-cns-risk-sites',
    values: [
      { code: 'cns-high-risk', label: 'High CNS risk (testicular, breast, adnexal, renal, adrenal DLBCL or DHL)' },
      { code: 'cns-standard-risk', label: 'Standard CNS risk (no high-risk anatomical involvement)' },
    ],
  },
  {
    id: 'cd4-count',
    label: 'CD4 lymphocyte count (in HIV+ DLBCL)',
    category: 'Infectious & Safety',
    help: 'Absolute CD4 count threshold: CD4 >= 50 cells/uL permits Rituximab (SC-RR-EPOCH); CD4 < 50 cells/uL contraindicates Rituximab (EPOCH without R).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-cd4-count',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-cd4-count',
    values: [
      { code: 'cd4-gte-50', label: 'CD4 >= 50 cells/uL (Rituximab permitted)' },
      { code: 'cd4-lt-50', label: 'CD4 < 50 cells/uL (Rituximab contraindicated / avoided)' },
      { code: 'not-applicable', label: 'Not applicable (HIV negative)' },
    ],
  },
  {
    id: 'central-venous-access',
    label: 'Central venous access availability (for PMBCL)',
    category: 'Treatment Planning',
    help: 'Continuous infusional chemotherapy (DA-EPOCH-R) mandates central venous access (PICC line or chemo port).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-central-venous-access',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-central-venous-access',
    values: [
      { code: 'central-access-available', label: 'Central venous access available (PICC line or chemo port in place)' },
      { code: 'no-central-access', label: 'No central venous access / peripheral IV only' },
    ],
  },
  {
    id: 'cardiac-echo-status',
    label: '2D-ECHO LVEF monitoring on therapy',
    category: 'Safety & Comorbidities',
    help: 'Mandatory 2D-ECHO at baseline and after cycle 4 of R-CHOP. Decline > 10% requires anthracycline discontinuation.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-cardiac-echo-status',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-cardiac-echo-status',
    values: [
      { code: 'echo-normal-stable', label: 'LVEF >= 50% and stable (decline <= 10% from baseline)' },
      { code: 'echo-lvef-declined', label: 'LVEF decline > 10% from baseline (cardiotoxicity gate)' },
    ],
  },
  {
    id: 'prephase-indication',
    label: 'Pre-phase therapy indication',
    category: 'Performance & Fitness',
    help: 'Mandatory pre-phase Cyclophosphamide + Steroids in: elderly Stage III/IV, bulky disease, GI involvement, or poor PS.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-prephase-indication',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-prephase-indication',
    values: [
      { code: 'prephase-indicated', label: 'Pre-phase indicated (elderly III/IV, bulky, GI involvement, poor PS)' },
      { code: 'prephase-not-indicated', label: 'No pre-phase indicated (standard good PS non-bulky)' },
    ],
  },
  {
    id: 'relapse-biopsy-status',
    label: 'Relapse tissue biopsy confirmation status',
    category: 'Diagnostics & Pathology',
    help: 'Mandatory repeat biopsy from most representative site (largest size + highest SUVmax) to confirm DLBCL, repeat IHC (GCB vs non-GCB), and exclude indolent transformation.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-relapse-biopsy-status',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-relapse-biopsy-status',
    values: [
      { code: 'biopsy-confirmed-dlbcl', label: 'Biopsy confirmed DLBCL (repeat IHC completed)' },
      { code: 'transformation-indolent', label: 'Transformed from prior indolent lymphoma (e.g. transformed FL)' },
      { code: 'biopsy-pending', label: 'Biopsy pending / FNAC only (repeat core/excisional biopsy mandatory)' },
    ],
  },
  {
    id: 'relapse-timing',
    label: 'Timing of relapse / progression relative to R-CHOP',
    category: 'Prognosis & Chronology',
    help: 'Critical branch point: Relapse > 12 months after R-CHOP completion (chemosensitive likely -> Pathway A) vs Relapse <= 12 months / progression ON R-CHOP (early/refractory -> Pathway B).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-relapse-timing',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-relapse-timing',
    values: [
      { code: 'relapse-gt-12m', label: 'Late relapse (> 12 months post completion of first-line R-CHOP)' },
      { code: 'relapse-le-12m', label: 'Early relapse (<= 12 months post completion of first-line R-CHOP)' },
      { code: 'primary-refractory', label: 'Primary refractory / progression ON first-line R-CHOP therapy' },
    ],
  },
  {
    id: 'chemo-fitness-overall',
    label: 'Fitness for combination systemic chemotherapy',
    category: 'Performance & Fitness',
    help: 'General fitness to tolerate intensive or non-transplant combination chemotherapy vs candidate for palliative/low-intensity oral therapy only.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-chemo-fitness-overall',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-chemo-fitness-overall',
    values: [
      { code: 'chemo-eligible', label: 'Chemotherapy eligible (candidate for intensive or standard combination salvage)' },
      { code: 'unfit-all-chemo', label: 'Unfit for combination chemotherapy (candidate for palliative / oral metronomic / targeted only)' },
    ],
  },
  {
    id: 'asct-fitness',
    label: 'Fitness for salvage chemotherapy + ASCT',
    category: 'Performance & Fitness',
    help: 'Eligibility for high-dose chemotherapy and Autologous Stem Cell Transplant (age, ECOG PS, absence of severe organ dysfunction).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-asct-fitness',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-asct-fitness',
    values: [
      { code: 'asct-fit', label: 'Fit for intensive salvage therapy + Autologous Stem Cell Transplant (ASCT)' },
      { code: 'asct-unfit', label: 'Not fit for ASCT (non-transplant candidate)' },
    ],
  },
  {
    id: 'car-t-fitness',
    label: 'Fitness for anti-CD19 CAR-T cell therapy',
    category: 'Performance & Fitness',
    help: 'Physiological fitness to tolerate cytokine release syndrome (CRS) and neurotoxicity (ICANS) associated with CAR-T.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-car-t-fitness',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-car-t-fitness',
    values: [
      { code: 'car-t-fit', label: 'Fit for CAR-T cell therapy (tolerable CRS/ICANS risk, adequate organ reserve)' },
      { code: 'car-t-unfit', label: 'Not fit for CAR-T cell therapy' },
    ],
  },
  {
    id: 'pet-response-salvage',
    label: 'PET-CT response after salvage chemotherapy (3 cycles)',
    category: 'Response Assessment',
    help: 'Deauville 5-point scale score after 3 cycles of salvage chemo (R-GEMOX / R-GDP / Pola-R-GEMOX).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-pet-response-salvage',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-pet-response-salvage',
    values: [
      { code: 'salvage-cr-pr', label: 'Chemosensitive: PR or CR (Deauville Score 1-3, >= 50% reduction in uptake)' },
      { code: 'salvage-ds4-partial', label: 'Partial response / residual uptake (Deauville Score 4, no new disease sites)' },
      { code: 'salvage-ds5-refractory', label: 'Chemotherapy-refractory (Deauville Score 5 or progressive disease)' },
      { code: 'not-assessed', label: 'Not yet assessed / salvage therapy not yet completed' },
    ],
  },
  {
    id: 'car-t-future-plan',
    label: 'CAR-T cell therapy future intention / possibility',
    category: 'Treatment Planning & Safety',
    help: 'CRITICAL SAFETY GATE: Bendamustine causes prolonged T-cell lymphopenia and impairs CAR-T manufacture. Must be AVOIDED if CAR-T remains a possibility.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-car-t-future-plan',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-car-t-future-plan',
    values: [
      { code: 'cart-possible', label: 'CAR-T is planned or remains a future possibility (MANDATORY TO AVOID BENDA / POLA-BR)' },
      { code: 'cart-definitively-excluded', label: 'CAR-T is definitively NOT planned / patient ineligible / unavailable' },
    ],
  },
  {
    id: 'cell-of-origin-rr',
    label: 'Repeat IHC cell-of-origin subtype at relapse',
    category: 'Histology & Pathology',
    help: 'Tumor biology may evolve at relapse. Non-GCB subtype qualifies for oral targeted lenalidomide or bortezomib in the palliative setting.',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-cell-of-origin-rr',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-cell-of-origin-rr',
    values: [
      { code: 'non-gcb', label: 'Non-GCB phenotype (eligible for targeted lenalidomide / bortezomib)' },
      { code: 'gcb', label: 'GCB phenotype' },
    ],
  },
  {
    id: 'dominant-residual-site',
    label: 'Residual or bulky disease site for radiation',
    category: 'Radiation Therapy',
    help: 'Presence of single residual PET-positive site or bulky site at presentation suitable for consolidative radiotherapy (30-36 Gy).',
    codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-dominant-residual-site',
    valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-dominant-residual-site',
    values: [
      { code: 'single-site-residual', label: 'Single residual PET+ site OR initial bulky site (candidate for consolidative RT 30-36 Gy)' },
      { code: 'diffuse-multisite', label: 'Diffuse widespread multi-site disease (systemic therapy only)' },
      { code: 'no-residual-cmr', label: 'Complete metabolic response (no residual uptake)' },
    ],
  },
];


// ---------------------------------------------------------------------------
// 2. STANDARD BUILT-IN CLINICAL SCORE FUNCTIONS
// ---------------------------------------------------------------------------
export const STANDARD_FUNCTIONS = [
  {
    id: 'aaipi-dlbcl',
    name: 'aaIPI',
    label: 'Age-adjusted International Prognostic Index (aaIPI)',
    category: 'DLBCL & Aggressive Lymphoma',
    description: 'Prognostic index for aggressive large B-cell lymphomas in patients age <= 60 years. Uses 3 adverse factors: Stage III/IV (+1), Elevated LDH (+1), and ECOG PS >= 2 (+1).',
    citations: 'N Engl J Med 1993; 329:987-994. Blood 2006; 107:4480-4488.',
    requiredFindingIds: ['staging-extent', 'serum-ldh', 'ecog-ps', 'age-group'],
    appliesWhen: [{ findingId: 'age-group', op: 'is', values: ['age-le-60'] }],
    factors: [
      { findingId: 'staging-extent', points: { 'stage-1-2-limited': 0, 'stage-3-4-advanced': 1 } },
      { findingId: 'serum-ldh', points: { 'ldh-normal': 0, 'ldh-elevated': 1 } },
      { findingId: 'ecog-ps', points: { 'ecog-0-1': 0, 'ecog-2-4': 1 } },
    ],
    bands: [
      { code: 'low', label: 'Low Risk', min: 0, max: 0, note: 'Score 0: ~83% 5-year OS with R-CHOP' },
      { code: 'low-intermediate', label: 'Low-Intermediate Risk', min: 1, max: 1, note: 'Score 1: ~69% 5-year OS' },
      { code: 'high-intermediate', label: 'High-Intermediate Risk', min: 2, max: 2, note: 'Score 2: ~53% 5-year OS' },
      { code: 'high', label: 'High Risk', min: 3, max: 3, note: 'Score 3: ~32% 5-year OS (candidate for intensified protocols)' },
    ],
  },
  {
    id: 'ipi-dlbcl',
    name: 'IPI',
    label: 'International Prognostic Index (IPI)',
    category: 'DLBCL & Aggressive Lymphoma',
    description: 'Full 5-factor prognostic index for aggressive non-Hodgkin lymphomas across all age groups: Age > 60 (+1), Stage III/IV (+1), Elevated LDH (+1), ECOG PS >= 2 (+1), and > 1 Extranodal site (+1).',
    citations: 'The International Non-Hodgkin Lymphoma Prognostic Factors Project. N Engl J Med 1993.',
    requiredFindingIds: ['age-group', 'staging-extent', 'serum-ldh', 'ecog-ps', 'extranodal-sites'],
    appliesWhen: [],
    factors: [
      { findingId: 'age-group', points: { 'age-le-60': 0, 'age-gt-60': 1 } },
      { findingId: 'staging-extent', points: { 'stage-1-2-limited': 0, 'stage-3-4-advanced': 1 } },
      { findingId: 'serum-ldh', points: { 'ldh-normal': 0, 'ldh-elevated': 1 } },
      { findingId: 'ecog-ps', points: { 'ecog-0-1': 0, 'ecog-2-4': 1 } },
      { findingId: 'extranodal-sites', points: { 'extranodal-0-1': 0, 'extranodal-gt-1': 1 } },
    ],
    bands: [
      { code: 'low', label: 'Low Risk', min: 0, max: 1, note: 'Score 0-1: ~82% 5-year OS' },
      { code: 'low-intermediate', label: 'Low-Intermediate Risk', min: 2, max: 2, note: 'Score 2: ~67% 5-year OS' },
      { code: 'high-intermediate', label: 'High-Intermediate Risk', min: 3, max: 3, note: 'Score 3: ~55% 5-year OS' },
      { code: 'high', label: 'High Risk', min: 4, max: 5, note: 'Score 4-5: ~40% 5-year OS' },
    ],
  },
  {
    id: 'flipi-score',
    name: 'FLIPI',
    label: 'Follicular Lymphoma International Prognostic Index (FLIPI)',
    category: 'Follicular & Indolent Lymphoma',
    description: 'Prognostic index specifically validated in Follicular Lymphoma. 5 adverse factors: Age > 60 (+1), Ann Arbor Stage III/IV (+1), Elevated LDH (+1), Extranodal sites > 1 (+1), and Bone Marrow involvement (+1).',
    citations: 'Solal-Céligny P, et al. Blood 2004; 104(5):1258-1265.',
    requiredFindingIds: ['age-group', 'staging-extent', 'serum-ldh', 'extranodal-sites', 'bone-marrow'],
    appliesWhen: [],
    factors: [
      { findingId: 'age-group', points: { 'age-le-60': 0, 'age-gt-60': 1 } },
      { findingId: 'staging-extent', points: { 'stage-1-2-limited': 0, 'stage-3-4-advanced': 1 } },
      { findingId: 'serum-ldh', points: { 'ldh-normal': 0, 'ldh-elevated': 1 } },
      { findingId: 'extranodal-sites', points: { 'extranodal-0-1': 0, 'extranodal-gt-1': 1 } },
      { findingId: 'bone-marrow', points: { 'cleared': 0, 'involved': 1 } },
    ],
    bands: [
      { code: 'low', label: 'Low Risk', min: 0, max: 1, note: 'Score 0-1: ~91% 10-year OS' },
      { code: 'intermediate', label: 'Intermediate Risk', min: 2, max: 2, note: 'Score 2: ~78% 10-year OS' },
      { code: 'high', label: 'High Risk', min: 3, max: 5, note: 'Score 3-5: ~53% 10-year OS' },
    ],
  },
  {
    id: 'mipi-mcl',
    name: 'MIPI',
    label: 'Mantle Cell Lymphoma International Prognostic Index (MIPI)',
    category: 'Mantle Cell Lymphoma',
    description: 'Validated prognostic index for Mantle Cell Lymphoma. Combines Age, ECOG performance status, Serum LDH, and Bone Marrow infiltration.',
    citations: 'Hoster E, et al. Blood 2008; 111(2):558-565.',
    requiredFindingIds: ['age-group', 'ecog-ps', 'serum-ldh', 'bone-marrow'],
    appliesWhen: [],
    factors: [
      { findingId: 'age-group', points: { 'age-le-60': 0, 'age-gt-60': 1 } },
      { findingId: 'ecog-ps', points: { 'ecog-0-1': 0, 'ecog-2-4': 1 } },
      { findingId: 'serum-ldh', points: { 'ldh-normal': 0, 'ldh-elevated': 1 } },
      { findingId: 'bone-marrow', points: { 'cleared': 0, 'involved': 1 } },
    ],
    bands: [
      { code: 'low', label: 'Low Risk', min: 0, max: 1, note: 'Score 0-1: Median OS not reached' },
      { code: 'intermediate', label: 'Intermediate Risk', min: 2, max: 2, note: 'Score 2: Median OS 51 months' },
      { code: 'high', label: 'High Risk', min: 3, max: 4, note: 'Score 3-4: Median OS 29 months' },
    ],
  },
  {
    id: 'cllipi-score',
    name: 'CLLIPI',
    label: 'CLL International Prognostic Index (CLL-IPI)',
    category: 'Chronic Lymphocytic Leukemia',
    description: 'International prognostic index for CLL. Heavily weights TP53 disruption (4 points), Elevated Serum Beta-2 Microglobulin (2 points), Clinical Staging (1 point), and Age > 65 (1 point).',
    citations: 'Lancet Oncol 2016; 17(6):779-790.',
    requiredFindingIds: ['tp53-del17p', 'serum-beta2-microglobulin', 'staging-extent', 'age-group'],
    appliesWhen: [],
    factors: [
      { findingId: 'tp53-del17p', points: { 'wild-type': 0, 'disrupted': 4 } },
      { findingId: 'serum-beta2-microglobulin', points: { 'b2m-normal': 0, 'b2m-elevated': 2 } },
      { findingId: 'staging-extent', points: { 'stage-1-2-limited': 0, 'stage-3-4-advanced': 1 } },
      { findingId: 'age-group', points: { 'age-le-60': 0, 'age-gt-60': 1 } },
    ],
    bands: [
      { code: 'low', label: 'Low Risk', min: 0, max: 1, note: 'Score 0-1: 5-year OS ~93%' },
      { code: 'intermediate', label: 'Intermediate Risk', min: 2, max: 3, note: 'Score 2-3: 5-year OS ~79%' },
      { code: 'high', label: 'High Risk', min: 4, max: 6, note: 'Score 4-6: 5-year OS ~63%' },
      { code: 'very-high', label: 'Very High Risk', min: 7, max: 8, note: 'Score 7-8: 5-year OS ~23% (targeted inhibitors preferred)' },
    ],
  },
  {
    id: 'ips-hodgkin',
    name: 'IPS',
    label: 'Hasenclever International Prognostic Score (IPS for Hodgkin)',
    category: 'Hodgkin Lymphoma',
    description: 'Prognostic score for advanced Classic Hodgkin Lymphoma predicting freedom from progression (FFP).',
    citations: 'Hasenclever D, Diehl V. N Engl J Med 1998; 339:1506-1514.',
    requiredFindingIds: ['age-group', 'staging-extent', 'bone-marrow', 'ecog-ps'],
    appliesWhen: [],
    factors: [
      { findingId: 'age-group', points: { 'age-le-60': 0, 'age-gt-60': 1 } },
      { findingId: 'staging-extent', points: { 'stage-1-2-limited': 0, 'stage-3-4-advanced': 1 } },
      { findingId: 'bone-marrow', points: { 'cleared': 0, 'involved': 1 } },
      { findingId: 'ecog-ps', points: { 'ecog-0-1': 0, 'ecog-2-4': 1 } },
    ],
    bands: [
      { code: 'low', label: 'Low Risk (Score 0-1)', min: 0, max: 1, note: 'Score 0-1: ~84% 5-year freedom from progression' },
      { code: 'intermediate', label: 'Intermediate Risk (Score 2-3)', min: 2, max: 3, note: 'Score 2-3: ~70% 5-year FFP' },
      { code: 'high', label: 'High Risk (Score 4+)', min: 4, max: 4, note: 'Score 4: ~55% 5-year FFP (consider escalated BEACOPP)' },
    ],
  },
  {
    id: 'malt-ipi',
    name: 'MALT_IPI',
    label: 'MALT-IPI Prognostic Index',
    category: 'Marginal Zone Lymphoma',
    description: 'Objective prognostic index for Extranodal Marginal Zone (MALT) Lymphoma based on Age > 60 (+1), Ann Arbor Stage III/IV (+1), and Elevated Serum LDH (+1).',
    citations: 'Thieblemont C, et al. Blood 2017; 130(2):140-147.',
    requiredFindingIds: ['age-group', 'staging-extent', 'serum-ldh'],
    appliesWhen: [],
    factors: [
      { findingId: 'age-group', points: { 'age-le-60': 0, 'age-gt-60': 1 } },
      { findingId: 'staging-extent', points: { 'stage-1-2-limited': 0, 'stage-3-4-advanced': 1 } },
      { findingId: 'serum-ldh', points: { 'ldh-normal': 0, 'ldh-elevated': 1 } },
    ],
    bands: [
      { code: 'low', label: 'Low Risk', min: 0, max: 0, note: 'Score 0: ~99% 5-year OS' },
      { code: 'intermediate', label: 'Intermediate Risk', min: 1, max: 1, note: 'Score 1: ~93% 5-year OS' },
      { code: 'high', label: 'High Risk', min: 2, max: 3, note: 'Score 2-3: ~64% 5-year OS' },
    ],
  },
  {
    id: 'pit-tcell',
    name: 'PIT',
    label: 'Prognostic Index for PTCL-NOS (PIT)',
    category: 'Peripheral T-Cell Lymphoma',
    description: 'Prognostic index for peripheral T-cell lymphoma unspecified: Age > 60 (+1), ECOG PS >= 2 (+1), Elevated LDH (+1), and Bone Marrow involvement (+1).',
    citations: 'Gallamini A, et al. Blood 2004; 103(7):2474-2479.',
    requiredFindingIds: ['age-group', 'ecog-ps', 'serum-ldh', 'bone-marrow'],
    appliesWhen: [],
    factors: [
      { findingId: 'age-group', points: { 'age-le-60': 0, 'age-gt-60': 1 } },
      { findingId: 'ecog-ps', points: { 'ecog-0-1': 0, 'ecog-2-4': 1 } },
      { findingId: 'serum-ldh', points: { 'ldh-normal': 0, 'ldh-elevated': 1 } },
      { findingId: 'bone-marrow', points: { 'cleared': 0, 'involved': 1 } },
    ],
    bands: [
      { code: 'group-1', label: 'Group 1 (Score 0)', min: 0, max: 0, note: 'Score 0: ~62% 5-year OS' },
      { code: 'group-2', label: 'Group 2 (Score 1)', min: 1, max: 1, note: 'Score 1: ~53% 5-year OS' },
      { code: 'group-3', label: 'Group 3 (Score 2)', min: 2, max: 2, note: 'Score 2: ~33% 5-year OS' },
      { code: 'group-4', label: 'Group 4 (Score 3-4)', min: 3, max: 4, note: 'Score 3-4: ~18% 5-year OS' },
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. STANDARD BUILT-IN CLINICAL OUTCOMES
// ---------------------------------------------------------------------------
export const STANDARD_OUTCOMES = [
  {
    id: 'needs-review',
    label: 'Needs clinician review (Data Missing / Unreliable)',
    kind: 'review',
    category: 'Clinical Governance & Safety',
    rationale: 'Required clinical findings are missing, incomplete, unparsed referral free-text, or outside guideline scope. A multidisciplinary clinical decision is required - automated execution halted.',
    regimens: [],
  },
  {
    id: 'pathway-staging-pet-ct-omit-bm',
    label: 'Advanced DLBCL / Hodgkin - Staging PET-CT (Omit routine BM biopsy)',
    kind: 'treatment',
    category: 'Staging & Workup',
    rationale: 'In DLBCL and classic Hodgkin lymphoma, whole-body 18F-FDG PET-CT has > 95% sensitivity for skeletal/marrow involvement. Routine bone marrow aspirate/trephine is omitted unless PET is negative and aggressive features require exclusion.',
    regimens: [
      { id: 'r-pet', name: 'Whole-body 18F-FDG PET-CT (skull base to mid-thigh)', category: 'Imaging' },
      { id: 'r-omit-bm', name: 'Omit routine bone marrow biopsy (PET-CT sufficient for marrow staging)', category: 'Procedure' },
      { id: 'r-prog-idx', name: 'Calculate disease-specific prognostic index (aaIPI / IPI / IPS)', category: 'Risk Stratification' },
    ],
  },
  {
    id: 'pathway-staging-pet-ct-bm-required',
    label: 'Indolent / Mantle Cell / Burkitt - PET-CT + Mandatory Bone Marrow Biopsy',
    kind: 'treatment',
    category: 'Staging & Workup',
    rationale: 'FDG avidity is variable in indolent lymphomas (FL, MZL, CLL/SLL), and discordance between PET and marrow involvement occurs in > 20% of Mantle Cell, Burkitt, and PTCL cases. Bone marrow trephine biopsy is mandatory.',
    regimens: [
      { id: 'r-pet', name: 'Whole-body 18F-FDG PET-CT', category: 'Imaging' },
      { id: 'r-bm', name: 'Bilateral or unilateral bone marrow aspirate & trephine biopsy (> 1.6 cm core)', category: 'Procedure' },
      { id: 'r-flow', name: 'Multiparametric flow cytometry & IHC for clonal infiltration', category: 'Pathology' },
    ],
  },
  {
    id: 'pathway-staging-limited-pet-ct',
    label: 'Limited Stage (I-II) DLBCL / Hodgkin - PET-CT Staging',
    kind: 'treatment',
    category: 'Staging & Workup',
    rationale: 'Accurate PET-CT confirmation of truly localized disease (Stage I-II) qualifies patient for abbreviated chemoimmunotherapy (e.g. 3-4 cycles) followed by involved-site radiotherapy (ISRT), sparing toxicity.',
    regimens: [
      { id: 'r-pet-lim', name: 'Diagnostic 18F-FDG PET-CT to exclude occult distant disease', category: 'Imaging' },
      { id: 'r-rad-consult', name: 'Radiation oncology consultation for Involved-Site Radiotherapy (ISRT) planning', category: 'Consultation' },
    ],
  },
  {
    id: 'pathway-r-chop-systemic',
    label: 'Advanced DLBCL - Standard Chemoimmunotherapy (R-CHOP)',
    kind: 'treatment',
    category: 'Systemic Therapy',
    rationale: 'Standard first-line curative regimen for diffuse large B-cell lymphoma without high-grade double hit features.',
    regimens: [
      { id: 'r-chop', name: 'R-CHOP x 6 cycles q21d (Rituximab, Cyclophosphamide, Doxorubicin, Vincristine, Prednisone)', category: 'Chemoimmunotherapy' },
      { id: 'r-isrt-bulk', name: 'Consolidative ISRT 30-36 Gy to initial bulky disease sites (>= 7.5 cm)', category: 'Radiation' },
    ],
  },
  {
    id: 'pathway-pola-r-chp',
    label: 'Advanced DLBCL (High IPI) - Targeted Chemoimmunotherapy (Pola-R-CHP)',
    kind: 'treatment',
    category: 'Systemic Therapy',
    rationale: 'Polatuzumab vedotin + R-CHP demonstrated superior progression-free survival compared to R-CHOP in previously untreated DLBCL with IPI 2-5 (POLARIX trial).',
    regimens: [
      { id: 'pola-r-chp', name: 'Polatuzumab vedotin (1.8 mg/kg) + R-CHP x 6 cycles q21d', category: 'Targeted ADC + Chemo' },
      { id: 'pola-r-maint', name: 'Rituximab monotherapy x 2 additional cycles', category: 'Maintenance' },
    ],
  },
  {
    id: 'pathway-br-chemoimmuno',
    label: 'Follicular / Mantle Cell - Bendamustine + Rituximab (BR)',
    kind: 'treatment',
    category: 'Systemic Therapy',
    rationale: 'BR provides superior progression-free survival and lower alopecia/cardiac toxicity compared to R-CHOP in advanced follicular lymphoma and transplant-ineligible mantle cell lymphoma (StiL and BRIGHT trials).',
    regimens: [
      { id: 'br-regimen', name: 'Bendamustine (90 mg/m2 D1-2) + Rituximab (375 mg/m2 D1) x 6 cycles q28d', category: 'Chemoimmunotherapy' },
      { id: 'r-maint', name: 'Rituximab maintenance 375 mg/m2 every 2 months for 2 years (in FL responders)', category: 'Maintenance' },
    ],
  },
  {
    id: 'pathway-da-epoch-r',
    label: 'Double-Hit / High-Grade B-Cell Lymphoma - Dose-Adjusted EPOCH-R',
    kind: 'treatment',
    category: 'Systemic Therapy',
    rationale: 'Double-hit lymphomas (MYC + BCL2/BCL6) have high relapse rates with standard R-CHOP. Infusional DA-EPOCH-R overcomes standard chemoresistance mechanisms and achieves higher complete response rates.',
    regimens: [
      { id: 'r-epoch', name: 'DA-EPOCH-R x 6 cycles (infusional etoposide, doxorubicin, vincristine + bolus cyclophosphamide & rituximab)', category: 'Dose-Adjusted Infusion' },
      { id: 'r-cns-p', name: 'Intrathecal methotrexate or high-dose systemic MTX CNS prophylaxis', category: 'CNS Prophylaxis' },
    ],
  },
  {
    id: 'pathway-watch-and-wait',
    label: 'Indolent Lymphoma / CLL - Watchful Waiting / Active Surveillance',
    kind: 'observation',
    category: 'Surveillance',
    rationale: 'Asymptomatic, low-tumor-burden follicular, marginal zone, or CLL patients exhibit no overall survival benefit from immediate treatment. Active surveillance defers toxicities without compromising clinical outcomes.',
    regimens: [
      { id: 'r-surv', name: 'Active clinical surveillance (physical exam, CBC, LDH every 3 to 6 months)', category: 'Surveillance' },
      { id: 'r-symptom-edu', name: 'Patient education regarding B-symptoms, rapidly growing adenopathy, and cytopenias', category: 'Patient Education' },
    ],
  },
  {
    id: 'pathway-curative-isrt',
    label: 'Stage I Limited Indolent Lymphoma - Curative-Intent Radiotherapy',
    kind: 'treatment',
    category: 'Radiation Therapy',
    rationale: 'Stage I follicular or marginal zone lymphoma with negative bone marrow achieves > 70% long-term disease-free survival with localized involved-site radiation therapy.',
    regimens: [
      { id: 'r-isrt-cur', name: 'Involved-Site Radiotherapy (ISRT) 24.0 Gy in 12 fractions', category: 'Radiation' },
      { id: 'r-followup-pet', name: 'Follow-up PET-CT at 12-16 weeks post-radiotherapy', category: 'Response Assessment' },
    ],
  },
  {
    id: 'safety-hbv-antiviral-prophylaxis',
    label: 'Safety Gate: Hepatitis B Positive - Mandatory Antiviral Prophylaxis',
    kind: 'treatment',
    category: 'Infectious Safety',
    rationale: 'Anti-CD20 therapy carries up to 50% risk of fulminant Hepatitis B reactivation in HBsAg+ and anti-HBc+ patients. Antiviral prophylaxis (Entecavir/Tenofovir) must start prior to chemoimmunotherapy and continue >= 12 months after.',
    regimens: [
      { id: 'r-entecavir', name: 'Entecavir 0.5 mg PO daily (or Tenofovir TDF/TAF if lamivudine exposed)', category: 'Antiviral Prophylaxis' },
      { id: 'r-hbv-dna', name: 'Baseline quantitative HBV DNA viral load and LFT monitoring', category: 'Safety Lab' },
    ],
  },
  {
    id: 'safety-tls-rasburicase-hydration',
    label: 'Safety Gate: High Metabolic Risk - Tumor Lysis Syndrome Protocol',
    kind: 'treatment',
    category: 'Metabolic Safety',
    rationale: 'High metabolic risk lymphomas require immediate pre-chemotherapy hyperhydration and urate oxidase prophylaxis to prevent acute renal failure and electrolyte emergencies.',
    regimens: [
      { id: 'r-hydration', name: 'Aggressive IV hydration (2.5 to 3.0 L/m2/day target urine output > 100 mL/hr)', category: 'Hydration' },
      { id: 'r-rasburicase', name: 'Rasburicase 0.2 mg/kg IV single dose (or Allopurinol 300 mg daily if low-risk)', category: 'Uric Acid Reducer' },
      { id: 'r-tls-panel', name: 'Serum uric acid, potassium, phosphorus, calcium, creatinine q6-8h', category: 'Safety Monitoring' },
    ],
  },
  {
    id: 'safety-cns-staging-prophylaxis',
    label: 'Safety Gate: DLBCL High CNS Relapse Risk - Diagnostic LP & Prophylaxis',
    kind: 'treatment',
    category: 'CNS Prophylaxis',
    rationale: 'Involvement of testicular, renal/adrenal, or epidural sites carries high risk (> 10%) of leptomeningeal or parenchymal CNS relapse. Diagnostic LP and CNS-directed prophylaxis are mandatory.',
    regimens: [
      { id: 'r-lp', name: 'Diagnostic lumbar puncture with CSF flow cytometry and cytology', category: 'Procedure' },
      { id: 'r-mri', name: 'Contrast-enhanced MRI brain with thin orbital/cavernous cuts', category: 'Imaging' },
      { id: 'r-it-mtx', name: 'CNS prophylaxis: Intrathecal Methotrexate (12 mg) or High-Dose MTX (3-3.5 g/m2)', category: 'Prophylaxis' },
    ],
  },
  {
    id: 'safety-dtpa-gfr-mtx',
    label: 'Safety Gate: High-Dose Methotrexate Planned - 99mTc-DTPA GFR Protocol',
    kind: 'treatment',
    category: 'Renal Safety',
    rationale: 'Serum creatinine often overestimates renal clearance in elderly or sarcopenic cancer patients. Measured clearance GFR (99mTc-DTPA) >= 60 mL/min is mandatory before HD-MTX (> 1 g/m2) to prevent fatal MTX clearance delay.',
    regimens: [
      { id: 'r-dtpa', name: '99mTc-DTPA clearance GFR scan (gate: >= 60 mL/min)', category: 'Nuclear Medicine' },
      { id: 'r-alkalinization', name: 'Urine alkalinization (IV sodium bicarbonate, target urine pH > 7.0)', category: 'Safety Protocol' },
    ],
  },
  {
    id: 'dlbcl-fit-limited-aai0-nonbulky',
    label: 'Limited Stage DLBCL (aaIPI 0, Non-Bulky): PET-Adapted R-CHOP x 3-4 Cycles',
    kind: 'treatment',
    category: 'Limited Stage DLBCL',
    rationale: 'Limited Stage (Stage I-II) with aaIPI 0 and non-bulky disease (< 7.5 cm): R-CHOP x 3 cycles followed by interim PET-CT. If CMR -> 1 additional cycle (total 4 R-CHOP); if PET positive -> 3 more cycles OR 30-35 Gy IFRT.',
    regimens: [
      { id: 'r-rchop-3', name: 'R-CHOP x 3 cycles', category: 'Chemoimmunotherapy' },
      { id: 'r-interim-pet', name: 'Interim 18F-FDG PET-CT after cycle 3', category: 'Response Imaging' },
      { id: 'r-rchop-plus1', name: 'If PET CMR: +1 more R-CHOP cycle (total 4 cycles, no radiation)', category: 'Consolidation' },
      { id: 'r-ifrt-pos', name: 'If PET positive: 3 more R-CHOP cycles OR 30-35 Gy IFRT', category: 'Radiation' },
    ],
  },
  {
    id: 'dlbcl-fit-limited-aai1-or-bulky',
    label: 'Limited Stage DLBCL (aaIPI >= 1 or Bulky >= 7.5 cm): R-CHOP x 6 + IFRT',
    kind: 'treatment',
    category: 'Limited Stage DLBCL',
    rationale: 'Limited stage DLBCL with aaIPI >= 1 or bulky disease (>= 7.5 cm): full 6 cycles of R-CHOP plus Involved-Field Radiotherapy (IFRT 30-35 Gy) to bulky disease site(s).',
    regimens: [
      { id: 'r-rchop-6', name: 'R-CHOP x 6 cycles q21d', category: 'Chemoimmunotherapy' },
      { id: 'r-ifrt-bulk', name: 'Involved-Field Radiotherapy (IFRT) 30-35 Gy to bulky disease site(s)', category: 'Radiation Therapy' },
      { id: 'r-echo-c4', name: 'Mandatory 2D-ECHO after cycle 4 to monitor LVEF', category: 'Cardiac Safety' },
    ],
  },
  {
    id: 'dlbcl-fit-advanced-standard',
    label: 'Advanced Stage DLBCL (Fit): Standard R-CHOP x 6 Cycles',
    kind: 'treatment',
    category: 'Advanced Stage DLBCL',
    rationale: 'Standard backbone for advanced stage (Stage III-IV) fit DLBCL is R-CHOP x 6 cycles. End-of-treatment PET-CT: if CMR -> observation; if Partial Response (PR) at single site -> consolidative RT 30-35 Gy.',
    regimens: [
      { id: 'r-rchop-6-std', name: 'R-CHOP x 6 cycles q21d', category: 'Standard Chemoimmunotherapy' },
      { id: 'r-echo-c4-std', name: '2D-ECHO mandatory after cycle 4', category: 'Cardiac Safety' },
      { id: 'r-eot-pet-std', name: 'End-of-treatment (EOT) PET-CT assessment', category: 'Imaging' },
      { id: 'r-rt-pr-site', name: 'Consolidative RT 30-35 Gy if PR at single residual site', category: 'Radiation Therapy' },
    ],
  },
  {
    id: 'dlbcl-fit-advanced-pola-r-chp',
    label: 'Advanced Non-GCB DLBCL (IPI >= 2, Age < 70, Non-Bulky): Pola-R-CHP x 6',
    kind: 'treatment',
    category: 'Targeted Chemoimmunotherapy',
    rationale: 'POLARIX regimen for previously untreated Non-GCB DLBCL with IPI >= 2, age < 70, non-bulky: Polatuzumab vedotin (1.8 mg/kg) replaces vincristine in R-CHP backbone x 6 cycles.',
    regimens: [
      { id: 'r-pola-r-chp', name: 'Polatuzumab vedotin (1.8 mg/kg) + R-CHP x 6 cycles q21d', category: 'Targeted ADC Chemo' },
      { id: 'r-ritux-maint', name: 'Rituximab monotherapy (375 mg/m2) x 2 additional doses', category: 'Monoclonal Antibody' },
      { id: 'r-gcsf-pep', name: 'Pegylated G-CSF primary prophylaxis 24h post-chemo', category: 'Growth Factor Support' },
    ],
  },
  {
    id: 'dlbcl-high-cns-risk-prophylaxis',
    label: 'High-Risk CNS DLBCL: Intrathecal + High-Dose MTX Prophylaxis',
    kind: 'treatment',
    category: 'CNS Prophylaxis',
    rationale: 'DLBCL involving testicular, breast, adnexal, adrenal, renal sites or DHL: Intrathecal MTX with each R-CHOP cycle plus 2 cycles of High-Dose Methotrexate (3-3.5 g/m2) post cycle 6 (DTPA GFR > 60 required).',
    regimens: [
      { id: 'r-rchop-cns', name: 'R-CHOP x 6 cycles q21d', category: 'Systemic Backbone' },
      { id: 'r-it-mtx', name: 'Intrathecal Methotrexate (12 mg) with each cycle', category: 'Intrathecal Prophylaxis' },
      { id: 'r-hd-mtx', name: 'High-Dose Methotrexate (3.0-3.5 g/m2) x 2 cycles after cycle 6', category: 'Systemic CNS Prophylaxis' },
    ],
  },
  {
    id: 'dlbcl-hiv-cd4-gte-50',
    label: 'HIV+ DLBCL (CD4 >= 50): SC-RR-EPOCH + ART + OI Prophylaxis',
    kind: 'treatment',
    category: 'HIV Lymphoma',
    rationale: 'In HIV-positive DLBCL with CD4 >= 50 cells/uL, Rituximab can be safely given. SC-RR-EPOCH with concurrent ART and opportunistic infection prophylaxis is recommended.',
    regimens: [
      { id: 'r-sc-rr-epoch', name: 'SC-RR-EPOCH (short-course dose-dense infusional EPOCH with Rituximab)', category: 'Chemoimmunotherapy' },
      { id: 'r-art', name: 'Combination Antiretroviral Therapy (ART) continuation', category: 'Antiviral' },
      { id: 'r-oi-proph', name: 'Opportunistic infection prophylaxis (TMP-SMX for PCP + fungal)', category: 'Infectious Prophylaxis' },
    ],
  },
  {
    id: 'dlbcl-hiv-cd4-lt-50',
    label: 'HIV+ DLBCL (CD4 < 50): EPOCH (Without Rituximab) + ART',
    kind: 'treatment',
    category: 'HIV Lymphoma',
    rationale: 'Severe CD4 lymphopenia (< 50 cells/uL) carries high risk of fatal infection if Rituximab is given. Treatment is infusional EPOCH alone with ART optimization and strict OI prophylaxis.',
    regimens: [
      { id: 'r-epoch-no-r', name: 'Infusional EPOCH without Rituximab (Rituximab avoided due to CD4 < 50)', category: 'Chemotherapy' },
      { id: 'r-art-opt', name: 'Aggressive ART optimization & viral load monitoring', category: 'Antiviral' },
      { id: 'r-oi-full', name: 'Mandatory multi-pathogen opportunistic infection prophylaxis', category: 'Infectious Prophylaxis' },
    ],
  },
  {
    id: 'dlbcl-unfit-cardiac-ceop',
    label: 'Unfit (Cardiac Dysfunction): R-CEOP x 6 Cycles',
    kind: 'treatment',
    category: 'Alternative Backbone',
    rationale: 'Significant cardiac dysfunction (LVEF < 50%, CAD with RWMA, or prior CHF): Doxorubicin is contraindicated. R-CEOP (Etoposide replacing Doxorubicin) achieves curative intent without cardiotoxicity.',
    regimens: [
      { id: 'r-ceop-6', name: 'R-CEOP x 6 cycles (Rituximab, Cyclophosphamide, Etoposide, Vincristine, Prednisone)', category: 'Non-Anthracycline Chemo' },
      { id: 'r-gcsf-ceop', name: 'Prophylactic G-CSF support', category: 'Growth Factor' },
    ],
  },
  {
    id: 'dlbcl-unfit-elderly-minichop',
    label: 'Unfit / Elderly Frail (Curative Intent): R-miniCHOP x 6 Cycles',
    kind: 'treatment',
    category: 'Attenuated Chemoimmunotherapy',
    rationale: 'Elderly patients (age > 70 with frailty) eligible for curative intent: R-miniCHOP (attenuated doses of CHOP + full-dose rituximab) significantly reduces treatment-related mortality.',
    regimens: [
      { id: 'r-minichop-6', name: 'R-miniCHOP x 6 cycles q21d (attenuated CHOP + Rituximab 375 mg/m2)', category: 'Attenuated Chemo' },
      { id: 'r-prephase-elderly', name: 'Pre-phase Cyclophosphamide + Prednisone x 7 days prior to cycle 1', category: 'Toxicity Reduction' },
    ],
  },
  {
    id: 'dlbcl-unfit-anthra-ineligible-gcvp',
    label: 'Unfit (Anthracycline Ineligible): R-GCVP / R-CGOP x 6 Cycles',
    kind: 'treatment',
    category: 'Alternative Backbone',
    rationale: 'Gemcitabine-based chemoimmunotherapy (R-GCVP: Gemcitabine, Cyclophosphamide, Vincristine, Prednisolone) provides an active non-anthracycline curative option.',
    regimens: [
      { id: 'r-gcvp-6', name: 'R-GCVP x 6 cycles (Rituximab, Gemcitabine, Cyclophosphamide, Vincristine, Prednisone)', category: 'Gemcitabine Backbone' },
      { id: 'r-gcsf-gcvp', name: 'G-CSF prophylaxis', category: 'Supportive Care' },
    ],
  },
  {
    id: 'dlbcl-frail-palliative',
    label: 'Frail / Palliative Intent: BR or R-PEP-C / Palliative RT',
    kind: 'treatment',
    category: 'Palliative Care',
    rationale: 'Frail patients unable to tolerate systemic curative regimens: palliative-intent BR (Bendamustine + Rituximab), oral metronomic R-PEP-C, or localized RT alone.',
    regimens: [
      { id: 'r-br-palliative', name: 'Bendamustine + Rituximab (BR) attenuated / palliative intent', category: 'Chemoimmunotherapy' },
      { id: 'r-pepc', name: 'Oral metronomic R-PEP-C', category: 'Oral Chemotherapy' },
    ],
  },
  {
    id: 'pmbcl-fit-central-access',
    label: 'PMBCL (Fit, Central Access Available): DA-EPOCH-R x 6 Cycles',
    kind: 'treatment',
    category: 'PMBCL First-Line',
    rationale: 'Primary Mediastinal B-Cell Lymphoma in fit patients with central venous access (PICC/port): Dose-Adjusted EPOCH-R x 6 cycles is preferred. Interim PET at cycle 4; if DS <= 3 -> complete 6 cycles without RT.',
    regimens: [
      { id: 'r-da-epoch-r', name: 'DA-EPOCH-R x 6 cycles (continuous 96-hr infusional chemo + rituximab)', category: 'Dose-Adjusted Infusion' },
      { id: 'r-cbc-titration', name: 'CBC on Days 8, 10, 12 of each cycle to guide dose adjustment', category: 'Safety Protocol' },
    ],
  },
  {
    id: 'pmbcl-alternative-rchop',
    label: 'PMBCL (No Central Access): R-CHOP x 6 Cycles + RT',
    kind: 'treatment',
    category: 'PMBCL Alternative',
    rationale: 'When infusional DA-EPOCH-R cannot be delivered: R-CHOP x 6 cycles is the standard alternative. Interim PET-CT at cycle 4: if positive (DS 4-5) -> consolidative radiotherapy after cycle 6.',
    regimens: [
      { id: 'r-rchop-pmbcl', name: 'R-CHOP x 6 cycles q21d', category: 'Chemoimmunotherapy' },
      { id: 'r-rt-positive-pmbcl', name: 'Consolidative RT to mediastinum if interim PET positive', category: 'Radiation Therapy' },
    ],
  },
  {
    id: 'cardiotoxicity-switch',
    label: 'Cardiac Toxicity Alert: Discontinue Anthracycline',
    kind: 'treatment',
    category: 'Cardiac Safety',
    rationale: '2D-ECHO showed LVEF decline > 10% from baseline. Discontinue doxorubicin immediately, refer to cardiology, and switch to non-cardiotoxic alternative (etoposide or gemcitabine).',
    regimens: [
      { id: 'r-cardio-ref', name: 'Urgent Cardiology referral & cardioprotection', category: 'Safety Consultation' },
      { id: 'r-ceop-switch', name: 'Switch to R-CEOP (Etoposide replaces Doxorubicin)', category: 'Chemoimmunotherapy' },
    ],
  },
  {
    id: 'rr-biopsy-mandatory-gate',
    label: 'Relapse Workup Gate: Mandatory Repeat Biopsy & Staging PET-CT',
    kind: 'review',
    category: 'Diagnostics & Safety',
    rationale: 'Repeat biopsy is MANDATORY from the most representative site (largest size + highest SUVmax) to rule out transformation from indolent lymphoma, confirm DLBCL histology, and re-evaluate IHC (GCB vs non-GCB).',
    regimens: [
      { id: 'r-pet-ct-staging', name: 'Whole-body 18F-FDG PET-CT to identify highest SUVmax site', category: 'Staging Imaging' },
      { id: 'r-core-biopsy', name: 'Image-guided core needle or surgical excisional biopsy of dominant lesion', category: 'Diagnostic Procedure' },
      { id: 'r-ihc-repeat', name: 'Repeat immunohistochemistry panel (CD20, CD10, BCL6, MUM1, MYC, BCL2)', category: 'Pathology' },
    ],
  },
  {
    id: 'rr-pathway-a-salvage-fit',
    label: 'Pathway A (Relapse > 12 Mo, Fit for ASCT): Salvage Chemotherapy x 3 Cycles',
    kind: 'treatment',
    category: 'Salvage Chemotherapy',
    rationale: 'Late relapse (> 12 months) in a transplant-eligible patient. Initiate platinum/gemcitabine salvage chemoimmunotherapy for 3 cycles (R-GEMOX, R-GDP, or Pola-R-GEMOX), followed by mandatory PET-CT restaging.',
    regimens: [
      { id: 'r-gemox', name: 'R-GEMOX x 3 cycles (Rituximab, Gemcitabine, Oxaliplatin)', category: 'Standard Salvage Backbone' },
      { id: 'r-gdp', name: 'Alternative: R-GDP x 3 cycles (Rituximab, Gemcitabine, Dexamethasone, Cisplatin)', category: 'Platinum Salvage' },
      { id: 'r-pola-gemox', name: 'Alternative: Pola-R-GEMOX x 3 cycles (Polatuzumab + R-GEMOX)', category: 'Targeted ADC Salvage' },
    ],
  },
  {
    id: 'rr-pathway-a-asct-consolidation',
    label: 'Pathway A: Chemosensitive Responders -> Autologous Stem Cell Transplant (ASCT)',
    kind: 'treatment',
    category: 'Transplant Consolidation',
    rationale: 'Patients achieving PR or CR (Deauville Score 1-3) after 3 cycles of salvage chemotherapy demonstrate chemosensitivity and proceed directly to high-dose therapy and Autologous Stem Cell Transplant (ASCT).',
    regimens: [
      { id: 'r-stem-cell-mobil', name: 'Peripheral blood stem cell (PBSC) mobilization and apheresis harvest', category: 'Cellular Therapy' },
      { id: 'r-beam-asct', name: 'High-dose conditioning chemotherapy (BEAM regimen)', category: 'Conditioning Chemo' },
      { id: 'r-asct-infusion', name: 'Autologous stem cell transplantation and post-transplant supportive care', category: 'Transplantation' },
    ],
  },
  {
    id: 'rr-pathway-a-ds4-biopsy-triage',
    label: 'Pathway A (Salvage DS-4 Partial Response): Re-Biopsy & MDT CAR-T Triage',
    kind: 'review',
    category: 'Response Triage',
    rationale: 'Deauville Score 4 after 3 cycles of salvage chemo represents residual metabolic uptake. Repeat biopsy is considered to distinguish viable lymphoma from necrosis. If viable, re-assess for CAR-T in MDT.',
    regimens: [
      { id: 'r-biopsy-residual', name: 'Targeted biopsy of residual FDG-avid mass', category: 'Diagnostic Procedure' },
      { id: 'r-mdt-cart-review', name: 'Multidisciplinary Tumor Board review for CAR-T eligibility', category: 'Specialist Review' },
    ],
  },
  {
    id: 'rr-pathway-a-ds5-salvage-cart',
    label: 'Pathway A (Salvage Refractory DS-5): Switch to CAR-T Cell Therapy',
    kind: 'treatment',
    category: 'Cellular Immunotherapy',
    rationale: 'Deauville Score 5 indicates chemotherapy-refractory disease. Immediately transition to anti-CD19 CAR-T cell therapy if fit and eligible.',
    regimens: [
      { id: 'r-cart-referral', name: 'Urgent referral to CAR-T certified cellular therapy center', category: 'Cellular Therapy' },
      { id: 'r-cart-infusion-ds5', name: 'Anti-CD19 CAR-T cell infusion (Axi-cel, Tisa-cel, or Liso-cel)', category: 'CAR-T Cell Therapy' },
    ],
  },
  {
    id: 'rr-pathway-a-nontransplant-salvage',
    label: 'Pathway A (Relapse > 12 Mo, NOT Fit for ASCT): Non-Transplant Salvage x 6 Cycles',
    kind: 'treatment',
    category: 'Non-Transplant Salvage',
    rationale: 'Late relapse (> 12 months) in patients ineligible for high-dose chemotherapy/ASCT. Administer 3 cycles of R-GEMOX, R-GDP, or Pola-R-GEMOX; if responding, complete 6 cycles total.',
    regimens: [
      { id: 'r-nontransplant-gemox', name: 'R-GEMOX / R-GDP / Pola-R-GEMOX x 3 cycles -> if responding complete 6 cycles total', category: 'Combination Chemo' },
      { id: 'r-glofit-alt', name: 'Alternative: Glofitamab-GEM-OX (CD20xCD3 bispecific + GemOx)', category: 'Bispecific Antibody' },
    ],
  },
  {
    id: 'rr-pathway-b-cart-primary',
    label: 'Pathway B (Early Relapse / Refractory, Fit for CAR-T): Primary CAR-T Therapy',
    kind: 'treatment',
    category: 'Cellular Immunotherapy',
    rationale: 'Early relapse (<= 12 months) or primary refractory DLBCL carries chemotherapy resistance. Anti-CD19 CAR-T cell therapy is the PRIMARY curative strategy. Bridging with R-GEMOX, Pola-R-GEMOX, or dominant-site radiation. STRICT SAFETY WARNING: AVOID Pola-BR and Bendamustine (impairs T-cell harvest quality).',
    regimens: [
      { id: 'r-apheresis-cart', name: 'T-cell leukapheresis for anti-CD19 CAR-T manufacturing (Axi-cel / Tisa-cel / Liso-cel)', category: 'Cellular Therapy' },
      { id: 'r-bridging-nobenda', name: 'Bridging therapy: R-GEMOX or Pola-R-GEMOX or dominant-site RT (AVOID BENDAMUSTINE)', category: 'Bridging Debulking' },
      { id: 'r-flucy-lymphodeplete', name: 'Pre-infusion lymphodepleting chemo: Fludarabine + Cyclophosphamide', category: 'Conditioning Protocol' },
      { id: 'r-cart-infuse', name: 'Anti-CD19 CAR-T cell infusion with inpatient CRS and ICANS monitoring', category: 'CAR-T Infusion' },
    ],
  },
  {
    id: 'rr-pathway-b-cart-unfit-glofit',
    label: 'Pathway B (Early Relapse / Refractory, NOT Fit for CAR-T): Glofitamab-GEMOX',
    kind: 'treatment',
    category: 'Bispecific Immunotherapy',
    rationale: 'Early relapse or primary refractory DLBCL in patients ineligible for CAR-T. Glofitamab-GEMOX (CD20xCD3 bispecific with GemOx) delivers high response rates without requiring apheresis.',
    regimens: [
      { id: 'r-obinutuzumab-pre', name: 'Obinutuzumab pre-treatment (1000 mg IV on D-7 of Cycle 1) to mitigate CRS', category: 'CRS Prophylaxis' },
      { id: 'r-glofit-stepup', name: 'Glofitamab step-up dosing (2.5 mg D8, 10 mg D15, then 30 mg D1 Cycle 2 onwards)', category: 'Bispecific T-Cell Engager' },
      { id: 'r-gemox-partner', name: 'Gemcitabine (1000 mg/m2) + Oxaliplatin (100 mg/m2) chemotherapy backbone', category: 'Chemotherapy Backbone' },
    ],
  },
  {
    id: 'rr-pathway-b-cart-unfit-pola-br',
    label: 'Pathway B (NOT Fit for CAR-T, CAR-T Excluded): Pola-BR x 6 Cycles',
    kind: 'treatment',
    category: 'Targeted Chemoimmunotherapy',
    rationale: 'Pola-BR x 6 cycles is indicated ONLY when CAR-T cell therapy is definitively NOT planned or permanently contraindicated. Bendamustine impairs T-cell harvest, but provides disease control in non-CAR-T patients.',
    regimens: [
      { id: 'r-pola-br-6', name: 'Polatuzumab vedotin + Bendamustine + Rituximab x 6 cycles q28d', category: 'Targeted Chemo' },
      { id: 'r-gcsf-polabr', name: 'Prophylactic G-CSF support in every cycle', category: 'Growth Factor' },
    ],
  },
  {
    id: 'rr-pathway-c-palliative-nongcb',
    label: 'Pathway C (Unfit for Chemo, Non-GCB): Palliative Care + Targeted Lenalidomide / Bortezomib',
    kind: 'treatment',
    category: 'Palliative Targeted Therapy',
    rationale: 'Frail patients unable to tolerate IV combination chemotherapy with confirmed Non-GCB DLBCL phenotype. Non-GCB tumors respond to oral immunomodulatory or proteasome inhibitor targeted therapy (Lenalidomide or Bortezomib based) with low toxicity.',
    regimens: [
      { id: 'r-lenalidomide-oral', name: 'Oral Lenalidomide (20-25 mg daily D1-21 q28d +/- Rituximab)', category: 'Targeted Immunomodulatory' },
      { id: 'r-bortezomib-alt', name: 'Alternative: Subcutaneous Bortezomib-based therapy', category: 'Proteasome Inhibitor' },
      { id: 'r-palliative-support', name: 'Palliative symptom care, pain management, and transfusion support', category: 'Palliative Care' },
    ],
  },
  {
    id: 'rr-pathway-c-palliative-supportive',
    label: 'Pathway C (Unfit for Chemo): Palliative Care + Oral Metronomic Chemotherapy',
    kind: 'treatment',
    category: 'Palliative Care',
    rationale: 'Frail patients unable to tolerate IV chemotherapy. Comprehensive palliative care, symptom management, and low-toxicity oral metronomic chemotherapy (e.g. oral etoposide-based regimens) provide disease stabilization.',
    regimens: [
      { id: 'r-palliative-core', name: 'Best supportive care: pain control, palliative care team co-management', category: 'Supportive Care' },
      { id: 'r-oral-metronomic', name: 'Oral metronomic chemotherapy (e.g. low-dose oral etoposide 50 mg/m2)', category: 'Oral Metronomic Chemo' },
      { id: 'r-palliative-rt', name: 'Palliative RT for localized bleeding or mass obstruction', category: 'Radiation Therapy' },
    ],
  },
  {
    id: 'rr-consolidative-radiotherapy',
    label: 'Consolidative Radiotherapy (30-36 Gy) to Residual or Bulky Site',
    kind: 'treatment',
    category: 'Radiation Therapy',
    rationale: 'Radiation therapy (30-36 Gy) plays a vital consolidative role in R/R DLBCL when given to a single residual PET-positive site after salvage chemotherapy or to an initial presentation bulky site post-ASCT.',
    regimens: [
      { id: 'r-isrt-30-36', name: 'Consolidative ISRT 30-36 Gy delivered to single residual FDG-avid lesion or initial presentation bulk', category: 'Radiation Therapy' },
      { id: 'r-pet-followup-rt', name: 'Post-radiotherapy PET-CT assessment at 12 weeks', category: 'Imaging Response' },
    ],
  },
];


// ---------------------------------------------------------------------------
// 4. STORAGE & CATALOG OPERATIONS
// ---------------------------------------------------------------------------

export function loadCustomCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { findings: [], functions: [], outcomes: [] };
}

export function saveCustomCatalog(catalog) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch { /* ignore */ }
}

export function saveItemToCustomCatalog(type, item, category) {
  const cat = loadCustomCatalog();
  const list = cat[type] = cat[type] || [];
  const existingIdx = list.findIndex((x) => x.id === item.id);
  const enriched = {
    ...structuredClone(item),
    category: category || item.category || 'User Shared Library',
    savedAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    list[existingIdx] = enriched;
  } else {
    list.push(enriched);
  }
  saveCustomCatalog(cat);
  return enriched;
}

// Aggregates:
// 1) Built-in standard library
// 2) User custom catalog from localStorage
// 3) Items from all other guidelines in the workspace (cross-guideline discovery!)
export function getAllCatalogItems(allGuidelines = [], activeGuidelineId = '') {
  const custom = loadCustomCatalog();

  // Cross-guideline items from other active guidelines
  const crossFindings = [];
  const crossFunctions = [];
  const crossOutcomes = [];

  allGuidelines.forEach((g) => {
    if (g.id === activeGuidelineId) return;
    const srcTag = `From: ${g.title || g.id}`;

    (g.findings || []).forEach((f) => {
      crossFindings.push({
        ...structuredClone(f),
        sourceGuidelineId: g.id,
        sourceGuidelineTitle: g.title,
        sourceType: 'guideline',
        category: f.category || srcTag,
        codeSystemUrl: f.codeSystemUrl || `http://ncgindia.org/fhir/CodeSystem/ncg-${f.id}`,
        valueSetUrl: f.valueSetUrl || `http://ncgindia.org/fhir/ValueSet/ncg-${f.id}`,
      });
    });

    (g.functions || []).forEach((fn) => {
      crossFunctions.push({
        ...structuredClone(fn),
        sourceGuidelineId: g.id,
        sourceGuidelineTitle: g.title,
        sourceType: 'guideline',
        category: fn.category || srcTag,
      });
    });

    (g.outcomes || []).forEach((o) => {
      crossOutcomes.push({
        ...structuredClone(o),
        sourceGuidelineId: g.id,
        sourceGuidelineTitle: g.title,
        sourceType: 'guideline',
        category: o.category || srcTag,
      });
    });
  });

  // Built-in standard library items tagged with source
  const stdFindings = STANDARD_FINDINGS.map((x) => ({
    ...x,
    codeSystemUrl: x.codeSystemUrl || `http://ncgindia.org/fhir/CodeSystem/ncg-${x.id}`,
    valueSetUrl: x.valueSetUrl || `http://ncgindia.org/fhir/ValueSet/ncg-${x.id}`,
    sourceType: 'standard',
  }));
  const stdFunctions = STANDARD_FUNCTIONS.map((x) => ({ ...x, sourceType: 'standard' }));
  const stdOutcomes = STANDARD_OUTCOMES.map((x) => ({ ...x, sourceType: 'standard' }));

  // Custom user items
  const custFindings = (custom.findings || []).map((x) => ({ ...x, sourceType: 'custom' }));
  const custFunctions = (custom.functions || []).map((x) => ({ ...x, sourceType: 'custom' }));
  const custOutcomes = (custom.outcomes || []).map((x) => ({ ...x, sourceType: 'custom' }));

  // Deduplicate by ID prioritizing: custom > standard > other guidelines
  const dedupe = (items) => {
    const map = new Map();
    items.forEach((it) => {
      const key = it.id;
      if (!map.has(key)) {
        map.set(key, it);
      }
    });
    return Array.from(map.values());
  };

  return {
    findings: dedupe([...custFindings, ...stdFindings, ...crossFindings]),
    functions: dedupe([...custFunctions, ...stdFunctions, ...crossFunctions]),
    outcomes: dedupe([...custOutcomes, ...stdOutcomes, ...crossOutcomes]),
  };
}

// ---------------------------------------------------------------------------
// 5. SEARCH ENGINE
// ---------------------------------------------------------------------------
export function searchCatalog({
  type, // 'findings' | 'functions' | 'outcomes'
  query = '',
  category = 'all',
  source = 'all',
  currentGuideline,
  allGuidelines = [],
}) {
  const all = getAllCatalogItems(allGuidelines, currentGuideline?.id);
  const items = all[type] || [];
  const q = String(query).trim().toLowerCase();

  const currentFindingIds = new Set((currentGuideline?.findings || []).map((x) => x.id));
  const currentFunctionIds = new Set((currentGuideline?.functions || []).map((x) => x.id));
  const currentOutcomeIds = new Set((currentGuideline?.outcomes || []).map((x) => x.id));

  return items.filter((item) => {
    // Source filter
    if (source !== 'all') {
      if (source === 'standard' && item.sourceType !== 'standard') return false;
      if (source === 'custom' && item.sourceType !== 'custom') return false;
      if (source === 'guidelines' && item.sourceType !== 'guideline') return false;
      if (source.startsWith('g:') && item.sourceGuidelineId !== source.slice(2)) return false;
    }

    // Category filter
    if (category !== 'all' && item.category !== category) {
      return false;
    }

    // Query filter
    if (q) {
      const textMatches = [
        item.label,
        item.id,
        item.name,
        item.help,
        item.description,
        item.rationale,
        item.category,
        item.citations,
        ...(item.values || []).map((v) => `${v.label} ${v.code}`),
        ...(item.regimens || []).map((r) => `${r.name} ${r.category}`),
        ...(item.bands || []).map((b) => `${b.label} ${b.note}`),
      ].some((txt) => txt && String(txt).toLowerCase().includes(q));

      if (!textMatches) return false;
    }

    return true;
  }).map((item) => {
    // Enrich with status relative to the current guideline
    let alreadyInGuideline = false;
    let missingDependencies = [];

    if (type === 'findings') {
      alreadyInGuideline = currentFindingIds.has(item.id);
    } else if (type === 'functions') {
      alreadyInGuideline = currentFunctionIds.has(item.id);
      // Check required factor findings
      const neededIds = item.requiredFindingIds || (item.factors || []).map((f) => f.findingId);
      missingDependencies = neededIds.filter((fid) => !currentFindingIds.has(fid));
    } else if (type === 'outcomes') {
      alreadyInGuideline = currentOutcomeIds.has(item.id);
    }

    return {
      ...item,
      alreadyInGuideline,
      missingDependencies,
    };
  });
}

// ---------------------------------------------------------------------------
// 6. IMPORT INTO GUIDELINE
// ---------------------------------------------------------------------------

export function importFindingIntoGuideline(guideline, catalogFinding) {
  guideline.findings = guideline.findings || [];
  const existing = guideline.findings.find((x) => x.id === catalogFinding.id);
  if (existing) {
    // Already present, return false (no-op)
    return { success: false, reason: 'Already in guideline', id: existing.id };
  }

  const fresh = {
    id: catalogFinding.id,
    label: catalogFinding.label,
    help: catalogFinding.help || '',
    category: catalogFinding.category || '',
    codeSystemUrl: catalogFinding.codeSystemUrl || `http://ncgindia.org/fhir/CodeSystem/ncg-${catalogFinding.id}`,
    valueSetUrl: catalogFinding.valueSetUrl || `http://ncgindia.org/fhir/ValueSet/ncg-${catalogFinding.id}`,
    values: structuredClone(catalogFinding.values || []),
  };

  guideline.findings.push(fresh);
  return { success: true, id: fresh.id, finding: fresh };
}

export function importOutcomeIntoGuideline(guideline, catalogOutcome) {
  guideline.outcomes = guideline.outcomes || [];
  const existing = guideline.outcomes.find((x) => x.id === catalogOutcome.id);
  if (existing) {
    return { success: false, reason: 'Already in guideline', id: existing.id };
  }

  const fresh = {
    id: catalogOutcome.id,
    label: catalogOutcome.label,
    kind: catalogOutcome.kind || 'treatment',
    category: catalogOutcome.category || '',
    rationale: catalogOutcome.rationale || '',
    regimens: structuredClone(catalogOutcome.regimens || []),
  };

  guideline.outcomes.push(fresh);
  return { success: true, id: fresh.id, outcome: fresh };
}

export function importFunctionIntoGuideline(guideline, catalogFunction, { importMissingFindings = true, allCatalogFindings = STANDARD_FINDINGS } = {}) {
  guideline.functions = guideline.functions || [];
  const existing = guideline.functions.find((x) => x.id === catalogFunction.id);
  if (existing) {
    return { success: false, reason: 'Already in guideline', id: existing.id };
  }

  const fresh = structuredClone(catalogFunction);
  delete fresh.sourceType;
  delete fresh.sourceGuidelineId;
  delete fresh.sourceGuidelineTitle;
  delete fresh.alreadyInGuideline;
  delete fresh.missingDependencies;

  // Auto-import missing factor findings if requested
  const importedFindings = [];
  if (importMissingFindings) {
    const currentFindingIds = new Set((guideline.findings || []).map((x) => x.id));
    const neededIds = catalogFunction.requiredFindingIds || (catalogFunction.factors || []).map((f) => f.findingId);

    neededIds.forEach((reqId) => {
      if (!currentFindingIds.has(reqId)) {
        // Look up finding from catalog
        const match = allCatalogFindings.find((f) => f.id === reqId);
        if (match) {
          importFindingIntoGuideline(guideline, match);
          importedFindings.push(match.label);
          currentFindingIds.add(reqId);
        }
      }
    });
  }

  guideline.functions.push(fresh);
  return { success: true, id: fresh.id, function: fresh, importedFindings };
}
