"""Validate handoff links and archived raw evidence, optionally against the Git index."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
parser = argparse.ArgumentParser()
parser.add_argument("--staged", action="store_true")
args = parser.parse_args()
errors: list[str] = []
checked = 0
indexed = 0


def check(item: dict, staged: bool = True) -> None:
    global checked, indexed
    rel = item.get("snapshotPath", item["path"])
    value = (ROOT / rel).read_bytes()
    if len(value) != item["bytes"] or hashlib.sha256(value).hexdigest() != item["sha256"]:
        errors.append(f"Raw evidence mismatch: {rel}")
    checked += 1
    if args.staged and staged:
        result = subprocess.run(["git", "cat-file", "blob", f":{rel}"], cwd=ROOT, capture_output=True)
        if result.returncode or result.stdout != value:
            errors.append(f"Git index does not preserve evidence bytes: {rel}")
        indexed += 1


audit_root = ROOT / "deliveries/completion-audits/FINISH-00-R2"
manifests = [ROOT / "docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json"]
manifests += list((audit_root / "architecture").glob("r*/output-hashes.json"))
manifests += list((audit_root / "independent").glob("r*/output-hashes.json"))
for manifest in manifests:
    for item in json.loads(manifest.read_text(encoding="utf-8"))["outputs"]:
        check(item)
decision = json.loads((ROOT / "docs/planning/reviews/2026-10-10-finish-00-r2/decision.json").read_text(encoding="utf-8"))
for item in decision["reviewBindings"]:
    check(item)
for item in json.loads((HERE / "input-hashes.json").read_text(encoding="utf-8"))["inputs"]:
    # Received maker roots were already committed by other sessions; this
    # read-only observation binds raw working bytes, not their Git EOL policy.
    check(item, staged=False)
link_checks = 0
documents = [ROOT / "docs/planning/reconciliation-packets/2026-10-10-finish-04.md",
             ROOT / "docs/planning/reviews/2026-10-10-finish-00-r2.md"]
documents += list((ROOT / "docs/planning/production-prompts/corrections-2026-10-10").glob("*.md"))
for document in documents:
    for target in re.findall(r"\]\(([^)]+)\)", document.read_text(encoding="utf-8")):
        if target.startswith(("http:", "https:", "#")):
            continue
        if not (document.parent / target.split("#", 1)[0]).is_file():
            errors.append(f"Missing local handoff link: {document.name} -> {target}")
        link_checks += 1
status = json.loads((ROOT / "docs/planning/current-status.json").read_text(encoding="utf-8"))
if status["completionProgram"]["successorContractsGate"]["outputManifestSha256"] != decision["acceptedContractOutputManifestSha256"]:
    errors.append("Living design status differs from exact Parent ruling")
if any(decision[name] for name in ["implementationAcceptance", "canonicalIntegration", "deploymentAcceptance", "g7Acceptance"]):
    errors.append("Design ruling exceeds its acceptance scope")
result = {"packet": "FINISH-04", "status": "FAIL" if errors else "PASS",
          "rawEvidenceChecks": checked, "gitIndexByteChecks": indexed, "localLinkChecks": link_checks,
          "independentHandoffAdvice": "Returned Sol ultra read-only check: 14 handoff links and role/allowance/root/dependency review; no new blocker",
          "scope": "Documentation/evidence identity and links; application behavior and live/device proof NOT RUN",
          "errors": errors}
if args.staged:
    (HERE / "validation.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    outputs = []
    for path in sorted(HERE.rglob("*")):
        if path.is_file() and path.name != "output-hashes.json" and "__pycache__" not in path.parts:
            data = path.read_bytes()
            outputs.append({"path": path.relative_to(ROOT).as_posix(), "bytes": len(data),
                            "sha256": hashlib.sha256(data).hexdigest()})
    (HERE / "output-hashes.json").write_text(json.dumps({"packet": "FINISH-04", "hashPolicy": "SHA-256 of raw bytes",
        "exclusions": ["output-hashes.json (self-reference)", "__pycache__"], "outputs": outputs}, indent=2) + "\n",
        encoding="utf-8", newline="\n")
print(json.dumps(result, indent=2))
raise SystemExit(1 if errors else 0)
