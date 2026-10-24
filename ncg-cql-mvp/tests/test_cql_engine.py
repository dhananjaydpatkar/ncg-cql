"""
test_cql_engine.py

Python integration tests for HL7 CQL execution on synthetic FHIR R4 bundles.
Executes the generated CQL libraries (NCG_LYMPHOMA_WORKUP_2020 and NCG_FL_2020)
via the node-based cql-execution engine and validates clinical recommendations,
score calculation (aaIPI), and data-provenance gating.

Run:
    ./.venv/bin/pytest tests/test_cql_engine.py -v
"""

import json
import os
import subprocess
import unittest

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENGINE_JS = os.path.join(REPO_DIR, "engine", "js", "evaluate_via_cql_execution.js")
BUNDLES_DIR = os.path.join(REPO_DIR, "sample_data", "fhir_bundles")


def run_cql_bundle(bundle_path: str, library_id: str = None, version: str = None) -> dict:
    cmd = ["node", ENGINE_JS, bundle_path]
    if library_id:
        cmd.append(library_id)
    if version:
        cmd.append(version)
    cmd.append("--json")

    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_DIR)
    if proc.returncode != 0:
        raise RuntimeError(f"CQL execution failed: {proc.stderr}")
    return json.loads(proc.stdout)


class TestCqlEngine(unittest.TestCase):
    def test_dlbcl_aaipi_score_calculation(self):
        bundle_file = os.path.join(
            BUNDLES_DIR,
            "lymphoma_workup",
            "17_tc17_advanced-dlbcl-in-48m-with-high-aaipi-score-2-ldh-stage-iv.json",
        )
        report = run_cql_bundle(bundle_file, "NCG_LYMPHOMA_WORKUP_2020", "1.2.0")

        self.assertEqual(report["library"]["id"], "NCG_LYMPHOMA_WORKUP_2020")
        self.assertEqual(report["library"]["version"], "1.2.0")
        self.assertEqual(report["treatment_group"], "pathway-staging-pet-ct-omit-bm")

        scores = report["calculated_scores"]
        self.assertIn("aaIPI", scores)
        self.assertEqual(scores["aaIPI"]["score"], 2)
        self.assertEqual(scores["aaIPI"]["riskGroup"], "high-intermediate")
        self.assertIn("50-55% 5-yr OS", scores["aaIPI"]["riskLabel"])

        # Standard IPI is also calculated
        self.assertIn("IPI", scores)
        self.assertEqual(scores["IPI"]["score"], 2)

    def test_unparsed_referral_provenance_safety_gate(self):
        bundle_file = os.path.join(
            BUNDLES_DIR,
            "lymphoma_workup",
            "10_tc10_referral-note-with-unparsed-text-safety-provenance-gate.json",
        )
        report = run_cql_bundle(bundle_file, "NCG_LYMPHOMA_WORKUP_2020", "1.2.0")

        self.assertEqual(report["treatment_group"], "needs-review")
        self.assertTrue(report["requires_human_review"])
        self.assertEqual(report["recommended_regimens"], [])
        self.assertIsNone(report["calculated_scores"]["aaIPI"]["score"])

    def test_high_dose_mtx_age_gt_40_dtpa_gfr(self):
        bundle_file = os.path.join(
            BUNDLES_DIR,
            "lymphoma_workup",
            "16_tc16_high-dose-methotrexate-planned-in-older-adult-requiring-dtpa-gfr.json",
        )
        report = run_cql_bundle(bundle_file, "NCG_LYMPHOMA_WORKUP_2020", "1.2.0")

        self.assertEqual(report["treatment_group"], "pathway-high-dose-mtx-dtpa")
        self.assertTrue(any("DTPA GFR" in r for r in report["recommended_regimens"]))

    def test_follicular_cql_execution(self):
        bundle_file = os.path.join(
            BUNDLES_DIR,
            "follicular",
            "01_t1_advanced-high-burden-fit.json",
        )
        report = run_cql_bundle(bundle_file, "NCG_FL_2020", "0.2.0")

        self.assertEqual(report["treatment_group"], "advanced-high-burden-systemic")
        self.assertTrue(any("Bendamustine" in r for r in report["recommended_regimens"]))
        self.assertFalse(report["requires_human_review"])

    def test_follicular_unparsed_histology_safety(self):
        bundle_file = os.path.join(
            BUNDLES_DIR,
            "follicular",
            "04_t4_referral-report-with-unparsed-histology-safety.json",
        )
        report = run_cql_bundle(bundle_file, "NCG_FL_2020", "0.2.0")

        self.assertEqual(report["treatment_group"], "needs-review")
        self.assertTrue(report["requires_human_review"])


if __name__ == "__main__":
    unittest.main()
