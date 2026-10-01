"""Parent metadata verifier; read-only. Does not install or implement maker work."""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def git_blob(commit, path):
    return subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=ROOT)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    manifest = json.loads((HERE / "baseline-manifest.json").read_text(encoding="utf-8"))
    ownership = json.loads((HERE / "ownership.json").read_text(encoding="utf-8"))
    receipts = []
    errors = []
    records = [manifest["g1"]["archive"]]
    records += manifest["specificationAndAuthority"] + manifest["references"]
    for item in manifest["acceptedInputs"].values():
        records += item["files"]
    for record in records:
        data = git_blob(record["gitCommit"], record["path"])
        ok = len(data) == record["bytes"] and digest(data) == record["sha256"]
        receipts.append({"path": record["path"], "sha256": digest(data), "verified": ok})
        if not ok:
            errors.append("Frozen object mismatch: " + record["path"])
    archive = manifest["g1"]["archive"]
    with zipfile.ZipFile(io.BytesIO(git_blob(archive["gitCommit"], archive["path"]))) as package:
        for path, record in manifest["g1"]["sourceMembers"].items():
            data = package.read("source/" + path)
            if len(data) != record["bytes"] or digest(data) != record["sha256"]:
                errors.append("G1 source member mismatch: " + path)
        for path in manifest["frozenRuntimeContracts"]:
            baseline = git_blob(manifest["planningBaseCommit"], "deliveries/W3/revisions/W3-A1-r2/source/" + path)
            if baseline.replace(b"\r\n", b"\n") != package.read("source/" + path).replace(b"\r\n", b"\n"):
                errors.append("W3/G1 contract mismatch: " + path)
        for filename, packet_id in [("room-blockout.glb", "W1"), ("avatar-proof.glb", "W2"), ("fixture-proof.glb", "W2")]:
            accepted = next(item for item in manifest["acceptedInputs"][packet_id]["files"] if item["path"].endswith("/" + filename))
            for folder in ("models", "assets/3d"):
                if digest(package.read("source/public/" + folder + "/" + filename)) != accepted["sha256"]:
                    errors.append("G1 accepted asset mismatch: " + filename)
    # Current allowlists use literal paths, trailing /** directories, or a terminal * prefix.
    # Prefix overlap is conservatively rejected; no arbitrary glob intersection is assumed.
    rules = [(name, rule, rule.split("*", 1)[0]) for name, lane in ownership["makers"].items() for rule in lane["overlayTargets"]]
    write_roots = [(name, lane["repositoryWriteRoot"]) for name, lane in ownership["makers"].items()]
    for index, (owner, root) in enumerate(write_roots):
        for other_owner, other_root in write_roots[index + 1:]:
            if root.startswith(other_root) or other_root.startswith(root):
                errors.append(f"Overlapping repository roots: {owner} / {other_owner}")
    for index, (owner, rule, prefix) in enumerate(rules):
        if prefix.startswith("/") or ".." in prefix.split("/") or "\\" in prefix:
            errors.append("Unsafe destination: " + rule)
        for other_owner, other_rule, other_prefix in rules[index + 1:]:
            if owner != other_owner and (prefix.startswith(other_prefix) or other_prefix.startswith(prefix)):
                errors.append(f"Overlapping ownership: {owner}:{rule} / {other_owner}:{other_rule}")
        for frozen in ownership["sharedReadOnlyTargets"] + ownership["notAssignedThisWave"]:
            frozen_prefix = frozen.split("*", 1)[0]
            if prefix.startswith(frozen_prefix) or frozen_prefix.startswith(prefix):
                errors.append(f"Shared target granted to {owner}: {rule} / {frozen}")
    output = {"freezeId": manifest["freezeId"], "frozenGitObjectsVerified": len(receipts), "archiveSourceMembersVerified": len(manifest["g1"]["sourceMembers"]), "overlayRulesChecked": len(rules), "errors": errors, "receipts": receipts}
    print(json.dumps(output, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
