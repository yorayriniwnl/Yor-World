"""Policy-driven fresh detached-checkout release execution. No approval, deployment or audit authority."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import subprocess
import sys
import time

BASE = "eb1ff201391334d6041b35c59eb350fcd012a79c"
DEFAULT_POLICY = "scripts/release/rc6-policy.json"
AUTHORIZED_PRODUCTION = [
    "app/src/features/world/WorldRoot.tsx", "app/src/features/world/WorldRuntime.ts",
    "app/src/features/world/LifecycleManager.ts", "app/src/features/world/world.module.css",
    "app/src/app/api/health/route.ts", "app/src/server/health.ts",
    "app/next.config.ts", "app/src/app/layout.tsx", "app/src/proxy.ts", "app/src/security/policy.ts",
]
PROTECTED = ["app", "scripts/release", ".github/workflows"]
HISTORICAL = [
    "deliveries/A6", "deliveries/C1", "deliveries/C2", "deliveries/C3", "deliveries/C4",
    "deliveries/production-environment", "deliveries/interaction-assets", "deliveries/B4",
    "deliveries/G6/corrections", "deliveries/G6/full-stack-integration",
    "deliveries/G6/gemini-1-platform", "deliveries/G6/gemini-2-world",
    "deliveries/G6/rc3-supplemental-codex-verification", "deliveries/G6/rc3-platform-corrections",
    "deliveries/G6/rc3-platform-independent-verification", "deliveries/G6/rc3-platform-residual-corrections",
    "deliveries/G6/rc4-candidate", "deliveries/G6/rc5-candidate", "docs/releases/v1.0.0-rc1.md", "docs/releases/v1.0.0-rc2.md", "docs/releases/v1.0.0-rc3.md", "docs/releases/v1.0.0-rc4.md", "docs/releases/v1.0.0-rc5.md", "docs/planning/reviews", "references",
]
EVIDENCE_ENV = ["B5_EVIDENCE_DIR", "C3_EVIDENCE_DIR", "C1_EVIDENCE_DIR", "G1_EVIDENCE_DIR",
                "W3_EVIDENCE_DIR", "A2_EVIDENCE_DIR", "A3_EVIDENCE_DIR", "A4_EVIDENCE_DIR"]
PRIVATE_ENV = ["DATABASE_URL", "CONTACT_HASH_SECRET", "QUOTA_HASH_SECRET", "SUPABASE_SERVICE_ROLE_KEY",
               "MEDIA_PRIVATE_BUCKET", "RESEND_API_KEY", "MAIL_FROM", "OWNER_NOTIFICATION_EMAIL",
               "CRON_SECRET", "INTERNAL_JOB_KEY", "GITHUB_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY",
               "SUPABASE_SERVICE_KEY", "NEXT_PUBLIC_BASE_URL", "NEXT_PUBLIC_SUPABASE_URL",
               "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
PRESERVED_OUTPUTS = [
    "deliveries/C4", "deliveries/G6/full-stack-integration",
    "deliveries/G6/rc4-candidate", "deliveries/G6/rc5-candidate",
    "deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
    "deliveries/G7/rc6-candidate-r3", "deliveries/G7/rc6-candidate-r4", "deliveries/G7/rc6-candidate-r5",
    "deliveries/G7/rc6-candidate-r6",
    "deliveries/G7/rc6-candidate-r7/release-composition.json",
    "deliveries/G7/rc6-candidate-r7/gltf-validation-receipt.json",
    "deliveries/G7/rc6-independent-delta/r6-audit",
    "deliveries/G7/rc6-independent-delta/gate-advice/final-r6",
    "docs/planning/reviews/2026-10-08-rc6-r1",
    "docs/planning/reviews/2026-10-08-rc6-r1.md",
    "docs/planning/reviews/2026-10-06-g6-r1",
    "docs/planning/reviews/2026-10-06-g6-r1.md",
    "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
    *[f"docs/releases/v1.0.0-rc{number}.md" for number in range(1, 6)],
]


def safe_output(root, name):
    if (not isinstance(name, str) or not name or re.search(r'[\\\x00-\x1f:<>"|?*]', name)
            or name.startswith("/") or any(part in ["", ".", ".."] or part.endswith((".", " "))
            or re.match(r"^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)", part, re.I)
            for part in name.split("/"))):
        raise ValueError(f"Unsafe repository output path: {name}")
    root = root.resolve()
    target = root.joinpath(*PurePosixPath(name).parts)
    resolved = target.resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"Output alias escapes repository: {name}")
    for reserved in PRESERVED_OUTPUTS:
        protected = root / reserved
        if target.is_relative_to(protected) or resolved.is_relative_to(protected.resolve()):
            raise ValueError(f"Preserved release proof cannot be overwritten: {name}")
    # Filesystem aliases cannot form portable release evidence, even within the repository.
    if resolved != target:
        raise ValueError(f"Output must use a portable path without filesystem aliases: {name}")
    assert_single_link_output(target)
    return target


def assert_single_link_output(path):
    try:
        stat = path.stat()
        if path.is_file() and stat.st_nlink > 1:
            raise ValueError(f"Hard-linked release output is forbidden: {path}")
    except FileNotFoundError:
        pass


def assert_policy_outputs(root, policy):
    delivery = policy.get("deliveryRoot")
    archive = policy.get("bundle", {}).get("path")
    safe_output(root, delivery)
    safe_output(root, archive)
    if (not delivery.startswith("deliveries/G7/")
            or archive != f"{delivery}/yor-world-{policy.get('releaseId')}.bundle.tar.gz"):
        raise ValueError("Archive output policy must bind the canonical bundle inside deliveryRoot")


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def write_json(path, value):
    assert_single_link_output(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, indent=2) + "\n")


def files_equal(left, right):
    if left.stat().st_size != right.stat().st_size:
        return False
    with left.open("rb") as left_stream, right.open("rb") as right_stream:
        while True:
            left_chunk = left_stream.read(1024 * 1024)
            right_chunk = right_stream.read(1024 * 1024)
            if left_chunk != right_chunk:
                return False
            if not left_chunk:
                return True


def export_plan(source, target, append_only=False):
    """Preflight a detached output without replacing any primary evidence."""
    assert_single_link_output(target)
    if not target.exists():
        return "create", 0
    if not target.is_file():
        raise ValueError(f"Existing export destination is not a regular file: {target}")
    target_size = target.stat().st_size
    source_size = source.stat().st_size
    if target_size == source_size and files_equal(source, target):
        return "same", target_size
    if not append_only or target_size >= source_size:
        raise ValueError(f"Existing export differs; refusing to overwrite prior evidence: {target}")
    with source.open("rb") as source_stream, target.open("rb") as target_stream:
        remaining = target_size
        while remaining:
            chunk = target_stream.read(min(1024 * 1024, remaining))
            if not chunk or source_stream.read(len(chunk)) != chunk:
                raise ValueError(f"Existing export is not a preserved prefix: {target}")
            remaining -= len(chunk)
    if target_size:
        with target.open("rb") as stream:
            stream.seek(-1, os.SEEK_END)
            if stream.read(1) != b"\n":
                raise ValueError(f"Existing execution log ends with an incomplete record: {target}")
    return "append", target_size


def export_file(source, target, append_only=False, plan=None):
    """Create a primary copy exclusively, or append only verified new log bytes."""
    action, expected_size = plan or export_plan(source, target, append_only)
    if action == "same":
        if not target.is_file() or not files_equal(source, target):
            raise ValueError(f"Export destination changed after preflight: {target}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    if action == "create":
        with source.open("rb") as source_stream, target.open("xb") as target_stream:
            shutil.copyfileobj(source_stream, target_stream)
        return
    if action != "append" or not append_only or target.stat().st_size != expected_size:
        raise ValueError(f"Export destination changed after preflight: {target}")
    current_action, current_size = export_plan(source, target, append_only=True)
    if current_action != "append" or current_size != expected_size:
        raise ValueError(f"Export destination changed after preflight: {target}")
    with source.open("rb") as source_stream, target.open("ab") as target_stream:
        source_stream.seek(expected_size)
        shutil.copyfileobj(source_stream, target_stream)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def capture(command, cwd):
    return subprocess.check_output(command, cwd=cwd, text=True, encoding="utf-8", errors="replace").strip()


def git(cwd, *args):
    return capture(["git", *args], cwd)


class Driver:
    def __init__(self, args):
        self.args = args
        self.repo = args.repository.resolve()
        self.checkout = args.checkout.resolve()
        self.policy_path = args.policy
        self.policy = json.loads((self.repo / self.policy_path).read_text(encoding="utf-8"))
        assert_policy_outputs(self.repo, self.policy)
        assert_policy_outputs(self.checkout, self.policy)
        self.delivery_relative = Path(self.policy["deliveryRoot"])
        if self.delivery_relative.is_absolute() or ".." in self.delivery_relative.parts or self.policy["deliveryRoot"].startswith("deliveries/G6/"):
            raise ValueError("Successor output must use a new safe delivery root")
        self.delivery = self.checkout / self.delivery_relative
        self.destination = self.repo / self.delivery_relative
        self.release_id = self.policy["releaseId"]
        self.evidence = self.delivery / "evidence"
        self.session_path = self.evidence / "session.json"
        self.pnpm = "pnpm.cmd" if os.name == "nt" else "pnpm"
        self.source = args.source
        self.env = os.environ.copy()
        for name in PRIVATE_ENV + EVIDENCE_ENV + ["PORT", "YOR_E2E_FIXTURE", "YOR_TEST_DATABASE_PATH"]:
            self.env.pop(name, None)
        self.env.update(CI="true", NEXT_TELEMETRY_DISABLED="1", FORCE_COLOR="0")

    def guard_outputs(self):
        for root in [self.repo, self.checkout]:
            policy_path = root / self.policy_path
            if policy_path.exists() and json.loads(policy_path.read_text(encoding="utf-8")) != self.policy:
                raise RuntimeError("Output policy drifted after driver initialization; no writes allowed")
            assert_policy_outputs(root, self.policy)
            delivery = root / self.delivery_relative
            if delivery.exists():
                for path in delivery.rglob("*"):
                    safe_output(root, path.relative_to(root).as_posix())

    def export(self):
        self.guard_outputs()
        # The parent owns report/docs/observer; do not copy committed tools over its current work.
        copies = []
        for path in self.delivery.rglob("*"):
            relative = path.relative_to(self.delivery)
            if not path.is_file() or relative.parts[0] == "tools" or "__pycache__" in relative.parts:
                continue
            name = (self.delivery_relative / relative).as_posix()
            safe_output(self.checkout, name)
            target = safe_output(self.repo, name)
            append_only = relative.as_posix() == "evidence/execution.jsonl"
            plan = export_plan(path, target, append_only)
            copies.append((path, target, append_only, plan))
        # Preflight every source/destination before creating or appending any files.
        for path, target, append_only, plan in copies:
            export_file(path, target, append_only, plan)

    def verify_exported_inputs(self):
        """Reject incomplete, divergent or nonportable final inputs before primary validation."""
        assert_policy_outputs(self.repo, self.policy)
        assert_policy_outputs(self.checkout, self.policy)
        delivery = self.delivery_relative.as_posix()
        def input_path(root, name):
            if not isinstance(name, str) or not name.startswith(delivery + "/"):
                raise ValueError(f"Mandatory exported input is outside deliveryRoot: {name}")
            path = safe_output(root, name)
            if not path.is_file() or not path.stat().st_size:
                raise RuntimeError(f"Mandatory exported input is missing or empty: {path}")
            return path
        def compare(name, expected=None, mode="raw"):
            source = input_path(self.checkout, name).read_bytes()
            exported = input_path(self.repo, name).read_bytes()
            if exported != source:
                raise RuntimeError(f"Exported input differs from detached proof: {name}")
            if mode not in ["raw", "lf"]:
                raise ValueError(f"Unknown exported input hash mode: {mode}")
            content = exported.replace(b"\r\n", b"\n") if mode == "lf" else exported
            if expected is not None and (not re.fullmatch(r"[a-f0-9]{64}", expected)
                                         or hashlib.sha256(content).hexdigest() != expected):
                raise RuntimeError(f"Mandatory exported input hash mismatch: {name}")
            return exported
        manifest = json.loads(compare(f"{delivery}/release-manifest.json"))
        if manifest.get("sourceCommit") != self.source or manifest.get("releaseBundlePath") != self.policy["bundle"]["path"]:
            raise RuntimeError("Exported manifest does not bind the exact source and policy archive")
        archive = compare(self.policy["bundle"]["path"], manifest.get("releaseBundleSha256", ""))
        bundle = json.loads(compare(f"{delivery}/bundle-receipt.json"))
        if (bundle.get("sourceCommit") != self.source or bundle.get("archivePath") != self.policy["bundle"]["path"]
                or bundle.get("sha256") != manifest.get("releaseBundleSha256") or bundle.get("bytes") != len(archive)):
            raise RuntimeError("Exported bundle receipt differs from the actual policy archive")
        supplemental = manifest.get("evidenceHashes", [])
        for suffix in self.policy["requiredEvidencePaths"]:
            name = f"{delivery}/{suffix}"
            if not any(item.get("path") == name for item in supplemental):
                raise RuntimeError(f"Missing mandatory exported evidence binding: {name}")
        for item in supplemental:
            compare(item["path"], item.get("sha256", ""), item.get("hashMode", "raw"))
        for binding in [manifest.get("sourceBinding", {}), manifest.get("composition", {})]:
            compare(binding.get("path"), binding.get("sha256", ""), binding.get("hashMode", "raw"))
        checks = manifest.get("requiredChecks", [])
        if sorted(check.get("id", "") for check in checks) != sorted(self.policy["requiredChecks"]):
            raise RuntimeError("Exported required check inventory differs from policy")
        for check in checks:
            if check.get("sourceCommit") != self.source or check.get("status") != "pass":
                raise RuntimeError("Exported required check is not exact-source PASS")
            compare(check.get("evidencePath"), None if check["id"] == "release-manifest-validation"
                    else check.get("evidenceSha256", ""), check.get("evidenceHashMode", "raw"))
        receipt = json.loads(compare(f"{delivery}/release-manifest-validation.receipt.json"))
        manifest_bytes = input_path(self.repo, f"{delivery}/release-manifest.json").read_bytes().replace(b"\r\n", b"\n")
        if (receipt.get("overallStatus") != "PASS" or receipt.get("sourceCommit") != self.source
                or receipt.get("manifestSha256") != hashlib.sha256(manifest_bytes).hexdigest()
                or receipt.get("releaseBundleSha256") != manifest["releaseBundleSha256"]):
            raise RuntimeError("Exported detached validation receipt does not bind final inputs")

    def verify_primary_validation(self):
        name = (self.delivery_relative / "primary-release-manifest-validation.receipt.json").as_posix()
        receipt = json.loads(safe_output(self.repo, name).read_text(encoding="utf-8"))
        manifest_path = self.destination / "release-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest_hash = hashlib.sha256(manifest_path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
        if (receipt.get("overallStatus") != "PASS" or receipt.get("sourceCommit") != self.source
                or receipt.get("manifestPath") != (self.delivery_relative / "release-manifest.json").as_posix()
                or receipt.get("manifestSha256") != manifest_hash
                or receipt.get("releaseBundleSha256") != manifest.get("releaseBundleSha256")):
            raise RuntimeError("Strict primary validation receipt is absent or differs from final exported proof")

    def assert_source(self):
        if git(self.checkout, "rev-parse", "HEAD") != self.source:
            raise RuntimeError("Detached checkout HEAD no longer equals exact sourceCommit")
        detached = subprocess.run(["git", "symbolic-ref", "-q", "HEAD"], cwd=self.checkout,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if detached.returncode != 1:
            raise RuntimeError("Checkout must remain detached")
        changes = git(self.checkout, "diff", "--name-only", "HEAD", "--", *PROTECTED)
        if changes:
            raise RuntimeError(f"Committed implementation changed during proof:\n{changes}")

    def record(self, check_id, command, cwd, number, env=None, output=False):
        self.guard_outputs()
        self.assert_source()
        log = self.evidence / f"{number:02d}-{check_id}.log"
        attempt = 1
        while log.exists():
            attempt += 1
            log = self.evidence / f"{number:02d}-{check_id}.attempt-{attempt:02d}.log"
        self.evidence.mkdir(parents=True, exist_ok=True)
        started = utc()
        command_env = {**self.env, **(env or {})}
        t0 = time.monotonic()
        chunks = []
        with log.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(f"COMMAND: {subprocess.list2cmdline(command)}\nCWD: {cwd}\nSOURCE: {self.source}\nSTARTED: {started}\n")
            stream.flush()
            try:
                process = subprocess.Popen(command, cwd=cwd, env=command_env, stdout=subprocess.PIPE,
                                           stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
                assert process.stdout is not None
                for line in process.stdout:
                    stream.write(line)
                    stream.flush()
                    chunks.append(line)
                    if not output:
                        print(line, end="", flush=True)
                code = process.wait()
            except OSError as error:
                code = 127
                line = f"PROCESS START FAILURE: {error}\n"
                chunks.append(line)
                stream.write(line)
            stream.write(f"\nEXIT CODE: {code}\n")
        record = {
            "id": check_id, "attempt": attempt, "command": command,
            "cwd": str(cwd), "startedAt": started, "completedAt": utc(), "sourceCommit": self.source,
            "sourceAppTree": git(self.checkout, "rev-parse", f"{self.source}:app"),
            "fixtureMode": command_env.get("YOR_E2E_FIXTURE") == "1",
            "durationSeconds": round(time.monotonic() - t0, 3), "exitCode": code,
            "evidencePath": log.relative_to(self.checkout).as_posix(), "evidenceSha256": digest(log),
            "environment": {name: command_env[name] for name in ["CI", "NEXT_TELEMETRY_DISABLED",
                            "YOR_E2E_FIXTURE", "YOR_TEST_DATABASE_PATH", *EVIDENCE_ENV] if name in command_env},
        }
        plain = re.sub(r"\x1b\[[0-9;]*m", "", "".join(chunks))
        if check_id in ["unit-tests", "integration-tests"]:
            counts = {}
            for label in ["Test Files", "Tests"]:
                match = re.search(rf"\b{label}\s+(\d+) passed.*?\((\d+)\)", plain)
                if match:
                    counts[label] = {"passed": int(match[1]), "total": int(match[2])}
            record["testCounts"] = counts
        with (self.evidence / "execution.jsonl").open("a", encoding="utf-8", newline="\n") as stream:
            stream.write(json.dumps(record) + "\n")
        self.export()
        print(json.dumps(record), flush=True)
        if code:
            raise RuntimeError(f"{check_id} failed with exit {code}; logs retained, no automatic rerun")
        return plain

    def prepare(self):
        self.guard_outputs()
        if not re.fullmatch(r"[a-f0-9]{40}", self.source):
            raise ValueError("--source must be a full commit SHA")
        if self.checkout.exists():
            raise RuntimeError("Checkout target already exists; use a new path or a later phase")
        if self.checkout == self.repo or self.repo in self.checkout.parents:
            raise RuntimeError("Fresh checkout must be outside the primary repository")
        if self.destination.exists() or self.destination.is_symlink():
            raise RuntimeError("Delivery target already exists, even if incomplete; preserve it and choose a new delivery revision")
        resolved = git(self.repo, "rev-parse", f"{self.source}^{{commit}}")
        if resolved != self.source:
            raise RuntimeError("Source identity did not resolve exactly")
        committed_policy = json.loads(git(self.repo, "show", f"{self.source}:{self.policy_path}"))
        if committed_policy != self.policy:
            raise RuntimeError("Primary policy differs from the policy frozen in sourceCommit")
        started = utc()
        t0 = time.monotonic()
        result = subprocess.run(["git", "worktree", "add", "--detach", str(self.checkout), self.source],
                                cwd=self.repo, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if result.returncode:
            raise RuntimeError(f"Worktree creation failed ({result.returncode}): {result.stdout}{result.stderr}")
        self.evidence.mkdir(parents=True, exist_ok=False)
        write_json(self.evidence / "prepare-started.json", {
            "phase": "prepare", "status": "STARTED", "sourceCommit": self.source,
            "deliveryRoot": self.delivery_relative.as_posix(), "startedAt": utc(),
        })
        initial = {
            "nodeModulesPresent": (self.checkout / "app/node_modules").exists(),
            "nextBuildPresent": (self.checkout / "app/.next").exists(),
            "trackedChanges": git(self.checkout, "status", "--porcelain"),
        }
        if any(initial.values()):
            raise RuntimeError(f"Checkout is not initially pristine: {initial}")
        write_json(self.session_path, {
            "releaseId": self.release_id, "sourceCommit": self.source,
            "sourceAppTree": git(self.checkout, "rev-parse", f"{self.source}:app"),
            "checkoutPath": str(self.checkout), "repositoryPath": str(self.repo),
            "startedAt": started, "worktreeCommand": ["git", "worktree", "add", "--detach", str(self.checkout), self.source],
            "worktreeExitCode": result.returncode, "worktreeDurationSeconds": round(time.monotonic() - t0, 3),
            "initialState": initial, "clientDate": self.args.client_date, "clientTimezone": "Asia/Calcutta",
            "executionMode": "Fresh exact-source detached Git worktree; CI=true; pinned full Chromium browser channel; no pre-existing dependencies or build output.",
            "secretConfiguration": "App service environment removed; synthetic E2E fixture configuration exists only for E2E/accessibility commands.",
        })
        historical_delta = [line.split("\t", 1) for line in git(self.checkout, "diff", "--name-status", BASE, self.source, "--", *HISTORICAL).splitlines()]
        historical = [name for status, name in historical_delta if not (status == "A" and name.startswith("docs/planning/reviews/"))]
        added_review_files = [name for status, name in historical_delta if status == "A" and name.startswith("docs/planning/reviews/")]
        production = git(self.checkout, "diff", "--name-only", BASE, self.source, "--", "app/src", "app/public", "app/supabase").splitlines()
        authorized = set(AUTHORIZED_PRODUCTION + self.args.authorized_production_path)
        unauthorized = [name for name in production if name not in authorized]
        write_json(self.evidence / "historical-immutability.json", {
            "baseCommit": BASE, "sourceCommit": self.source, "historicalPaths": HISTORICAL,
            "changedHistoricalPaths": historical, "protectedProductionPaths": ["app/src", "app/public", "app/supabase"],
            "newReviewFilesAllowedByParent": added_review_files,
            "changedProductionPaths": production, "authorizedProductionPaths": sorted(authorized), "unauthorizedProductionPaths": unauthorized, "overallStatus": "FAIL" if historical or unauthorized else "PASS",
        })
        self.export()
        if historical or unauthorized:
            raise RuntimeError(f"Historical or unauthorized production trees changed: {historical + unauthorized}")
        write_json(self.evidence / "prepare-completed.json", {
            "phase": "prepare", "status": "PASS", "sourceCommit": self.source,
            "deliveryRoot": self.delivery_relative.as_posix(), "completedAt": utc(),
        })
        self.export()
        print(f"Prepared fresh detached checkout at {self.checkout}", flush=True)

    def require_session(self):
        self.guard_outputs()
        session = json.loads(self.session_path.read_text(encoding="utf-8"))
        if session["sourceCommit"] != self.source or session["checkoutPath"] != str(self.checkout):
            raise RuntimeError("Session identity differs from requested exact checkout")
        self.assert_source()
        self.require_phase_complete("prepare")

    def phase_path(self, phase, state, root=None):
        root = root or self.checkout
        return safe_output(root, (self.delivery_relative / "evidence" / f"{phase}-{state}.json").as_posix())

    def require_phase_complete(self, phase):
        checkout_receipt = self.phase_path(phase, "completed")
        primary_receipt = self.phase_path(phase, "completed", self.repo)
        if not checkout_receipt.is_file() or not primary_receipt.is_file():
            raise RuntimeError(f"Required {phase} phase completion is absent; interrupted attempts must use a new delivery revision")
        checkout_bytes = checkout_receipt.read_bytes()
        if primary_receipt.read_bytes() != checkout_bytes:
            raise RuntimeError(f"Primary {phase} completion differs from detached evidence")
        receipt = json.loads(checkout_bytes)
        if (receipt.get("phase") != phase or receipt.get("status") != "PASS"
                or receipt.get("sourceCommit") != self.source
                or receipt.get("deliveryRoot") != self.delivery_relative.as_posix()):
            raise RuntimeError(f"{phase} completion does not bind this source and delivery")

    def begin_phase(self, phase, prerequisite):
        if prerequisite:
            self.require_phase_complete(prerequisite)
        started = self.phase_path(phase, "started")
        completed = self.phase_path(phase, "completed")
        if started.exists() or completed.exists():
            raise RuntimeError(f"{phase} phase already started or completed; preserve this attempt and use a new delivery revision")
        write_json(started, {
            "phase": phase, "status": "STARTED", "sourceCommit": self.source,
            "deliveryRoot": self.delivery_relative.as_posix(), "startedAt": utc(),
        })
        self.export()

    def finish_phase(self, phase):
        write_json(self.phase_path(phase, "completed"), {
            "phase": phase, "status": "PASS", "sourceCommit": self.source,
            "deliveryRoot": self.delivery_relative.as_posix(), "completedAt": utc(),
        })
        self.export()

    def browser_env(self, bucket, fixture):
        destination = self.evidence / bucket
        destination.mkdir(parents=True, exist_ok=True)
        env = {name: str(destination) for name in EVIDENCE_ENV}
        if fixture:
            env.update(YOR_E2E_FIXTURE="1", YOR_TEST_DATABASE_PATH=str(self.checkout / f".release-{bucket}-db"))
            if bucket == "e2e":
                env["CRON_SECRET"] = "release-local-synthetic-job-secret"
        return env

    def discover(self, check_id, arguments, expected, number):
        raw = self.record(f"{check_id}-discovery", [self.pnpm, "exec", "playwright", "test", *arguments,
                          "--list", "--reporter=json"], self.checkout / "app", number, output=True)
        report = json.loads(raw)
        if len(report.get("config", {}).get("projects", [])) != 1:
            raise RuntimeError("Fresh candidate discovery must use exactly one CI Chromium project")
        def count(suites):
            return sum(sum(len(spec.get("tests", [])) for spec in suite.get("specs", []))
                       + count(suite.get("suites", [])) for suite in suites)
        actual = count(report.get("suites", []))
        write_json(self.evidence / f"{check_id}-discovery.json", report)
        if actual <= 0 or (expected is not None and actual != expected):
            self.export()
            raise RuntimeError(f"{check_id} discovery count {actual} differs from authoritative expected {expected}")
        identities = []
        def collect(suites):
            for suite in suites:
                for spec in suite.get("specs", []):
                    for case in spec.get("tests", []):
                        identities.append({"id": spec.get("id"), "file": spec.get("file"), "title": spec.get("title"), "projectId": case.get("projectId"), "line": spec.get("line")})
                collect(suite.get("suites", []))
        collect(report.get("suites", []))
        write_json(self.evidence / f"{check_id}-inventory.json", {"sourceCommit": self.source, "discoveredCount": actual, "policyExpectedCount": expected, "cases": identities})
        return actual

    def verify_browser(self, check_id, path, expected, number):
        self.record(check_id, ["node", "scripts/release/verify-playwright-results.mjs", path,
                              "--expected", str(expected)], self.checkout, number)
        report = json.loads((self.checkout / path).read_text(encoding="utf-8"))
        if report["stats"]["expected"] != expected:
            raise RuntimeError(f"{check_id}: expected {expected} actual passing executions, got {report['stats']}")

    def checks(self):
        self.require_session()
        self.begin_phase("checks", "prepare")
        app = self.checkout / "app"
        counts = {}
        for number, check_id, args in [
            (1, "frozen-install", ["install", "--frozen-lockfile"]), (2, "lint", ["lint"]),
            (3, "typecheck", ["typecheck"]), (4, "unit-tests", ["test:unit"]),
            (5, "integration-tests", ["test:integration"]),
        ]:
            self.record(check_id, [self.pnpm, *args], app, number)
        self.record("asset-validation", ["node", "scripts/release/validate-gltf-assets.mjs", "--output",
                    (self.delivery_relative / "asset-validation.json").as_posix()], self.checkout, 6)
        self.record("production-build", [self.pnpm, "build"], app, 7)
        build_id = (app / ".next/BUILD_ID").read_text(encoding="utf-8").strip()
        self.record("browser-install", [self.pnpm, "exec", "playwright", "install", "chromium"], app, 18)
        browser_script = ('const {chromium}=require("@playwright/test");(async()=>{'
                          'const browser=await chromium.launch({channel:"chromium",headless:true});'
                          'console.log(JSON.stringify({version:browser.version(),executable:chromium.executablePath(),'
                          'channel:"chromium",headless:true}));await browser.close();})().catch(e=>{console.error(e);process.exit(1)})')
        raw = self.record("browser-version", ["node", "-e", browser_script], app, 19, output=True)
        package = json.loads((app / "package.json").read_text(encoding="utf-8"))
        session = json.loads(self.session_path.read_text(encoding="utf-8"))
        versions = {
            "clientDate": self.args.client_date, "clientTimezone": "Asia/Calcutta", "sourceCommit": self.source,
            "sourceAppTree": git(self.checkout, "rev-parse", f"{self.source}:app"),
            "node": capture(["node", "--version"], self.checkout),
            "pnpm": capture([self.pnpm, "--version"], self.checkout),
            "git": git(self.checkout, "--version"), "python": platform.python_version(), "os": platform.platform(),
            "workingDirectory": str(self.checkout), "canonicalApplicationRoot": "app",
            "executionMode": "Fresh detached checkout; CI=true selects exactly one Chromium project for all browser checks.",
            "cleanInitialState": session["initialState"], "packageVersion": package["version"],
            "packageManager": package["packageManager"], "declaredNodeEngine": package["engines"]["node"],
            "playwrightPackage": package["devDependencies"]["@playwright/test"], "buildId": build_id,
            "browser": json.loads(raw), "installedPlaywrightVersion": capture([self.pnpm, "exec", "playwright", "--version"], app),
            "lockfileSha256": hashlib.sha256((app / "pnpm-lock.yaml").read_bytes().replace(b"\r\n", b"\n")).hexdigest(),
            "lockfileHashMode": "lf", "dependencyDownloadCache": "pnpm host store may be reused; node_modules and .next did not exist at checkout creation.",
        }
        write_json(self.evidence / "versions.json", versions)
        counts["e2e"] = self.discover("e2e", [], self.args.expected_e2e or self.policy.get("expectedBrowserChecks", {}).get("e2e"), 20)
        counts["accessibility"] = self.discover("accessibility", ["tests/e2e/accessibility.spec.ts"], self.args.expected_accessibility or self.policy.get("expectedBrowserChecks", {}).get("accessibility"), 21)
        counts["performance"] = self.discover("performance", ["--config", "playwright.performance.config.ts"], self.args.expected_performance or self.policy.get("expectedBrowserChecks", {}).get("performance"), 22)
        for number, check_id, bucket, command, fixture, verify_id, verify_number, report_name in [
            (8, "e2e-tests", "e2e", [self.pnpm, "test:e2e"], True, "browser-report-verification", 15, "browser-results.json"),
            (9, "accessibility", "accessibility", [self.pnpm, "exec", "playwright", "test", "tests/e2e/accessibility.spec.ts"], True,
             "accessibility-report-verification", 16, "browser-results.json"),
            (10, "performance-tests", "performance", [self.pnpm, "test:performance"], False, "performance-report-verification", 17, "performance-results.json"),
        ]:
            env = self.browser_env(bucket, fixture)
            destination = self.evidence / bucket / "test-results"
            self.record(check_id, [*command, "--output", str(destination)], app, number, env)
            path = (self.delivery_relative / "evidence" / bucket / report_name).as_posix()
            self.verify_browser(verify_id, path, counts[bucket], verify_number)
        self.record("release-composition", ["node", "scripts/release/check-release-composition.mjs", "--output",
                    (self.delivery_relative / "release-composition.json").as_posix()], self.checkout, 11)
        self.record("budget-regression", ["node", "scripts/release/check-performance-budgets.mjs", "--benchmark-dir",
                    (self.delivery_relative / "evidence/performance").as_posix(), "--output",
                    (self.delivery_relative / "budget-validation-receipt.json").as_posix()], self.checkout, 12)
        write_json(self.evidence / "browser-counts.json", {
            "sourceCommit": self.source, "projectMode": "CI=true Chromium", "discoveredCounts": counts,
            "executedCounts": {bucket: json.loads((self.evidence / bucket / filename).read_text(encoding="utf-8"))["stats"]
                               for bucket, filename in [("e2e", "browser-results.json"), ("accessibility", "browser-results.json"),
                                                        ("performance", "performance-results.json")]},
            "overallStatus": "PASS", "buildId": versions["buildId"],
        })
        self.export()
        self.finish_phase("checks")

    def package(self):
        self.require_session()
        self.begin_phase("package", "checks")
        counts = json.loads((self.evidence / "browser-counts.json").read_text(encoding="utf-8"))
        if counts["sourceCommit"] != self.source or counts["overallStatus"] != "PASS":
            raise RuntimeError("Fresh check completion receipt is absent or bound to another source")
        self.record("bundle-assembly", ["node", "scripts/release/build-release-bundle.mjs", "--source-commit", self.source], self.checkout, 14)
        assembly = Path(__file__).with_name("assemble-evidence.py")
        self.record("evidence-assembly", [sys.executable, str(assembly), "--repository", str(self.checkout), "--policy", self.policy_path, "--source", self.source], self.checkout, 23)
        self.finish_phase("package")

    def validate(self):
        self.require_session()
        self.begin_phase("validate", "package")
        self.record("release-manifest-validation", ["node", "scripts/release/validate-release.mjs", "--strict", "--receipt",
                    (self.delivery_relative / "release-manifest-validation.receipt.json").as_posix()], self.checkout, 13)
        self.export()
        self.verify_exported_inputs()
        self.record("primary-release-manifest-validation", ["node", "scripts/release/validate-release.mjs", "--strict", "--receipt",
                    (self.delivery_relative / "primary-release-manifest-validation.receipt.json").as_posix()], self.repo, 24)
        self.verify_exported_inputs()
        self.verify_primary_validation()
        self.finish_phase("validate")

    def inventory(self):
        self.require_session()
        self.begin_phase("inventory", "validate")
        self.verify_exported_inputs()
        self.verify_primary_validation()
        # Parent report and actual GitHub observations may now exist only in the primary delivery.
        assembly = Path(__file__).with_name("assemble-evidence.py")
        result = subprocess.run([sys.executable, str(assembly), "--repository", str(self.repo), "--policy", self.policy_path, "--source", self.source,
                                 "--inventory-only"], check=False)
        if result.returncode:
            raise RuntimeError(f"Final inventory failed: exit {result.returncode}")
        self.finish_phase("inventory")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--policy", default=DEFAULT_POLICY)
    parser.add_argument("--authorized-production-path", action="append", default=[], help="Extra exact path explicitly authorized by Parent packet")
    parser.add_argument("--source", required=True)
    parser.add_argument("--checkout", type=Path, required=True)
    parser.add_argument("--client-date", required=True, help="User-facing date, YYYY-MM-DD in Asia/Calcutta")
    parser.add_argument("--phase", choices=["prepare", "checks", "package", "validate", "inventory", "all"], default="all")
    parser.add_argument("--expected-e2e", type=int)
    parser.add_argument("--expected-accessibility", type=int)
    parser.add_argument("--expected-performance", type=int)
    args = parser.parse_args()
    dt.date.fromisoformat(args.client_date)
    driver = Driver(args)
    for phase in (["prepare", "checks", "package", "validate", "inventory"] if args.phase == "all" else [args.phase]):
        getattr(driver, phase)()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"FAIL release maker execution: {error}", file=sys.stderr, flush=True)
        sys.exit(1)
