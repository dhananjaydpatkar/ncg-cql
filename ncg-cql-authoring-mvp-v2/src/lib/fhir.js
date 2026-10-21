import { generateCql, csUrl } from './cql.js';

const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
const rid = (g) => g.id.toLowerCase().replace(/_/g, '-');

export function fhirLibrary(g) {
  return {
    resourceType: 'Library', id: rid(g), url: `http://ncgindia.org/fhir/Library/${g.id}`, version: g.version,
    name: g.id, title: g.title, status: g.status === 'approved' ? 'active' : 'draft',
    type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/library-type', code: 'logic-library' }] },
    date: new Date().toISOString(), publisher: g.organization, description: g.description,
    content: [{ contentType: 'text/cql', data: b64(generateCql(g)), title: `${g.id}.cql` }],
  };
}

export function fhirPlanDefinition(g) {
  return {
    resourceType: 'PlanDefinition', id: `${rid(g)}-pathway`, url: `http://ncgindia.org/fhir/PlanDefinition/${g.id}-pathway`,
    version: g.version, name: `${g.id}_Pathway`, title: g.title, status: g.status === 'approved' ? 'active' : 'draft',
    type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/plan-definition-type', code: 'clinical-protocol' }] },
    library: [`http://ncgindia.org/fhir/Library/${g.id}`], publisher: g.organization, description: g.description,
    action: g.outcomes.map((o) => ({
      title: o.label,
      description: [o.rationale, ...o.regimens.map((r) => `- ${r.name}${r.category ? ' (' + r.category + ')' : ''}`)].filter(Boolean).join('\n'),
      condition: [{ kind: 'applicability', expression: { language: 'text/cql', expression: `TreatmentGroup = '${o.id}'` } }],
    })),
  };
}

export function fhirCodeSystems(g) {
  return g.findings.map((f) => ({
    resourceType: 'CodeSystem', id: `ncg-${f.id}`, url: csUrl(f), version: g.version, name: f.id, title: f.label,
    status: 'draft', content: 'complete', publisher: g.organization,
    concept: f.values.map((v) => ({ code: v.code, display: v.label })),
  }));
}
