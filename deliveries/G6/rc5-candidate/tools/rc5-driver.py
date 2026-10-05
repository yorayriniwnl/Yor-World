"""Fresh detached-checkout RC5 execution. No approval, deployment or audit authority."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import time

BASE = "8d9a8ac11eb748261f9c2ae6b59a5d9f66f3d4c4"
DELIVERY = Path("deliveries/G6/rc5-candidate")
PROTECTED = ["app", "scripts/release", ".github/workflows/ci.yml"]
HISTORICAL = [
    "deliveries/A6", "deliveries/C1", "deliveries/C2", "deliveries/C3", "deliveries/C4",
    "deliveries/production-environment", "deliveries/interaction-assets", "deliveries/B4",
    "deliveries/G6/corrections", "deliveries/G6/full-stack-integration",
    "deliveries/G6/gemini-1-platform", "deliveries/G6/gemini-2-world",
    "deliveries/G6/rc3-supplemental-codex-verification", "deliveries/G6/rc3-platform-corrections",
    "deliveries/G6/rc3-platform-independent-verification", "deliveries/G6/rc3-platform-residual-corrections",
    "deliveries/G6/rc4-candidate", "docs/releases/v1.0.0-rc4.md", "docs/planning/reviews", "references",
]
EVIDENCE_ENV = ["B5_EVIDENCE_DIR", "C3_EVIDENCE_DIR", "C1_EVIDENCE_DIR", "G1_EVIDENCE_DIR",
                "W3_EVIDENCE_DIR", "A2_EVIDENCE_DIR", "A3_EVIDENCE_DIR", "A4_EVIDENCE_DIR"]
PRIVATE_ENV = ["DATABASE_URL", "CONTACT_HASH_SECRET", "QUOTA_HASH_SECRET", "SUPABASE_SERVICE_ROLE_KEY",
               "MEDIA_PRIVATE_BUCKET", "RESEND_API_KEY", "MAIL_FROM", "OWNER_NOTIFICATION_EMAIL",
               "CRON_SECRET", "INTERNAL_JOB_KEY", "GITHUB_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY",
               "SUPABASE_SERVICE_KEY", "NEXT_PUBLIC_BASE_URL", "NEXT_PUBLIC_SUPABASE_URL",
               "NEXT_PUBLIC_SUPABASE_ANON_KEY"]


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


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
        self.delivery = self.checkout / DELIVERY
        self.destination = self.repo / DELIVERY
        self.evidence = self.delivery / "evidence"
        self.session_path = self.evidence / "session.json"
        self.pnpm = "pnpm.cmd" if os.name == "nt" else "pnpm"
        self.source = args.source
        self.env = os.environ.copy()
        for name in PRIVATE_ENV + EVIDENCE_ENV + ["PORT", "YOR_E2E_FIXTURE", "YOR_TEST_DATABASE_PATH"]:
            self.env.pop(name, None)
        self.env.update(CI="true", NEXT_TELEMETRY_DISABLED="1", FORCE_COLOR="0")

    def export(self):
        # The parent owns report/docs/observer; do not copy committed tools over its current work.
        for path in self.delivery.rglob("*"):
            relative = path.relative_to(self.delivery)
            if not path.is_file() or relative.parts[0] == "tools" or "__pycache__" in relative.parts:
                continue
            target = self.destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)

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
        with log.open("w", encoding="utf-8", newline="\n") as stream:
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
        if not re.fullmatch(r"[a-f0-9]{40}", self.source):
            raise ValueError("--source must be a full commit SHA")
        if self.checkout.exists():
            raise RuntimeError("Checkout target already exists; use a new path or a later phase")
        if self.checkout == self.repo or self.repo in self.checkout.parents:
            raise RuntimeError("Fresh checkout must be outside the primary repository")
        if (self.destination / "evidence/execution.jsonl").exists():
            raise RuntimeError("Existing RC5 execution evidence cannot be silently replaced; choose a new delivery revision")
        resolved = git(self.repo, "rev-parse", f"{self.source}^{{commit}}")
        if resolved != self.source:
            raise RuntimeError("Source identity did not resolve exactly")
        started = utc()
        t0 = time.monotonic()
        result = subprocess.run(["git", "worktree", "add", "--detach", str(self.checkout), self.source],
                                cwd=self.repo, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if result.returncode:
            raise RuntimeError(f"Worktree creation failed ({result.returncode}): {result.stdout}{result.stderr}")
        initial = {
            "nodeModulesPresent": (self.checkout / "app/node_modules").exists(),
            "nextBuildPresent": (self.checkout / "app/.next").exists(),
            "trackedChanges": git(self.checkout, "status", "--porcelain"),
        }
        if any(initial.values()):
            raise RuntimeError(f"Checkout is not initially pristine: {initial}")
        write_json(self.session_path, {
            "releaseId": "v1.0.0-rc5", "sourceCommit": self.source,
            "sourceAppTree": git(self.checkout, "rev-parse", f"{self.source}:app"),
            "checkoutPath": str(self.checkout), "repositoryPath": str(self.repo),
            "startedAt": started, "worktreeCommand": ["git", "worktree", "add", "--detach", str(self.checkout), self.source],
            "worktreeExitCode": result.returncode, "worktreeDurationSeconds": round(time.monotonic() - t0, 3),
            "initialState": initial, "clientDate": self.args.client_date, "clientTimezone": "Asia/Calcutta",
            "executionMode": "Fresh exact-source detached Git worktree; CI=true; pinned full Chromium browser channel; no pre-existing dependencies or build output.",
            "secretConfiguration": "App service environment removed; synthetic E2E fixture configuration exists only for E2E/accessibility commands.",
        })
        package = json.loads((self.checkout / "app/package.json").read_text(encoding="utf-8"))
        write_json(self.evidence / "versions.json", {
            "clientDate": self.args.client_date, "clientTimezone": "Asia/Calcutta", "sourceCommit": self.source,
            "sourceAppTree": git(self.checkout, "rev-parse", f"{self.source}:app"),
            "node": capture(["node", "--version"], self.checkout),
            "pnpm": capture([self.pnpm, "--version"], self.checkout),
            "git": git(self.checkout, "--version"), "python": platform.python_version(), "os": platform.platform(),
            "workingDirectory": str(self.checkout), "canonicalApplicationRoot": "app",
            "executionMode": "Fresh detached checkout; CI=true selects exactly one Chromium project for all browser checks.",
            "cleanInitialState": initial, "packageVersion": package["version"], "packageManager": package["packageManager"],
            "declaredNodeEngine": package["engines"]["node"], "playwrightPackage": package["devDependencies"]["@playwright/test"],
            "lockfileSha256": hashlib.sha256((self.checkout / "app/pnpm-lock.yaml").read_bytes().replace(b"\r\n", b"\n")).hexdigest(),
            "lockfileHashMode": "lf", "dependencyDownloadCache": "pnpm host store may be reused; node_modules and .next did not exist at checkout creation.",
        })
        historical = git(self.checkout, "diff", "--name-only", BASE, self.source, "--", *HISTORICAL).splitlines()
        production = git(self.checkout, "diff", "--name-only", BASE, self.source, "--", "app/src", "app/public", "app/supabase").splitlines()
        write_json(self.evidence / "historical-immutability.json", {
            "baseCommit": BASE, "sourceCommit": self.source, "historicalPaths": HISTORICAL,
            "changedHistoricalPaths": historical, "protectedProductionPaths": ["app/src", "app/public", "app/supabase"],
            "changedProductionPaths": production, "overallStatus": "FAIL" if historical or production else "PASS",
        })
        self.export()
        if historical or production:
            raise RuntimeError(f"Historical or protected production trees changed: {historical + production}")
        print(f"Prepared fresh detached checkout at {self.checkout}", flush=True)

    def require_session(self):
        session = json.loads(self.session_path.read_text(encoding="utf-8"))
        if session["sourceCommit"] != self.source or session["checkoutPath"] != str(self.checkout):
            raise RuntimeError("Session identity differs from requested exact checkout")
        self.assert_source()

    def browser_env(self, bucket, fixture):
        destination = self.evidence / bucket
        destination.mkdir(parents=True, exist_ok=True)
        env = {name: str(destination) for name in EVIDENCE_ENV}
        if fixture:
            env.update(YOR_E2E_FIXTURE="1", YOR_TEST_DATABASE_PATH=str(self.checkout / f".rc5-{bucket}-db"))
            if bucket == "e2e":
                env["CRON_SECRET"] = "rc5-local-synthetic-job-secret"
        return env

    def discover(self, check_id, arguments, expected, number):
        raw = self.record(f"{check_id}-discovery", [self.pnpm, "exec", "playwright", "test", *arguments,
                          "--list", "--reporter=json"], self.checkout / "app", number, output=True)
        report = json.loads(raw)
        def count(suites):
            return sum(sum(len(spec.get("tests", [])) for spec in suite.get("specs", []))
                       + count(suite.get("suites", [])) for suite in suites)
        actual = count(report.get("suites", []))
        write_json(self.evidence / f"{check_id}-discovery.json", report)
        if actual != expected:
            self.export()
            raise RuntimeError(f"{check_id} discovery count {actual} differs from authoritative expected {expected}")
        return actual

    def verify_browser(self, check_id, path, expected, number):
        self.record(check_id, ["node", "scripts/release/verify-playwright-results.mjs", path,
                              "--expected", str(expected)], self.checkout, number)
        report = json.loads((self.checkout / path).read_text(encoding="utf-8"))
        if report["stats"]["expected"] != expected:
            raise RuntimeError(f"{check_id}: expected {expected} actual passing executions, got {report['stats']}")

    def checks(self):
        self.require_session()
        app = self.checkout / "app"
        counts = {}
        for number, check_id, args in [
            (1, "frozen-install", ["install", "--frozen-lockfile"]), (2, "lint", ["lint"]),
            (3, "typecheck", ["typecheck"]), (4, "unit-tests", ["test:unit"]),
            (5, "integration-tests", ["test:integration"]),
        ]:
            self.record(check_id, [self.pnpm, *args], app, number)
        self.record("asset-validation", ["node", "scripts/release/validate-gltf-assets.mjs", "--output",
                    (DELIVERY / "asset-validation.json").as_posix()], self.checkout, 6)
        self.record("production-build", [self.pnpm, "build"], app, 7)
        versions_path = self.evidence / "versions.json"
        versions = json.loads(versions_path.read_text(encoding="utf-8"))
        versions["buildId"] = (app / ".next/BUILD_ID").read_text(encoding="utf-8").strip()
        self.record("browser-install", [self.pnpm, "exec", "playwright", "install", "chromium"], app, 18)
        browser_script = ('const {chromium}=require("@playwright/test");(async()=>{'
                          'const browser=await chromium.launch({channel:"chromium",headless:true});'
                          'console.log(JSON.stringify({version:browser.version(),executable:chromium.executablePath(),'
                          'channel:"chromium",headless:true}));await browser.close();})().catch(e=>{console.error(e);process.exit(1)})')
        raw = self.record("browser-version", ["node", "-e", browser_script], app, 19, output=True)
        versions["browser"] = json.loads(raw)
        versions["installedPlaywrightVersion"] = capture([self.pnpm, "exec", "playwright", "--version"], app)
        write_json(versions_path, versions)
        counts["e2e"] = self.discover("e2e", [], self.args.expected_e2e, 20)
        counts["accessibility"] = self.discover("accessibility", ["tests/e2e/accessibility.spec.ts"], self.args.expected_accessibility, 21)
        counts["performance"] = self.discover("performance", ["--config", "playwright.performance.config.ts"], self.args.expected_performance, 22)
        for number, check_id, bucket, command, fixture, verify_id, verify_number, report_name in [
            (8, "e2e-tests", "e2e", [self.pnpm, "test:e2e"], True, "browser-report-verification", 15, "browser-results.json"),
            (9, "accessibility", "accessibility", [self.pnpm, "exec", "playwright", "test", "tests/e2e/accessibility.spec.ts"], True,
             "accessibility-report-verification", 16, "browser-results.json"),
            (10, "performance-tests", "performance", [self.pnpm, "test:performance"], False, "performance-report-verification", 17, "performance-results.json"),
        ]:
            env = self.browser_env(bucket, fixture)
            destination = self.evidence / bucket / "test-results"
            self.record(check_id, [*command, "--output", str(destination)], app, number, env)
            path = (DELIVERY / "evidence" / bucket / report_name).as_posix()
            self.verify_browser(verify_id, path, counts[bucket], verify_number)
        self.record("release-composition", ["node", "scripts/release/check-release-composition.mjs", "--output",
                    (DELIVERY / "release-composition.json").as_posix()], self.checkout, 11)
        self.record("budget-regression", ["node", "scripts/release/check-performance-budgets.mjs", "--benchmark-dir",
                    (DELIVERY / "evidence/performance").as_posix(), "--output",
                    (DELIVERY / "budget-validation-receipt.json").as_posix()], self.checkout, 12)
        write_json(self.evidence / "browser-counts.json", {
            "sourceCommit": self.source, "projectMode": "CI=true Chromium", "discoveredCounts": counts,
            "executedCounts": {bucket: json.loads((self.evidence / bucket / filename).read_text(encoding="utf-8"))["stats"]
                               for bucket, filename in [("e2e", "browser-results.json"), ("accessibility", "browser-results.json"),
                                                        ("performance", "performance-results.json")]},
            "overallStatus": "PASS", "buildId": versions["buildId"],
        })
        self.export()

    def package(self):
        self.require_session()
        counts = json.loads((self.evidence / "browser-counts.json").read_text(encoding="utf-8"))
        if counts["sourceCommit"] != self.source or counts["overallStatus"] != "PASS":
            raise RuntimeError("Fresh check completion receipt is absent or bound to another source")
        self.record("bundle-assembly", ["node", "scripts/release/build-rc5-bundle.mjs", "--source-commit", self.source], self.checkout, 14)
        assembly = Path(__file__).with_name("assemble-evidence.py")
        self.record("evidence-assembly", [sys.executable, str(assembly), "--repository", str(self.checkout), "--source", self.source], self.checkout, 23)

    def validate(self):
        self.require_session()
        self.record("release-manifest-validation", ["node", "scripts/release/validate-release.mjs", "--strict", "--receipt",
                    (DELIVERY / "release-manifest-validation.receipt.json").as_posix()], self.checkout, 13)
        self.export()

    def inventory(self):
        # Parent report and actual GitHub observations may now exist only in the primary delivery.
        assembly = Path(__file__).with_name("assemble-evidence.py")
        result = subprocess.run([sys.executable, str(assembly), "--repository", str(self.repo), "--source", self.source,
                                 "--inventory-only"], check=False)
        if result.returncode:
            raise RuntimeError(f"Final inventory failed: exit {result.returncode}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--source", required=True)
    parser.add_argument("--checkout", type=Path, required=True)
    parser.add_argument("--client-date", required=True, help="User-facing date, YYYY-MM-DD in Asia/Calcutta")
    parser.add_argument("--phase", choices=["prepare", "checks", "package", "validate", "inventory", "all"], default="all")
    parser.add_argument("--expected-e2e", type=int, default=97)
    parser.add_argument("--expected-accessibility", type=int, default=17)
    parser.add_argument("--expected-performance", type=int, default=6)
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
        print(f"FAIL RC5 maker execution: {error}", file=sys.stderr, flush=True)
        sys.exit(1)
