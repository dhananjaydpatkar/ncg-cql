"""
Reference evaluator for cql/NCGCommon.cql + cql/NCG_FL_2020.cql.

Hand-written, define-for-define Python mirror of NCG_FL_2020.cql.
Every function and variable name matches its CQL counterpart exactly.
"""

from dataclasses import dataclass, field
from typing import Optional, List


USABLE_PROVENANCE = {"source-coded", "structured-capture", "nlp-extracted-high-confidence"}


def _provenance_of(obs: Optional[dict]) -> Optional[str]:
    if obs is None:
        return None
    for ext in obs.get("extension", []):
        if ext.get("url") == "http://ncgindia.org/fhir/StructureDefinition/ncg-extension-data-provenance":
            codings = ext.get("valueCodeableConcept", {}).get("coding", [])
            if codings:
                return codings[0]["code"]
    return None


# mirrors NCGCommon.cql: IsUsable()
def is_usable(obs: Optional[dict]) -> bool:
    return _provenance_of(obs) in USABLE_PROVENANCE


def _value_boolean(obs: Optional[dict]) -> Optional[bool]:
    if obs is None:
        return None
    return obs.get("valueBoolean")


def _find_observation_by_codes(bundle: dict, allowed_codes: set) -> Optional[dict]:
    """Finds first Observation matching any code in allowed_codes."""
    for entry in bundle.get("entry", []):
        res = entry.get("resource", {})
        if res.get("resourceType") != "Observation":
            continue
        codings = res.get("code", {}).get("coding", [])
        for c in codings:
            if c.get("code") in allowed_codes:
                return res
    return None


def _get_obs_code(obs: Optional[dict]) -> Optional[str]:
    if not obs:
        return None
    codings = obs.get("code", {}).get("coding", [])
    return codings[0]["code"] if codings else None


REGIMENS_BY_GROUP = {
    "stage-1-rt-fit": [
        "ISRT (Involved-site RT) 24 Gy [Optimal]",
        "IFRT (Involved-field RT) 24 Gy [Essential]",
    ],
    "stage-1-rt-unsuitable": [
        "Watchful waiting (Low-volume / high-risk toxicity site) [Optional]",
        "Single-agent Rituximab (375 mg/m2 weekly x 4 doses) [Optional]",
    ],
    "stage-2-contiguous": [
        "IFRT 24 Gy [Optimal]",
        "Watchful waiting (if low-volume disease) [Optimal]",
        "Single-agent Rituximab (375 mg/m2 weekly x 4) [Optimal]",
    ],
    "stage-2-non-contiguous": [
        "Observation / Watchful waiting [Preferred if low-volume]",
        "Single-agent Rituximab (375 mg/m2 weekly x 4) [Optimal]",
    ],
    "advanced-low-burden": [
        "Watchful waiting / Active surveillance [Optimal]",
        "Single-agent Rituximab x 4 doses (if patient declines observation) [Optional]",
    ],
    "advanced-high-burden-br": [
        "BR (Bendamustine + Rituximab) x 6 cycles [Optimal / Preferred]",
    ],
    "advanced-high-burden-rchop": [
        "R-CHOP x 6 cycles [Optimal - high LDH / high proliferation / aggressive features]",
    ],
    "advanced-high-burden-rlen": [
        "R + Lenalidomide (Induction 6 cycles -> Response-guided maintenance) [Optimal for bendamustine-unfit]",
    ],
    "advanced-high-burden-frail": [
        "Single-agent Rituximab x 4 doses + maintenance every 2 months x 12 months [Palliative]",
    ],
    "grade-3b-dlbcl": [
        "R-CHOP protocol (Treat as DLBCL)",
    ],
    "transformed-dlbcl": [
        "R-CHOP x 6 cycles -> Autologous Stem Cell Transplant (ASCT) [Optimal]",
    ],
    "duodenal-asymptomatic": [
        "Observation / Watchful waiting [Optimal]",
        "Endoscopic mucosal resection (if technically feasible)",
    ],
    "duodenal-symptomatic": [
        "Single-agent Rituximab (375 mg/m2 weekly x 4) [Optimal]",
        "ISRT 24 Gy [Optimal]",
    ],
    "needs-review": [],
}


@dataclass
class FLClassificationResult:
    treatment_group: str
    recommended_regimens: List[str]
    rationale: List[str]
    data_quality_warnings: List[str] = field(default_factory=list)


def classify_fl(bundle: dict) -> FLClassificationResult:
    """
    Evaluates NCG Follicular Lymphoma logic over a patient FHIR Bundle.
    Returns FLClassificationResult.
    """
    warnings = []

    # 1. Source Observation retrieves
    hist_codes = {"fl-grade-1-2", "fl-grade-3a", "fl-grade-3b", "fl-duodenal", "transformed-dlbcl"}
    stage_codes = {"stage-1", "stage-2", "stage-3", "stage-4"}
    contig_codes = {"contiguous", "non-contiguous"}
    burden_codes = {"high-burden", "low-burden"}

    hist_obs = _find_observation_by_codes(bundle, hist_codes)
    stage_obs = _find_observation_by_codes(bundle, stage_codes)
    contig_obs = _find_observation_by_codes(bundle, contig_codes)
    burden_obs = _find_observation_by_codes(bundle, burden_codes)

    rt_fit_obs = _find_observation_by_codes(bundle, {"fit-for-radiotherapy"})
    benda_fit_obs = _find_observation_by_codes(bundle, {"fit-for-bendamustine"})
    anthra_fit_obs = _find_observation_by_codes(bundle, {"fit-for-anthracycline"})
    bm_obs = _find_observation_by_codes(bundle, {"bone-marrow-cleared"})
    ldh_obs = _find_observation_by_codes(bundle, {"high-ldh-or-proliferation"})

    # 2. Provenance gates
    hist_usable = is_usable(hist_obs)
    stage_usable = is_usable(stage_obs)
    burden_usable = is_usable(burden_obs)
    bm_usable = is_usable(bm_obs)

    hist_code = _get_obs_code(hist_obs) if hist_usable else None
    stage_code = _get_obs_code(stage_obs) if stage_usable else None
    burden_code = _get_obs_code(burden_obs) if burden_usable else None
    contig_code = _get_obs_code(contig_obs) if is_usable(contig_obs) else None

    if hist_obs and not hist_usable:
        warnings.append(f"Histology finding has unverified provenance: '{_provenance_of(hist_obs)}'")
    if stage_obs and not stage_usable:
        warnings.append(f"Ann Arbor staging finding has unverified provenance: '{_provenance_of(stage_obs)}'")
    if burden_obs and not burden_usable:
        warnings.append(f"GELF tumour burden finding has unverified provenance: '{_provenance_of(burden_obs)}'")

    # Clinical branch variables
    is_transformed = hist_code == "transformed-dlbcl"
    is_grade_3b = hist_code == "fl-grade-3b"
    is_duodenal = hist_code == "fl-duodenal"
    is_low_grade = hist_code in ("fl-grade-1-2", "fl-grade-3a")

    is_stage_1 = stage_code == "stage-1"
    is_stage_2 = stage_code == "stage-2"
    is_advanced = stage_code in ("stage-3", "stage-4")
    is_contiguous_stage_2 = contig_code == "contiguous"

    is_high_burden = burden_code == "high-burden"
    is_low_burden = burden_code == "low-burden"

    is_fit_rt = is_usable(rt_fit_obs) and _value_boolean(rt_fit_obs) is True
    is_fit_benda = is_usable(benda_fit_obs) and _value_boolean(benda_fit_obs) is True
    is_fit_anthra = is_usable(anthra_fit_obs) and _value_boolean(anthra_fit_obs) is True
    is_high_ldh = is_usable(ldh_obs) and _value_boolean(ldh_obs) is True
    bm_assessed = bm_usable and (_value_boolean(bm_obs) is not None)

    # Classification decision
    if not hist_usable or hist_code is None:
        group = "needs-review"
        warnings.append("Histology subtype or grade is missing or unverified.")
    elif is_transformed:
        group = "transformed-dlbcl"
    elif is_grade_3b:
        group = "grade-3b-dlbcl"
    elif is_duodenal:
        group = "duodenal-symptomatic" if is_high_burden else "duodenal-asymptomatic"
    elif not is_low_grade:
        group = "needs-review"
    elif not stage_usable or stage_code is None:
        group = "needs-review"
        warnings.append("Ann Arbor stage is missing or unverified.")
    elif is_stage_1:
        if not bm_assessed:
            group = "needs-review"
            warnings.append("Stage I requires bone marrow biopsy to confirm limited-stage before RT.")
        elif is_fit_rt:
            group = "stage-1-rt-fit"
        else:
            group = "stage-1-rt-unsuitable"
    elif is_stage_2:
        if not bm_assessed:
            group = "needs-review"
            warnings.append("Stage II requires bone marrow biopsy to confirm limited-stage disease.")
        elif is_contiguous_stage_2:
            group = "stage-2-contiguous"
        else:
            group = "stage-2-non-contiguous"
    elif is_advanced:
        if not burden_usable or burden_code is None:
            group = "needs-review"
            warnings.append("Advanced FL requires GELF tumour burden evaluation before starting therapy.")
        elif is_low_burden:
            group = "advanced-low-burden"
        elif is_high_burden:
            if is_high_ldh and is_fit_anthra:
                group = "advanced-high-burden-rchop"
            elif is_fit_benda:
                group = "advanced-high-burden-br"
            else:
                group = "advanced-high-burden-rlen"
        else:
            group = "needs-review"
    else:
        group = "needs-review"

    regimens = REGIMENS_BY_GROUP.get(group, [])

    rationale = [
        f"histology: {hist_code or 'unusable / missing'}",
        f"stage: {stage_code or 'unusable / missing'}",
        f"gelf_tumour_burden: {burden_code or 'not assessed'}",
        f"bone_marrow_cleared: {'yes' if bm_assessed and _value_boolean(bm_obs) else ('no' if bm_assessed else 'not assessed / unverified')}",
        f"fit_for_bendamustine: {is_fit_benda}",
    ]

    return FLClassificationResult(
        treatment_group=group,
        recommended_regimens=regimens,
        rationale=rationale,
        data_quality_warnings=warnings,
    )
