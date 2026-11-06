from django.test import TestCase
from iep_management.rgori_service import RGORICheckerService


class RGORIAuditBreakdownTests(TestCase):
    def test_audit_goal_explainable_evaluates_smart_abcd_goal(self):
        goal = (
            "Given visual schedule strips and verbal prompts, Alex will independently "
            "transition between classroom activities with 80% accuracy in 4 out of 5 "
            "opportunities across 3 consecutive weeks."
        )
        context = "Student: Alex. Needs support with transitions."
        audit = RGORICheckerService.audit_goal_explainable(goal, context)

        self.assertIn("total_score", audit)
        self.assertIn("status", audit)
        self.assertIn("breakdown", audit)
        self.assertGreaterEqual(audit["total_score"], 65)

        breakdown = audit["breakdown"]
        self.assertIn("measurability", breakdown)
        self.assertIn("functionality", breakdown)
        self.assertIn("generality", breakdown)
        self.assertIn("instructional_context", breakdown)

        self.assertGreater(breakdown["measurability"]["score"], 15)
        self.assertTrue(len(breakdown["measurability"]["explanation"]) > 10)

    def test_audit_goal_explainable_identifies_vague_goal(self):
        vague_goal = "Alex will understand and appreciate reading."
        audit = RGORICheckerService.audit_goal_explainable(vague_goal, "")

        self.assertLess(audit["total_score"], 65)
        self.assertEqual(audit["status"], "Review Advised")
        self.assertIn("non-observable", audit["breakdown"]["measurability"]["explanation"].lower())
