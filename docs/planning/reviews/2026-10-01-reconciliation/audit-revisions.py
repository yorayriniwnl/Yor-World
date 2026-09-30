"""Parent read-only audit of pinned repository bytes; never runs maker generators.

Run from the repository root with Python. Outputs only beside this script.
Historical archive bytes, checkout bytes and Git blob bytes are distinct identities.
"""
from pathlib import Path
import collections
import datetime
import difflib
import hashlib
import json
import struct
import subprocess
import urllib.error
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
BASE = "fe1a40f797ce3ec839939c09a1857b797c197269"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))


def identity(path):
    local = (ROOT / path).read_bytes()
    blob = git("show", f"{BASE}:{path}")
    return {"path": path, "checkoutBytes": len(local), "checkoutSha256": sha(local),
            "gitBlobBytes": len(blob), "gitBlobSha256": sha(blob),
            "gitObjectId": git("rev-parse", f"{BASE}:{path}").decode().strip(),
            "equalAfterCRLFNormalization": local.replace(b"\r\n", b"\n") == blob.replace(b"\r\n", b"\n")}


result = {"recordedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "baseCommit": BASE, "initialAuditScope": "Parent byte, archive, source and GLB inspection; no maker test rerun",
          "remote": git("ls-remote", "--symref", "origin", "HEAD", "refs/heads/main").decode(),
          "coreAutocrlf": git("config", "--get", "core.autocrlf").decode().strip(),
          "baseTree": git("ls-tree", BASE).decode(), "manifests": {}, "archives": {}, "inputs": {}, "glb": {}}
for lane, manifest, archive in [("W2", "output-hashes.json", "w2-avatar-proof-r2.zip"),
                                 ("W3", "output-manifest.json", "W3-A1-handoff.zip")]:
    prefix = f"deliveries/{lane}/"
    files = read_json(prefix + manifest)["files"]
    rows = files.items() if isinstance(files, dict) else [(v["path"], v) for v in files]
    rows = list(rows)
    entries = []
    differences = []
    with zipfile.ZipFile(ROOT / prefix / archive) as package:
        for name, declared in rows:
            record = identity(prefix + name)
            archived = package.read(name)
            current = (ROOT / prefix / name).read_bytes()
            record.update(declaredSha256=declared["sha256"], archiveSha256=sha(archived),
                          archiveMatchesDeclared=sha(archived) == declared["sha256"],
                          checkoutMatchesDeclared=sha(current) == declared["sha256"],
                          gitMatchesDeclared=record["gitBlobSha256"] == declared["sha256"])
            if current != archived:
                differences.append({"path": name, "diff": "".join(difflib.unified_diff(
                    archived.decode().splitlines(True), current.decode().splitlines(True),
                    fromfile="archived-maker-evidence", tofile="committed-checkout"))})
            entries.append(record)
        result["archives"][lane] = {**identity(prefix + archive), "crcError": package.testzip(),
                                   "memberCount": len(package.namelist()), "differences": differences}
    result["manifests"][lane] = {"identity": identity(prefix + manifest), "files": entries,
                                "counts": {key: sum(e[key] for e in entries) for key in
                                           ["archiveMatchesDeclared", "checkoutMatchesDeclared", "gitMatchesDeclared"]}}

with zipfile.ZipFile(ROOT / "deliveries/W1/delivery-W1.zip") as package:
    result["archives"]["W1"] = {**identity("deliveries/W1/delivery-W1.zip"), "crcError": package.testzip(),
                                "memberCount": len(package.namelist()), "members": []}
    for name in package.namelist():
        data = package.read(name)
        result["archives"]["W1"]["members"].append({**identity("deliveries/W1/" + name),
                                                    "archiveSha256": sha(data),
                                                    "archiveEqualsCheckout": data == (ROOT / "deliveries/W1" / name).read_bytes()})

for manifest in ["deliveries/W2/input-revisions.json", "deliveries/W2/handoff-input-revisions.json",
                 "deliveries/W3/evidence/a1-current/input-manifest.json"]:
    inputs = read_json(manifest)["inputs"]
    rows = inputs.items() if isinstance(inputs, dict) else [(v["path"], v) for v in inputs]
    result["inputs"][manifest] = [{**identity(name), "declaredSha256": info["sha256"]} for name, info in rows]

for path in ["deliveries/W1/room-blockout.glb", "deliveries/W2/avatar-proof.glb", "deliveries/W2/fixture-proof.glb"]:
    data = (ROOT / path).read_bytes()
    doc = json.loads(data[20:20 + struct.unpack_from("<I", data, 12)[0]])
    names = [node.get("name") for node in doc["nodes"]]
    magic, version, length = struct.unpack_from("<4sII", data)
    summary = {**identity(path), "header": {"magic": magic.decode(), "version": version, "declaredBytes": length},
               "nodeCount": len(names), "materials": len(doc.get("materials", [])),
               "triangles": sum(doc["accessors"][p.get("indices", p["attributes"]["POSITION"])]["count"] // 3
                                for mesh in doc["meshes"] for p in mesh["primitives"]),
               "roots": [names[i] for i in doc["scenes"][0]["nodes"]], "nodes": doc["nodes"],
               "cameras": doc.get("cameras", []), "clips": []}
    for clip in doc.get("animations", []):
        summary["clips"].append({"name": clip["name"],
                                 "start": min(doc["accessors"][s["input"]]["min"][0] for s in clip["samplers"]),
                                 "end": max(doc["accessors"][s["input"]]["max"][0] for s in clip["samplers"])})
    if "/W1/" in path:
        register = read_json("deliveries/W1/asset-register.json")
        summary["missingRegisteredNodes"] = {key: [name for name in register[key] if name not in names]
                                             for key in ["removableProxyNodeNames", "removableChairNodeNames", "interactionHitZones"]}
    result["glb"][path] = summary

result["reviewIdentities"] = [identity(p) for p in ["reviews/gemini-3/w1-review.md", "reviews/gemini-3/w2-review.md", "reviews/gemini-3/review.md"]]
result["trackedClaudeReviews"] = git("ls-tree", "-r", "--name-only", BASE, "reviews").decode().splitlines()
result["trackedClaudeReviews"] = [p for p in result["trackedClaudeReviews"] if "/claude-" in p]
result["referenceIntegrity"] = [{"path": v["destination"], "matches": sha((ROOT / v["destination"]).read_bytes()) == v["sha256"]}
                                for v in read_json("references/manifest.json")["files"]]

urls = ["https://registry.npmjs.org/next/latest", "https://registry.npmjs.org/next/16.3.8",
        "https://registry.npmjs.org/eslint-config-next/16.3.8", "https://registry.npmjs.org/next/15.5.27",
        "https://registry.npmjs.org/eslint-plugin-react/latest"]
result["registryRecheck"] = []
for url in urls:
    entry = {"url": url, "observedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        with urllib.request.urlopen(url, timeout=25) as response:
            data = json.load(response)
            entry.update(status=response.status, version=data.get("version"), dist=data.get("dist"),
                         engines=data.get("engines"), peerDependencies=data.get("peerDependencies"))
    except urllib.error.HTTPError as error:
        entry["status"] = error.code
    except Exception as error:
        entry["error"] = str(error)
    result["registryRecheck"].append(entry)

(OUT / "revision-audit.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"baseCommit": BASE, "manifests": {key: value["counts"] for key, value in result["manifests"].items()},
                  "archives": {key: {"crcError": value["crcError"], "memberCount": value["memberCount"]} for key, value in result["archives"].items()},
                  "registry": [{"url": v["url"], "status": v.get("status"), "version": v.get("version")} for v in result["registryRecheck"]]}, indent=2))
