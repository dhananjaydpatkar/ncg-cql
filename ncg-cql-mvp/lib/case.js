/**
 * case.js - everything between "a clinician's answers" and "a CQL decision":
 *   1. validate + turn answered findings into an ABDM-style FHIR R4 Bundle (using the guideline's own code systems)
 *   2. interpret the CQL result for a clinician (outcome label, status, regimens, scores, missing inputs)
 *   3. explain WHY (which authored rule fired and which criteria were met). This re-implements the rule
 *      semantics only to *explain*; the recommendation itself always comes from the CQL engine, and a
 *      mismatch between the two is surfaced as an integrity warning.
 */
const { findingById, outcomeById, functionById, valueLabel, isAllowedValue } = require('./schemas');

const PROVENANCE_USABLE = new Set(['source-coded', 'structured-capture', 'nlp-extracted-high-confidence']); // mirrors NCGCommon.IsUsable
const PROVENANCE_ALL = new Set([...PROVENANCE_USABLE, 'nlp-extracted-low-confidence', 'unparsed', 'missing']);
const PROVENANCE_URL = 'http://ncgindia.org/fhir/StructureDefinition/ncg-extension-data-provenance';
const PROVENANCE_CS = 'http://ncgindia.org/fhir/CodeSystem/ncg-data-provenance';
const ABHA_SYSTEM = 'https://healthid.ndhm.gov.in';

// ---------------------------------------------------------------------------------------------
// 1. Bundle building
// ---------------------------------------------------------------------------------------------
function validateFindings(schema, findings) {
  const errors = [];
  const clean = {};
  for (const [id, entry] of Object.entries(findings || {})) {
    const f = findingById(schema, id);
    if (!f) { errors.push(`Unknown finding '${id}' for ${schema.id}`); continue; }
    if (!entry || !entry.value) continue; // unanswered
    if (!isAllowedValue(f, entry.value)) { errors.push(`'${entry.value}' is not an allowed value for '${id}'`); continue; }
    const provenance = PROVENANCE_ALL.has(entry.provenance) ? entry.provenance : 'structured-capture';
    clean[id] = { value: entry.value, provenance };
  }
  return { clean, errors };
}

function buildCaseBundle(schema, patient = {}, findings = {}) {
  const stamp = Date.now();
  const patientId = `patient-${stamp}`;
  const age = Number.parseInt(patient.age, 10);
  const birthDate = patient.birthDate || (Number.isFinite(age) ? `${new Date().getFullYear() - age}-01-01` : undefined);
  const gender = ['male', 'female', 'other', 'unknown'].includes(String(patient.gender || '').toLowerCase()) ? String(patient.gender).toLowerCase() : 'unknown';
  const name = patient.name || 'Unnamed patient';

  const identifier = [];
  if (patient.abhaId) identifier.push({ system: ABHA_SYSTEM, value: patient.abhaId });
  if (patient.mrn) identifier.push({ type: { text: 'MRN' }, system: 'https://tmc.gov.in/mrn', value: patient.mrn });

  const entries = [{
    fullUrl: `Patient/${patientId}`,
    resource: { resourceType: 'Patient', id: patientId, identifier, name: [{ text: name }], gender, ...(birthDate ? { birthDate } : {}) },
  }];

  for (const f of schema.findings) {
    const a = findings[f.id];
    if (!a || !a.value) continue;
    const obsId = `obs-${f.id}`;
    entries.push({
      fullUrl: `Observation/${obsId}`,
      resource: {
        resourceType: 'Observation',
        id: obsId,
        meta: { profile: ['http://ncgindia.org/fhir/StructureDefinition/ncg-observation-heme'] },
        status: a.provenance === 'missing' ? 'unknown' : 'final',
        subject: { reference: `Patient/${patientId}` },
        code: {
          coding: [{ system: f.codeSystemUrl, code: a.value, display: valueLabel(f, a.value) }],
          text: `${f.label}: ${valueLabel(f, a.value)}`,
        },
        extension: [{
          url: PROVENANCE_URL,
          valueCodeableConcept: { coding: [{ system: PROVENANCE_CS, code: a.provenance, display: a.provenance }] },
        }],
      },
    });
  }

  return {
    resourceType: 'Bundle',
    id: `bundle-case-${stamp}`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    meta: { tag: [{ system: 'http://ncgindia.org/guideline', code: schema.id }, { system: 'http://ncgindia.org/source-modality', code: 'point-of-care-worksheet' }] },
    entry: entries,
  };
}

/**
 * Extracts { patient, findings } from an existing FHIR R4 Bundle so synthetic test cases
 * and external bundles can be inspected on the Point-of-Care worksheet and explained by buildDecision.
 */
function extractFindingsFromBundle(schema, bundle) {
  const findings = {};
  const patient = {};
  if (!schema || !bundle || !Array.isArray(bundle.entry)) return { patient, findings };

  const patRes = bundle.entry.map((e) => e.resource).find((r) => r?.resourceType === 'Patient');
  if (patRes) {
    patient.id = patRes.id || '';
    patient.name = patRes.name?.[0]?.text || [ ...(patRes.name?.[0]?.given || []), patRes.name?.[0]?.family ].filter(Boolean).join(' ') || '';
    patient.gender = patRes.gender || '';
    patient.birthDate = patRes.birthDate || '';
    if (patRes.birthDate) {
      const yr = Number.parseInt(String(patRes.birthDate).slice(0, 4), 10);
      if (Number.isFinite(yr)) patient.age = new Date().getFullYear() - yr;
    }
    const abha = (patRes.identifier || []).find((i) => i.system === ABHA_SYSTEM)?.value;
    if (abha) patient.abhaId = abha;
  }

  for (const entry of bundle.entry) {
    const obs = entry.resource;
    if (!obs || obs.resourceType !== 'Observation') continue;
    const coding = obs.code?.coding?.[0];
    if (!coding) continue;
    const f = schema.findings.find((x) => x.codeSystemUrl === coding.system);
    if (!f) continue;
    const provCode = obs.extension?.find((e) => e.url === PROVENANCE_URL)?.valueCodeableConcept?.coding?.[0]?.code || 'source-coded';
    const normalizedProv = PROVENANCE_ALL.has(provCode) ? provCode : 'unparsed';
    if (isAllowedValue(f, coding.code)) {
      findings[f.id] = {
        value: coding.code,
        provenance: normalizedProv,
        source: 'bundle',
        detail: obs.code?.text || valueLabel(f, coding.code),
      };
    } else {
      // Unparsed or non-standard code in a synthetic negative test bundle
      findings[f.id] = {
        value: f.values[0]?.code || '',
        provenance: 'unparsed',
        source: 'bundle',
        detail: `Unverified code in bundle: ${coding.code}`,
      };
    }
  }
  return { patient, findings };
}

// ---------------------------------------------------------------------------------------------
// 2. Rule explanation (mirrors the authored rule semantics: ordered, first match wins)
// ---------------------------------------------------------------------------------------------
const isKnown = (findings, id) => !!findings[id]?.value && PROVENANCE_USABLE.has(findings[id].provenance);

function computeScore(schema, fn, findings) {
  const condHolds = (c) => evalFindingCondition(schema, findings, c);
  const applicable = (fn.appliesWhen || []).every(condHolds);
  let total = 0; let missing = false;
  for (const fa of fn.factors) {
    if (!isKnown(findings, fa.findingId)) { missing = true; continue; }
    total += Number(fa.points?.[findings[fa.findingId].value] || 0);
  }
  const score = applicable && !missing ? total : null;
  const band = score == null ? null : fn.bands.find((b) => score >= Number(b.min) && score <= Number(b.max)) || null;
  return { score, band };
}

function evalFindingCondition(schema, findings, c) {
  const known = isKnown(findings, c.findingId);
  if (c.op === 'unknown') return !known;
  if (!known) return false;
  const inList = (c.values || []).includes(findings[c.findingId].value);
  return c.op === 'is' ? inList : !inList;
}

function evalCondition(schema, findings, c) {
  if (!c.functionId) return evalFindingCondition(schema, findings, c);
  const fn = functionById(schema, c.functionId);
  if (!fn) return false;
  const s = computeScore(schema, fn, findings);
  if (c.op === 'score_unknown') return s.score == null;
  if (s.score == null) return false;
  if (c.op === 'score_gte') return s.score >= Number(c.threshold);
  if (c.op === 'score_lte') return s.score <= Number(c.threshold);
  return !!s.band && (c.values || []).includes(s.band.code);
}

function describeCondition(schema, c) {
  if (c.functionId) {
    const fn = functionById(schema, c.functionId);
    const name = fn?.label || fn?.name || c.functionId;
    if (c.op === 'score_unknown') return `${name} cannot be calculated`;
    if (c.op === 'score_gte') return `${name} score is at least ${c.threshold}`;
    if (c.op === 'score_lte') return `${name} score is at most ${c.threshold}`;
    const labels = (c.values || []).map((code) => fn?.bands.find((b) => b.code === code)?.label || code);
    return `${name} risk group is ${labels.join(' or ')}`;
  }
  const f = findingById(schema, c.findingId);
  const label = f?.label || c.findingId;
  if (c.op === 'unknown') return `${label} is unknown or not reliable`;
  const vals = (c.values || []).map((code) => valueLabel(f, code)).join(' or ');
  return `${label} ${c.op === 'is_not' ? 'is not' : 'is'} ${vals}`;
}

function explainRules(schema, findings) {
  for (const r of schema.rules) {
    const conds = r.conditions.map((c) => ({ text: describeCondition(schema, c), findingId: c.findingId || null, met: evalCondition(schema, findings, c) }));
    if (conds.length && conds.every((c) => c.met)) {
      return { ruleId: r.id, ruleLabel: r.label, outcomeId: r.outcomeId, conditions: conds };
    }
  }
  return { ruleId: null, ruleLabel: null, outcomeId: schema.fallbackOutcomeId, conditions: [] };
}

// ---------------------------------------------------------------------------------------------
// 3. Decision for the clinician
// ---------------------------------------------------------------------------------------------
function buildDecision(schema, report, findings) {
  const outcomeId = report.treatment_group;
  const outcome = outcomeById(schema, outcomeId);
  const missing = schema.findings
    .filter((f) => !isKnown(findings, f.id))
    .map((f) => ({ id: f.id, label: f.label, category: f.category, reason: findings[f.id]?.value ? 'unverified' : 'unanswered' }));

  const explanation = explainRules(schema, findings);
  const integrity = explanation.outcomeId === outcomeId
    ? { ok: true }
    : { ok: false, message: `Rule trace (${explanation.outcomeId}) differs from CQL result (${outcomeId}); rely on the CQL result and report this to the guideline owner.` };

  let status = 'recommendation';
  if (outcomeId === schema.fallbackOutcomeId && missing.length) status = 'incomplete';
  else if (outcome?.kind === 'review' || report.requires_human_review) status = 'review';

  const regimenIndex = new Map((outcome?.regimens || []).map((r) => [r.name, r]));
  const regimens = (report.recommended_regimens || []).map((name) => ({ name, category: regimenIndex.get(name)?.category || '' }));

  const scores = Object.entries(report.calculated_scores || {}).map(([name, s]) => {
    const fn = (schema.functions || []).find((x) => x.name === name || x.id === name);
    return { name, label: fn?.label || name, score: s.score, riskGroup: s.riskGroup, riskLabel: s.riskLabel };
  });

  return {
    status,
    outcomeId,
    label: outcome?.label || outcomeId,
    kind: outcome?.kind || 'treatment',
    category: outcome?.category || '',
    rationale: outcome?.rationale || '',
    regimens,
    scores,
    why: integrity.ok ? explanation : { ...explanation, conditions: [] },
    integrity,
    warnings: report.data_quality_warnings || [],
    missing,
    answered: schema.findings.length - missing.length,
    total: schema.findings.length,
  };
}

module.exports = { PROVENANCE_USABLE, validateFindings, buildCaseBundle, extractFindingsFromBundle, explainRules, describeCondition, buildDecision, isKnown };

