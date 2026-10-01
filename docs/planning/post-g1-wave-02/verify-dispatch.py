"""Read-only parent packet/identity verifier; no maker or runtime execution."""
from pathlib import Path
import hashlib
import io
import json
import re
import subprocess
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def blob(commit, path):
    return subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=ROOT)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def records(value):
    if isinstance(value, dict):
        if {"gitCommit", "path", "bytes", "sha256"} <= value.keys():
            yield value
        for child in value.values():
            yield from records(child)
    elif isinstance(value, list):
        for child in value:
            yield from records(child)


def main():
    errors = []
    manifest = json.loads((HERE / "input-manifest.json").read_text(encoding="utf-8"))
    ownership = json.loads((HERE / "ownership.json").read_text(encoding="utf-8"))
    original = manifest["inheritedBaseline"]
    baseline = json.loads(blob(original["gitCommit"], original["path"]))
    unique = {(r["gitCommit"], r["path"]): r for r in records(manifest)}
    receipt_path = HERE / "intake" / "A3-receipt.json"
    if receipt_path.exists():
        for r in records(json.loads(receipt_path.read_text(encoding="utf-8"))):
            unique[(r["gitCommit"], r["path"])] = r
    for record in unique.values():
        data = blob(record["gitCommit"], record["path"])
        if len(data) != record["bytes"] or sha(data) != record["sha256"]:
            errors.append("Input object mismatch: " + record["path"])
    if manifest["g1AcceptedArchive"] != baseline["g1"]["archive"]:
        errors.append("Accepted G1 input drift")
    for lane, accepted in baseline["acceptedInputs"].items():
        returned = manifest["acceptedProofRevisions"][lane]
        if returned != {"revision": accepted["revision"], "files": accepted["files"]}:
            errors.append("Accepted proof input drift: " + lane)
    with zipfile.ZipFile(io.BytesIO(blob(baseline["g1"]["archive"]["gitCommit"], baseline["g1"]["archive"]["path"]))) as z:
        for name, record in baseline["g1"]["sourceMembers"].items():
            data = z.read("source/" + name)
            if len(data) != record["bytes"] or sha(data) != record["sha256"]:
                errors.append("Accepted source mismatch: " + name)
    benchmark = manifest["b3AcceptedBenchmark"]
    with zipfile.ZipFile(io.BytesIO(blob(benchmark["archive"]["gitCommit"], benchmark["archive"]["path"]))) as z:
        for name, record in benchmark["members"].items():
            data = z.read(name)
            if len(data) != record["bytes"] or sha(data) != record["sha256"]:
                errors.append("Benchmark member mismatch: " + name)
    active = {**ownership["makers"], **ownership["continuingMakers"]}
    old_ownership = json.loads(blob(original["gitCommit"], "docs/planning/post-g1-wave-01/ownership.json"))
    lanes = {**active, "A2-queued": {**old_ownership["makers"]["A2"], "repositoryWriteRoot": ownership["queuedMakers"]["A2"]["repositoryWriteRoot"]}}
    rules = [(lane, rule, rule.split("*", 1)[0]) for lane, value in lanes.items() for rule in value["overlayTargets"]]
    roots = [(lane, value["repositoryWriteRoot"]) for lane, value in lanes.items()]
    for i, (lane, root) in enumerate(roots):
        if not root.startswith("deliveries/") or ".." in root.split("/") or "\\" in root:
            errors.append("Unsafe return root: " + root)
        for other, other_root in roots[i + 1:]:
            if root.startswith(other_root) or other_root.startswith(root):
                errors.append(f"Return root overlap: {lane} / {other}")
    for i, (lane, rule, prefix) in enumerate(rules):
        if prefix.startswith("/") or ".." in prefix.split("/") or "\\" in prefix or ":" in prefix:
            errors.append("Unsafe destination: " + rule)
        for other, other_rule, other_prefix in rules[i + 1:]:
            if lane != other and (prefix.startswith(other_prefix) or other_prefix.startswith(prefix)):
                errors.append(f"Production ownership overlap: {lane}:{rule} / {other}:{other_rule}")
        if lane in active:
            for frozen in ownership["sharedReadOnlyTargets"] + ownership["notAssignedThisWave"]:
                frozen_prefix = frozen.split("*", 1)[0]
                if prefix.startswith(frozen_prefix) or frozen_prefix.startswith(prefix):
                    errors.append(f"Read-only target granted: {lane}:{rule} / {frozen}")
    files = list(HERE.rglob("*.md")) + [ROOT / name for name in ["README.md", "START_HERE.md", "docs/planning/delegation-and-work-orders.md", "docs/planning/account-prompts.md", "docs/planning/local-tool-access.md"]]
    link_count = 0
    for file in files:
        content = file.read_text(encoding="utf-8")
        # Historical code/prompt examples can contain placeholder paths. Only actual Markdown links are checked.
        for target in re.findall(r"\[[^\]\n]+\]\(([^)\n]+)\)", content):
            if "://" in target or target.startswith("#"):
                continue
            local = target.split("#", 1)[0].strip("<>")
            if local:
                link_count += 1
                if not (file.parent / local).exists():
                    errors.append(f"Missing local link: {file.relative_to(ROOT)} -> {target}")
    dispatch_path = HERE / "dispatch-manifest.json"
    dispatch_count = 0
    if dispatch_path.exists():
        dispatch = json.loads(dispatch_path.read_text(encoding="utf-8"))
        # Living entrypoints may advance after issuance. Bind the immutable dispatch
        # to its introducing commit rather than rewriting historical hash evidence.
        introduction = subprocess.check_output(["git", "log", "--diff-filter=A", "--format=%H", "--", dispatch_path.relative_to(ROOT).as_posix()], cwd=ROOT).decode().splitlines()
        issued_commit = introduction[-1] if introduction else None
        for name, record in dispatch["files"].items():
            if name == str(dispatch_path.relative_to(ROOT)).replace("\\", "/"):
                errors.append("Dispatch manifest must not hash itself")
                continue
            data = blob(issued_commit, name) if issued_commit else (ROOT / name).read_bytes().replace(b"\r\n", b"\n")
            dispatch_count += 1
            if len(data) != record["bytes"] or sha(data) != record["sha256"]:
                errors.append("Issued dispatch file mismatch: " + name)
    output = {
        "coordinationId": manifest["coordinationId"],
        "inputGitObjectsVerified": len(unique),
        "acceptedSourceMembersVerified": len(baseline["g1"]["sourceMembers"]),
        "benchmarkMembersVerified": len(benchmark["members"]),
        "ownershipRulesChecked": len(rules),
        "returnRootsChecked": len(roots),
        "localLinksChecked": link_count,
        "issuedDispatchFilesVerified": dispatch_count,
        "errors": errors,
        "executionClass": "Parent byte/metadata/planning inspection only; no auth/database/native/browser runtime tests."
    }
    print(json.dumps(output, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
