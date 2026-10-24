// Sample guideline expressed purely as data: NCG Follicular Lymphoma (derived from the NCG FL workflow).
// Authors never edit this file - they use the Studio UI. It only seeds the first run.
const R = (id, name, category) => ({ id, name, category });
const V = (code, label) => ({ code, label });
const P = 'source-coded';
const inp = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v, provenance: P }]));

export const NCG_FL = {
  schema: 1,
  id: 'NCG_FL_2020',
  version: '0.2.1',
  title: 'Follicular Lymphoma - first-line treatment pathway',
  organization: 'National Cancer Grid (India) / NCG-Heme Working Group',
  source: 'NCG Follicular Lymphoma Treatment Workflow; Lymphoma Workup Flowchart',
  description: 'Assigns an adult follicular lymphoma patient to a treatment group based on histology, Ann Arbor stage, GELF tumour burden, bone marrow status and fitness.',
  status: 'draft',
  author: 'NCG-Heme Working Group',
  enforceProvenance: true,
  findings: [
    {
      id: 'histology',
      label: 'Histology / grade',
      category: 'Histology & Pathology',
      help: 'WHO histological grade from the pathology report.',
      codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-fl-histology',
      valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-fl-histology',
      values: [V('fl-grade-1-2', 'FL grade 1-2'), V('fl-grade-3a', 'FL grade 3a'), V('fl-grade-3b', 'FL grade 3b'), V('fl-duodenal', 'Primary duodenal FL'), V('transformed-dlbcl', 'Transformed to DLBCL')],
    },
    {
      id: 'stage',
      label: 'Ann Arbor stage',
      category: 'Staging & Anatomy',
      help: 'Validated anatomical stage (PET-CT / CECT).',
      codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-ann-arbor-stage',
      valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-ann-arbor-stage',
      values: [V('stage-1', 'Stage I'), V('stage-2', 'Stage II'), V('stage-3', 'Stage III'), V('stage-4', 'Stage IV')],
    },
    {
      id: 'stage2-contiguity',
      label: 'Stage II contiguity',
      category: 'Staging & Anatomy',
      help: 'Only relevant for Stage II.',
      codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-stage2-contiguity',
      valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-stage2-contiguity',
      values: [V('contiguous', 'Contiguous'), V('non-contiguous', 'Non-contiguous')],
    },
    {
      id: 'bone-marrow',
      label: 'Bone marrow biopsy',
      category: 'Staging & Anatomy',
      help: 'Marrow involvement upstages the patient to Stage IV.',
      codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-bone-marrow',
      valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-bone-marrow',
      values: [V('cleared', 'Negative (cleared)'), V('involved', 'Involved')],
    },
    {
      id: 'gelf',
      label: 'GELF tumour burden',
      category: 'Prognosis & Tumor Burden',
      help: 'High if any GELF criterion is met (bulky mass > 7 cm, 3 nodes > 3 cm, cytopenias, B symptoms...).',
      codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-gelf',
      valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-gelf',
      values: [V('low-burden', 'Low burden'), V('high-burden', 'High burden')],
    },
    {
      id: 'fitness',
      label: 'Fitness for systemic therapy',
      category: 'Performance & Fitness',
      help: 'Fit for full-dose chemoimmunotherapy (BR / R-CHOP).',
      codeSystemUrl: 'http://ncgindia.org/fhir/CodeSystem/ncg-fitness',
      valueSetUrl: 'http://ncgindia.org/fhir/ValueSet/ncg-fitness',
      values: [V('fit', 'Fit'), V('frail', 'Frail / comorbid')],
    },
  ],
  outcomes: [
    { id: 'needs-review', label: 'Needs clinician review', kind: 'review', rationale: 'Required data is missing or unreliable. A clinician must decide - no regimen is suggested.', regimens: [] },
    { id: 'treat-as-dlbcl', label: 'Treat as DLBCL', kind: 'treatment', rationale: 'Grade 3b / transformed FL behaves as aggressive lymphoma.',
      regimens: [R('r1', 'R-CHOP x 6 cycles (+/- ISRT to bulky sites)', 'Anthracycline chemoimmunotherapy'), R('r2', 'Polatuzumab vedotin + R-CHP', 'Targeted ADC')] },
    { id: 'fl-duodenal-limited', label: 'Duodenal FL - watch / local therapy', kind: 'observation', rationale: 'Primary duodenal FL is usually indolent and localised.',
      regimens: [R('r1', 'Observation / watchful waiting', 'Surveillance'), R('r2', 'ISRT 24-30 Gy if symptomatic', 'Local therapy')] },
    { id: 'stage-1-limited', label: 'Stage I - curative radiotherapy', kind: 'treatment', rationale: 'Limited stage with cleared marrow: curative-intent radiotherapy.',
      regimens: [R('r1', 'ISRT 24 Gy in 12 fractions', 'Radiation therapy'), R('r2', 'Watchful waiting if radiotherapy contraindicated', 'Surveillance')] },
    { id: 'stage-2-contiguous', label: 'Stage II contiguous - radiotherapy', kind: 'treatment', rationale: 'Contiguous nodal disease fits a single radiation field.',
      regimens: [R('r1', 'IFRT / ISRT 24 Gy', 'Radiation therapy'), R('r2', 'Single-agent rituximab 375 mg/m2 weekly x 4', 'Monotherapy')] },
    { id: 'advanced-low-burden', label: 'Advanced, low burden - watch and wait', kind: 'observation', rationale: 'Asymptomatic low tumour burden: no survival benefit from early treatment.',
      regimens: [R('r1', 'Watchful waiting (review every 3-6 months)', 'Surveillance'), R('r2', 'Single-agent rituximab x 4 if patient declines observation', 'Monotherapy')] },
    { id: 'advanced-high-burden-systemic', label: 'Advanced, high burden - systemic therapy', kind: 'treatment', rationale: 'High GELF burden in a fit patient.',
      regimens: [R('r1', 'Bendamustine + rituximab (BR) x 6', 'Chemoimmunotherapy'), R('r2', 'R-CHOP x 6', 'Chemoimmunotherapy'), R('r3', 'Rituximab + lenalidomide (R2)', 'Immunomodulatory')] },
    { id: 'advanced-high-burden-frail', label: 'Advanced, high burden - frail', kind: 'treatment', rationale: 'High burden but not fit for full-dose therapy.',
      regimens: [R('r1', 'Single-agent rituximab weekly x 4', 'Monotherapy'), R('r2', 'Attenuated bendamustine + rituximab', 'Dose-reduced'), R('r3', 'R-CVP', 'Non-anthracycline')] },
  ],
  rules: [
    { id: 'rule1', label: 'Histology unknown', conditions: [{ findingId: 'histology', op: 'unknown', values: [] }], outcomeId: 'needs-review' },
    { id: 'rule2', label: 'Grade 3b or transformed', conditions: [{ findingId: 'histology', op: 'is', values: ['fl-grade-3b', 'transformed-dlbcl'] }], outcomeId: 'treat-as-dlbcl' },
    { id: 'rule3', label: 'Duodenal FL', conditions: [{ findingId: 'histology', op: 'is', values: ['fl-duodenal'] }], outcomeId: 'fl-duodenal-limited' },
    { id: 'rule4', label: 'Stage unknown', conditions: [{ findingId: 'stage', op: 'unknown', values: [] }], outcomeId: 'needs-review' },
    { id: 'rule5', label: 'Stage I, marrow not assessed', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-1'] }, { findingId: 'bone-marrow', op: 'unknown', values: [] }], outcomeId: 'needs-review' },
    { id: 'rule6', label: 'Stage I, marrow cleared', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-1'] }, { findingId: 'bone-marrow', op: 'is', values: ['cleared'] }], outcomeId: 'stage-1-limited' },
    { id: 'rule7', label: 'Stage I but marrow involved (restage as IV)', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-1'] }, { findingId: 'bone-marrow', op: 'is', values: ['involved'] }], outcomeId: 'needs-review' },
    { id: 'rule8', label: 'Stage II contiguous', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-2'] }, { findingId: 'stage2-contiguity', op: 'is', values: ['contiguous'] }], outcomeId: 'stage-2-contiguous' },
    { id: 'rule9', label: 'Advanced disease, GELF unknown', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-2', 'stage-3', 'stage-4'] }, { findingId: 'gelf', op: 'unknown', values: [] }], outcomeId: 'needs-review' },
    { id: 'rule10', label: 'Advanced disease, low burden', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-2', 'stage-3', 'stage-4'] }, { findingId: 'gelf', op: 'is', values: ['low-burden'] }], outcomeId: 'advanced-low-burden' },
    { id: 'rule11', label: 'Advanced, high burden, fit', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-2', 'stage-3', 'stage-4'] }, { findingId: 'gelf', op: 'is', values: ['high-burden'] }, { findingId: 'fitness', op: 'is', values: ['fit'] }], outcomeId: 'advanced-high-burden-systemic' },
    { id: 'rule12', label: 'Advanced, high burden, frail', conditions: [{ findingId: 'stage', op: 'is', values: ['stage-2', 'stage-3', 'stage-4'] }, { findingId: 'gelf', op: 'is', values: ['high-burden'] }, { findingId: 'fitness', op: 'is', values: ['frail'] }], outcomeId: 'advanced-high-burden-frail' },
  ],
  fallbackOutcomeId: 'needs-review',
  testCases: [
    { id: 't1', name: 'Advanced high burden, fit', description: '61M, grade 2 FL, stage IV, bulky mass 8.2 cm, B symptoms, fit.', expectedOutcomeId: 'advanced-high-burden-systemic',
      inputs: inp({ histology: 'fl-grade-1-2', stage: 'stage-4', 'bone-marrow': 'involved', gelf: 'high-burden', fitness: 'fit' }) },
    { id: 't2', name: 'Stage I limited, marrow cleared', description: '54F, grade 1 FL, isolated cervical node, marrow negative.', expectedOutcomeId: 'stage-1-limited',
      inputs: inp({ histology: 'fl-grade-1-2', stage: 'stage-1', 'bone-marrow': 'cleared', gelf: 'low-burden', fitness: 'fit' }) },
    { id: 't3', name: 'Advanced low burden', description: '67F, stage III, nodes < 2.5 cm, asymptomatic.', expectedOutcomeId: 'advanced-low-burden',
      inputs: inp({ histology: 'fl-grade-1-2', stage: 'stage-3', 'bone-marrow': 'cleared', gelf: 'low-burden', fitness: 'fit' }) },
    { id: 't4', name: 'Referral report with unparsed histology (safety)', description: 'External lab says "borderline 3a vs 3b" as free text.', expectedOutcomeId: 'needs-review',
      inputs: { histology: { value: 'fl-grade-3a', provenance: 'unparsed' }, stage: { value: 'stage-3', provenance: P }, gelf: { value: 'high-burden', provenance: P }, fitness: { value: 'fit', provenance: P } } },
    { id: 't5', name: 'Advanced high burden, frail', description: '78M, stage III, high burden, frail.', expectedOutcomeId: 'advanced-high-burden-frail',
      inputs: inp({ histology: 'fl-grade-3a', stage: 'stage-3', gelf: 'high-burden', fitness: 'frail' }) },
    { id: 't6', name: 'Transformed to DLBCL', description: 'Biopsy shows transformation.', expectedOutcomeId: 'treat-as-dlbcl',
      inputs: inp({ histology: 'transformed-dlbcl', stage: 'stage-4' }) },
    { id: 't7', name: 'Stage II contiguous', description: '49F, two contiguous nodal regions.', expectedOutcomeId: 'stage-2-contiguous',
      inputs: inp({ histology: 'fl-grade-1-2', stage: 'stage-2', 'stage2-contiguity': 'contiguous', 'bone-marrow': 'cleared' }) },
  ],
};

import { NCG_LYMPHOMA_WORKUP } from './lymphoma_workup.js';
import { NCG_DLBCL_TREATMENT } from './dlbcl_treatment.js';
import { NCG_DLBCL_RR } from './dlbcl_relapsed_refractory.js';

export const SEED_GUIDELINES = [
  NCG_FL,
  NCG_LYMPHOMA_WORKUP,
  NCG_DLBCL_TREATMENT,
  NCG_DLBCL_RR,
];

