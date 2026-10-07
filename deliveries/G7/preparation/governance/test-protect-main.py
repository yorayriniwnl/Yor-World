"""Offline safety checks; fixtures are synthetic, not production evidence."""
import copy
import importlib.util
import io
import sys
import unittest
from unittest import mock
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("protect_main", Path(__file__).with_name("protect-main.py"))
governance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(governance)


class SafetyChecks(unittest.TestCase):
    def observations(self):
        head = "a" * 40
        return {"checks": [{"name": name, "app": {"id": 15368, "slug": "github-actions"}} for name in governance.CONTEXTS],
                "historicalChecksForDraftOnly": [],
                "currentQualityRun": {"id": 1, "run_attempt": 1, "head_sha": head, "event": "push", "path": ".github/workflows/ci.yml", "status": "completed", "conclusion": "success"},
                "currentQualityJob": {"run_id": 1, "run_attempt": 1, "head_sha": head, "name": governance.CONTEXTS[1], "status": "completed", "conclusion": "success",
                    "steps": [{"name": name, "status": "completed", "conclusion": "success"} for name in governance.REQUIRED_STEPS]}}

    def test_payload_preserves_owner_emergency_bypass_and_denials(self):
        payload = governance.draft(self.observations())
        self.assertEqual(payload["required_status_checks"]["contexts"], governance.CONTEXTS)
        self.assertTrue(payload["required_status_checks"]["strict"])
        self.assertFalse(payload["enforce_admins"])
        self.assertFalse(payload["allow_force_pushes"])
        self.assertFalse(payload["allow_deletions"])
        self.assertEqual(payload["required_pull_request_reviews"]["required_approving_review_count"], 1)
        self.assertTrue(payload["required_pull_request_reviews"]["dismiss_stale_reviews"])

    def test_check_provider_must_be_actual_github_actions(self):
        observed = self.observations()
        observed["checks"][0]["app"]["slug"] = "unrelated-app"
        with self.assertRaises(governance.Failure):
            governance.draft(observed)

    def test_all_thirteen_steps_required_without_skips_or_duplicates(self):
        observed = self.observations()
        self.assertEqual(governance.quality_failures(observed, "a" * 40), [])
        for mutation in ["skip", "missing", "duplicate", "wrong-name", "wrong-head", "wrong-attempt"]:
            changed = copy.deepcopy(observed)
            steps = changed["currentQualityJob"]["steps"]
            if mutation == "skip":
                steps[-1]["conclusion"] = "skipped"
            elif mutation == "missing":
                steps.pop()
            elif mutation == "duplicate":
                steps.append(copy.deepcopy(steps[-1]))
            elif mutation == "wrong-name":
                steps[-1]["name"] = "13. Unrelated success"
            elif mutation == "wrong-head":
                changed["currentQualityRun"]["head_sha"] = "b" * 40
            else:
                changed["currentQualityRun"]["run_attempt"] = 2
            self.assertTrue(governance.quality_failures(changed, "a" * 40), mutation)

    def test_readback_rejects_missing_controls_or_provider_mismatch(self):
        payload = governance.draft(self.observations())
        protection = {**payload, **{key: {"enabled": False} for key in ["enforce_admins", "allow_force_pushes", "allow_deletions"]}}
        self.assertEqual(governance.readback_failures(protection, payload), [])
        bad = copy.deepcopy(protection)
        bad["allow_force_pushes"]["enabled"] = True
        self.assertTrue(governance.readback_failures(bad, payload))
        bad = copy.deepcopy(protection)
        bad["required_status_checks"]["checks"][0]["app_id"] = -1
        self.assertTrue(governance.readback_failures(bad, payload))

    def test_no_mutation_outside_single_main_protection_put(self):
        api = governance.API()
        for endpoint, method in [(governance.PREFIX, "PUT"), (governance.PREFIX + "/branches/main/protection", "DELETE"), (governance.PREFIX + "/rulesets", "POST")]:
            with self.assertRaises(governance.Failure):
                api.request(endpoint, method=method)
        self.assertEqual(api.calls, [])

    def test_redirect_handler_never_forwards_authenticated_request(self):
        self.assertIsNone(governance.fetch.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://example.com"))

    def test_apply_requires_explicit_expected_head_before_api_access(self):
        with mock.patch.object(sys, "argv", ["protect-main.py", "--apply"]), mock.patch.object(sys, "stderr", io.StringIO()), mock.patch.object(governance, "API") as api:
            with self.assertRaises(SystemExit) as stopped:
                governance.main()
            self.assertEqual(stopped.exception.code, 2)
            api.assert_not_called()


if __name__ == "__main__":
    unittest.main(testRunner=unittest.TextTestRunner(stream=sys.stdout, verbosity=2))
