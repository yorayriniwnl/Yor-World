"""Offline safety checks; fixtures are synthetic, not production evidence."""
import copy
import importlib.util
import io
import json
import sys
import unittest
from unittest import mock
from pathlib import Path
from urllib.error import HTTPError

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
        self.assertNotIn("checks", payload["required_status_checks"])
        self.assertNotIn("expectedChecks", json.dumps(payload))
        self.assertEqual(governance.expected_checks(self.observations()), [{"context": name, "app_id": 15368} for name in governance.CONTEXTS])
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
        for invalid_provider in [-1, None, 999999]:
            observed = self.observations()
            observed["checks"][0]["app"]["id"] = invalid_provider
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
        expected = governance.expected_checks(self.observations())
        protection = {**payload, **{key: {"enabled": False} for key in ["enforce_admins", "allow_force_pushes", "allow_deletions"]}}
        # GET expands app-bound checks into the effective contexts inventory.
        protection["required_status_checks"] = {**payload["required_status_checks"], "checks": expected}
        self.assertEqual(governance.readback_failures(protection, payload, expected), [])
        bad = copy.deepcopy(protection)
        bad["allow_force_pushes"]["enabled"] = True
        self.assertTrue(governance.readback_failures(bad, payload, expected))
        for invalid_provider in [-1, None, 999999]:
            bad = copy.deepcopy(protection)
            bad["required_status_checks"]["checks"][0]["app_id"] = invalid_provider
            self.assertTrue(governance.readback_failures(bad, payload, expected))
        bad = copy.deepcopy(protection)
        bad["required_status_checks"].pop("checks")
        self.assertTrue(governance.readback_failures(bad, payload, expected))

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

    def test_validation_diagnostics_project_only_safe_message_field_code(self):
        secret = "sensitive-sentinel-value"
        raw = json.dumps({"message": "Validation Failed: " + secret, "value": secret, "token": secret,
                          "errors": [{"resource": secret, "field": "required_status_checks.checks", "code": "custom",
                                      "value": secret, "message": "The same context cannot be required more than once: " + secret},
                                     {"field": secret, "code": secret, "message": secret}, secret]}).encode()
        safe = governance.validation_diagnostic(raw)
        self.assertEqual(safe["message"], "Validation Failed")
        self.assertEqual(safe["errors"][0], {"message": "Required status check contexts must be unique", "field": "required_status_checks.checks", "code": "custom"})
        rendered = json.dumps(safe)
        self.assertNotIn(secret, rendered)
        self.assertNotIn("resource", rendered)
        self.assertNotIn("token", rendered)
        self.assertNotIn('"value"', rendered)

    def test_validation_diagnostics_cap_input_errors_and_unknown_shapes(self):
        self.assertIn("size cap", governance.validation_diagnostic(b"x" * (16 * 1024 + 1))["message"])
        self.assertIn("not valid JSON", governance.validation_diagnostic(b"not-json")["message"])
        self.assertIn("unexpected shape", governance.validation_diagnostic(b"[]")["message"])
        errors = [{"field": "contexts", "code": "invalid", "message": "Unrecognized secret-containing text"} for _ in range(100)]
        self.assertEqual(len(governance.validation_diagnostic(json.dumps({"errors": errors}).encode())["errors"]), 8)

    def test_mock_422_api_captures_safe_diagnostic_and_preserves_failure(self):
        api = governance.API()
        secret = "never-log-this-synthetic-credential"
        raw = json.dumps({"message": "Validation Failed", "errors": [{"field": "contexts", "code": "custom", "message": "Contexts must be unique", "value": secret}]}).encode()
        error = HTTPError("https://api.github.com" + governance.PREFIX, 422, "Unprocessable Entity", {}, io.BytesIO(raw))
        with mock.patch.object(api.client, "credential", return_value=secret), mock.patch.object(api.client.opener, "open", side_effect=error):
            with self.assertRaises(governance.Failure) as failed:
                api.request(governance.PREFIX + "/branches/main/protection", method="PUT", payload={})
        self.assertIn("HTTP 422", str(failed.exception))
        self.assertIn("contexts must be unique", str(failed.exception))
        self.assertEqual(api.calls[-1]["status"], 422)
        self.assertNotIn(secret, str(failed.exception) + json.dumps(api.calls))
        self.assertTrue(error.fp.closed)

    def test_top_level_schema_prose_retains_categories_and_known_names_only(self):
        secret = "synthetic-sensitive-value-not-for-output"
        raw = json.dumps({"message": "Invalid request. No subschema in anyOf matched. For properties/required_status_checks: contexts is not of type array; checks is not a permitted key; app_id is missing. Duplicate contexts: " + secret}).encode()
        safe = governance.validation_diagnostic(raw)
        message = safe["message"]
        for expected in ["Invalid request", "Schema alternatives did not match", "Invalid field type", "Field not permitted", "Required field missing", "Duplicate values rejected", "contexts", "checks", "app_id", "required_status_checks"]:
            self.assertIn(expected, message)
        self.assertNotIn(secret, json.dumps(safe))
        self.assertNotIn("properties/", message)
        self.assertLess(len(message), 1024)

    def test_unknown_schema_names_values_and_long_prose_are_suppressed(self):
        secret = "synthetic-sensitive-unknown-field-and-value"
        raw = json.dumps({"message": "Invalid request. " + secret + " is not a permitted key. " + "opaque " * 400}).encode()
        safe = governance.validation_diagnostic(raw)
        self.assertIn("Field not permitted", safe["message"])
        self.assertNotIn(secret, json.dumps(safe))
        self.assertNotIn("opaque", json.dumps(safe))
        self.assertNotIn("mentioned fields", safe["message"])

    def test_per_clause_missing_disallowed_and_expected_types_are_safe(self):
        secret = "synthetic-sensitive-value-hidden-from-schema-diagnostics"
        prose = "Invalid request.\nNo subschema in anyOf matched.\nFor 'properties/required_status_checks', 'checks' is not a permitted key.\nFor 'properties/required_status_checks/checks/items', 'app_id' wasn't supplied.\nFor 'properties/required_status_checks/checks/items/app_id', '" + secret + "' is not an integer."
        safe = governance.validation_diagnostic(json.dumps({"message": prose}).encode())
        clauses = safe["errors"]
        self.assertEqual(len(clauses), 4)
        self.assertIn("Field not permitted", clauses[1]["message"])
        self.assertIn("checks", clauses[1]["message"])
        self.assertIn("Required field missing", clauses[2]["message"])
        self.assertIn("app_id", clauses[2]["message"])
        self.assertIn("expected types: integer", clauses[3]["message"])
        self.assertNotIn(secret, json.dumps(safe))
        self.assertNotIn("properties/", json.dumps(safe))
        self.assertNotIn("items", json.dumps(safe))


if __name__ == "__main__":
    unittest.main(testRunner=unittest.TextTestRunner(stream=sys.stdout, verbosity=2))
