// Reusable Clinical Catalog for NCG Guideline Authoring Studio.
// Standardized Findings, Score Functions, and Outcomes that can be searched,
// shared, and reused across multiple clinical guidelines.

import { slug, uniqueSlug } from './model.js';

const STORAGE_KEY = 'ncg-clinical-catalog-v2';

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
  const stdFindings = STANDARD_FINDINGS.map((x) => ({ ...x, sourceType: 'standard' }));
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
    codeSystemUrl: catalogFinding.codeSystemUrl || '',
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
