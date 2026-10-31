/**
 * derive.js - turns RAW clinical data from the EHR (age from birthDate, lab values, ECOG score,
 * serology results) into the categorical findings the clinical guidelines are written against.
 *
 * Every rule is explicit and uses the thresholds stated in the authored guideline's own value
 * labels (e.g. "Hb < 12.0 g/dL", "Elevated (> ULN)"). Where a raw value cannot be bucketed
 * unambiguously (e.g. the guideline defines overlapping Hb / WBC cut-offs as exclusive options)
 * nothing is derived and the clinician is asked, rather than guessing.
 *
 * Mock LOINC codes below are for the demo EHR; confirm against your lab catalogue before real use.
 */

const LOINC = {
  LDH: '2532-0',
  ECOG: '89247-1',
  HBSAG: '5196-1',
  HBCAB: '13952-7',
  HCV_AB: '16128-1',
  HIV_AB: '75622-1',
  CD4: '24467-3',
  ALBUMIN: '1751-7',
  B2M: '1952-1',
};
const SNOMED_POSITIVE = '10828004';
const SNOMED_NEGATIVE = '260385009';
const LOINC_SYSTEM = 'http://loinc.org';
const SNOMED_SYSTEM = 'http://snomed.info/sct';

const has = (f, code) => !!f && f.values.some((v) => v.code === code);
const firstExisting = (f, ...codes) => codes.find((c) => has(f, c)) || null;

function ageInYears(birthDate, now = new Date()) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function latestByLoinc(observations, loinc) {
  const matches = observations.filter((o) => (o.code?.coding || []).some((c) => c.system === LOINC_SYSTEM && c.code === loinc));
  if (!matches.length) return null;
  const when = (o) => Date.parse(o.effectiveDateTime || o.issued || '') || 0;
  return matches.sort((a, b) => when(b) - when(a))[0];
}

const numeric = (o) => {
  if (!o) return null;
  if (typeof o.valueInteger === 'number') return { value: o.valueInteger, unit: '' };
  if (o.valueQuantity && typeof o.valueQuantity.value === 'number') return { value: o.valueQuantity.value, unit: o.valueQuantity.unit || o.valueQuantity.code || '' };
  return null;
};

function serologyResult(o) {
  const codings = o?.valueCodeableConcept?.coding || [];
  if (codings.some((c) => c.system === SNOMED_SYSTEM && c.code === SNOMED_POSITIVE)) return 'positive';
  if (codings.some((c) => c.system === SNOMED_SYSTEM && c.code === SNOMED_NEGATIVE)) return 'negative';
  return null;
}

const ref = (o) => (o ? `Observation/${o.id}` : null);

/**
 * @returns {Object} { [findingId]: { value, detail, sourceRefs[] } }
 */
function deriveFindings(schema, { patient, observations = [] }) {
  const out = {};
  const finding = (id) => schema.findings.find((f) => f.id === id) || null;
  const set = (id, value, detail, refs) => {
    const f = finding(id);
    if (!f || !has(f, value)) return;
    out[id] = { value, detail, sourceRefs: refs.filter(Boolean) };
  };

  // Age group (from Patient.birthDate)
  const age = ageInYears(patient?.birthDate);
  const ageF = finding('age-group');
  if (ageF && age != null) {
    const code = age <= 60 ? firstExisting(ageF, 'age-le-60') : age >= 70 ? firstExisting(ageF, 'age-ge-70', 'age-gt-60') : firstExisting(ageF, 'age-gt-60');
    if (code) set('age-group', code, `Age ${age} years (DOB ${patient.birthDate})`, [patient?.id ? `Patient/${patient.id}` : null]);
  }

  // LDH vs ULN (needs the lab's own reference range)
  const ldhObs = latestByLoinc(observations, LOINC.LDH);
  const ldh = numeric(ldhObs);
  const uln = ldhObs?.referenceRange?.[0]?.high?.value;
  if (ldh && typeof uln === 'number') {
    set('serum-ldh', ldh.value > uln ? 'ldh-elevated' : 'ldh-normal', `LDH ${ldh.value} ${ldh.unit || 'U/L'} (ULN ${uln})`, [ref(ldhObs)]);
  }

  // ECOG performance status
  const ecogObs = latestByLoinc(observations, LOINC.ECOG);
  const ecog = numeric(ecogObs);
  const ecogF = finding('ecog-ps');
  if (ecog && ecogF) {
    const code = ecog.value <= 1 ? firstExisting(ecogF, 'ecog-0-1') : firstExisting(ecogF, 'ecog-ge-2', 'ecog-2-4');
    if (code) set('ecog-ps', code, `ECOG performance status ${ecog.value}`, [ref(ecogObs)]);
  }

  // Viral serology
  const hbsag = latestByLoinc(observations, LOINC.HBSAG);
  const hbcab = latestByLoinc(observations, LOINC.HBCAB);
  const hbsagR = serologyResult(hbsag);
  const hbcabR = serologyResult(hbcab);
  if (hbsagR === 'positive' || hbcabR === 'positive') {
    set('viral-screening-hbv', 'hbv-positive', `HBsAg ${hbsagR || 'not done'}, HBcAb-IgG ${hbcabR || 'not done'}`, [ref(hbsag), ref(hbcab)]);
  } else if (hbsagR === 'negative' && hbcabR === 'negative') {
    set('viral-screening-hbv', 'hbv-negative', 'HBsAg negative, HBcAb-IgG negative', [ref(hbsag), ref(hbcab)]);
  } // only one marker resulted and it is negative: not enough to call HBV negative

  const hcv = latestByLoinc(observations, LOINC.HCV_AB);
  const hcvR = serologyResult(hcv);
  if (hcvR) set('viral-screening-hcv', hcvR === 'positive' ? 'hcv-positive' : 'hcv-negative', `Anti-HCV ${hcvR}`, [ref(hcv)]);

  const hiv = latestByLoinc(observations, LOINC.HIV_AB);
  const hivR = serologyResult(hiv);
  if (hivR) set('viral-screening-hiv', hivR === 'positive' ? 'hiv-positive' : 'hiv-negative', `HIV 1/2 ${hivR === 'positive' ? 'reactive' : 'non-reactive'}`, [ref(hiv)]);

  // CD4 (HIV+ patients). HIV-negative => "not applicable" by the guideline's own definition.
  const cd4Obs = latestByLoinc(observations, LOINC.CD4);
  const cd4 = numeric(cd4Obs);
  if (cd4) {
    set('cd4-count', cd4.value >= 50 ? 'cd4-gte-50' : 'cd4-lt-50', `CD4 ${cd4.value} cells/uL`, [ref(cd4Obs)]);
  } else if (out['viral-screening-hiv']?.value === 'hiv-negative') {
    set('cd4-count', 'not-applicable', 'HIV negative: CD4 count not required', [ref(hiv)]);
  }

  // Albumin (IPS cut-off 4.0 g/dL)
  const albObs = latestByLoinc(observations, LOINC.ALBUMIN);
  const alb = numeric(albObs);
  if (alb) {
    const g_dl = /g\/l$/i.test(alb.unit) ? alb.value / 10 : alb.value;
    set('serum-albumin', g_dl < 4.0 ? 'albumin-low' : 'albumin-normal', `Albumin ${alb.value} ${alb.unit || 'g/dL'}`, [ref(albObs)]);
  }

  // Beta-2 microglobulin (3.5 mg/L cut-off)
  const b2mObs = latestByLoinc(observations, LOINC.B2M);
  const b2m = numeric(b2mObs);
  if (b2m) set('b2m-level', b2m.value > 3.5 ? 'b2m-elevated' : 'b2m-normal', `Beta-2 microglobulin ${b2m.value} ${b2m.unit || 'mg/L'}`, [ref(b2mObs)]);

  return out;
}

module.exports = { LOINC, LOINC_SYSTEM, SNOMED_SYSTEM, SNOMED_POSITIVE, SNOMED_NEGATIVE, ageInYears, deriveFindings };

