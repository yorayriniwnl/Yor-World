"""Own read-only PRE09 boundary and provenance review at an exact source."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
R4 = "e461e029a1b38c461743d60dcd4aadb599613218"
APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
OWNED = ["scripts/release/rc6-policy.json", "scripts/release/release-lib.mjs",
         "scripts/release/build-release-bundle.mjs", "scripts/release/validate-release.mjs",
         "scripts/release/tests/immutable-output.test.mjs", "scripts/release/tests/policy-output.test.mjs",
         "deliveries/G7/preparation/tools/candidate-driver.py"]

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)

def sha(data):
    return hashlib.sha256(data.replace(b"\r\n", b"\n")).hexdigest()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    source = parser.parse_args().source
    policy = json.loads(git("show", source + ":scripts/release/rc6-policy.json"))
    old = json.loads(git("show", R4 + ":scripts/release/rc6-policy.json"))
    changed = git("diff", "--name-only", R4, source, "--", "app", "scripts/release", ".github/workflows",
                  "deliveries/G7/preparation/tools").decode().splitlines()
    actual_tree = git("rev-parse", source + ":app").decode().strip()
    workflow_same = git("rev-parse", R4 + ":.github/workflows") == git("rev-parse", source + ":.github/workflows")
    hashes = [{"path": name, "sourceSha256Lf": sha(git("show", source + ":" + name)),
               "workingMatches": sha((ROOT / name).read_bytes()) == sha(git("show", source + ":" + name))}
              for name in OWNED]
    old_without_paths = {k: v for k, v in old.items() if k not in ["deliveryRoot", "bundle"]}
    new_without_paths = {k: v for k, v in policy.items() if k not in ["deliveryRoot", "bundle"]}
    old_bundle = {k: v for k, v in old["bundle"].items() if k != "path"}
    new_bundle = {k: v for k, v in policy["bundle"].items() if k != "path"}
    checks = {"amendmentWithinOwnedCodeAndParentDocs": set(changed) <= set(OWNED + ["scripts/release/README.md", "deliveries/G7/preparation/tools/README.md"]), "appTreeUnchanged": actual_tree == APP_TREE,
              "workflowTreeUnchanged": workflow_same, "workingSourceMatches": all(x["workingMatches"] for x in hashes),
              "policyOnlyChangesOutputPaths": old_without_paths == new_without_paths and old_bundle == new_bundle,
              "r6OutputBinding": policy["deliveryRoot"] == "deliveries/G7/rc6-candidate-r6"
              and policy["bundle"]["path"] == policy["deliveryRoot"] + "/yor-world-v1.0.0-rc6.bundle.tar.gz"}
    ledger = "deliveries/G7/preparation/tools/g7-evidence.py"
    checks["reviewedLedgerUnchanged"] = sha(git("show", source + ":" + ledger)) == "a773309189aff8ec40684fdd0912470611a4d9c891e00f391d7ac8566c2372f6"
    for ref in ["d9277083a00a9d1ed08abff50971310c1fcdf3ec", "49080809", "6c379b0a"]:
        checks["preservedAncestor:" + ref] = subprocess.run(["git", "merge-base", "--is-ancestor", ref, source], cwd=ROOT, capture_output=True).returncode == 0
    result = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "reviewer": "/root/r6_independent_audit",
              "executionClass": "Own read-only Git, policy and source identity analysis", "sourceCommit": source,
              "incomingR5Source": R4, "sourceAppTree": actual_tree, "changedProtectedPaths": changed, "checks": checks,
              "sourceHashes": hashes, "sourceAcceptanceClaim": False, "g7AcceptanceClaim": False,
              "overallStatus": "PASS" if all(checks.values()) else "FAIL"}
    (HERE / "source-review.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, indent=2))
    if result["overallStatus"] != "PASS":
        raise SystemExit(1)
