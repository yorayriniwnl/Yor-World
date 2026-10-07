"""Independent read-only PRE-G7-07 frozen-source and preservation review."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = "30240b672ae31537d8090b11b60f8bf808a27670"
PRIOR = "71737a61c52d1bb887e5cdfc65201666daee5a1d"
CANDIDATE = "deliveries/G7/rc6-candidate-r4"
PRESERVED = ["deliveries/C4", "deliveries/G6/full-stack-integration", "deliveries/G6/rc4-candidate",
             "deliveries/G6/rc5-candidate", "deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
             "deliveries/G7/rc6-candidate-r3", "deliveries/G7/rc6-independent-delta/r2-audit",
             "deliveries/G7/rc6-independent-delta/r3-audit", "deliveries/G7/rc6-independent-delta/runtime",
             "deliveries/G7/rc6-independent-delta/security-release", "docs/releases/v1.0.0-rc5.md",
             "docs/planning/reviews/2026-10-06-g6-r1.md", "docs/planning/reviews/2026-10-06-g6-r1",
             "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md"]


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def digest(data, lf=False):
    return hashlib.sha256(data.replace(b"\r\n", b"\n") if lf else data).hexdigest()


def snapshot():
    result = {}
    for prefix in PRESERVED:
        target = ROOT / prefix
        for path in ([target] if target.is_file() else sorted(target.rglob("*"))):
            if path.is_file() and "__pycache__" not in path.parts:
                result[path.relative_to(ROOT).as_posix()] = digest(path.read_bytes())
    return result


if __name__ == "__main__":
    defects = []
    checks = []
    def require(condition, label, detail=None):
        checks.append({"check": label, "status": "PASS" if condition else "FAIL", "detail": detail})
        if not condition:
            defects.append(label)
    source = git("rev-parse", SOURCE + "^{commit}").decode().strip()
    require(source == SOURCE, "Exact source commit accessible")
    require(git("rev-parse", SOURCE + ":app").decode().strip() == "42ea29ec235225046a75959eb19eb386ac2f821d", "Exact R4 app tree")
    changed_app = git("diff", "--name-only", PRIOR, SOURCE, "--", "app").decode().splitlines()
    require(changed_app == ["app/tests/e2e/renderer-recovery.spec.ts"], "Production app bytes remain identical; only reviewed pointer-test timeout changed", changed_app)
    timeout_diff = git("diff", PRIOR, SOURCE, "--", "app/tests/e2e/renderer-recovery.spec.ts").decode()
    added = [line for line in timeout_diff.splitlines() if line.startswith("+") and not line.startswith("+++")]
    require(added == ["+    // GitHub-hosted SwiftShader can make this real-renderer pointer path exceed the suite default while still completing correctly.",
                      "+    test.setTimeout(45_000);"], "Pointer test assertions and product budgets unchanged")
    policy = json.loads(git("show", SOURCE + ":scripts/release/rc6-policy.json"))
    require(policy["deliveryRoot"] == CANDIDATE and policy["bundle"]["path"] == CANDIDATE + "/yor-world-v1.0.0-rc6.bundle.tar.gz", "R4 policy/archive paths agree")
    workflow = git("show", SOURCE + ":.github/workflows/ci.yml").decode()
    require('assertPolicyOutputs(); console.log("RC6_DELIVERY_ROOT="+policy.deliveryRoot)' in workflow,
            "CI derives/preflights deliveryRoot from frozen policy")
    require('node scripts/release/validate-release.mjs --strict --receipt "$RC6_DELIVERY_ROOT/ci-release-manifest-validation.receipt.json" | tee .rc6-ci/13-release-manifest-validation.log' in workflow,
            "CI strict receipt uses permitted in-policy output")
    require('cp "$RC6_DELIVERY_ROOT/ci-release-manifest-validation.receipt.json" .rc6-ci/release-manifest-validation.receipt.json' in workflow
            and 'path: .rc6-ci/' in workflow and 'set -o pipefail' in workflow,
            "CI copies actual strict receipt into unchanged uploaded evidence root")
    names = [line.strip() for line in workflow.splitlines() if line.strip().startswith("- name: ")]
    numbered = [line for line in names if line[8:9].isdigit()]
    require(len(numbered) == 13, "All thirteen numbered mandatory steps remain", numbered)
    require(not git("ls-tree", "--name-only", SOURCE, ".github/workflows/generate-rc6-r3.yml").strip(), "Automatic same-root proof generator removed")
    guard = git("show", SOURCE + ":scripts/release/release-lib.mjs").decode()
    driver = git("show", SOURCE + ":deliveries/G7/preparation/tools/candidate-driver.py").decode()
    require('"deliveries/G7/rc6-candidate-r3"' in guard and '"deliveries/G7/rc6-candidate-r3"' in driver,
            "JavaScript and Python output preflight reserve R3 history")
    require(git("rev-parse", "archive/rc6-local-71737a6^{commit}").decode().strip() == "d9277083a00a9d1ed08abff50971310c1fcdf3ec",
            "Local71737a6 proof branch retains exact archive commit")
    for revision in ["49080809bde98fee2f6158b935ec6bc32c81d1bc", "6c379b0a7587b53fa3ec70f14b67eaea6760ae25"]:
        require(subprocess.run(["git", "merge-base", "--is-ancestor", revision, SOURCE], cwd=ROOT).returncode == 0,
                "Remote R3 snapshot remains reachable ancestor: " + revision)
    changed = git("diff", "--name-only", PRIOR, SOURCE, "--", "app", "scripts/release", ".github/workflows", "deliveries/G7/preparation/tools/candidate-driver.py").decode().splitlines()
    source_hashes = []
    for name in changed:
        committed = git("show", SOURCE + ":" + name)
        actual = (ROOT / name).read_bytes()
        source_hashes.append({"path": name, "gitBlobSha256": digest(committed), "workingLfMatches": digest(actual, lf=True) == digest(committed, lf=True)})
    require(all(item["workingLfMatches"] for item in source_hashes), "Reviewed working source equals committed R4")
    values = snapshot()
    (HERE / "historical-before.json").write_text(json.dumps(values, indent=2) + "\n", encoding="utf-8", newline="\n")
    receipt = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "auditedSource": SOURCE,
               "priorAuditedSource": PRIOR, "candidate": CANDIDATE, "checks": checks, "sourceHashes": source_hashes,
               "preservedSnapshotFiles": len(values), "productionAndPhysicalManual": "NOT RUN",
               "acceptanceClaim": False, "defects": defects, "overallStatus": "PASS" if not defects else "FAIL"}
    (HERE / "source-review.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key: value for key,value in receipt.items() if key != "sourceHashes"}, indent=2))
    if defects:
        raise SystemExit(1)
