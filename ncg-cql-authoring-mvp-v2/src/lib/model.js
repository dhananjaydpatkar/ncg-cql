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

// Operators available when a rule condition embeds a score function.
export const SCORE_OPS = [
  { code: 'band_is', label: 'risk group is' },
  { code: 'score_gte', label: 'score is at least' },
  { code: 'score_lte', label: 'score is at most' },
  { code: 'score_unknown', label: 'cannot be calculated' },
];

// ---- Score functions -------------------------------------------------------
// A function is a reusable, points-based clinical score (IPI, FLIPI, CLL-IPI...):
//   appliesWhen: finding conditions that must hold for the score to apply (else null)
//   factors:     [{ findingId, points: { <valueCode>: <int> } }]  - summed
//   bands:       [{ code, label, min, max, note }]               - risk groups
// It is evaluated in the browser (test cases) AND emitted as CQL functions, so the
// two always agree. Missing / unreliable inputs make the score null (never guessed).
const CQL_RESERVED = new Set(['start', 'end', 'day', 'days', 'year', 'years', 'month', 'months', 'week', 'weeks', 'hour', 'minute', 'second', 'date', 'time', 'in', 'is', 'not', 'and', 'or', 'from', 'where', 'return', 'case', 'when', 'then', 'else', 'null', 'true', 'false', 'interval', 'list', 'tuple', 'code', 'concept', 'define', 'function', 'context', 'library', 'using', 'include', 'version', 'called', 'public', 'private', 'with', 'without', 'such', 'that', 'let', 'sort', 'by', 'asc', 'desc', 'all', 'distinct', 'exists', 'singleton', 'point', 'width', 'size', 'contains', 'properly', 'includes', 'during', 'before', 'after', 'meets', 'overlaps', 'starts', 'ends', 'occurs', 'same', 'as', 'cast', 'convert', 'to', 'if', 'between', 'collapse', 'expand', 'per', 'difference', 'duration', 'of', 'minimum', 'maximum', 'predecessor', 'successor', 'union', 'intersect', 'except', 'implies', 'xor', 'mod', 'div']);
export const cqlIdent = (s = '') => {
  const x = String(s).replace(/[^A-Za-z0-9_]/g, '_').replace(/^([^A-Za-z])/, 'F_$1');
  return x || 'F';
};
export const camel = (s = '') => {
  const p = pascal(s);
  const c = p[0].toLowerCase() + p.slice(1);
  return CQL_RESERVED.has(c) ? c + 'Value' : c;
};

export const functionById = (g, id) => (g.functions || []).find((f) => f.id === id);
export const bandByCode = (fn, code) => fn?.bands.find((b) => b.code === code);

export function blankFunction(taken = []) {
  const id = uniqueSlug('new score', taken);
  return {
    id,
    name: 'NewScore',
    label: 'New score',
    description: '',
    appliesWhen: [],
    factors: [],
    bands: [
      { code: 'low', label: 'Low', min: 0, max: 1, note: '' },
      { code: 'high', label: 'High', min: 2, max: 99, note: '' },
    ],
  };
}

// Range of achievable totals, used for hints and band validation.
export function scoreRange(fn) {
  let min = 0, max = 0;
  fn.factors.forEach((fa) => {
    const pts = Object.values(fa.points || {}).map(Number).filter((n) => !Number.isNaN(n));
    min += Math.min(0, ...pts);
    max += Math.max(0, ...pts);
  });
  return { min, max };
}

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
    functions: [],
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
  if (c.functionId) {
    const fn = functionById(g, c.functionId);
    const name = fn ? fn.label : '(missing function)';
    if (c.op === 'score_unknown') return name + ' cannot be calculated';
    if (c.op === 'score_gte') return `${name} score ≥ ${c.threshold ?? '?'}`;
    if (c.op === 'score_lte') return `${name} score ≤ ${c.threshold ?? '?'}`;
    const bands = (c.values || []).map((b) => bandByCode(fn, b)?.label || b);
    return `${name} risk group is ${bands.length ? bands.join(' or ') : '(choose groups)'}`;
  }
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
