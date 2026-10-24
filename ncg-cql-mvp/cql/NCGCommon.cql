library NCGCommon version '0.1.0'

/*
 * Shared CQL definitions reused across every NCG pathway (CLL today;
 * Hodgkin/DLBCL/etc. in later phases). Kept in its own library per
 * standard CQL practice so disease-specific libraries `include` it
 * rather than re-deriving the same formulas.
 *
 * NOTE ON PROFILES: `using FHIR version '4.0.1'` binds this library to
 * base FHIR. Retrieves in the disease-specific libraries additionally
 * declare the NCG-Heme profile via the `code` filter's ValueSet binding
 * (see NCG_CLL_2019.cql) rather than a profile-typed retrieve, which
 * keeps this compatible with the reference cql-to-elm translator without
 * requiring a custom model-info file for the MVP. A later iteration can
 * tighten this to profile-scoped retrieves once the NCG-Heme profile
 * package (fhir-profiles/) is registered with a FHIR-aware CQL tool.
 */

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

codesystem "NCGDataProvenance": 'http://ncgindia.org/fhir/CodeSystem/ncg-data-provenance'
codesystem "NCGFindingQualifier": 'http://ncgindia.org/fhir/CodeSystem/ncg-finding-qualifier'
codesystem "NCGCytogeneticFinding": 'http://ncgindia.org/fhir/CodeSystem/ncg-cytogenetic-finding'

code "Positive": 'positive' from "NCGFindingQualifier"
code "Negative": 'negative' from "NCGFindingQualifier"
code "NotDone": 'not-done' from "NCGFindingQualifier"

code "SourceCoded": 'source-coded' from "NCGDataProvenance"
code "StructuredCapture": 'structured-capture' from "NCGDataProvenance"
code "NlpHighConfidence": 'nlp-extracted-high-confidence' from "NCGDataProvenance"
code "NlpLowConfidence": 'nlp-extracted-low-confidence' from "NCGDataProvenance"
code "Unparsed": 'unparsed' from "NCGDataProvenance"
code "Missing": 'missing' from "NCGDataProvenance"

/*
 * ---------------------------------------------------------------------
 * DATA-QUALITY GATE
 * ---------------------------------------------------------------------
 * This is the concrete "extension" this project makes to a standard
 * CQL/FHIR pathway: every disease-specific rule MUST route a value
 * through IsUsable() before branching on it. An observation whose
 * ncg-extension-data-provenance is unparsed/missing, or NLP-extracted
 * below the trust threshold, is NOT usable evidence for a decision --
 * it must fall through to a "needs review" branch instead of being
 * silently treated as absent-and-therefore-negative, or guessed.
 */
define function IsUsable(observation FHIR.Observation):
  exists (
    observation.extension E
      where E.url = 'http://ncgindia.org/fhir/StructureDefinition/ncg-extension-data-provenance'
        and (
          (E.value as FHIR.CodeableConcept) ~ "SourceCoded"
          or (E.value as FHIR.CodeableConcept) ~ "StructuredCapture"
          or (E.value as FHIR.CodeableConcept) ~ "NlpHighConfidence"
        )
  )

define function ProvenanceOf(observation FHIR.Observation):
  (First(
    observation.extension E
      where E.url = 'http://ncgindia.org/fhir/StructureDefinition/ncg-extension-data-provenance'
  )).value as FHIR.CodeableConcept

/*
 * ---------------------------------------------------------------------
 * QUALIFIER HELPERS
 * ---------------------------------------------------------------------
 */
define function IsPositive(observation FHIR.Observation):
  IsUsable(observation)
    and (observation.value as FHIR.CodeableConcept) ~ "Positive"

define function IsNegative(observation FHIR.Observation):
  IsUsable(observation)
    and (observation.value as FHIR.CodeableConcept) ~ "Negative"

define function IsNotDone(observation FHIR.Observation):
  IsUsable(observation)
    and (observation.value as FHIR.CodeableConcept) ~ "NotDone"

/*
 * ---------------------------------------------------------------------
 * DOSING / FITNESS HELPERS
 * ---------------------------------------------------------------------
 * Shared across future pathways with weight/renal-function-adjusted
 * dosing (e.g. Myeloma MM-1 melphalan dose by CrCl threshold). NOT
 * currently used by the CLL classification logic itself, but declared
 * here as the reusable library the next pathway will pull from --
 * this is the concrete shape of "extending CQL to support India health
 * systems": ordinary CQL arithmetic, made reusable, not a language change.
 */
define function CalculateBSA(heightCm Decimal, weightKg Decimal):
  // Mosteller formula: BSA (m^2) = sqrt((height_cm * weight_kg) / 3600)
  Power((heightCm * weightKg) / 3600.0, 0.5)

define function CalculateCrClCockcroftGault(ageYears Decimal, weightKg Decimal, serumCreatinineMgDl Decimal, isFemale Boolean):
  (((140 - ageYears) * weightKg) / (72 * serumCreatinineMgDl)) * (if isFemale then 0.85 else 1.0)
