/**
 * build_guideline_schemas.mjs
 *
 * Exports a UI/runtime "schema" for every guideline authored in the Clinical Guideline Studio
 * (findings, allowed values, outcomes, rules, score functions) into
 * schemas/guideline_schemas.json.
 *
 * The point-of-care UI renders its data-entry worksheet from this file, so the form always
 * matches the authored guideline (labels, help text, allowed values, code systems) and no
 * disease-specific form code is needed.
 *
 *   npm run build:schemas
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../ncg-cql-authoring-mvp-v2/src/data');
const outDir = path.resolve(__dirname, '../schemas');
fs.mkdirSync(outDir, { recursive: true });

const { NCG_FL } = await import(path.join(dataDir, 'seed.js'));
const { NCG_LYMPHOMA_WORKUP } = await import(path.join(dataDir, 'lymphoma_workup.js'));
const { NCG_DLBCL_TREATMENT } = await import(path.join(dataDir, 'dlbcl_treatment.js'));
const { NCG_DLBCL_RR } = await import(path.join(dataDir, 'dlbcl_relapsed_refractory.js'));

const slug = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Short, clinician-friendly names for the pathway picker (the authored titles are long).
const PRESENTATION = {
  NCG_LYMPHOMA_WORKUP_2020: { shortTitle: 'Suspected lymphoma: workup & staging', stage: 'Diagnosis', icon: 'workup', order: 1 },
  NCG_FL_2020: { shortTitle: 'Follicular lymphoma: first-line treatment', stage: 'First-line treatment', icon: 'fl', order: 2 },
  NCG_DLBCL_TREATMENT_2020: { shortTitle: 'DLBCL / PMBCL: first-line treatment', stage: 'First-line treatment', icon: 'dlbcl', order: 3 },
  NCG_DLBCL_RR_2020: { shortTitle: 'Relapsed / refractory DLBCL', stage: 'Relapse', icon: 'rr', order: 4 },
};

function toSchema(g) {
  const pres = PRESENTATION[g.id] || { shortTitle: g.title, stage: '', order: 99 };
  return {
    id: g.id,
    version: g.version,
    title: g.title,
    shortTitle: pres.shortTitle,
    stage: pres.stage,
    order: pres.order,
    organization: g.organization,
    source: g.source,
    description: g.description || '',
    enforceProvenance: g.enforceProvenance !== false,
    fallbackOutcomeId: g.fallbackOutcomeId,
    findings: g.findings.map((f) => ({
      id: f.id,
      label: f.label,
      help: f.help || '',
      category: f.category || 'Clinical',
      codeSystemUrl: `http://ncgindia.org/fhir/CodeSystem/ncg-${slug(f.id)}`,
      valueSetUrl: `http://ncgindia.org/fhir/ValueSet/ncg-${slug(f.id)}`,
      values: f.values.map((v) => ({ code: v.code, label: v.label })),
    })),
    // Full score definitions: the server re-computes them to explain which rule fired.
    functions: (g.functions || []).map((fn) => ({
      id: fn.id,
      name: fn.name,
      label: fn.label,
      description: fn.description || '',
      appliesWhen: (fn.appliesWhen || []).map((c) => ({ ...c })),
      factors: (fn.factors || []).map((fa) => ({ findingId: fa.findingId, points: { ...(fa.points || {}) } })),
      bands: (fn.bands || []).map((b) => ({ code: b.code, label: b.label, min: b.min, max: b.max, note: b.note || '' })),
    })),
    outcomes: g.outcomes.map((o) => ({
      id: o.id,
      label: o.label,
      kind: o.kind,
      category: o.category || '',
      rationale: o.rationale || '',
      regimens: (o.regimens || []).map((r) => ({ id: r.id, name: r.name, category: r.category || '' })),
    })),
    rules: g.rules.map((r) => ({
      id: r.id,
      label: r.label,
      outcomeId: r.outcomeId,
      conditions: r.conditions.map((c) => ({ ...c })),
    })),
  };
}

const all = [NCG_LYMPHOMA_WORKUP, NCG_FL, NCG_DLBCL_TREATMENT, NCG_DLBCL_RR].map(toSchema);
const out = { generatedAt: new Date().toISOString(), guidelines: all };
fs.writeFileSync(path.join(outDir, 'guideline_schemas.json'), JSON.stringify(out, null, 2), 'utf8');

for (const s of all) {
  const cats = [...new Set(s.findings.map((f) => f.category))];
  console.log(`${s.id.padEnd(28)} v${s.version.padEnd(6)} findings=${String(s.findings.length).padStart(2)} outcomes=${String(s.outcomes.length).padStart(2)} rules=${String(s.rules.length).padStart(2)} functions=${s.functions.length}`);
  console.log('   categories:', cats.join(' | '));
}
console.log(`\nWrote ${path.relative(process.cwd(), path.join(outDir, 'guideline_schemas.json'))}`);
