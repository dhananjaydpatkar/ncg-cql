/**
 * evaluate_via_cql_execution.js
 *
 * Production HL7 CQL execution module for Clinical Practice Guidelines.
 * Evaluates ABDM-aligned FHIR R4 Bundles against compiled ELM libraries
 * using the official HL7 cql-execution and cql-exec-fhir engines.
 *
 * Can be imported as a CommonJS module or run directly via CLI:
 *   node engine/js/evaluate_via_cql_execution.js <path-to-fhir-bundle.json> [libraryId] [version]
 */

const { Repository, Executor, CodeService } = require('cql-execution');
const { PatientSource } = require('cql-exec-fhir');

const ELM_FHIRHelpers = require('../../elm/FHIRHelpers.json');
const ELM_NCGCommon = require('../../elm/NCGCommon.json');
const ELM_NCG_DLBCL_RR_2020 = require('../../elm/NCG_DLBCL_RR_2020.json');
const ELM_NCG_DLBCL_TREATMENT_2020 = require('../../elm/NCG_DLBCL_TREATMENT_2020.json');
const ELM_NCG_FL_2020 = require('../../elm/NCG_FL_2020.json');
const ELM_NCG_LYMPHOMA_WORKUP_2020 = require('../../elm/NCG_LYMPHOMA_WORKUP_2020.json');

const BUILTIN_LIBS = {
  FHIRHelpers: ELM_FHIRHelpers,
  NCGCommon: ELM_NCGCommon,
  NCG_DLBCL_RR_2020: ELM_NCG_DLBCL_RR_2020,
  NCG_DLBCL_TREATMENT_2020: ELM_NCG_DLBCL_TREATMENT_2020,
  NCG_FL_2020: ELM_NCG_FL_2020,
  NCG_LYMPHOMA_WORKUP_2020: ELM_NCG_LYMPHOMA_WORKUP_2020,
};

const nodeRequire = typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function' ? (id) => process.getBuiltinModule(id) : null;
let _cachedRepo = null;

function getRepository() {
  if (_cachedRepo) return _cachedRepo;
  _cachedRepo = new Repository(BUILTIN_LIBS);
  return _cachedRepo;
}

/**
 * Detect the guideline library to use based on bundle metadata or content
 */
function detectLibrary(bundle, repository) {
  // 1. Check meta.tag for guideline ID
  const tags = bundle.meta?.tag || [];
  const gTag = tags.find((t) => t.system === 'http://ncgindia.org/guideline');
  if (gTag && gTag.code) {
    return { id: gTag.code, version: null };
  }

  // 2. Fall back to NCG_LYMPHOMA_WORKUP_2020 if available, else NCG_FL_2020
  if (repository.libraries['NCG_LYMPHOMA_WORKUP_2020']) {
    return { id: 'NCG_LYMPHOMA_WORKUP_2020', version: '1.2.0' };
  }
  return { id: 'NCG_FL_2020', version: '0.2.0' };
}

/**
 * Evaluates a single FHIR Bundle against a CQL library.
 *
 * @param {Object} bundle - FHIR R4 Bundle (type: collection)
 * @param {string} [libraryId] - ID of CQL library (e.g. 'NCG_LYMPHOMA_WORKUP_2020')
 * @param {string} [version] - Library version (e.g. '1.2.0')
 * @param {Object} [options] - Optional settings
 * @returns {Promise<Object>} Execution report
 */
async function evaluateBundle(bundle, libraryId, version, options = {}) {
  const repository = getRepository(options.elmDir);

  if (!libraryId) {
    const detected = detectLibrary(bundle, repository);
    libraryId = detected.id;
    version = version || detected.version;
  }

  const library = version ? repository.resolve(libraryId, version) : repository.resolve(libraryId);
  if (!library) {
    throw new Error(`Could not resolve CQL library '${libraryId}' (version: ${version || 'latest'})`);
  }

  const executor = new Executor(library, new CodeService({}));
  const patientSource = PatientSource.FHIRv401();
  patientSource.loadBundles([bundle]);

  const rawResults = await executor.exec(patientSource);
  const patientIds = Object.keys(rawResults.patientResults);
  if (patientIds.length === 0) {
    throw new Error('No patient found in FHIR bundle');
  }

  const patientId = patientIds[0];
  const p = rawResults.patientResults[patientId];

  // Extract calculated score functions
  const calculatedScores = {};
  const scoreKeys = ['aaIPI', 'IPI', 'FLIPI', 'MIPI', 'CLLIPI', 'IPS', 'MALT_IPI', 'PIT'];
  for (const sk of scoreKeys) {
    if (`${sk}_Score` in p) {
      calculatedScores[sk] = {
        score: p[`${sk}_Score`],
        riskGroup: p[`${sk}_RiskGroup`] || null,
        riskLabel: p[`${sk}_RiskLabel`] || null,
      };
    }
  }

  // Filter out internal and helper expression results for clean output
  const clinicalExpressions = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === 'Patient') continue;
    if (k.endsWith('Observation') || k.endsWith('Usable') || k.endsWith('Known') || k.endsWith('Value')) continue;
    clinicalExpressions[k] = v;
  }

  // Check data provenance safety gate
  const unparsedFindings = [];
  for (const [k, v] of Object.entries(p)) {
    if (k.endsWith('Observation') && v) {
      const findingBase = k.replace(/Observation$/, '');
      const usable = p[`${findingBase}Usable`];
      if (usable === false) {
        unparsedFindings.push(findingBase);
      }
    }
  }

  return {
    patientId,
    library: {
      id: libraryId,
      version: library.source?.library?.identifier?.version || version,
    },
    treatment_group: p.TreatmentGroup || 'needs-review',
    recommended_regimens: p.RecommendedRegimens || [],
    rationale: p.ClassificationRationale || [],
    calculated_scores: calculatedScores,
    data_quality_warnings: unparsedFindings.map((f) => `Finding '${f}' has unverified data provenance (failed IsUsable safety gate).`),
    requires_human_review: p.TreatmentGroup === 'needs-review' || unparsedFindings.length > 0,
    all_expressions: clinicalExpressions,
  };
}

// CLI handler if executed directly
if (typeof require !== 'undefined' && require.main === module && nodeRequire) {
  const fs = nodeRequire('fs');
  const path = nodeRequire('path');
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: node engine/js/evaluate_via_cql_execution.js <bundle.json> [libraryId] [version]

Examples:
  node engine/js/evaluate_via_cql_execution.js sample_data/fhir_bundles/lymphoma_workup/17_tc17_advanced-dlbcl-in-48m-with-high-aaipi-score-2-ldh-stage-iv.json
  node engine/js/evaluate_via_cql_execution.js sample_data/fhir_bundles/follicular/01_t1_advanced-high-burden-fit.json NCG_FL_2020 0.2.0
`);
    process.exit(0);
  }

  const isJson = args.includes('--json');
  const positional = args.filter((a) => !a.startsWith('--'));

  let bundle;
  let sourceDesc;
  if (positional[0] === '-') {
    sourceDesc = 'standard input';
    bundle = JSON.parse(fs.readFileSync(0, 'utf8'));
  } else {
    const bundlePath = path.resolve(positional[0]);
    if (!fs.existsSync(bundlePath)) {
      console.error(`Error: Bundle file not found at ${bundlePath}`);
      process.exit(1);
    }
    sourceDesc = bundlePath;
    bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  }

  const libraryId = positional[1] || null;
  const version = positional[2] || null;

  evaluateBundle(bundle, libraryId, version)
    .then((report) => {
      if (isJson) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      console.log('='.repeat(78));
      console.log('Clinical Pathway - CQL Recommendation Report');
      console.log('Source Bundle :', sourceDesc);
      console.log('Patient ID    :', report.patientId);
      console.log('CQL Library   :', `${report.library.id} v${report.library.version}`);
      console.log('='.repeat(78));
      console.log(`Treatment Group : ${report.treatment_group.toUpperCase()}`);
      
      console.log('\nRecommended Regimens / Next Steps:');
      if (report.recommended_regimens.length === 0) {
        console.log('  (None - requires multidisciplinary clinician review)');
      } else {
        report.recommended_regimens.forEach((r) => console.log(`  - ${r}`));
      }

      if (Object.keys(report.calculated_scores).length > 0) {
        console.log('\nCalculated Prognostic Scores:');
        for (const [name, sc] of Object.entries(report.calculated_scores)) {
          if (sc.score !== null) {
            console.log(`  - ${name.padEnd(8)}: Score ${sc.score} | Risk Group: ${sc.riskGroup} (${sc.riskLabel || ''})`);
          } else {
            console.log(`  - ${name.padEnd(8)}: null (missing / unparsed inputs)`);
          }
        }
      }

      if (report.data_quality_warnings.length > 0) {
        console.log('\nData Quality & Provenance Warnings:');
        report.data_quality_warnings.forEach((w) => console.log(`  ⚠ ${w}`));
      }

      console.log(`\nRequires Human Review: ${report.requires_human_review ? 'YES' : 'NO'}`);
      console.log('='.repeat(78));
    })
    .catch((err) => {
      console.error('CQL Execution Failed:', err);
      process.exit(1);
    });
}

module.exports = {
  getRepository,
  evaluateBundle,
};
