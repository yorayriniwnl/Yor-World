"""Bind completed fresh executions to RC4, or regenerate its non-circular inventory."""
import argparse
import hashlib
import json
import pathlib
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True)
parser.add_argument("--inventory-only", action="store_true")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[4]
delivery = root / "deliveries/G6/rc4-candidate"

def write(name, data):
    (delivery / name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")

def digest(filename):
    data = (root / filename).read_bytes()
    if pathlib.Path(filename).suffix != ".gz" and pathlib.Path(filename).suffix != ".png":
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()

records = [json.loads(line) for line in (delivery / "evidence/execution.jsonl").read_text(encoding="utf-8").splitlines()]
latest = {record["id"]: record for record in records if record.get("sourceCommit") == args.source}
policy = json.loads((root / "scripts/release/rc4-policy.json").read_text(encoding="utf-8"))
if not args.inventory_only:
    bundle = json.loads((delivery / "bundle-receipt.json").read_text(encoding="utf-8"))
    assert bundle["sourceCommit"] == args.source
    for report_path, expected in [("evidence/e2e/browser-results.json", 194), ("evidence/accessibility/browser-results.json", 34), ("evidence/performance/performance-results.json", 6)]:
        stats = json.loads((delivery / report_path).read_text(encoding="utf-8"))["stats"]
        assert stats["expected"] == expected and all(stats[key] == 0 for key in ["unexpected", "flaky", "skipped"]), (report_path, stats)
    checks = []
    for check_id in policy["requiredChecks"]:
        if check_id == "release-manifest-validation":
            evidence = "deliveries/G6/rc4-candidate/release-manifest-validation.receipt.json"
        else:
            record = latest[check_id]
            assert record["exitCode"] == 0, (check_id, record["exitCode"])
            assert digest(record["evidencePath"]) == record["evidenceSha256"], check_id
            evidence = record["evidencePath"]
            if check_id == "release-composition": evidence = "deliveries/G6/rc4-candidate/release-composition.json"
            if check_id == "budget-regression": evidence = "deliveries/G6/rc4-candidate/budget-validation-receipt.json"
        check = {"id": check_id, "status": "pass", "blocking": True, "verificationCategory": "AUTOMATED PASS", "sourceCommit": args.source, "evidencePath": evidence}
        if check_id != "release-manifest-validation": check.update(evidenceSha256=digest(evidence), evidenceHashMode="lf")
        checks.append(check)
    supplemental = ["source-binding.json", "asset-validation.json", "evidence/versions.json", "evidence/historical-immutability.json", "evidence/e2e/browser-results.json", "evidence/accessibility/browser-results.json", "evidence/performance/performance-results.json"]
    supplemental += [str(name.relative_to(delivery)).replace("\\", "/") for name in sorted((delivery / "evidence/performance").glob("*.json")) if name.name != "performance-results.json"]
    composition = "deliveries/G6/rc4-candidate/release-composition.json"
    manifest = {key: policy[key] for key in ["releaseId", "canonicalApplicationRoot", "assetRevision", "publicationRevision", "schemaRevision", "contactAmendment"]}
    manifest.update(sourceCommit=args.source, gitCommit=args.source, releaseBundlePath=bundle["archivePath"], releaseBundleSha256=bundle["sha256"], bundleMetadata={"fileCount": bundle["fileCount"], "bytes": bundle["bytes"]}, governance={"status": "candidate", "selfApproved": False, "g6Status": "ACTIVE / REWORK", "g7Status": "LOCKED"}, composition={"path": composition, "sha256": digest(composition), "hashMode": "lf"}, requiredChecks=checks, evidenceHashes=[{"path": "deliveries/G6/rc4-candidate/" + name, "sha256": digest("deliveries/G6/rc4-candidate/" + name), "hashMode": "lf"} for name in supplemental])
    write("release-manifest.json", manifest)

lines = ["# Fresh RC4 commands and exit codes", "", f"Implementation sourceCommit: `{args.source}`. Canonical root: `app/`. Final runs use the isolated detached checkout recorded in `evidence/versions.json`; its dependencies and build outputs started absent. Earlier diagnostic/failing executions remain in execution history and are not final proof.", "", "| Check | Exact command | Exit | Duration (s) | Evidence |", "| --- | --- | ---: | ---: | --- |"]
for check_id in policy["requiredChecks"] + ["bundle-assembly", "browser-report-verification", "accessibility-report-verification", "performance-report-verification"]:
    record = latest.get(check_id)
    if record:
        command = subprocess.list2cmdline(record["command"])
        log = pathlib.PurePosixPath(record["evidencePath"]).relative_to("deliveries/G6/rc4-candidate")
        lines.append(f"| {check_id} | `{command}` | {record['exitCode']} | {record['durationSeconds']} | [{log}]({log}) |")
lines += ["", "Test counts and measured results are in the exact command logs, browser JSON reports, release composition and budget receipt. Chromium uses the documented full-browser headless channel; the frame report identifies its actual renderer. Browser fixtures use one synthetic file-backed PostgreSQL engine across canonical routes and execute the exact accepted migrations/grant hardening. Fixture mode is absent from build and performance runs.", "", "Local embedded transaction evidence does not prove independent hosted PostgreSQL sessions, real Supabase MFA/Storage or mail delivery. Physical devices, screen readers, hosted restore/rollback and production operations remain NOT RUN/G7-only. G6 remains pending independent audit; G7 LOCKED.", ""]
(delivery / "commands-and-exit-codes.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")
inventory = []
for filename in sorted(delivery.rglob("*")):
    if not filename.is_file() or filename.name == "SHA256SUMS.txt" or "__pycache__" in filename.parts: continue
    name = filename.relative_to(root).as_posix()
    inventory.append(f"{digest(name)}  {name}")
(delivery / "SHA256SUMS.txt").write_text("\n".join(inventory) + "\n", encoding="utf-8", newline="\n")
print(f"Recorded {len(latest)} exact-source executed checks; inventoried {len(inventory)} artifacts.")
