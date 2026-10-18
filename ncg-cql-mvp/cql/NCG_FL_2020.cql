library NCG_FL_2020 version '0.1.0'

/*
 * =====================================================================
 * National Cancer Grid (NCG) India - Follicular Lymphoma Guideline
 * Source: NCG Adult Hematolymphoid Management Guidelines:
 *   - Follicular Lymphoma Treatment Workflow Flowchart (pp. 1-8)
 *   - Lymphoma Workup Flowchart & Prognostic Scoring (FLIPI / GELF)
 *
 * Scope: Evaluates Histological Grade (Grade I/II/IIIa vs IIIb vs Duodenal),
 * Ann Arbor Staging (I-IV + Contiguity), GELF Tumour Burden Criteria,
 * Bone Marrow clearance, and Patient Fitness to determine guideline-directed
 * treatment groups and regimen options.
 *
 * Data-Provenance aware: Flags unverified referral lab findings via
 * NCGCommon.IsUsable() to prevent unverified data driving treatment.
 * =====================================================================
 */

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers
include NCGCommon version '0.1.0' called NCGCommon

codesystem "NCGLymphomaHistology": 'http://ncgindia.org/fhir/CodeSystem/ncg-lymphoma-histology'
codesystem "NCGAnnArborStage": 'http://ncgindia.org/fhir/CodeSystem/ncg-ann-arbor-stage'
codesystem "NCGStage2Contiguity": 'http://ncgindia.org/fhir/CodeSystem/ncg-stage-2-contiguity'
codesystem "NCGGelfTumourBurden": 'http://ncgindia.org/fhir/CodeSystem/ncg-gelf-tumour-burden'
codesystem "NCGClinicalFlag": 'http://ncgindia.org/fhir/CodeSystem/ncg-clinical-flag'

// Histology & Grade
code "FlGrade12Finding": 'fl-grade-1-2' from "NCGLymphomaHistology"
code "FlGrade3aFinding": 'fl-grade-3a' from "NCGLymphomaHistology"
code "FlGrade3bFinding": 'fl-grade-3b' from "NCGLymphomaHistology"
code "FlDuodenalFinding": 'fl-duodenal' from "NCGLymphomaHistology"
code "TransformedDlbclFinding": 'transformed-dlbcl' from "NCGLymphomaHistology"

// Ann Arbor Staging
code "Stage1Finding": 'stage-1' from "NCGAnnArborStage"
code "Stage2Finding": 'stage-2' from "NCGAnnArborStage"
code "Stage3Finding": 'stage-3' from "NCGAnnArborStage"
code "Stage4Finding": 'stage-4' from "NCGAnnArborStage"

// Stage II Contiguity
code "ContiguousFinding": 'contiguous' from "NCGStage2Contiguity"
code "NonContiguousFinding": 'non-contiguous' from "NCGStage2Contiguity"

// GELF Tumour Burden
code "GelfHighBurdenFinding": 'high-burden' from "NCGGelfTumourBurden"
code "GelfLowBurdenFinding": 'low-burden' from "NCGGelfTumourBurden"

// Clinical & Fitness Flags
code "FitForBendamustineFlag": 'fit-for-bendamustine' from "NCGClinicalFlag"
code "FitForAnthracyclineFlag": 'fit-for-anthracycline' from "NCGClinicalFlag"
code "FitForRadiotherapyFlag": 'fit-for-radiotherapy' from "NCGClinicalFlag"
code "BoneMarrowClearedFlag": 'bone-marrow-cleared' from "NCGClinicalFlag"
code "HighLdhOrProliferationFlag": 'high-ldh-or-proliferation' from "NCGClinicalFlag"
code "BSymptomsPresentFlag": 'b-symptoms-present' from "NCGClinicalFlag"
code "BulkyMassGt7cmFlag": 'bulky-mass-gt-7cm' from "NCGClinicalFlag"
code "CytopeniasGelfFlag": 'cytopenias-gelf' from "NCGClinicalFlag"

context Patient

/*
 * ---------------------------------------------------------------------
 * RETRIEVES: SYNOPTIC OBSERVATIONS WITH PROVENANCE
 * ---------------------------------------------------------------------
 */
define "HistologyObservation":
  singleton from ([Observation: "FlGrade12Finding"]
    union [Observation: "FlGrade3aFinding"]
    union [Observation: "FlGrade3bFinding"]
    union [Observation: "FlDuodenalFinding"]
    union [Observation: "TransformedDlbclFinding"])

define "StageObservation":
  singleton from ([Observation: "Stage1Finding"]
    union [Observation: "Stage2Finding"]
    union [Observation: "Stage3Finding"]
    union [Observation: "Stage4Finding"])

define "Stage2ContiguityObservation":
  singleton from ([Observation: "ContiguousFinding"]
    union [Observation: "NonContiguousFinding"])

define "GelfBurdenObservation":
  singleton from ([Observation: "GelfHighBurdenFinding"]
    union [Observation: "GelfLowBurdenFinding"])

define "FitForBendamustineObservation":
  singleton from ([Observation: "FitForBendamustineFlag"])

define "FitForAnthracyclineObservation":
  singleton from ([Observation: "FitForAnthracyclineFlag"])

define "FitForRadiotherapyObservation":
  singleton from ([Observation: "FitForRadiotherapyFlag"])

define "BoneMarrowClearedObservation":
  singleton from ([Observation: "BoneMarrowClearedFlag"])

define "HighLdhOrProliferationObservation":
  singleton from ([Observation: "HighLdhOrProliferationFlag"])

/*
 * ---------------------------------------------------------------------
 * DATA USABILITY / PROVENANCE GATES
 * ---------------------------------------------------------------------
 */
define "HistologyStatusKnown":
  "HistologyObservation" is not null and NCGCommon.IsUsable("HistologyObservation")

define "StageStatusKnown":
  "StageObservation" is not null and NCGCommon.IsUsable("StageObservation")

define "GelfBurdenKnown":
  "GelfBurdenObservation" is not null and NCGCommon.IsUsable("GelfBurdenObservation")

define "BoneMarrowAssessed":
  "BoneMarrowClearedObservation" is not null and NCGCommon.IsUsable("BoneMarrowClearedObservation")

/*
 * ---------------------------------------------------------------------
 * SUBTYPE & GRADE BRANCHES
 * ---------------------------------------------------------------------
 */
define "IsTransformedDlbcl":
  "HistologyStatusKnown"
    and ("HistologyObservation".code.coding[0].code = 'transformed-dlbcl')

define "IsGrade3b":
  "HistologyStatusKnown"
    and ("HistologyObservation".code.coding[0].code = 'fl-grade-3b')

define "IsDuodenalFL":
  "HistologyStatusKnown"
    and ("HistologyObservation".code.coding[0].code = 'fl-duodenal')

define "IsLowGradeFL":
  "HistologyStatusKnown"
    and ("HistologyObservation".code.coding[0].code in { 'fl-grade-1-2', 'fl-grade-3a' })

/*
 * ---------------------------------------------------------------------
 * STAGE BRANCHES
 * ---------------------------------------------------------------------
 */
define "IsStage1":
  "StageStatusKnown" and ("StageObservation".code.coding[0].code = 'stage-1')

define "IsStage2":
  "StageStatusKnown" and ("StageObservation".code.coding[0].code = 'stage-2')

define "IsAdvancedStage":
  "StageStatusKnown" and ("StageObservation".code.coding[0].code in { 'stage-3', 'stage-4' })

define "IsContiguousStage2":
  "Stage2ContiguityObservation" is not null
    and NCGCommon.IsUsable("Stage2ContiguityObservation")
    and ("Stage2ContiguityObservation".code.coding[0].code = 'contiguous')

/*
 * ---------------------------------------------------------------------
 * TUMOUR BURDEN (GELF CRITERIA)
 * ---------------------------------------------------------------------
 */
define "IsHighTumourBurden":
  "GelfBurdenKnown" and ("GelfBurdenObservation".code.coding[0].code = 'high-burden')

define "IsLowTumourBurden":
  "GelfBurdenKnown" and ("GelfBurdenObservation".code.coding[0].code = 'low-burden')

/*
 * ---------------------------------------------------------------------
 * FITNESS & CLINICAL MODIFIERS
 * ---------------------------------------------------------------------
 */
define "IsFitForRT":
  "FitForRadiotherapyObservation" is not null
    and NCGCommon.IsUsable("FitForRadiotherapyObservation")
    and ("FitForRadiotherapyObservation".value as FHIR.boolean).value

define "IsFitForBendamustine":
  "FitForBendamustineObservation" is not null
    and NCGCommon.IsUsable("FitForBendamustineObservation")
    and ("FitForBendamustineObservation".value as FHIR.boolean).value

define "IsFitForAnthracycline":
  "FitForAnthracyclineObservation" is not null
    and NCGCommon.IsUsable("FitForAnthracyclineObservation")
    and ("FitForAnthracyclineObservation".value as FHIR.boolean).value

define "IsHighLdhOrAggressive":
  "HighLdhOrProliferationObservation" is not null
    and NCGCommon.IsUsable("HighLdhOrProliferationObservation")
    and ("HighLdhOrProliferationObservation".value as FHIR.boolean).value

/*
 * ---------------------------------------------------------------------
 * TREATMENT GROUP CLASSIFICATION
 * Evaluates NCG Follicular Lymphoma Workflow (pp. 1-8).
 * Any missing or unparsed gate falls through to 'needs-review'.
 * ---------------------------------------------------------------------
 */
define "TreatmentGroup":
  case
    when not "HistologyStatusKnown" then 'needs-review'
    when "IsTransformedDlbcl" then 'transformed-dlbcl'
    when "IsGrade3b" then 'grade-3b-dlbcl'
    when "IsDuodenalFL" and "IsHighTumourBurden" then 'duodenal-symptomatic'
    when "IsDuodenalFL" and not "IsHighTumourBurden" then 'duodenal-asymptomatic'
    when not "IsLowGradeFL" then 'needs-review'
    when not "StageStatusKnown" then 'needs-review'
    when "IsStage1" and not "BoneMarrowAssessed" then 'needs-review'
    when "IsStage1" and "IsFitForRT" then 'stage-1-rt-fit'
    when "IsStage1" and not "IsFitForRT" then 'stage-1-rt-unsuitable'
    when "IsStage2" and not "BoneMarrowAssessed" then 'needs-review'
    when "IsStage2" and "IsContiguousStage2" then 'stage-2-contiguous'
    when "IsStage2" and not "IsContiguousStage2" then 'stage-2-non-contiguous'
    when "IsAdvancedStage" and not "GelfBurdenKnown" then 'needs-review'
    when "IsAdvancedStage" and "IsLowTumourBurden" then 'advanced-low-burden'
    when "IsAdvancedStage" and "IsHighTumourBurden" and "IsHighLdhOrAggressive" and "IsFitForAnthracycline" then 'advanced-high-burden-rchop'
    when "IsAdvancedStage" and "IsHighTumourBurden" and "IsFitForBendamustine" then 'advanced-high-burden-br'
    when "IsAdvancedStage" and "IsHighTumourBurden" and not "IsFitForBendamustine" then 'advanced-high-burden-rlen'
    else 'needs-review'
  end

/*
 * ---------------------------------------------------------------------
 * RECOMMENDED REGIMENS
 * ---------------------------------------------------------------------
 */
define "RecommendedRegimens":
  case "TreatmentGroup"
    when 'stage-1-rt-fit' then {
      'ISRT (Involved-site RT) 24 Gy [Optimal]',
      'IFRT (Involved-field RT) 24 Gy [Essential]'
    }
    when 'stage-1-rt-unsuitable' then {
      'Watchful waiting (Low-volume / high-risk toxicity site) [Optional]',
      'Single-agent Rituximab (375 mg/m2 weekly x 4 doses) [Optional]'
    }
    when 'stage-2-contiguous' then {
      'IFRT 24 Gy [Optimal]',
      'Watchful waiting (if low-volume disease) [Optimal]',
      'Single-agent Rituximab (375 mg/m2 weekly x 4) [Optimal]'
    }
    when 'stage-2-non-contiguous' then {
      'Observation / Watchful waiting [Preferred if low-volume]',
      'Single-agent Rituximab (375 mg/m2 weekly x 4) [Optimal]'
    }
    when 'advanced-low-burden' then {
      'Watchful waiting / Active surveillance [Optimal]',
      'Single-agent Rituximab x 4 doses (if patient declines observation) [Optional]'
    }
    when 'advanced-high-burden-br' then {
      'BR (Bendamustine + Rituximab) x 6 cycles [Optimal / Preferred]'
    }
    when 'advanced-high-burden-rchop' then {
      'R-CHOP x 6 cycles [Optimal - high LDH / high proliferation / aggressive features]'
    }
    when 'advanced-high-burden-rlen' then {
      'R + Lenalidomide (Induction 6 cycles -> Response-guided maintenance) [Optimal for bendamustine-unfit]'
    }
    when 'advanced-high-burden-frail' then {
      'Single-agent Rituximab x 4 doses + maintenance every 2 months x 12 months [Palliative]'
    }
    when 'grade-3b-dlbcl' then {
      'R-CHOP protocol (Treat as DLBCL)'
    }
    when 'transformed-dlbcl' then {
      'R-CHOP x 6 cycles -> Autologous Stem Cell Transplant (ASCT) [Optimal]'
    }
    when 'duodenal-asymptomatic' then {
      'Observation / Watchful waiting [Optimal]',
      'Endoscopic mucosal resection (if technically feasible)'
    }
    when 'duodenal-symptomatic' then {
      'Single-agent Rituximab (375 mg/m2 weekly x 4) [Optimal]',
      'ISRT 24 Gy [Optimal]'
    }
    else { }
  end

/*
 * ---------------------------------------------------------------------
 * CLASSIFICATION RATIONALE (Audit trail for clinical verification)
 * ---------------------------------------------------------------------
 */
define "ClassificationRationale":
  {
    'histology: ' + (if "HistologyStatusKnown" then "HistologyObservation".code.coding[0].code else 'unusable / missing'),
    'stage: ' + (if "StageStatusKnown" then "StageObservation".code.coding[0].code else 'unusable / missing'),
    'gelf_tumour_burden: ' + (if "GelfBurdenKnown" then "GelfBurdenObservation".code.coding[0].code else 'not assessed / unparsed'),
    'bone_marrow_cleared: ' + (if "BoneMarrowAssessed" then ("BoneMarrowClearedObservation".value as FHIR.boolean).value.ToString() else 'not done / unverified'),
    'fit_for_bendamustine: ' + (if "FitForBendamustineObservation" is not null and NCGCommon.IsUsable("FitForBendamustineObservation") then ("FitForBendamustineObservation".value as FHIR.boolean).value.ToString() else 'unknown')
  }
