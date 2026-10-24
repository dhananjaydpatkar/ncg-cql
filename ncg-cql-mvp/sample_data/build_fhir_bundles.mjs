/**
 * build_fhir_bundles.mjs
 *
 * Generates standard FHIR R4 Bundles from the authoring studio guidelines
 * (NCG_LYMPHOMA_WORKUP_2020 and NCG_FL_2020) and saves them in sample_data/fhir_bundles.
 *
 * Each bundle conforms to ABDM-aligned NCG profiles and includes:
 *   - Patient resource with NDHM health identifier
 *   - Observation resources with standard/NCG code systems
 *   - ncg-extension-data-provenance extensions gating CQL IsUsable() checks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authoringDataDir = path.resolve(__dirname, '../../ncg-cql-authoring-mvp-v2/src/data');
const bundlesDir = path.resolve(__dirname, 'fhir_bundles');

fs.mkdirSync(bundlesDir, { recursive: true });
fs.mkdirSync(path.join(bundlesDir, 'lymphoma_workup'), { recursive: true });
fs.mkdirSync(path.join(bundlesDir, 'follicular'), { recursive: true });
fs.mkdirSync(path.join(bundlesDir, 'dlbcl_treatment'), { recursive: true });
fs.mkdirSync(path.join(bundlesDir, 'dlbcl_rr'), { recursive: true });

const slug = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const csUrl = (f) => f.codeSystemUrl || `http://ncgindia.org/fhir/CodeSystem/ncg-${slug(f.id)}`;

function buildBundleForTestCase(guideline, tc, index) {
  const patientId = `patient-${slug(tc.id || 'tc' + index)}`;
  const patientName = tc.name || `Test Patient ${index + 1}`;
  
  const entries = [
    {
      fullUrl: `Patient/${patientId}`,
      resource: {
        resourceType: 'Patient',
        id: patientId,
        identifier: [
          {
            system: 'https://healthid.ndhm.gov.in',
            value: `91-0000-${String(index + 1).padStart(4, '0')}-0000`,
          },
        ],
        name: [{ text: patientName }],
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>${patientName}</b> - ${tc.description || ''}</p></div>`,
        },
      },
    },
  ];

  for (const f of guideline.findings) {
    const inp = tc.inputs[f.id];
    if (!inp || !inp.value) continue;

    const valObj = f.values.find((v) => v.code === inp.value);
    const display = valObj?.label || inp.value;
    const provenance = inp.provenance || 'source-coded';
    const obsId = `obs-${slug(f.id)}-${slug(tc.id)}`;

    entries.push({
      fullUrl: `Observation/${obsId}`,
      resource: {
        resourceType: 'Observation',
        id: obsId,
        meta: {
          profile: ['http://ncgindia.org/fhir/StructureDefinition/ncg-observation-heme'],
        },
        status: provenance === 'missing' ? 'unknown' : 'final',
        subject: { reference: `Patient/${patientId}` },
        code: {
          coding: [
            {
              system: csUrl(f),
              code: inp.value,
              display,
            },
          ],
          text: `${f.label}: ${display}`,
        },
        extension: [
          {
            url: 'http://ncgindia.org/fhir/StructureDefinition/ncg-extension-data-provenance',
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://ncgindia.org/fhir/CodeSystem/ncg-data-provenance',
                  code: provenance,
                  display: provenance,
                },
              ],
            },
          },
        ],
      },
    });
  }

  return {
    resourceType: 'Bundle',
    id: `bundle-${slug(guideline.id)}-${slug(tc.id)}`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    meta: {
      tag: [
        { system: 'http://ncgindia.org/guideline', code: guideline.id },
        { system: 'http://ncgindia.org/test-case-id', code: tc.id },
        { system: 'http://ncgindia.org/expected-outcome', code: tc.expectedOutcomeId },
      ],
    },
    entry: entries,
  };
}

async function main() {
  const { NCG_LYMPHOMA_WORKUP } = await import(path.join(authoringDataDir, 'lymphoma_workup.js'));
  const { NCG_FL } = await import(path.join(authoringDataDir, 'seed.js'));
  const { NCG_DLBCL_TREATMENT } = await import(path.join(authoringDataDir, 'dlbcl_treatment.js'));
  const { NCG_DLBCL_RR } = await import(path.join(authoringDataDir, 'dlbcl_relapsed_refractory.js'));

  console.log(`Generating FHIR R4 Bundles for ${NCG_LYMPHOMA_WORKUP.title}...`);
  const lymphomaSummary = [];
  NCG_LYMPHOMA_WORKUP.testCases.forEach((tc, idx) => {
    const bundle = buildBundleForTestCase(NCG_LYMPHOMA_WORKUP, tc, idx);
    const filename = `${String(idx + 1).padStart(2, '0')}_${slug(tc.id)}_${slug(tc.name)}.json`;
    const filepath = path.join(bundlesDir, 'lymphoma_workup', filename);
    fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2), 'utf8');
    lymphomaSummary.push({
      index: idx + 1,
      id: tc.id,
      name: tc.name,
      expectedOutcome: tc.expectedOutcomeId,
      filename,
    });
  });
  console.log(`Saved ${lymphomaSummary.length} bundles to sample_data/fhir_bundles/lymphoma_workup/`);

  console.log(`Generating FHIR R4 Bundles for ${NCG_FL.title}...`);
  const flSummary = [];
  NCG_FL.testCases.forEach((tc, idx) => {
    const bundle = buildBundleForTestCase(NCG_FL, tc, idx);
    const filename = `${String(idx + 1).padStart(2, '0')}_${slug(tc.id)}_${slug(tc.name)}.json`;
    const filepath = path.join(bundlesDir, 'follicular', filename);
    fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2), 'utf8');
    flSummary.push({
      index: idx + 1,
      id: tc.id,
      name: tc.name,
      expectedOutcome: tc.expectedOutcomeId,
      filename,
    });
  });
  console.log(`Saved ${flSummary.length} bundles to sample_data/fhir_bundles/follicular/`);

  console.log(`Generating FHIR R4 Bundles for ${NCG_DLBCL_TREATMENT.title}...`);
  const dlbclSummary = [];
  NCG_DLBCL_TREATMENT.testCases.forEach((tc, idx) => {
    const bundle = buildBundleForTestCase(NCG_DLBCL_TREATMENT, tc, idx);
    const filename = `${String(idx + 1).padStart(2, '0')}_${slug(tc.id)}_${slug(tc.name)}.json`;
    const filepath = path.join(bundlesDir, 'dlbcl_treatment', filename);
    fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2), 'utf8');
    dlbclSummary.push({
      index: idx + 1,
      id: tc.id,
      name: tc.name,
      expectedOutcome: tc.expectedOutcomeId,
      filename,
    });
  });
  console.log(`Saved ${dlbclSummary.length} bundles to sample_data/fhir_bundles/dlbcl_treatment/`);

  console.log(`Generating FHIR R4 Bundles for ${NCG_DLBCL_RR.title}...`);
  const rrSummary = [];
  NCG_DLBCL_RR.testCases.forEach((tc, idx) => {
    const bundle = buildBundleForTestCase(NCG_DLBCL_RR, tc, idx);
    const filename = `${String(idx + 1).padStart(2, '0')}_${slug(tc.id)}_${slug(tc.name)}.json`;
    const filepath = path.join(bundlesDir, 'dlbcl_rr', filename);
    fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2), 'utf8');
    rrSummary.push({
      index: idx + 1,
      id: tc.id,
      name: tc.name,
      expectedOutcome: tc.expectedOutcomeId,
      filename,
    });
  });
  console.log(`Saved ${rrSummary.length} bundles to sample_data/fhir_bundles/dlbcl_rr/`);

  // Write manifest file
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceGuidelines: [
      { id: NCG_LYMPHOMA_WORKUP.id, version: NCG_LYMPHOMA_WORKUP.version, count: lymphomaSummary.length, testCases: lymphomaSummary },
      { id: NCG_FL.id, version: NCG_FL.version, count: flSummary.length, testCases: flSummary },
      { id: NCG_DLBCL_TREATMENT.id, version: NCG_DLBCL_TREATMENT.version, count: dlbclSummary.length, testCases: dlbclSummary },
      { id: NCG_DLBCL_RR.id, version: NCG_DLBCL_RR.version, count: rrSummary.length, testCases: rrSummary },
    ],
  };
  fs.writeFileSync(path.join(bundlesDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Manifest written to sample_data/fhir_bundles/manifest.json');
}


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
