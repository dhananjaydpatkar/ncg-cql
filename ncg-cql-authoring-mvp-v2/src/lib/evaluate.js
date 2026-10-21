import { isUsableProvenance, describeCondition, outcomeById, findingById, functionById } from './model.js';

// Generic rule evaluator. Mirrors the semantics of the generated CQL:
//  - a finding is "known" only if a value is recorded AND (if the provenance gate is on)
//    its provenance is trustworthy;
//  - "is" / "is not" are false when the finding is not known;
//  - a score function is null (cannot be calculated) when it does not apply or any of
//    its inputs is not known; score conditions other than "cannot be calculated" are
//    then false (CQL: comparisons with null are null, and a null rule never fires);
//  - rules are checked in order, first match wins, otherwise the fallback outcome applies.

export function isKnown(g, tc, findingId) {
  const i = tc.inputs?.[findingId];
  if (!i || !i.value) return false;
  if (g.enforceProvenance && !isUsableProvenance(i.provenance || 'source-coded')) return false;
  return true;
}

function evalFindingCondition(g, tc, c) {
  const known = isKnown(g, tc, c.findingId);
  if (c.op === 'unknown') return !known;
  if (!known) return false;
  const v = tc.inputs[c.findingId].value;
  const inList = (c.values || []).includes(v);
  return c.op === 'is' ? inList : !inList;
}

// Computes one score function for a test patient.
// Returns { score, band, applicable, missing: [finding labels], parts: [{label, value, points}] }
export function computeScore(g, fn, tc) {
  const applicable = (fn.appliesWhen || []).every((c) => evalFindingCondition(g, tc, c));
  const parts = [];
  const missing = [];
  let total = 0;
  for (const fa of fn.factors) {
    const f = findingById(g, fa.findingId);
    if (!f || !isKnown(g, tc, fa.findingId)) { missing.push(f ? f.label : '(missing finding)'); continue; }
    const v = tc.inputs[fa.findingId].value;
    const pts = Number(fa.points?.[v] || 0);
    total += pts;
    parts.push({ label: f.label, value: f.values.find((x) => x.code === v)?.label || v, points: pts });
  }
  const score = applicable && !missing.length ? total : null;
  const band = score == null ? null : fn.bands.find((b) => score >= Number(b.min) && score <= Number(b.max)) || null;
  return { score, band, applicable, missing, parts };
}

export function computeAllScores(g, tc) {
  const out = {};
  (g.functions || []).forEach((fn) => { out[fn.id] = computeScore(g, fn, tc); });
  return out;
}

function evalCondition(g, tc, c, scores) {
  if (!c.functionId) return evalFindingCondition(g, tc, c);
  const fn = functionById(g, c.functionId);
  if (!fn) return false;
  const s = scores[fn.id] || computeScore(g, fn, tc);
  if (c.op === 'score_unknown') return s.score == null;
  if (s.score == null) return false;
  if (c.op === 'score_gte') return s.score >= Number(c.threshold);
  if (c.op === 'score_lte') return s.score <= Number(c.threshold);
  return !!s.band && (c.values || []).includes(s.band.code);
}

export function evaluate(g, tc) {
  const scores = computeAllScores(g, tc);
  const trace = [];
  let firedRule = null;
  for (const r of g.rules) {
    const conds = r.conditions.map((c) => ({ text: describeCondition(g, c), pass: evalCondition(g, tc, c, scores) }));
    const matched = conds.length > 0 && conds.every((c) => c.pass);
    trace.push({ ruleId: r.id, label: r.label, matched, conds });
    if (matched) { firedRule = r; break; }
  }
  const outcomeId = firedRule ? firedRule.outcomeId : g.fallbackOutcomeId;
  const warnings = [];
  for (const f of g.findings) {
    const i = tc.inputs?.[f.id];
    if (i && i.value && g.enforceProvenance && !isUsableProvenance(i.provenance || 'source-coded')) {
      warnings.push(`${f.label}: value ignored because provenance is "${i.provenance}" (provenance gate is on).`);
    }
  }
  if (!firedRule) warnings.push('No rule matched - fallback outcome applied.');

  // Optional score assertions on the test case: { <functionId>: <expected score | null> }
  const scoreChecks = Object.entries(tc.expectedScores || {}).map(([fid, expected]) => {
    const actual = scores[fid]?.score ?? null;
    return { functionId: fid, expected, actual, passed: (expected ?? null) === actual };
  });
  return { outcomeId, outcome: outcomeById(g, outcomeId), firedRule, trace, warnings, scores, scoreChecks };
}

export function runAllTests(g) {
  return g.testCases.map((tc) => {
    const res = evaluate(g, tc);
    const passed = res.outcomeId === tc.expectedOutcomeId && res.scoreChecks.every((c) => c.passed);
    return { id: tc.id, passed, res };
  });
}
