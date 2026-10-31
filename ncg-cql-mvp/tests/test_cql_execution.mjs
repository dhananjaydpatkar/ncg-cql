/**
 * test_cql_execution.mjs
 *
 * Automated regression test suite for HL7 CQL execution on synthetic FHIR R4 bundles.
 * Tests generated CQL libraries (NCG_LYMPHOMA_WORKUP_2020 and NCG_FL_2020)
 * against sample FHIR Bundles in sample_data/fhir_bundles.
 *
 * Run via: node tests/test_cql_execution.mjs
 * Or: npm test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { evaluateBundle } = require('../engine/js/evaluate_via_cql_execution.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlesDir = path.resolve(__dirname, '../sample_data/fhir_bundles');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runLymphomaTests() {
  console.log('\n============================================================');
  console.log('Testing NCG_LYMPHOMA_WORKUP_2020 (Lymphoma Workup Flowchart)');
  console.log('============================================================');

  const dir = path.join(bundlesDir, 'lymphoma_workup');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

  for (const file of files) {
    const bundlePath = path.join(dir, file);
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
    const expTag = bundle.meta?.tag?.find((t) => t.system === 'http://ncgindia.org/expected-outcome');
    const expected = expTag?.code;

    const report = await evaluateBundle(bundle, 'NCG_LYMPHOMA_WORKUP_2020', '1.2.0');
    const matched = report.treatment_group === expected;
    assert(matched, `${file.slice(0, 32)} -> ${report.treatment_group} (expected: ${expected})`);
  }

  // Deep inspection on specific clinical cases
  console.log('\n--- Specific Clinical Scenario Checks (Lymphoma) ---');

  // Case 17: DLBCL with aaIPI calculation
  const tc17Path = path.join(dir, files.find((f) => f.includes('tc17')));
  const tc17Bundle = JSON.parse(fs.readFileSync(tc17Path, 'utf8'));
  const rep17 = await evaluateBundle(tc17Bundle, 'NCG_LYMPHOMA_WORKUP_2020', '1.2.0');
  assert(rep17.calculated_scores.aaIPI.score === 2, 'Case 17: aaIPI score calculated as 2 (Stage IV + elevated LDH)');
  assert(rep17.calculated_scores.aaIPI.riskGroup === 'high-intermediate', 'Case 17: aaIPI risk group classified as high-intermediate');
  assert(rep17.calculated_scores.IPI.score === 2, 'Case 17: Standard IPI score calculated as 2');

  // Case 10: Unparsed referral note safety gate
  const tc10Path = path.join(dir, files.find((f) => f.includes('tc10')));
  const tc10Bundle = JSON.parse(fs.readFileSync(tc10Path, 'utf8'));
  const rep10 = await evaluateBundle(tc10Bundle, 'NCG_LYMPHOMA_WORKUP_2020', '1.2.0');
  assert(rep10.treatment_group === 'needs-review', 'Case 10: Unparsed referral text triggers needs-review');
  assert(rep10.requires_human_review === true, 'Case 10: Requires human review is true');
  assert(rep10.calculated_scores.aaIPI.score === null, 'Case 10: aaIPI score is null due to missing/unverified inputs');

  // Case 16: High-dose MTX in older adult
  const tc16Path = path.join(dir, files.find((f) => f.includes('tc16')));
  const tc16Bundle = JSON.parse(fs.readFileSync(tc16Path, 'utf8'));
  const rep16 = await evaluateBundle(tc16Bundle, 'NCG_LYMPHOMA_WORKUP_2020', '1.2.0');
  assert(rep16.treatment_group === 'pathway-high-dose-mtx-dtpa', 'Case 16: Age > 40 on high-dose MTX triggers DTPA-GFR clearance protocol');
  assert(rep16.recommended_regimens.some((r) => r.includes('DTPA GFR')), 'Case 16: DTPA GFR clearance regimen included');
}

async function runFollicularTests() {
  console.log('\n============================================================');
  console.log('Testing NCG_FL_2020 (Follicular Lymphoma First-Line Pathway)');
  console.log('============================================================');

  const dir = path.join(bundlesDir, 'follicular');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

  for (const file of files) {
    const bundlePath = path.join(dir, file);
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
    const expTag = bundle.meta?.tag?.find((t) => t.system === 'http://ncgindia.org/expected-outcome');
    const expected = expTag?.code;

    const report = await evaluateBundle(bundle, 'NCG_FL_2020', '0.2.0');
    const matched = report.treatment_group === expected;
    assert(matched, `${file.slice(0, 32)} -> ${report.treatment_group} (expected: ${expected})`);
  }

  // Deep inspection on specific FL cases
  console.log('\n--- Specific Clinical Scenario Checks (Follicular) ---');
  
  // Case t1: Advanced high burden fit
  const t1Path = path.join(dir, files.find((f) => f.includes('t1')));
  const rep1 = await evaluateBundle(JSON.parse(fs.readFileSync(t1Path, 'utf8')), 'NCG_FL_2020', '0.2.0');
  assert(rep1.treatment_group === 'advanced-high-burden-systemic', 'FL t1: Routes to systemic chemoimmunotherapy');
  assert(rep1.recommended_regimens.some((r) => r.includes('Bendamustine')), 'FL t1: BR regimen recommended');

  // Case t4: Unparsed histology safety
  const t4Path = path.join(dir, files.find((f) => f.includes('t4')));
  const rep4 = await evaluateBundle(JSON.parse(fs.readFileSync(t4Path, 'utf8')), 'NCG_FL_2020', '0.2.0');
  assert(rep4.treatment_group === 'needs-review', 'FL t4: Unparsed histology triggers needs-review safety gate');
  assert(rep4.requires_human_review === true, 'FL t4: Requires human review is true');

  // Case t6: Transformed to DLBCL
  const t6Path = path.join(dir, files.find((f) => f.includes('t6')));
  const rep6 = await evaluateBundle(JSON.parse(fs.readFileSync(t6Path, 'utf8')), 'NCG_FL_2020', '0.2.0');
  assert(rep6.treatment_group === 'treat-as-dlbcl', 'FL t6: Transformed disease treated as aggressive DLBCL');
}

async function runDlbclTreatmentTests() {
  console.log('\n============================================================');
  console.log('Testing NCG_DLBCL_TREATMENT_2020 (DLBCL & PMBCL First-Line)');
  console.log('============================================================');

  const dir = path.join(bundlesDir, 'dlbcl_treatment');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

  for (const file of files) {
    const bundlePath = path.join(dir, file);
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
    const expTag = bundle.meta?.tag?.find((t) => t.system === 'http://ncgindia.org/expected-outcome');
    const expected = expTag?.code;

    const report = await evaluateBundle(bundle, 'NCG_DLBCL_TREATMENT_2020', '1.0.0');
    const matched = report.treatment_group === expected;
    assert(matched, `${file.slice(0, 32)} -> ${report.treatment_group} (expected: ${expected})`);
  }
}

async function runDlbclRrTests() {
  console.log('\n============================================================');
  console.log('Testing NCG_DLBCL_RR_2020 (Relapsed/Refractory DLBCL Pathways)');
  console.log('============================================================');

  const dir = path.join(bundlesDir, 'dlbcl_rr');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

  for (const file of files) {
    const bundlePath = path.join(dir, file);
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
    const expTag = bundle.meta?.tag?.find((t) => t.system === 'http://ncgindia.org/expected-outcome');
    const expected = expTag?.code;

    const report = await evaluateBundle(bundle, 'NCG_DLBCL_RR_2020', '1.0.0');
    const matched = report.treatment_group === expected;
    assert(matched, `${file.slice(0, 32)} -> ${report.treatment_group} (expected: ${expected})`);
  }
}

async function main() {
  console.log('Running HL7 CQL Execution Test Suite...');
  await runLymphomaTests();
  await runFollicularTests();
  await runDlbclTreatmentTests();
  await runDlbclRrTests();

  console.log('\n============================================================');
  console.log(`Results: ${passedTests} passed, ${failedTests} failed (${totalTests} total)`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

