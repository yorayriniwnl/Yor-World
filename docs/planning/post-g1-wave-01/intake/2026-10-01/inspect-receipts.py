"""Read-only parent receipt inspection. No installs or maker implementation."""
from pathlib import Path
from fnmatch import fnmatchcase
import hashlib
import io
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[5]
LIVE_COMMIT = "256d2294c144a8e6434df52126e827b293473e90"
ISSUE_COMMIT = "385c945fddd2de0b45353dcbc0324c001b3276fc"
G1_COMMIT = "62ee8a064e744e0ff7a52f85fd550aef3f66def9"
B3_COMMIT = "fa649a74c66cf86338a55d32517204d39652eec9"


def blob(commit, path):
    return subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=ROOT)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def identity(data):
    return {"bytes": len(data), "sha256": sha(data)}


def archive_members(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = [item.filename for item in archive.infolist() if not item.is_dir()]
        assert len(names) == len(set(names)), "duplicate archive member"
        assert all(not n.startswith(("/", "\\")) and ".." not in n.split("/") for n in names)
        return {name: archive.read(name) for name in names}


def allowed(path, rules):
    return any(fnmatchcase(path, rule) for rule in rules)


def main():
    frozen = json.loads(blob(ISSUE_COMMIT, "docs/planning/post-g1-wave-01/baseline-manifest.json"))
    ownership = json.loads(blob(ISSUE_COMMIT, "docs/planning/post-g1-wave-01/ownership.json"))
    g1_bytes = blob(G1_COMMIT, "deliveries/G1/g1-integration-proof.zip")
    assert identity(g1_bytes) == {k: frozen["g1"]["archive"][k] for k in ("bytes", "sha256")}
    baseline = {name[7:]: data for name, data in archive_members(g1_bytes).items() if name.startswith("source/")}
    assert len(baseline) == 52
    result = {"repositoryCommit": LIVE_COMMIT, "issuedPacketCommit": ISSUE_COMMIT,
              "evidenceClass": "PARENT SOURCE/BYTE INSPECTION", "runtimeReproduction": "NOT RUN",
              "frozenG1": identity(g1_bytes), "candidates": {}}
    for packet, delivery, filename in [("A2", "A2", "a2-verified-portfolio.zip"),
                                       ("B5-P1", "B5", "b5-lifecycle-proof.zip")]:
        prefix = f"deliveries/{delivery}/"
        archive = blob(LIVE_COMMIT, prefix + filename)
        members = archive_members(archive)
        receipt = blob(LIVE_COMMIT, prefix + filename + ".sha256").decode("utf-8").strip()
        assert sha(archive) in receipt, prefix + "checksum mismatch"
        source = {name[7:]: data for name, data in members.items() if name.startswith("source/")}
        rules = ownership["makers"][packet]["overlayTargets"]
        changed = []
        for name in sorted(set(baseline) | set(source)):
            before, after = baseline.get(name), source.get(name)
            if before == after:
                continue
            changed.append({"path": name, "operation": "ADD" if before is None else "DELETE" if after is None else "REPLACE",
                            "allowedProductionDestination": allowed(name, rules),
                            "baseline": identity(before) if before is not None else None,
                            "candidate": identity(after) if after is not None else None})
        mismatches = []
        for name, data in members.items():
            try:
                current = blob(LIVE_COMMIT, prefix + name)
            except subprocess.CalledProcessError:
                mismatches.append({"path": name, "reason": "missing Git member"})
                continue
            if current != data:
                mismatches.append({"path": name, "archive": identity(data), "git": identity(current),
                                   "lineEndingOnly": data.replace(b"\r\n", b"\n") == current.replace(b"\r\n", b"\n")})
        item = {"deliveryRoot": prefix, "archive": {"path": prefix + filename, **identity(archive)},
                "sidecarMatches": True, "archiveMembers": len(members), "sourceMembers": len(source),
                "archiveVsGitMemberMismatches": mismatches, "changedSourceMembers": changed,
                "frozenContractsMatch": all(source.get(n) == baseline[n] for n in baseline if n.startswith("src/contracts/")),
                "reportGitBlob": identity(blob(LIVE_COMMIT, prefix + "report.md")),
                "lastSourceCommit": subprocess.check_output(["git", "log", "-1", "--format=%H", LIVE_COMMIT, "--", prefix + "source"], cwd=ROOT, text=True).strip()}
        if packet == "A2":
            manifest = json.loads(members["manifest.json"])
            item["manifestBaseline"] = manifest["baselineRevision"]
            item["manifestGitBlob"] = identity(blob(LIVE_COMMIT, prefix + "manifest.json"))
            item["manifestMemberMismatches"] = []
            for record in manifest["files"]:
                data = members.get(record["path"])
                if data is None or identity(data) != {"bytes": record["sizeBytes"], "sha256": record["sha256"]}:
                    item["manifestMemberMismatches"].append(record["path"])
        else:
            claims = re.findall(r"\|\s*`(src/[^`]+)`\s*\|[^\n]*?`([a-f0-9]{64})`", blob(LIVE_COMMIT, prefix + "report.md").decode("utf-8"))
            item["reportSourceHashClaims"] = [{"path": name, "claimed": declared, "actual": sha(source[name]),
                                               "matches": declared == sha(source[name])} for name, declared in claims]
            item["declaredG1"] = json.loads(blob(LIVE_COMMIT, prefix + "accepted-input-manifest.json"))["acceptedInputs"][-1]
        result["candidates"][packet] = item
    b3_path = "deliveries/material-light-sample/material-light-sample.zip"
    b3_bytes = blob(B3_COMMIT, b3_path)
    assert sha(b3_bytes) == "f75441ac85533bb9b7ad790a552c4f50373d685b9d6bbc179f219f1ba43b053f"
    b3_members = archive_members(b3_bytes)
    b3 = {"archive": {"path": b3_path, **identity(b3_bytes)}, "pinnedCommit": B3_COMMIT,
          "acceptanceRecord": "docs/planning/reviews/2026-10-01-reconciliation-04.md", "members": {}}
    for filename in ["workstation-sample.glb", "workstation-sample.blend"]:
        matches = [name for name in b3_members if name == filename or name.endswith("/" + filename)]
        assert len(matches) == 1, matches
        archived = b3_members[matches[0]]
        assert archived == blob(B3_COMMIT, "deliveries/material-light-sample/" + filename)
        assert archived == blob(LIVE_COMMIT, "deliveries/material-light-sample/" + filename)
        b3["members"][filename] = {"archiveMember": matches[0], **identity(archived), "archivePinnedGitAndLiveGitMatch": True}
    result["candidates"]["B3-legacy-accepted-benchmark"] = b3
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
