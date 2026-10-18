// Core data model helpers for the data-driven guideline authoring studio.
// A guideline is plain JSON: findings (inputs), outcomes (treatment groups),
// ordered rules (IF findings THEN outcome) and test cases. No per-disease code.

export const slug = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const pascal = (s = '') =>
  slug(s).split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('') || 'X';

export const uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 8);

export const uniqueSlug = (base, taken) => {
  let s = slug(base) || 'item';
  let i = 2;
  const orig = s;
  while (taken.includes(s)) s = orig + '-' + i++;
  return s;
};

export const PROVENANCE = [
  { code: 'source-coded', label: 'Source-coded (verified)', usable: true },
  { code: 'nlp-extracted-high-confidence', label: 'Extracted, high confidence', usable: true },
  { code: 'unparsed', label: 'Unparsed free text (referral)', usable: false },
  { code: 'missing', label: 'Missing / not done', usable: false },
];
export const isUsableProvenance = (p) => !!PROVENANCE.find((x) => x.code === p && x.usable);

export const OPS = [
  { code: 'is', label: 'is' },
  { code: 'is_not', label: 'is not' },
  { code: 'unknown', label: 'is unknown / not reliable' },
];

export const OUTCOME_KINDS = [
  { code: 'treatment', label: 'Treatment recommendation' },
  { code: 'observation', label: 'Observation / watchful waiting' },
  { code: 'review', label: 'Needs clinician review (safety)' },
];

export function blankGuideline() {
  const reviewId = 'needs-review';
  return {
    schema: 1,
    id: 'NCG_NEW_' + new Date().getFullYear(),
    version: '0.1.0',
    title: 'Untitled guideline',
    organization: 'National Cancer Grid (India)',
    source: '',
    description: '',
    status: 'draft',
    author: '',
    enforceProvenance: true,
    findings: [],
    outcomes: [
      {
        id: reviewId,
        label: 'Needs clinician review',
        kind: 'review',
        rationale: 'Data missing, unreliable or not covered by the guideline. A clinician must decide.',
        regimens: [],
      },
    ],
    rules: [],
    fallbackOutcomeId: reviewId,
    testCases: [],
  };
}

export const findingById = (g, id) => g.findings.find((f) => f.id === id);
export const outcomeById = (g, id) => g.outcomes.find((o) => o.id === id);
export const valueLabel = (f, code) => f?.values.find((v) => v.code === code)?.label || code;

export function describeCondition(g, c) {
  const f = findingById(g, c.findingId);
  const name = f ? f.label : '(missing finding)';
  if (c.op === 'unknown') return name + ' is unknown or not reliable';
  const vals = (c.values || []).map((v) => valueLabel(f, v));
  const list = vals.length === 0 ? '(choose values)' : vals.length === 1 ? vals[0] : vals.slice(0, -1).join(', ') + ' or ' + vals[vals.length - 1];
  return name + (c.op === 'is_not' ? ' is not ' : ' is ') + list;
}

export function describeRule(g, r) {
  if (!r.conditions.length) return '(no conditions yet)';
  return r.conditions.map((c) => describeCondition(g, c)).join(' AND ');
}
