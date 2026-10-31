/**
 * schemas.js - loads the guideline schemas exported from the Clinical Guideline Studio
 * (see scripts/build_guideline_schemas.mjs). The point-of-care UI, the FHIR importer,
 * the document extractor and the decision builder are all driven by this one file,
 * so nothing here is disease-specific.
 */
const rawSchemas = require('../schemas/guideline_schemas.json');

let cache = null;

function load() {
  if (!cache) {
    const raw = rawSchemas;
    const byId = new Map(raw.guidelines.map((g) => [g.id, g]));
    cache = { raw, byId };
  }
  return cache;
}

const listGuidelines = () => load().raw.guidelines;
const getGuideline = (id) => load().byId.get(id) || null;
const findingById = (g, id) => g.findings.find((f) => f.id === id) || null;
const outcomeById = (g, id) => g.outcomes.find((o) => o.id === id) || null;
const functionById = (g, id) => (g.functions || []).find((f) => f.id === id) || null;
const valueLabel = (f, code) => f?.values.find((v) => v.code === code)?.label || code;
const isAllowedValue = (f, code) => !!f && f.values.some((v) => v.code === code);

module.exports = { listGuidelines, getGuideline, findingById, outcomeById, functionById, valueLabel, isAllowedValue };

