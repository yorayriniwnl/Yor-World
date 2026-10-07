"""Isolated structural fixtures only. No production, physical or authority proof."""
from __future__ import annotations

import copy
import datetime as dt
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

TOOL = Path(__file__).with_name("g7-evidence.py")
SPEC = importlib.util.spec_from_file_location("g7_evidence", TOOL)
G7 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(G7)
NOW = dt.datetime(2026, 10, 7, 12, tzinfo=dt.timezone.utc)
LABEL = "ISOLATED STRUCTURAL TEST FIXTURE; NOT LIVE EVIDENCE OR AN ACTUAL RULING"


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="pre-g7-05-isolated-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.base = self.root / "deliveries/G7/isolated-labelled-fixtures"
        self.base.mkdir(parents=True)
        self.raw = self.base / "NOT-LIVE-artifact.txt"
        self.raw.write_text(LABEL + "\n", encoding="utf-8")
        self.artifact = self.ref(self.raw)
        self.candidate = {"releaseId": "v1.0.0-rc6", "sourceCommit": "1" * 40, "sourceAppTree": "2" * 40,
                          "releaseBundleSha256": self.artifact["sha256"]}
        source = self.save("NOT-REAL-source-binding.json", self.candidate)
        self.manifest = self.save("NOT-REAL-manifest.json", {**self.candidate, "releaseBundlePath": self.artifact["path"], "sourceBinding": self.ref(source), "fixtureLabel": LABEL})
        self.identity = {**self.candidate, "manifestSha256": G7.hash_artifact(self.manifest, "lf"),
                         "deploymentId": "NOT-REAL-deployment", "targetOrigin": "https://structural-fixture.example.com", "deployedAt": "2026-10-07T08:00:00Z"}
        self.owner = self.save("NOT-REAL-owner.json", {"authorizationId": "G7-OWNER-AUTH-20261006", "deploymentAuthorized": True,
                               "g7Status": "AUTHORIZED / PREPARATION", "acceptanceClaim": False, "ownerInstruction": LABEL, "date": "2026-10-06"})
        self.successor = self.save("NOT-REAL-successor.json", {**{key: self.identity[key] for key in G7.CANDIDATE_IDENTITY},
                                  "acceptance": "ACCEPTED", "ruling": "RC6 SOURCE ACCEPTED", "rulingId": "RC6-R1",
                                  "authority": "Parent Codex", "acceptedAt": "2026-10-07T07:00:00Z", "fixtureLabel": LABEL})
        self.binding_data = {**self.identity, "status": "AUTHORIZED", "ownerAuthorizationReference": self.ref(self.owner),
                             "acceptedSuccessorReference": self.ref(self.successor), "fixtureLabel": LABEL}
        self.binding = self.save("NOT-REAL-binding.json", self.binding_data)
        self.receipt = {**self.identity, "executedAt": "2026-10-07T09:00:00Z", "completedAt": "2026-10-07T10:00:00Z",
                        "evidenceCategory": "LIVE PRODUCTION", "requirements": [self.requirement(1)], "fixtureLabel": LABEL}

    def save(self, name, value):
        path = self.base / name
        G7.write(path, value)
        return path

    def ref(self, path):
        return {"path": path.relative_to(self.root).as_posix(), "sha256": G7.hash_artifact(path, "raw"), "hashMode": "raw"}

    def execution(self):
        return {"status": "PASS", "method": LABEL, "measured": {"fixtureValue": 1}, "expected": LABEL,
                "startedAt": "2026-10-07T09:01:00Z", "completedAt": "2026-10-07T09:11:00Z", "artifactHashes": [copy.deepcopy(self.artifact)]}

    def requirement(self, ident):
        number, name, criteria = G7.CRITERIA[ident - 1]
        return {"id": number, "name": name, "status": "PASS", "observations": [{"criterion": key, **self.execution()} for key in criteria]}

    def session(self, ident):
        name = next(name for key, name, _ in G7.MANUAL if key == ident)
        measured = {key: LABEL for key in G7.MANUAL_MEASUREMENTS[ident]}
        if ident == "MD-01":
            measured["coldLoads"] = [1, 2, 3, 4, 5]
        if ident == "MD-06":
            measured = {"batteryStartPercent": 90, "batteryEndPercent": 85, "temperatureStartC": 30,
                        "temperatureEndC": 35, "chargerConnected": False, "network": LABEL, "qualityTier": "low",
                        "framePacing": [{"elapsedSeconds": seconds, "frameTimesMs": [16.7, 17.1]} for seconds in (120, 240, 360, 480, 600)],
                        "crashes": 0, "recoveryObservations": LABEL}
        identity = {
            "MD-01": {"platform": "iOS", "browser": "Safari", "physicalDevice": True},
            "MD-02": {"platform": "Android", "browser": "Chrome", "physicalDevice": True},
            "MD-03": {"platform": "Windows", "browser": "Firefox", "assistiveTool": "NVDA"},
            "MD-04": {"platform": "macOS", "browser": "Safari", "assistiveTool": "VoiceOver"},
            "MD-05": {"platform": "Android", "browser": "Chrome", "assistiveTool": "TalkBack", "physicalDevice": True},
            "MD-06": {"platform": "Android", "browser": "Chrome", "physicalDevice": True},
        }[ident]
        return {"id": ident, "name": name, **self.execution(), **identity, "deviceModel": LABEL, "os": LABEL,
                "browserOrAssistiveToolVersion": LABEL, "operator": LABEL, "viewportDprNetworkCache": LABEL,
                "rawMeasurements": measured, "evidenceCategory": "ACTUAL PHYSICAL OR ASSISTIVE SESSION"}

    def run_receipt(self, receipt=None, manifest=True, binding=True):
        receipt_path = self.save("NOT-LIVE-receipt.json", receipt or self.receipt)
        return G7.build_ledger(self.root, self.manifest if manifest else None, self.binding if binding else None, [receipt_path], now=NOW)

    def change_binding(self, field, value):
        self.binding_data[field] = value
        G7.write(self.binding, self.binding_data)

    def change_reference(self, field, changes):
        path = self.owner if field == "ownerAuthorizationReference" else self.successor
        value = G7.load_json(path)
        value.update(changes)
        G7.write(path, value)
        self.change_binding(field, self.ref(path))

    def test_initialize_without_manifest_or_live_binding(self):
        ledger = G7.build_ledger(self.root, now=NOW)
        self.assertEqual(len(ledger["requirements"]), 10)
        self.assertEqual(len(ledger["physicalAndAssistiveSessions"]), 6)
        self.assertEqual(ledger["overallStatus"], "NOT RUN")
        self.assertEqual(ledger["heapGpuLeakAbsence"], "UNKNOWN")
        self.assertFalse(ledger["acceptanceClaim"])
        self.assertIsNone(ledger["sourceCommit"])

    def test_manifest_only_remains_not_run(self):
        ledger = G7.build_ledger(self.root, self.manifest, now=NOW)
        self.assertEqual(ledger["sourceCommit"], self.identity["sourceCommit"])
        self.assertEqual(ledger["overallStatus"], "NOT RUN")

    def test_pass_requires_manifest_and_binding(self):
        for manifest, binding in ((False, False), (True, False), (False, True)):
            with self.subTest(manifest=manifest, binding=binding), self.assertRaises(ValueError):
                self.run_receipt(manifest=manifest, binding=binding)

    def test_each_exact_receipt_identity_is_required(self):
        for key in G7.IDENTITY:
            for action in ("missing", "wrong"):
                value = copy.deepcopy(self.receipt)
                if action == "missing":
                    value.pop(key)
                else:
                    value[key] = "incorrect"
                with self.subTest(key=key, action=action), self.assertRaisesRegex(ValueError, "Receipt identity mismatch"):
                    self.run_receipt(value)

    def test_each_candidate_binding_field_is_required(self):
        original = copy.deepcopy(self.binding_data)
        for key in G7.CANDIDATE_IDENTITY:
            self.binding_data = copy.deepcopy(original)
            self.change_binding(key, "incorrect")
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "Operational candidate mismatch"):
                self.run_receipt()

    def test_manifest_bundle_and_source_binding_are_hash_verified(self):
        self.raw.write_text("tampered", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
            self.run_receipt()

    def test_source_binding_identity_must_match(self):
        manifest = G7.load_json(self.manifest)
        source = self.save("conflicting-source.json", {**self.candidate, "sourceCommit": "f" * 40})
        manifest["sourceBinding"] = self.ref(source)
        G7.write(self.manifest, manifest)
        with self.assertRaisesRegex(ValueError, "Manifest/source binding mismatch"):
            self.run_receipt()

    def test_reference_hashes_cannot_be_stale(self):
        for path in (self.owner, self.successor):
            original = path.read_bytes()
            path.write_bytes(original + b" ")
            with self.subTest(path=path.name), self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                self.run_receipt()
            path.write_bytes(original)

    def test_actual_owner_record_fields_required(self):
        original = G7.load_json(self.owner)
        for changes in ({"authorizationId": "another-owner"}, {"deploymentAuthorized": False}, {"acceptanceClaim": True}, {"g7Status": "ACCEPTED"}, {"date": "2026-10-08"}):
            G7.write(self.owner, original)
            self.change_reference("ownerAuthorizationReference", changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.run_receipt()

    def test_successor_requires_actual_parent_decision_and_exact_candidate(self):
        original = G7.load_json(self.successor)
        for changes in ({"acceptance": "PENDING"}, {"ruling": "RC6 NOT ACCEPTED"}, {"authority": "Maker"}, {"rulingId": "G6-R1"}, {"acceptedAt": "2026-10-07T08:01:00Z"}, *({key: "incorrect"} for key in G7.CANDIDATE_IDENTITY)):
            G7.write(self.successor, original)
            self.change_reference("acceptedSuccessorReference", changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.run_receipt()

    def test_invalid_or_stale_execution_timestamps_rejected(self):
        for key, value in (("executedAt", "1999-01-01T00:00:00Z"), ("completedAt", "2027-01-01T00:00:00Z"), ("executedAt", "2026-10-07T10:01:00Z"), ("executedAt", "2026-10-07T09:00:00"), ("executedAt", "invalid")):
            receipt = copy.deepcopy(self.receipt)
            receipt[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.run_receipt(receipt)

    def test_invalid_deployment_origins_and_time_rejected(self):
        original = copy.deepcopy(self.binding_data)
        for key, value in (("targetOrigin", "http://example.com"), ("targetOrigin", "https://localhost"), ("targetOrigin", "https://127.0.0.1"), ("targetOrigin", "https://example.com/path"), ("targetOrigin", "https://name:pass@example.com"), ("targetOrigin", "https://example.com:invalid"), ("deployedAt", "invalid"), ("deployedAt", "2027-01-01T00:00:00Z")):
            self.binding_data = copy.deepcopy(original)
            self.change_binding(key, value)
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.run_receipt()

    def test_partial_pass_rejected_but_partial_observation_preserves_inventory(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["requirements"][0]["observations"] = receipt["requirements"][0]["observations"][:1]
        with self.assertRaisesRegex(ValueError, "exact complete"):
            self.run_receipt(receipt)
        receipt["requirements"][0]["status"] = "NOT RUN"
        ledger = self.run_receipt(receipt)
        requirement = ledger["requirements"][0]
        self.assertEqual(requirement["status"], "NOT RUN")
        self.assertEqual(len(requirement["observations"]), len(G7.CRITERIA[0][2]))
        self.assertEqual([row["status"] for row in requirement["observations"]], ["PASS", "NOT RUN", "NOT RUN", "NOT RUN"])

    def test_unknown_duplicate_or_conflicting_inventories_rejected(self):
        variants = []
        for criterion in ("unknown", G7.CRITERIA[0][2][0]):
            receipt = copy.deepcopy(self.receipt)
            receipt["requirements"][0]["observations"].append({"criterion": criterion, **self.execution()})
            variants.append(receipt)
        receipt = copy.deepcopy(self.receipt)
        receipt["requirements"].append(copy.deepcopy(receipt["requirements"][0]))
        variants.append(receipt)
        for key, value in (("id", 11), ("id", True), ("name", "other")):
            receipt = copy.deepcopy(self.receipt)
            receipt["requirements"][0][key] = value
            variants.append(receipt)
        for receipt in variants:
            with self.subTest(receipt=receipt), self.assertRaises(ValueError):
                self.run_receipt(receipt)

    def test_each_executed_subcriterion_needs_fields_and_verified_artifacts(self):
        for key in ("method", "measured", "expected", "startedAt", "completedAt", "artifactHashes"):
            receipt = copy.deepcopy(self.receipt)
            receipt["requirements"][0]["observations"][0].pop(key)
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.run_receipt(receipt)
        receipt = copy.deepcopy(self.receipt)
        receipt["requirements"][0]["observations"][0]["method"] = False
        with self.assertRaisesRegex(ValueError, "actual method"):
            self.run_receipt(receipt)
        for mutation in ({"sha256": "f" * 64}, {"hashMode": "unverified"}, {"path": "../outside.txt"}):
            receipt = copy.deepcopy(self.receipt)
            receipt["requirements"][0]["observations"][0]["artifactHashes"][0].update(mutation)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.run_receipt(receipt)

    def test_surrogate_categories_cannot_promote_requirement(self):
        for category in ("HTTP ONLY", "LIVE BROWSER AUTOMATED", "VIEWPORT EMULATION", "AUTOMATED AXE", "LOCAL EMBEDDED SQL", "SYNTHETIC", "ACTUAL PHYSICAL OR ASSISTIVE SESSION"):
            receipt = copy.deepcopy(self.receipt)
            receipt["evidenceCategory"] = category
            with self.subTest(category=category), self.assertRaises(ValueError):
                self.run_receipt(receipt)

    def test_partial_http_inventory_never_promotes_even_when_complete(self):
        receipt = copy.deepcopy(self.receipt)
        receipt["evidenceCategory"] = "HTTP ONLY"
        receipt["requirements"][0]["status"] = "NOT RUN"
        self.assertEqual(self.run_receipt(receipt)["requirements"][0]["status"], "NOT RUN")
        receipt["requirements"][0]["observations"][0]["evidenceCategory"] = "LIVE PRODUCTION"
        with self.assertRaisesRegex(ValueError, "category conflicts"):
            self.run_receipt(receipt)

    def test_explicit_fixture_markers_rejected(self):
        for key in ("auditFixture", "synthetic", "localFixture"):
            receipt = copy.deepcopy(self.receipt)
            receipt[key] = True
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "Synthetic fixtures"):
                self.run_receipt(receipt)

    def manual_receipt(self, sessions=None):
        return {**self.receipt, "requirements": [], "evidenceCategory": "ACTUAL PHYSICAL OR ASSISTIVE SESSION",
                "physicalAndAssistiveSessions": sessions if sessions is not None else [self.session("MD-06")]}

    def test_all_six_manual_sessions_validate_structurally_only(self):
        ledger = self.run_receipt(self.manual_receipt([self.session(key) for key, _, _ in G7.MANUAL]))
        self.assertTrue(all(row["status"] == "PASS" for row in ledger["physicalAndAssistiveSessions"]))
        self.assertEqual(ledger["overallStatus"], "NOT RUN")
        self.assertFalse(ledger["acceptanceClaim"])

    def test_manual_identity_category_timing_and_artifacts(self):
        for key in ("deviceModel", "os", "operator", "browserOrAssistiveToolVersion", "viewportDprNetworkCache", "rawMeasurements", "method", "artifactHashes", "startedAt", "completedAt"):
            receipt = self.manual_receipt()
            receipt["physicalAndAssistiveSessions"][0].pop(key)
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.run_receipt(receipt)

    def test_manual_platform_device_and_assistive_identity_must_match(self):
        for ident, changes in (("MD-01", {"platform": "Android"}), ("MD-01", {"browser": "Chrome"}),
                               ("MD-02", {"physicalDevice": False}), ("MD-03", {"assistiveTool": "VoiceOver"}),
                               ("MD-04", {"platform": "Windows"}), ("MD-05", {"assistiveTool": "NVDA"}),
                               ("MD-06", {"platform": "Windows"})):
            session = self.session(ident)
            session.update(changes)
            with self.subTest(ident=ident, changes=changes), self.assertRaises(ValueError):
                self.run_receipt(self.manual_receipt([session]))
        for changes in ({"id": "MD-99"}, {"name": "different"}, {"evidenceCategory": "VIEWPORT EMULATION"}, {"startedAt": "2026-10-07T08:59:00Z"}):
            receipt = self.manual_receipt()
            receipt["physicalAndAssistiveSessions"][0].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.run_receipt(receipt)

    def test_thermal_600_second_duration_and_full_measurement_inventory(self):
        receipt = self.manual_receipt()
        receipt["physicalAndAssistiveSessions"][0]["completedAt"] = "2026-10-07T09:10:59Z"
        with self.assertRaisesRegex(ValueError, "600 seconds"):
            self.run_receipt(receipt)
        for key in G7.MANUAL_MEASUREMENTS["MD-06"]:
            receipt = self.manual_receipt()
            receipt["physicalAndAssistiveSessions"][0]["rawMeasurements"].pop(key)
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.run_receipt(receipt)
        for key, value in (("batteryStartPercent", 101), ("temperatureStartC", "warm"), ("chargerConnected", "false"), ("qualityTier", "unknown"), ("framePacing", [{"elapsedSeconds": 600, "frameTimesMs": [16]}])):
            receipt = self.manual_receipt()
            receipt["physicalAndAssistiveSessions"][0]["rawMeasurements"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.run_receipt(receipt)

    def test_manual_failure_prevents_overall_pass(self):
        receipt = self.manual_receipt()
        receipt["physicalAndAssistiveSessions"][0]["status"] = "FAIL"
        self.assertEqual(self.run_receipt(receipt)["overallStatus"], "FAIL")

    def test_full_structural_fixture_still_has_no_review_or_acceptance(self):
        live = {**self.receipt, "requirements": [self.requirement(number) for number, _, _ in G7.CRITERIA]}
        paths = [self.save("NOT-LIVE-all-live.json", live), self.save("NOT-LIVE-all-manual.json", self.manual_receipt([self.session(key) for key, _, _ in G7.MANUAL]))]
        ledger = G7.build_ledger(self.root, self.manifest, self.binding, paths, now=NOW)
        self.assertEqual(ledger["overallStatus"], "PASS")
        self.assertEqual(ledger["validationScope"], "STRUCTURE, IDENTITY AND ARTIFACT HASHES ONLY")
        self.assertEqual(ledger["independentReview"], "NOT RUN")
        self.assertEqual(ledger["heapGpuLeakAbsence"], "UNKNOWN")
        self.assertFalse(ledger["acceptanceClaim"])

    def test_repeated_executed_subcriteria_across_receipts_rejected(self):
        paths = [self.save("a.json", self.receipt), self.save("b.json", self.receipt)]
        with self.assertRaisesRegex(ValueError, "repeated executed subcriterion"):
            G7.build_ledger(self.root, self.manifest, self.binding, paths, now=NOW)

    def test_duplicate_json_keys_rejected(self):
        path = self.base / "duplicate.json"
        path.write_text('{"releaseId":"one","releaseId":"two"}', encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
            G7.load_json(path)

    def test_cli_initialization_and_existing_output_preservation(self):
        output = self.base / "NOT-LIVE-empty-output.json"
        command = [sys.executable, str(TOOL), "--repository", str(self.root), "--output", str(output)]
        run = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        original = output.read_bytes()
        run = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(run.returncode, 0)
        self.assertEqual(output.read_bytes(), original)


if __name__ == "__main__":
    unittest.main(verbosity=2)
