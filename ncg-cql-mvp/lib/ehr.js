/**
 * ehr.js - Mock Hospital EHR FHIR R4 Service for Point-of-Care CDS
 *
 * Simulates an ABDM / Hospital EHR FHIR R4 endpoint where a clinician enters or selects a
 * Patient ID (MRN, ABHA ID, or FHIR Patient ID) and pulls:
 *   1. FHIR R4 Patient demographics (name, gender, birthDate, identifiers)
 *   2. Raw FHIR R4 Observation resources coded in LOINC / SNOMED (LDH with reference range ULN,
 *      ECOG performance status, HBsAg, HBcAb-IgG, Anti-HCV, HIV 1/2, CD4 count, Albumin, B2M)
 *   3. Structured clinical findings already recorded in the EHR problem / staging list
 *
 * Raw LOINC / demographic observations are automatically translated into guideline findings
 * via derive.js, and merged with any pre-coded EHR observations.
 */
const { LOINC, LOINC_SYSTEM, SNOMED_SYSTEM, SNOMED_POSITIVE, SNOMED_NEGATIVE, ageInYears, deriveFindings } = require('./derive');
const { getGuideline, valueLabel, isAllowedValue } = require('./schemas');

const PROVENANCE_URL = 'http://ncgindia.org/fhir/StructureDefinition/ncg-extension-data-provenance';
const PROVENANCE_CS = 'http://ncgindia.org/fhir/CodeSystem/ncg-data-provenance';
const ABHA_SYSTEM = 'https://healthid.ndhm.gov.in';
const MRN_SYSTEM = 'https://tmc.gov.in/mrn';

function makeLoincQuantityObs(id, patientId, loincCode, display, value, unit, uln, effectiveDateTime = '2026-10-25T09:30:00Z') {
  const obs = {
    resourceType: 'Observation',
    id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: { coding: [{ system: LOINC_SYSTEM, code: loincCode, display }], text: display },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime,
    valueQuantity: { value, unit, system: 'http://unitsofmeasure.org', code: unit },
  };
  if (typeof uln === 'number') {
    obs.referenceRange = [{ high: { value: uln, unit, system: 'http://unitsofmeasure.org', code: unit }, text: `<= ${uln} ${unit}` }];
  }
  return obs;
}

function makeLoincIntegerObs(id, patientId, loincCode, display, valueInteger, effectiveDateTime = '2026-10-25T09:30:00Z') {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey', display: 'Survey' }] }],
    code: { coding: [{ system: LOINC_SYSTEM, code: loincCode, display }], text: display },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime,
    valueInteger,
  };
}

function makeSerologyObs(id, patientId, loincCode, display, isPositive, effectiveDateTime = '2026-10-24T14:15:00Z') {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: { coding: [{ system: LOINC_SYSTEM, code: loincCode, display }], text: display },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime,
    valueCodeableConcept: {
      coding: [{
        system: SNOMED_SYSTEM,
        code: isPositive ? SNOMED_POSITIVE : SNOMED_NEGATIVE,
        display: isPositive ? 'Positive / Reactive' : 'Negative / Non-reactive',
      }],
      text: isPositive ? 'Reactive' : 'Non-reactive',
    },
  };
}

/**
 * Curated Point-of-Care EHR Patients across all 4 Lymphoma Clinical Guidelines.
 * Some patients intentionally leave 2-3 pending pathology/PET-CT findings so the clinician
 * can experience the hybrid workflow: Pull EHR -> Upload Pathology/PET Report -> Confirm -> Evaluate CQL.
 */
const CURATED_EHR_PATIENTS = [
  {
    id: 'PAT-1001',
    mrn: 'TMC-2026-1001',
    abhaId: '91-4421-8801-1204',
    name: 'Rameshwar Deshmukh',
    gender: 'male',
    birthDate: '1961-03-14',
    defaultGuidelineId: 'NCG_DLBCL_TREATMENT_2020',
    clinicalSummary: '65M with newly diagnosed DLBCL; EHR has labs (LDH 680 U/L), 2D-ECHO (LVEF 58%), & serology. Upload PET-CT/IHC report or enter stage & cell-of-origin.',
    workflowHint: 'Hybrid PoC Demo: EHR pulls demographics, elevated LDH, ECOG 1, LVEF 58%, HIV(-). Upload the "DLBCL 1L - Non-GCB Stage IV" report to complete IHC & PET-CT staging.',
    rawObservations: (pid) => [
      makeLoincQuantityObs('obs-loinc-ldh-1001', pid, LOINC.LDH, 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma', 680, 'U/L', 240),
      makeLoincIntegerObs('obs-loinc-ecog-1001', pid, LOINC.ECOG, 'ECOG Performance Status score', 1),
      makeSerologyObs('obs-loinc-hiv-1001', pid, LOINC.HIV_AB, 'HIV 1 and 2 Ab [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hbsag-1001', pid, LOINC.HBSAG, 'Hepatitis B virus surface Ag [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hbcab-1001', pid, LOINC.HBCAB, 'Hepatitis B virus core IgG Ab [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hcv-1001', pid, LOINC.HCV_AB, 'Hepatitis C virus Ab [Presence] in Serum', false),
    ],
    codedFindings: {
      NCG_DLBCL_TREATMENT_2020: {
        'lymphoma-subtype': { value: 'dlbcl', detail: 'EHR Problem List: Diffuse Large B-Cell Lymphoma (SNOMED 109979007)' },
        'anthracycline-fitness': { value: 'fit-r-chop', detail: 'Baseline 2D-ECHO LVEF 58%, no RWMA, fit for standard R-CHOP' },
        'cardiac-echo-status': { value: 'echo-normal-stable', detail: 'Baseline LVEF 58% (stable)' },
        'cns-risk-sites': { value: 'cns-standard-risk', detail: 'No testicular, breast, renal, or adrenal involvement recorded' },
        'extranodal-sites': { value: 'extranodal-gt-1', detail: '2 extranodal sites documented (gastric + hepatic lesions)' },
        'prephase-indication': { value: 'prephase-not-indicated', detail: 'Ambulatory ECOG 1, no GI obstruction' },
      },
      NCG_LYMPHOMA_WORKUP_2020: {
        'presentation-smear': { value: 'no-lymphocytosis', detail: 'CBC smear: ALC 1.8 x 10^9/L, no abnormal circulating lymphoid cells' },
        'lymphoma-category': { value: 'dlbcl', detail: 'Excisional biopsy: Diffuse large B-cell lymphoma' },
        'staging-extent': { value: 'stage-3-4-advanced', detail: 'Stage IV disease on staging workup' },
        'extranodal-sites': { value: 'extranodal-gt-1', detail: '2 extranodal sites' },
        'cns-risk-factors': { value: 'cns-standard-risk', detail: 'Standard CNS risk' },
        'tls-metabolic-risk': { value: 'tls-standard-risk', detail: 'Uric acid 5.4 mg/dL, normal renal function' },
        'planned-therapy-cardiac': { value: 'anthracycline-planned', detail: 'Planned R-CHOP / Pola-R-CHP' },
      },
    },
  },
  {
    id: 'PAT-1002',
    mrn: 'TMC-2026-1002',
    abhaId: '91-7812-3390-4510',
    name: 'Meenakshi Iyer',
    gender: 'female',
    birthDate: '1972-06-20',
    defaultGuidelineId: 'NCG_FL_2020',
    clinicalSummary: '54F referred with Follicular Lymphoma; EHR has fitness & bone marrow trephine result. Upload synoptic pathology/PET-CT PDF to populate histology grade, stage & GELF burden.',
    workflowHint: 'Hybrid PoC Demo: Pulls EHR demographics, fitness, and marrow status. Upload sample_fl_case_advanced_high_burden.pdf (or select a sample FL report) to extract Grade, Stage, and GELF burden.',
    rawObservations: (pid) => [
      makeLoincQuantityObs('obs-loinc-ldh-1002', pid, LOINC.LDH, 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma', 390, 'U/L', 240),
      makeLoincIntegerObs('obs-loinc-ecog-1002', pid, LOINC.ECOG, 'ECOG Performance Status score', 1),
      makeSerologyObs('obs-loinc-hbsag-1002', pid, LOINC.HBSAG, 'Hepatitis B virus surface Ag [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hbcab-1002', pid, LOINC.HBCAB, 'Hepatitis B virus core IgG Ab [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hcv-1002', pid, LOINC.HCV_AB, 'Hepatitis C virus Ab [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hiv-1002', pid, LOINC.HIV_AB, 'HIV 1 and 2 Ab [Presence] in Serum', false),
    ],
    codedFindings: {
      NCG_FL_2020: {
        'bone-marrow': { value: 'involved', detail: 'BM Trephine (2026-10-22): Paratrabecular lymphoid aggregates (~25% cellularity)' },
        'fitness': { value: 'fit', detail: 'ECOG 1, LVEF 62%, CrCl 84 mL/min — fit for chemoimmunotherapy' },
      },
      NCG_LYMPHOMA_WORKUP_2020: {
        'presentation-smear': { value: 'no-lymphocytosis', detail: 'No peripheral lymphocytosis' },
        'lymphoma-category': { value: 'fl', detail: 'Follicular lymphoma' },
        'staging-extent': { value: 'stage-3-4-advanced', detail: 'Stage IV (marrow involved)' },
        'bone-marrow-status': { value: 'bm-positive', detail: 'Paratrabecular marrow involvement' },
        'hemoglobin-level': { value: 'hb-lt-12', detail: 'Hemoglobin 10.9 g/dL' },
        'nodal-sites-count': { value: 'nodal-sites-gt-4', detail: '6 nodal areas involved' },
      },
    },
  },
  {
    id: 'PAT-1003',
    mrn: 'TMC-2026-1003',
    abhaId: '91-6305-1198-7721',
    name: 'Vikramaditya Kulkarni',
    gender: 'male',
    birthDate: '1968-02-11',
    defaultGuidelineId: 'NCG_DLBCL_RR_2020',
    clinicalSummary: '58M with FDG-avid nodal progression 7 months after completing 6x R-CHOP (Early Relapse <= 12m). Fit for CAR-T & ASCT; repeat core biopsy report pending confirmation.',
    workflowHint: 'Relapsed/Refractory DLBCL Demo: EHR loads early relapse chronology (<= 12 mo) and CAR-T fitness. Upload the Relapse Biopsy Report or confirm biopsy status to unlock Pathway B (Primary CAR-T).',
    rawObservations: (pid) => [
      makeLoincQuantityObs('obs-loinc-ldh-1003', pid, LOINC.LDH, 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma', 520, 'U/L', 240),
      makeLoincIntegerObs('obs-loinc-ecog-1003', pid, LOINC.ECOG, 'ECOG Performance Status score', 1),
    ],
    codedFindings: {
      NCG_DLBCL_RR_2020: {
        'relapse-timing': { value: 'relapse-le-12m', detail: 'EHR Oncology Timeline: Completed 6x R-CHOP 7 months ago; progression <= 12 months' },
        'chemo-fitness-overall': { value: 'chemo-eligible', detail: 'ECOG 1, normal hepatic/renal reserve — eligible for systemic therapy' },
        'asct-fitness': { value: 'asct-fit', detail: 'Age 58, LVEF 56%, DLCO 78% — transplant eligible' },
        'car-t-fitness': { value: 'car-t-fit', detail: 'CAR-T Cellular Therapy Board: Fit for anti-CD19 CAR-T (tolerable CRS/ICANS risk)' },
        'car-t-future-plan': { value: 'cart-possible', detail: 'CAR-T planned (Safety Alert: strictly avoid bendamustine / Pola-BR)' },
        'pet-response-salvage': { value: 'not-assessed', detail: 'Salvage therapy not yet initiated' },
      },
    },
  },
  {
    id: 'PAT-1004',
    mrn: 'TMC-2026-1004',
    abhaId: '91-5520-9041-3318',
    name: 'Ananya Chatterjee',
    gender: 'female',
    birthDate: '1980-08-05',
    defaultGuidelineId: 'NCG_LYMPHOMA_WORKUP_2020',
    clinicalSummary: '46F undergoing initial lymphoma staging workup for DLBCL; EHR LOINC serology reveals occult Hepatitis B (HBcAb-IgG Positive) with elevated LDH (590 U/L) & Stage III.',
    workflowHint: 'Workup & Safety Gate Demo: Demonstrates automatic LOINC viral serology derivation (HBcAb-IgG positive -> HBV Prophylaxis Protocol) + real-time aaIPI & IPI prognostic scoring.',
    rawObservations: (pid) => [
      makeLoincQuantityObs('obs-loinc-ldh-1004', pid, LOINC.LDH, 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma', 590, 'U/L', 245),
      makeLoincIntegerObs('obs-loinc-ecog-1004', pid, LOINC.ECOG, 'ECOG Performance Status score', 1),
      makeSerologyObs('obs-loinc-hbsag-1004', pid, LOINC.HBSAG, 'Hepatitis B virus surface Ag [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hbcab-1004', pid, LOINC.HBCAB, 'Hepatitis B virus core IgG Ab [Presence] in Serum', true),
      makeSerologyObs('obs-loinc-hcv-1004', pid, LOINC.HCV_AB, 'Hepatitis C virus Ab [Presence] in Serum', false),
      makeSerologyObs('obs-loinc-hiv-1004', pid, LOINC.HIV_AB, 'HIV 1 and 2 Ab [Presence] in Serum', false),
      makeLoincQuantityObs('obs-loinc-alb-1004', pid, LOINC.ALBUMIN, 'Albumin [Mass/volume] in Serum or Plasma', 4.2, 'g/dL'),
      makeLoincQuantityObs('obs-loinc-b2m-1004', pid, LOINC.B2M, 'Beta-2-Microglobulin [Mass/volume] in Serum or Plasma', 2.4, 'mg/L'),
    ],
    codedFindings: {
      NCG_LYMPHOMA_WORKUP_2020: {
        'presentation-smear': { value: 'no-lymphocytosis', detail: 'Peripheral smear: Normal leukocyte differential, no circulating blasts/lymphoma cells' },
        'lymphoma-category': { value: 'dlbcl', detail: 'Excisional cervical node biopsy: DLBCL, NOS' },
        'cll-therapy-indication': { value: 'not-applicable', detail: 'Non-CLL subtype' },
        'staging-extent': { value: 'stage-3-4-advanced', detail: 'PET-CT: FDG-avid cervical, mediastinal, and retroperitoneal nodes (Stage III)' },
        'cns-risk-factors': { value: 'cns-standard-risk', detail: 'No high-risk extranodal CNS sites' },
        'planned-therapy-cardiac': { value: 'anthracycline-planned', detail: 'Planned R-CHOP chemoimmunotherapy' },
        'tls-metabolic-risk': { value: 'tls-standard-risk', detail: 'Uric acid 4.8 mg/dL, potassium 4.1 mmol/L, phosphate 3.3 mg/dL' },
        'double-hit-fish': { value: 'dhl-negative', detail: 'FISH panel negative for MYC/BCL2 rearrangement' },
        'extranodal-sites': { value: 'extranodal-0-1', detail: 'Nodal disease only (0 extranodal sites)' },
        'bone-marrow-status': { value: 'bm-negative', detail: 'PET-CT negative for focal marrow uptake' },
      },
    },
  },
  {
    id: 'PAT-1005',
    mrn: 'TMC-2026-1005',
    abhaId: '91-8190-4402-6612',
    name: 'Suresh Nair',
    gender: 'male',
    birthDate: '1953-01-19',
    defaultGuidelineId: 'NCG_DLBCL_TREATMENT_2020',
    clinicalSummary: '73M with Stage III GCB-DLBCL and ischemic cardiomyopathy (LVEF 42% on 2D-ECHO, anthracycline contraindicated). Complete EHR record ready for instant evaluation.',
    workflowHint: 'Complete EHR Case: All clinical findings are pre-populated from EHR FHIR resources — evaluates immediately to Non-Anthracycline R-CEOP x 6 Cycles with IPI = 3 (High-Intermediate).',
    rawObservations: (pid) => [
      makeLoincQuantityObs('obs-loinc-ldh-1005', pid, LOINC.LDH, 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma', 410, 'U/L', 240),
      makeLoincIntegerObs('obs-loinc-ecog-1005', pid, LOINC.ECOG, 'ECOG Performance Status score', 1),
      makeSerologyObs('obs-loinc-hiv-1005', pid, LOINC.HIV_AB, 'HIV 1 and 2 Ab [Presence] in Serum', false),
    ],
    codedFindings: {
      NCG_DLBCL_TREATMENT_2020: {
        'lymphoma-subtype': { value: 'dlbcl', detail: 'Inguinal node excision: DLBCL, GCB phenotype' },
        'anthracycline-fitness': { value: 'unfit-cardiac', detail: '2D-ECHO: LVEF 42% with anterior wall hypokinesia (prior MI) — anthracycline contraindicated' },
        'dlbcl-stage': { value: 'stage-3-4-advanced', detail: 'PET-CT: Stage III nodal disease above and below diaphragm' },
        'bulky-status': { value: 'non-bulky', detail: 'Largest nodal mass 4.8 cm (< 7.5 cm)' },
        'cell-of-origin': { value: 'gcb', detail: 'IHC Hans: CD10(+), BCL6(+), MUM1(-) — GCB subtype' },
        'cns-risk-sites': { value: 'cns-standard-risk', detail: 'No high-risk extranodal CNS sites' },
        'cardiac-echo-status': { value: 'echo-normal-stable', detail: 'Baseline LVEF 42% (prior to systemic therapy)' },
        'prephase-indication': { value: 'prephase-indicated', detail: 'Age 73 with Stage III disease — pre-phase cyclophosphamide + steroid indicated' },
        'extranodal-sites': { value: 'extranodal-0-1', detail: '0 extranodal sites' },
      },
    },
  },
  {
    id: 'PAT-1006',
    mrn: 'TMC-2026-1006',
    abhaId: '91-3091-7723-1098',
    name: 'Kavita Deshpande',
    gender: 'female',
    birthDate: '1964-09-28',
    defaultGuidelineId: 'NCG_DLBCL_RR_2020',
    clinicalSummary: '62F with late relapse DLBCL (18 months post R-CHOP), biopsy confirmed, fit for ASCT, achieved Complete Metabolic Response (Deauville 2) after 3 cycles of R-GEMOX.',
    workflowHint: 'Complete EHR Case: Late relapse (> 12 mo) chemosensitive responder after 3x R-GEMOX — evaluates immediately to Pathway A: Autologous Stem Cell Transplant (ASCT) Consolidation.',
    rawObservations: (pid) => [
      makeLoincQuantityObs('obs-loinc-ldh-1006', pid, LOINC.LDH, 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma', 210, 'U/L', 240),
      makeLoincIntegerObs('obs-loinc-ecog-1006', pid, LOINC.ECOG, 'ECOG Performance Status score', 0),
    ],
    codedFindings: {
      NCG_DLBCL_RR_2020: {
        'relapse-biopsy-status': { value: 'biopsy-confirmed-dlbcl', detail: 'Retroperitoneal core biopsy: Confirmed relapsed DLBCL, CD20(+)' },
        'relapse-timing': { value: 'relapse-gt-12m', detail: 'Relapsed 18 months after completing first-line R-CHOP (> 12 months)' },
        'chemo-fitness-overall': { value: 'chemo-eligible', detail: 'ECOG 0, normal organ function' },
        'asct-fitness': { value: 'asct-fit', detail: 'Fit for high-dose BEAM conditioning and ASCT' },
        'car-t-fitness': { value: 'car-t-fit', detail: 'Fit for cellular therapy' },
        'pet-response-salvage': { value: 'salvage-cr-pr', detail: 'Post-cycle 3 R-GEMOX PET-CT: Complete Metabolic Response (Deauville Score 2)' },
        'car-t-future-plan': { value: 'cart-possible', detail: 'CAR-T preserved as third-line backup if needed' },
        'cell-of-origin-rr': { value: 'gcb', detail: 'Repeat IHC: GCB phenotype' },
        'dominant-residual-site': { value: 'no-residual-cmr', detail: 'Complete metabolic resolution, no residual FDG-avid mass' },
      },
    },
  },
];

function buildCuratedFhirBundle(entry, guidelineId) {
  const schema = getGuideline(guidelineId || entry.defaultGuidelineId);
  const rawObs = entry.rawObservations ? entry.rawObservations(entry.id) : [];

  const patientResource = {
    resourceType: 'Patient',
    id: entry.id,
    meta: { profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient'] },
    identifier: [
      { system: ABHA_SYSTEM, value: entry.abhaId, type: { text: 'ABHA ID' } },
      { system: MRN_SYSTEM, value: entry.mrn, type: { text: 'MRN' } },
    ],
    name: [{ text: entry.name }],
    gender: entry.gender,
    birthDate: entry.birthDate,
  };

  const codedMap = (entry.codedFindings && schema && entry.codedFindings[schema.id]) || {};
  const codedObs = [];
  if (schema) {
    for (const [findingId, info] of Object.entries(codedMap)) {
      const f = schema.findings.find((x) => x.id === findingId);
      if (!f || !isAllowedValue(f, info.value)) continue;
      codedObs.push({
        resourceType: 'Observation',
        id: `obs-ehr-${entry.id}-${findingId}`,
        meta: { profile: ['http://ncgindia.org/fhir/StructureDefinition/ncg-observation-heme'] },
        status: 'final',
        subject: { reference: `Patient/${entry.id}` },
        effectiveDateTime: '2026-10-25T10:00:00Z',
        code: {
          coding: [{ system: f.codeSystemUrl, code: info.value, display: valueLabel(f, info.value) }],
          text: `${f.label}: ${valueLabel(f, info.value)}`,
        },
        note: info.detail ? [{ text: info.detail }] : undefined,
        extension: [{
          url: PROVENANCE_URL,
          valueCodeableConcept: { coding: [{ system: PROVENANCE_CS, code: 'source-coded', display: 'Source-coded EHR' }] },
        }],
      });
    }
  }

  return {
    resourceType: 'Bundle',
    id: `ehr-bundle-${entry.id}`,
    type: 'searchset',
    timestamp: new Date().toISOString(),
    meta: {
      tag: [
        { system: 'http://ncgindia.org/source-modality', code: 'ehr-fhir-r4' },
        ...(schema ? [{ system: 'http://ncgindia.org/guideline', code: schema.id }] : []),
      ],
    },
    entry: [
      { fullUrl: `Patient/${entry.id}`, resource: patientResource },
      ...rawObs.map((o) => ({ fullUrl: `Observation/${o.id}`, resource: o })),
      ...codedObs.map((o) => ({ fullUrl: `Observation/${o.id}`, resource: o })),
    ],
  };
}

function listEhrPatients() {
  return CURATED_EHR_PATIENTS.map((p) => ({
    id: p.id,
    mrn: p.mrn,
    abhaId: p.abhaId,
    name: p.name,
    gender: p.gender,
    birthDate: p.birthDate,
    age: ageInYears(p.birthDate),
    defaultGuidelineId: p.defaultGuidelineId,
    clinicalSummary: p.clinicalSummary,
    workflowHint: p.workflowHint,
  }));
}

function findCuratedPatient(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  return CURATED_EHR_PATIENTS.find((p) =>
    p.id.toLowerCase() === q ||
    p.mrn.toLowerCase() === q ||
    p.abhaId.toLowerCase() === q ||
    p.name.toLowerCase().includes(q)
  ) || null;
}

/**
 * Fallback lookup in sample_data/fhir_bundles/ so any synthetic test case ID or patient ID
 * can also be queried through the mock EHR FHIR service.
 */
function findSyntheticBundleByQuery(query) {
  if (!query) return null;
  const nodeRequire = typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function' ? (id) => process.getBuiltinModule(id) : null;
  if (!nodeRequire) return null;
  const fs = nodeRequire('fs');
  const path = nodeRequire('path');
  const q = String(query).trim().toLowerCase();
  const dir = path.resolve(__dirname, '../sample_data/fhir_bundles');
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const item of manifest) {
    const fileBase = item.file.replace(/\.json$/i, '').toLowerCase();
    const fullPath = path.join(dir, item.file);
    if (!fs.existsSync(fullPath)) continue;
    if (fileBase === q || (item.patient_name && item.patient_name.toLowerCase() === q)) {
      return { item, bundle: JSON.parse(fs.readFileSync(fullPath, 'utf8')) };
    }
    const bundle = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const pat = (bundle.entry || []).map((e) => e.resource).find((r) => r?.resourceType === 'Patient');
    if (!pat) continue;
    const patIdMatch = pat.id && pat.id.toLowerCase() === q;
    const identMatch = (pat.identifier || []).some((id) => String(id.value || '').toLowerCase() === q);
    if (patIdMatch || identMatch) {
      return { item, bundle };
    }
  }
  return null;
}

/**
 * Pulls patient demographics, raw LOINC observations, and coded guideline findings from the Mock EHR
 * for a given `patientId` and `guidelineId`.
 */
function importFromEhr(guidelineId, patientIdQuery) {
  const curated = findCuratedPatient(patientIdQuery);
  let targetGuidelineId = guidelineId || curated?.defaultGuidelineId || 'NCG_DLBCL_TREATMENT_2020';
  let schema = getGuideline(targetGuidelineId);

  if (curated) {
    if (!guidelineId && curated.defaultGuidelineId) {
      targetGuidelineId = curated.defaultGuidelineId;
      schema = getGuideline(targetGuidelineId);
    }
    const fhirBundle = buildCuratedFhirBundle(curated, schema.id);
    const resources = (fhirBundle.entry || []).map((e) => e.resource).filter(Boolean);
    const patientRes = resources.find((r) => r.resourceType === 'Patient');
    const observations = resources.filter((r) => r.resourceType === 'Observation');

    // 1. Derive findings from raw LOINC / birthDate
    const derived = deriveFindings(schema, { patient: patientRes, observations });
    const findings = {};
    for (const [fid, d] of Object.entries(derived)) {
      findings[fid] = {
        value: d.value,
        provenance: 'source-coded',
        source: 'ehr-derived',
        detail: d.detail,
        sourceRefs: d.sourceRefs,
      };
    }

    // 2. Merge pre-coded EHR findings for this guideline
    const codedForGuideline = (curated.codedFindings && curated.codedFindings[schema.id]) || {};
    for (const [fid, info] of Object.entries(codedForGuideline)) {
      const f = schema.findings.find((x) => x.id === fid);
      if (!f || !isAllowedValue(f, info.value)) continue;
      findings[fid] = {
        value: info.value,
        provenance: 'source-coded',
        source: 'ehr-coded',
        detail: info.detail || 'Recorded in EHR Problem / Staging List',
        sourceRefs: [`Observation/obs-ehr-${curated.id}-${fid}`],
      };
    }

    const rawObservationsSummary = (curated.rawObservations ? curated.rawObservations(curated.id) : []).map((o) => {
      const coding = o.code?.coding?.[0] || {};
      let valueStr = '';
      if (o.valueQuantity) {
        valueStr = `${o.valueQuantity.value} ${o.valueQuantity.unit || ''}`.trim();
        const uln = o.referenceRange?.[0]?.high?.value;
        if (typeof uln === 'number') valueStr += ` (ULN ${uln})`;
      } else if (typeof o.valueInteger === 'number') {
        valueStr = String(o.valueInteger);
      } else if (o.valueCodeableConcept) {
        valueStr = o.valueCodeableConcept.text || o.valueCodeableConcept.coding?.[0]?.display || '';
      }
      return {
        id: o.id,
        loinc: coding.code || '',
        display: o.code?.text || coding.display || o.id,
        value: valueStr,
        effectiveDateTime: o.effectiveDateTime || '',
      };
    });

    return {
      found: true,
      guidelineId: schema.id,
      patient: {
        id: curated.id,
        mrn: curated.mrn,
        abhaId: curated.abhaId,
        name: curated.name,
        gender: curated.gender,
        birthDate: curated.birthDate,
        age: ageInYears(curated.birthDate),
        clinicalSummary: curated.clinicalSummary,
        workflowHint: curated.workflowHint,
      },
      findings,
      rawObservations: rawObservationsSummary,
      fhirBundle,
    };
  }

  // Fallback: check synthetic FHIR bundles in sample_data/fhir_bundles/
  const synth = findSyntheticBundleByQuery(patientIdQuery);
  if (synth) {
    const bundle = synth.bundle;
    const bundleGuideline = (bundle.meta?.tag || []).find((t) => t.system === 'http://ncgindia.org/guideline')?.code;
    if (bundleGuideline && getGuideline(bundleGuideline)) {
      schema = getGuideline(bundleGuideline);
    }
    const resources = (bundle.entry || []).map((e) => e.resource).filter(Boolean);
    const pat = resources.find((r) => r.resourceType === 'Patient') || {};
    const observations = resources.filter((r) => r.resourceType === 'Observation');

    const findings = {};
    const derived = deriveFindings(schema, { patient: pat, observations });
    for (const [fid, d] of Object.entries(derived)) {
      findings[fid] = {
        value: d.value,
        provenance: 'source-coded',
        source: 'ehr-derived',
        detail: d.detail,
        sourceRefs: d.sourceRefs,
      };
    }

    for (const obs of observations) {
      const coding = obs.code?.coding?.[0];
      if (!coding) continue;
      const f = schema.findings.find((x) => x.codeSystemUrl === coding.system);
      if (!f || !isAllowedValue(f, coding.code)) continue;
      const provCode = obs.extension?.find((e) => e.url === PROVENANCE_URL)?.valueCodeableConcept?.coding?.[0]?.code || 'source-coded';
      findings[f.id] = {
        value: coding.code,
        provenance: provCode,
        source: 'ehr-coded',
        detail: obs.code?.text || `${f.label}: ${valueLabel(f, coding.code)}`,
        sourceRefs: [`Observation/${obs.id}`],
      };
    }

    const abha = (pat.identifier || []).find((i) => i.system === ABHA_SYSTEM)?.value || '';
    const mrn = (pat.identifier || []).find((i) => i.system !== ABHA_SYSTEM)?.value || pat.id || '';
    const patName = pat.name?.[0]?.text || [ ...(pat.name?.[0]?.given || []), pat.name?.[0]?.family ].filter(Boolean).join(' ') || synth.item.patient_name || 'Patient';

    return {
      found: true,
      guidelineId: schema.id,
      patient: {
        id: pat.id || synth.item.file.replace('.json', ''),
        mrn,
        abhaId: abha,
        name: patName,
        gender: pat.gender || 'unknown',
        birthDate: pat.birthDate || '',
        age: ageInYears(pat.birthDate),
        clinicalSummary: synth.item.description || '',
        workflowHint: `Loaded from synthetic FHIR R4 bundle (${synth.item.file})`,
      },
      findings,
      rawObservations: [],
      fhirBundle: bundle,
    };
  }

  return {
    found: false,
    error: `No patient found in EHR for ID '${patientIdQuery}'. Try PAT-1001 through PAT-1006, an ABHA ID, or MRN.`,
  };
}

module.exports = {
  CURATED_EHR_PATIENTS,
  listEhrPatients,
  importFromEhr,
};

