/*
 * PRODUCTION INTEGRATION PATH (not runnable in this sandbox -- see below)
 * ---------------------------------------------------------------------
 * This is the real HL7 CQL execution path that engine/cql_lite_fl.py
 * stands in for. It is not wired into run_pipeline.py because building
 * it requires two things this sandboxed environment doesn't have network
 * access to:
 *
 *   1. The HL7 cql-to-elm translator (JVM-based; cqframework/
 *      clinical_quality_language releases, typically pulled via Maven
 *      Central or a hosted cql-translation-service) to compile
 *      cql/NCGCommon.cql and cql/NCG_FL_2020.cql into ELM JSON.
 *   2. `npm install cql-execution cql-exec-fhir` (these packages
 *      themselves ARE reachable from this sandbox via the npm registry --
 *      it's step 1, the translator, that isn't).
 *
 * Once elm/NCGCommon.json and elm/NCG_FL_2020.json exist (produced by
 * step 1, wherever the translator runs), the execution call looks like
 * this:
 *
 *   const { Repository, Executor } = require('cql-execution');
 *   const { FhirPatientSource } = require('cql-exec-fhir');
 *
 *   const elmFiles = {
 *     NCGCommon: require('../../elm/NCGCommon.json'),
 *     NCG_FL_2020: require('../../elm/NCG_FL_2020.json'),
 *   };
 *
 *   const repository = new Repository(elmFiles);
 *   const library = repository.resolve('NCG_FL_2020', '0.1.0');
 *   const executor = new Executor(library, repository.getCodeService());
 *
 *   const patientSource = FhirPatientSource.FHIRv401();
 *   patientSource.loadBundles([fhirBundleJson]); // from fhir_mapping/mapper.py
 *
 *   const results = executor.exec(patientSource);
 *   // results[<patientId>]['TreatmentGroup']
 *   // results[<patientId>]['RecommendedRegimens']
 *   // results[<patientId>]['ClassificationRationale']
 *
 * Swapping this in: change EVALUATE_VIA in engine/run_pipeline.py to
 * "cql_execution" and replace the classify_fl() call with a subprocess
 * or HTTP call into a small Node service wrapping the block above.
 * Nothing else in the pipeline (extraction, FHIR mapping, terminology)
 * needs to change -- the ELM execution result shape mirrors
 * FLClassificationResult's fields by name.
 */

throw new Error(
  "Not runnable in this sandbox: requires ELM compiled from cql/*.cql " +
  "via the HL7 cql-to-elm translator, which needs Maven Central / JVM " +
  "access not available in this build environment. See the comment " +
  "block above for the intended integration once that access exists."
);
