import { runAllTests } from './evaluate';
import { findingById, outcomeById } from './model';

// Returns [{level: 'error'|'warn'|'info', tab, text}] - plain-language checks for authors.
export function validate(g) {
  const out = [];
  const add = (level, tab, text) => out.push({ level, tab, text });

  if (!g.title.trim()) add('error', 'setup', 'Guideline needs a title.');
  if (!g.findings.length) add('error', 'findings', 'Add at least one finding (a clinical input such as stage or histology).');
  g.findings.forEach((f) => {
    if (f.values.length < 2) add('error', 'findings', `"${f.label}" needs at least two possible values.`);
  });

  if (!g.rules.length) add('error', 'rules', 'Add at least one rule.');
  g.rules.forEach((r, i) => {
    const n = `Rule ${i + 1} "${r.label}"`;
    if (!r.conditions.length) add('error', 'rules', `${n} has no conditions.`);
    r.conditions.forEach((c) => {
      if (!findingById(g, c.findingId)) add('error', 'rules', `${n} refers to a finding that no longer exists.`);
      else if (c.op !== 'unknown' && !(c.values || []).length) add('error', 'rules', `${n}: choose at least one value for "${findingById(g, c.findingId).label}".`);
    });
    if (!outcomeById(g, r.outcomeId)) add('error', 'rules', `${n} has no outcome selected.`);
    const key = JSON.stringify(r.conditions);
    if (g.rules.slice(0, i).some((p) => JSON.stringify(p.conditions) === key)) {
      add('warn', 'rules', `${n} has the same conditions as an earlier rule, so it can never fire.`);
    }
  });

  const fb = outcomeById(g, g.fallbackOutcomeId);
  if (!fb) add('error', 'rules', 'Choose a fallback outcome for patients matching no rule.');
  else if (fb.kind !== 'review') add('warn', 'rules', 'Fallback outcome is not a "needs review" outcome - patients matching no rule would get a treatment.');

  const hasUnknownRule = g.rules.some((r) => r.conditions.some((c) => c.op === 'unknown'));
  if (g.findings.length && !hasUnknownRule) add('warn', 'rules', 'No rule sends missing/unreliable data to review. Consider adding "finding is unknown -> Needs review" rules (safety).');

  g.outcomes.forEach((o) => {
    if (o.kind === 'treatment' && !o.regimens.length) add('warn', 'outcomes', `Outcome "${o.label}" is a treatment but lists no regimens.`);
    const reached = g.rules.some((r) => r.outcomeId === o.id) || g.fallbackOutcomeId === o.id;
    if (!reached) add('warn', 'rules', `Outcome "${o.label}" is not used by any rule.`);
  });

  if (!g.testCases.length) add('warn', 'tests', 'No test cases yet. Add patient cases to prove the guideline behaves as intended.');
  else {
    const results = runAllTests(g);
    results.filter((r) => !r.passed).forEach((r) => {
      const tc = g.testCases.find((t) => t.id === r.id);
      add('error', 'tests', `Test "${tc.name}" fails: expected "${outcomeById(g, tc.expectedOutcomeId)?.label || '?'}" but got "${r.res.outcome?.label || '?'}".`);
    });
    g.outcomes.forEach((o) => {
      if (!g.testCases.some((t) => t.expectedOutcomeId === o.id)) add('info', 'tests', `No test case covers outcome "${o.label}".`);
    });
  }
  return out;
}
