"""
End-to-end tests for NCG Follicular Lymphoma clinical pathway against synthetic cases.

Run: python3 -m pytest tests/ -v
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine.run_pipeline import run

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_data")


class TestFLPipeline(unittest.TestCase):
    def test_advanced_high_burden_routes_to_br(self):
        report, _ = run(os.path.join(SAMPLE_DIR, "sample_fl_case_advanced_high_burden.pdf"))
        self.assertEqual(report["treatment_group"], "advanced-high-burden-br")
        self.assertTrue(any("BR (Bendamustine + Rituximab)" in r for r in report["recommended_regimens"]))
        self.assertFalse(report["requires_human_review"])

    def test_stage_1_limited_routes_to_rt(self):
        report, _ = run(os.path.join(SAMPLE_DIR, "sample_fl_case_stage1_limited.pdf"))
        self.assertEqual(report["treatment_group"], "stage-1-rt-fit")
        self.assertTrue(any("ISRT" in r for r in report["recommended_regimens"]))
        self.assertFalse(report["requires_human_review"])

    def test_advanced_low_burden_routes_to_watchful_waiting(self):
        report, _ = run(os.path.join(SAMPLE_DIR, "sample_fl_case_advanced_low_burden.pdf"))
        self.assertEqual(report["treatment_group"], "advanced-low-burden")
        self.assertTrue(any("Watchful waiting" in r for r in report["recommended_regimens"]))
        self.assertFalse(report["requires_human_review"])

    def test_ambiguous_referral_text_forces_needs_review(self):
        report, _ = run(os.path.join(SAMPLE_DIR, "sample_fl_case_ambiguous_referral.pdf"))
        self.assertEqual(report["treatment_group"], "needs-review")
        self.assertTrue(report["requires_human_review"])
        self.assertIn("histology_grade", report["extraction_summary"]["unparsed_fields"])
        self.assertTrue(any("unverified provenance" in w for w in report["data_quality_warnings"]))

    def test_regimen_list_is_empty_for_needs_review(self):
        report, _ = run(os.path.join(SAMPLE_DIR, "sample_fl_case_ambiguous_referral.pdf"))
        self.assertEqual(report["recommended_regimens"], [])


if __name__ == "__main__":
    unittest.main()
