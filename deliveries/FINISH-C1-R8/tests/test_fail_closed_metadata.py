from __future__ import annotations

import copy
import functools
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
CANDIDATE_COMMIT = "e2670d4152c461005da86b392dbcea12cec740bf"
RECEIPT_FILES = (
    "source-binding.json",
    "candidate-input-provenance.json",
    "predecessor-output-git-blobs.json",
)

sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location(
    "finish_c1_r8_verifier", ROOT / "source" / "verify-input-provenance.py"
)
assert SPEC is not None and SPEC.loader is not None
VERIFIER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = VERIFIER
SPEC.loader.exec_module(VERIFIER)
VERIFIER.PACKAGE_DIR = ROOT
# Multi-case imported-module probes reuse immutable Git-object reads. The CLI
# regression below starts a fresh process and performs uncached Git reads.
VERIFIER.git_bytes = functools.lru_cache(maxsize=None)(VERIFIER.git_bytes)
VERIFIER.git_text = functools.lru_cache(maxsize=None)(VERIFIER.git_text)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class FailClosedMetadataTests(unittest.TestCase):
    def setUp(self) -> None:
        (ROOT / ".work" / "test-cases").mkdir(parents=True, exist_ok=True)

    def case_copy(self, case_root: Path) -> None:
        for name in RECEIPT_FILES:
            shutil.copyfile(ROOT / name, case_root / name)

    def assert_case_fails(self, file_name: str, mutate, *, expected=VERIFIER.VerificationError) -> None:
        with tempfile.TemporaryDirectory(dir=ROOT / ".work" / "test-cases") as directory:
            case_root = Path(directory)
            self.case_copy(case_root)
            path = case_root / file_name
            document = read_json(path)
            mutate(document)
            path.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8", newline="\n")
            with mock.patch.object(VERIFIER, "PACKAGE_DIR", case_root):
                with self.assertRaises(expected):
                    VERIFIER.run_verification(CANDIDATE_COMMIT)

    def test_exact_candidate_and_output_manifest_pass(self) -> None:
        result = VERIFIER.run_verification(CANDIDATE_COMMIT)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["outputManifest"]["commit"], CANDIDATE_COMMIT)
        self.assertEqual(result["candidateInputs"]["installedPackageFiles"], 2)

    def test_every_source_manifest_identity_field_is_authoritative(self) -> None:
        mutations = {
            "commit": lambda value: "0" * 40,
            "path": lambda value: value + ".wrong",
            "blobOid": lambda value: "0" * 40,
            "sha256": lambda value: "0" * 64,
            "bytes": lambda value: value + 1,
        }
        for field, replacement in mutations.items():
            with self.subTest(field=field):
                self.assert_case_fails(
                    "candidate-input-provenance.json",
                    lambda document, field=field, replacement=replacement: document["sourceManifest"].__setitem__(
                        field, replacement(document["sourceManifest"][field])
                    ),
                )

    def test_source_manifest_rejects_missing_extra_and_duplicate_fields(self) -> None:
        self.assert_case_fails(
            "candidate-input-provenance.json",
            lambda document: document["sourceManifest"].pop("bytes"),
        )
        self.assert_case_fails(
            "candidate-input-provenance.json",
            lambda document: document["sourceManifest"].__setitem__("untrustedAlias", "x"),
        )
        with self.assertRaises(VERIFIER.VerificationError):
            VERIFIER.json_from_bytes(
                b'{"sourceManifest":{"sha256":"a","sha256":"b"}}',
                "duplicate-key probe",
            )

    def test_source_binding_package_file_fields_are_exact_and_unique(self) -> None:
        mutations = {
            "alias": lambda row: row.__setitem__("alias", row["alias"] + ".wrong"),
            "packageFile": lambda row: row.__setitem__("packageFile", "../outside.js"),
            "sha256": lambda row: row.__setitem__("sha256", "0" * 64),
            "bytes": lambda row: row.__setitem__("bytes", row["bytes"] + 1),
            "extra-field": lambda row: row.__setitem__("note", "ignored"),
        }
        for label, mutate_row in mutations.items():
            with self.subTest(field=label):
                self.assert_case_fails(
                    "source-binding.json",
                    lambda document, mutate_row=mutate_row: mutate_row(
                        document["threeDependencyEvidence"]["packageFiles"][0]
                    ),
                )

        def remove_one(document):
            document["threeDependencyEvidence"]["packageFiles"].pop()

        def add_duplicate_alias(document):
            rows = document["threeDependencyEvidence"]["packageFiles"]
            rows.append(copy.deepcopy(rows[0]))

        def duplicate_path(document):
            rows = document["threeDependencyEvidence"]["packageFiles"]
            rows[1]["packageFile"] = rows[0]["packageFile"]

        def add_extra_row(document):
            rows = document["threeDependencyEvidence"]["packageFiles"]
            extra = copy.deepcopy(rows[0])
            extra["alias"] = "candidate-app/node_modules/three/build/extra.js"
            extra["packageFile"] = "build/extra.js"
            rows.append(extra)

        for label, mutate in (
            ("missing", remove_one),
            ("duplicate-alias", add_duplicate_alias),
            ("duplicate-package-file", duplicate_path),
            ("extra-row", add_extra_row),
        ):
            with self.subTest(case=label):
                self.assert_case_fails("source-binding.json", mutate)

    def test_source_binding_package_identity_declarations_remain_bound(self) -> None:
        for field, replacement in (
            ("packageName", "other"),
            ("packageVersion", "0.181.0"),
            ("packageManager", "npm"),
            ("packageManagerVersion", "0.0.0"),
            ("installedPackageRoot", "app/node_modules/three"),
            ("threeIntegrity", "sha512-invalid"),
        ):
            with self.subTest(field=field):
                self.assert_case_fails(
                    "source-binding.json",
                    lambda document, field=field, replacement=replacement: document[
                        "threeDependencyEvidence"
                    ].__setitem__(field, replacement),
                )

    def test_candidate_installed_package_rows_still_match_installed_bytes(self) -> None:
        package_alias = VERIFIER.EXPECTED_THREE_PACKAGE_FILES[0]["alias"]
        for field, replacement in (("sha256", "0" * 64), ("bytes", -1)):
            with self.subTest(field=field):
                def mutate(document, field=field, replacement=replacement):
                    row = next(item for item in document["inputs"] if item["alias"] == package_alias)
                    row["corrected"][field] = replacement

                self.assert_case_fails("candidate-input-provenance.json", mutate)

    def test_original_fail_closed_guards_remain(self) -> None:
        def malformed_primary_hash(document):
            document["inputs"][0]["corrected"]["sha256"] = "not-a-sha256"

        def wrong_path(document):
            document["inputs"][0]["provenance"]["path"] += ".wrong"

        def wrong_commit(document):
            document["inputs"][0]["provenance"]["commit"] = "0" * 40

        def wrong_count(document):
            document["inputs"].pop()

        def duplicate_alias(document):
            document["inputs"][1]["alias"] = document["inputs"][0]["alias"]

        def duplicate_predecessor_path(document):
            document["outputs"][1]["path"] = document["outputs"][0]["path"]

        def unpinned_commit(document):
            document["commits"]["R6"]["commit"] = "0" * 40

        def bad_integrity(document):
            document["threeDependencyEvidence"]["threeIntegrity"] = "sha512-invalid"

        cases = (
            ("candidate-input-provenance.json", malformed_primary_hash),
            ("candidate-input-provenance.json", wrong_path),
            ("candidate-input-provenance.json", wrong_commit),
            ("candidate-input-provenance.json", wrong_count),
            ("candidate-input-provenance.json", duplicate_alias),
            ("predecessor-output-git-blobs.json", duplicate_predecessor_path),
            ("source-binding.json", unpinned_commit),
            ("source-binding.json", bad_integrity),
        )
        for file_name, mutate in cases:
            with self.subTest(file=file_name, mutation=mutate.__name__):
                self.assert_case_fails(file_name, mutate)

        with tempfile.TemporaryDirectory(dir=ROOT / ".work" / "test-cases") as directory:
            case_root = Path(directory)
            self.case_copy(case_root)
            (case_root / "source-binding.json").unlink()
            with mock.patch.object(VERIFIER, "PACKAGE_DIR", case_root):
                with self.assertRaises(OSError):
                    VERIFIER.run_verification(CANDIDATE_COMMIT)

    def test_installed_package_identity_version_and_bytes_use_disposable_copies(self) -> None:
        installed_root = (REPO_ROOT / "app" / "node_modules" / "three").resolve(strict=True)
        expected_root = VERIFIER.EXPECTED_THREE_PACKAGE_ROOT
        dependency = read_json(ROOT / "source-binding.json")["threeDependencyEvidence"]

        def make_copy(directory: Path) -> Path:
            package_root = directory / "three"
            (package_root / "build").mkdir(parents=True)
            shutil.copyfile(installed_root / "package.json", package_root / "package.json")
            for row in VERIFIER.EXPECTED_THREE_PACKAGE_FILES:
                shutil.copyfile(installed_root / row["packageFile"], package_root / row["packageFile"])
            return package_root

        with tempfile.TemporaryDirectory(dir=ROOT / ".work" / "test-cases") as directory:
            package_root = make_copy(Path(directory))
            package_info = VERIFIER.validate_installed_three_package(package_root, expected_root, dependency)
            self.assertEqual(package_info["version"], "0.180.0")

        for label, mutate_package in (
            ("name", lambda package: package.__setitem__("name", "not-three")),
            ("version", lambda package: package.__setitem__("version", "0.181.0")),
        ):
            with self.subTest(case=label), tempfile.TemporaryDirectory(dir=ROOT / ".work" / "test-cases") as directory:
                package_root = make_copy(Path(directory))
                package_json = read_json(package_root / "package.json")
                mutate_package(package_json)
                (package_root / "package.json").write_text(json.dumps(package_json), encoding="utf-8")
                with self.assertRaises(VERIFIER.VerificationError):
                    VERIFIER.validate_installed_three_package(package_root, expected_root, dependency)

        for row in VERIFIER.EXPECTED_THREE_PACKAGE_FILES:
            with self.subTest(file=row["packageFile"]), tempfile.TemporaryDirectory(dir=ROOT / ".work" / "test-cases") as directory:
                package_root = make_copy(Path(directory))
                target = package_root / row["packageFile"]
                data = bytearray(target.read_bytes())
                data[0] ^= 1
                target.write_bytes(data)
                with self.assertRaises(VERIFIER.VerificationError):
                    VERIFIER.validate_installed_three_package(package_root, expected_root, dependency)

    def test_uncached_cli_rejects_zeroed_manifest_hash_with_output_check(self) -> None:
        scratch_parent = REPO_ROOT / ".finish-c1-r8-cli"
        created_parent = not scratch_parent.exists()
        scratch_parent.mkdir(exist_ok=True)
        try:
            with tempfile.TemporaryDirectory(dir=scratch_parent) as directory:
                case_root = Path(directory)
                (case_root / "source").mkdir()
                for name in RECEIPT_FILES:
                    shutil.copyfile(ROOT / name, case_root / name)
                shutil.copyfile(ROOT / "source" / "verify-input-provenance.py", case_root / "source" / "verify-input-provenance.py")
                receipt_path = case_root / "candidate-input-provenance.json"
                receipt = read_json(receipt_path)
                receipt["sourceManifest"]["sha256"] = "0" * 64
                receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
                command = [
                    sys.executable,
                    "-B",
                    str(case_root / "source" / "verify-input-provenance.py"),
                    "--json",
                    "--check-output-manifest",
                    "--commit",
                    CANDIDATE_COMMIT,
                ]
                result = subprocess.run(command, cwd=REPO_ROOT, capture_output=True, text=True, check=False)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertEqual(json.loads(result.stdout)["status"], "FAIL")
                self.assertIn("sourceManifest sha256", json.loads(result.stdout)["errors"][0])
                self.assertEqual(result.stderr, "")
        finally:
            if created_parent and not any(scratch_parent.iterdir()):
                scratch_parent.rmdir()


if __name__ == "__main__":
    unittest.main(verbosity=2)
