import { isUsableProvenance, describeCondition, outcomeById } from './model';

// Generic rule evaluator. Mirrors the semantics of the generated CQL:
//  - a finding is "known" only if a value is recorded AND (if the provenance gate is on)
//    its provenance is trustworthy;
//  - "is" / "is not" are false when the finding is not known;
//  - rules are checked in order, first match wins, otherwise the fallback outcome applies.

export function isKnown(g, tc, findingId) {
  const i = tc.inputs?.[findingId];
  if (!i || !i.value) return false;
  if (g.enforceProvenance && !isUsableProvenance(i.provenance || 'source-coded')) return false;
  return true;
}

function evalCondition(g, tc, c) {
  const known = isKnown(g, tc, c.findingId);
  if (c.op === 'unknown') return !known;
  if (!known) return false;
  const v = tc.inputs[c.findingId].value;
  const inList = (c.values || []).includes(v);
  return c.op === 'is' ? inList : !inList;
}

export function evaluate(g, tc) {
  const trace = [];
  let firedRule = null;
  for (const r of g.rules) {
    const conds = r.conditions.map((c) => ({ text: describeCondition(g, c), pass: evalCondition(g, tc, c) }));
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
  return { outcomeId, outcome: outcomeById(g, outcomeId), firedRule, trace, warnings };
}

export function runAllTests(g) {
  return g.testCases.map((tc) => {
    const res = evaluate(g, tc);
    return { id: tc.id, passed: res.outcomeId === tc.expectedOutcomeId, res };
  });
}
