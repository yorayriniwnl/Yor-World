from pathlib import Path
import hashlib
import json
import os
import struct

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = Path(r"C:\Users\yoray\Projects\Yor World\deliveries\completion-audits\FINISH-B1\finish-06\20261011T063200Z-b1-r3-independent-review-02-f6a91d")
if ROOT != EXPECTED:
    raise SystemExit(f"Unexpected audit root: {ROOT}")


def read_json(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def write_json(rel, value):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# Rehash the fresh reviewer captures and validate each PNG IHDR against the index.
index = read_json("reviewer-rerun/captures/index.json")
checks = []
for item in index["captures"]:
    for kind, entry in item["files"].items():
        filename = "webgl-canvas.png" if kind == "webglCanvas" else "dom-ui.png"
        path = ROOT / "reviewer-rerun/captures" / item["key"] / filename
        blob = path.read_bytes()
        actual_hash = hashlib.sha256(blob).hexdigest()
        pixels = list(struct.unpack(">II", blob[16:24])) if blob[:8] == b"\x89PNG\r\n\x1a\n" else [None, None]
        passed = (len(blob) == entry["bytes"] and actual_hash == entry["sha256"]
                  and pixels == item["expectedPixels"] and item["actualPixels"] == item["expectedPixels"])
        checks.append({"key": item["key"], "kind": kind, "path": path.relative_to(ROOT).as_posix(),
                       "status": "PASS" if passed else "FAIL", "bytes": len(blob),
                       "sha256": actual_hash, "pixels": pixels, "indexedPixels": item["actualPixels"]})
write_json("reviewer-rerun/validator-logs/capture-index-reverification.json", {
    "scope": "Rehash fresh reviewer capture files and check PNG IHDR dimensions against the fresh index.",
    "index": "reviewer-rerun/captures/index.json", "viewCount": len(index["captures"]),
    "imageCount": len(checks), "passed": sum(c["status"] == "PASS" for c in checks),
    "failed": sum(c["status"] != "PASS" for c in checks), "checks": checks
})

verification = read_json("candidate-package-verification.json")
file_map = {item["path"]: item for item in verification["files"]}
write_json("candidate-binding.json", {
    "candidateCommit": verification["candidateCommit"],
    "candidateTree": verification["candidateTree"],
    "candidateParent": verification["candidateParent"],
    "candidatePackageTreeOid": verification["candidatePackageTreeOid"],
    "candidatePackagePrefix": verification["candidatePackagePrefix"],
    "acceptedBaselineCommit": "f62a43c5e71c00dcb89e28275ea81d842167db80",
    "acceptedAppTree": "42ea29ec235225046a75959eb19eb386ac2f821d",
    "package": {
        "trackedFiles": verification["trackedFileCount"],
        "trackedBytes": verification["totalTrackedBytes"],
        "outputHashesManifestSha256": verification["manifestSha256"],
        "manifestRows": verification["manifestChecks"]["declaredFileCount"],
        "passingRows": sum(item["status"] == "PASS" for item in verification["files"]),
        "failingRows": sum(item["status"] == "FAIL" for item in verification["files"]),
        "excludedRows": sum(item["status"] == "EXCLUDED_BY_DECLARED_SCOPE" for item in verification["files"]),
        "excludedSelfReferences": ["output-hashes.json", "validator-logs/manifest-verification.json"],
        "report": file_map["report.md"]["actual"],
        "sourcePatch": file_map["source.patch"]["actual"]
    },
    "sourcePatch": {
        "paths": ["source/blender/scripts/build-environment.py", "source/blender/scripts/build-resident-fixture.py"],
        "incrementalBase": "deliveries/FINISH-B1-R2/source/blender/scripts/",
        "r2OutputManifestSha256": "546e32459e48fdca4a7b698cdcab5371aa7e38a8322657805113ed4c50fd993b",
        "cumulativeAcceptedBaselineDiff": "limited to the same two assigned builder files",
        "eolCaveat": "Default apply check fails on CRLF resident input; --ignore-space-change and normalized comparison reproduce final source text, while raw scratch EOL differs.",
        "acceptedBaselineNote": "The delivered patch is incremental from R2 and is not intended to apply directly to f62a43c5."
    },
    "auditRoot": "deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/",
    "priorRoots": {"status": "PRESERVED_NOT_USED", "paths": [
        "deliveries/completion-audits/FINISH-B1/finish-05/20261011T062300Z-b1-r3-independent-review-01/",
        "deliveries/completion-audits/FINISH-B1/finish-04/20261011T062300Z-b1-r3-parent-local-reaudit/"
    ]}
})

write_json("reviewer-rerun/validator-logs/production-door-owner-source-search.json", {
    "scope": "Read-only source search at the exact accepted app tree; not an integration test.",
    "acceptedBaseCommit": "f62a43c5e71c00dcb89e28275ea81d842167db80",
    "acceptedAppTree": "42ea29ec235225046a75959eb19eb386ac2f821d",
    "searchCommand": "git grep -n -i -E 'Door_Hinge|Door_Leaf|door.?angle|door.?rotation' f62a43c5e71c00dcb89e28275ea81d842167db80 -- app/src",
    "searchExit": 1,
    "matches": [],
    "sourceExcerpts": [
        {"path": "app/src/features/world/EntranceCoordinator.ts", "lines": "15-24", "result": "Defines the camera entrance position path."},
        {"path": "app/src/features/world/EntranceCoordinator.ts", "lines": "189-202", "result": "Updates camera position, target, and field of view; no door write."},
        {"path": "app/src/features/world/WorldRuntime.ts", "result": "Constructs and invokes EntranceCoordinator for entrance lifecycle."}
    ],
    "roomAsset": {"animationCount": 0, "leafParent": "Door_Hinge"},
    "status": "UNRESOLVED_PRODUCTION_DOOR_TRANSFORM_OWNER"
})

write_json("tool-versions.json", {
    "os": "Windows 11 Pro / 10.0.26300-SP0", "python": "3.12.10",
    "node": "v24.19.0", "npm": "11.17.0", "blender": "5.2.2 LTS",
    "gltfValidator": "2.0.0-dev.3.10", "browser": "Chromium 153.0.8010.12",
    "playwright": "1.63.0", "three": "r180",
    "gpuReportedByHarness": "ANGLE NVIDIA GeForce RTX 2060 Direct3D11",
    "limitations": ["No physical iOS/Android run.", "No deployment/CDN or external reviewer run."]
})

commands = """FINISH-B1-R3 independent read-only audit — commands and exits
Candidate commit: 1753b9278c4537b5377c3893172b2a0f26d13b10
Candidate tree: 9759ac9879bcc9489770b7c5784ead2f022157b0
Environment versions: see tool-versions.json.

Package and source
  python package_manifest_audit.py "C:\\Users\\yoray\\Projects\\Yor World" 1753b9278c4537b5377c3893172b2a0f26d13b10 "C:\\Users\\yoray\\Projects\\Yor World\\deliveries\\completion-audits\\FINISH-B1\\finish-06\\20261011T063200Z-b1-r3-independent-review-02-f6a91d"
  exit=0; 206 tracked files / 93,466,246 bytes; 204/204 hash rows PASS; manifest SHA 338a04d5cc00a9b78fbc5d1bc13785b1e2ded0aac6e8e85d17a08a6e118976b3.
  python reviewer-rerun/scripts/compare-source-provenance.py
  exit=0; exact two-builder source scope; accepted-baseline-to-candidate diffs recorded.
  python reviewer-rerun/scripts/verify-r2-source-delta.py
  exit=0; the script records an inner git apply --check exit=1 on raw CRLF resident input.
  python reviewer-rerun/scripts/check-r2-patch-eol-options.py
  exit=0; inner git apply --check exit=1, while --ignore-space-change and --ignore-whitespace checks exit=0 on scratch copies.
  python reviewer-rerun/scripts/verify-r2-source-delta-normalized.py
  exit=0; normalized R2 patch application matches final text.
  python reviewer-rerun/scripts/apply-r2-source-delta-ignore-space.py
  exit=0; environment raw bytes match; resident normalized text matches, raw EOL differs.

Browser and renderer
  node reviewer-rerun/scripts/run-r3-verification-inherited.mjs
  exit=0; fresh standalone motion/contact rerun; negative-Y door direction.
  node reviewer-rerun/scripts/run-r3-verification-positive-y.mjs
  exit=0; same bounded suite with yaw sign changed; 451 door/camera samples.
  node reviewer-rerun/scripts/measure-draw-attribution-reviewer.mjs
  exit=0; intercepted calls equal renderer.info; see raw attribution files.
  node reviewer-rerun/scripts/assert-draw-budgets-reviewer.mjs
  exit=1; expected frozen budget failure: 202 > 120 desktop and 146 > 80 mobile.
  python reviewer-rerun/scripts/finalize-audit.py
  exit=0; rehashes 30 fresh capture PNGs and checks dimensions.

Export checks
  node reviewer-rerun/scripts/validate-glb-reviewer.mjs
  exit=0; gltf-validator 2.0.0-dev.3.10; five GLBs, 0 errors/warnings.
  Blender 5.2.2 --background --factory-startup --python-exit-code 1 --python reviewer-rerun/scripts/verify-final-exports-blender-reviewer.py
  exit=0; 5/5 final export imports.
  python reviewer-rerun/scripts/independent-glb-audit.py
  exit=0; 31 contract checks pass; comparator reports 144 fixture and 932 room triangle-key differences.
  python reviewer-rerun/scripts/compare-glb-vertex-sets.py
  exit=0; writes both the 0.1 mm unique-position comparison and full-precision nearest-distance diagnostic; two quantized room material sets differ and the other four assets pass.
  The full-precision diagnostic reports maximum symmetric nearest-point distance 1.8082886417e-7 m.
  python reviewer-rerun/scripts/verify-inherited-copy.py
  exit=0; selected 41-file maker-evidence subset matches exact candidate package hashes.

Accepted app source search
  git rev-parse f62a43c5e71c00dcb89e28275ea81d842167db80:app
  output=42ea29ec235225046a75959eb19eb386ac2f821d.
  git grep -n -i -E 'Door_Hinge|Door_Leaf|door.?angle|door.?rotation' f62a43c5e71c00dcb89e28275ea81d842167db80 -- app/src
  exit=1; no source matches. See production-door-owner-source-search.json.

Not run: C2/C3 runtime or target-tier controller, physical iOS/Android, deployment/CDN, external GPT Plus #2/Astra/manual review, Parent acceptance.
"""
(ROOT / "commands-and-exits.txt").write_text(commands, encoding="utf-8")

# Final reviewer artifact hashes exclude the staging/scratch tree and this self-referential index.
manifest_path = ROOT / "audit-output-hashes.json"
records = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = sorted(name for name in dirnames if name != ".work")
    for filename in sorted(filenames):
        path = Path(dirpath) / filename
        if path == manifest_path:
            continue
        blob = path.read_bytes()
        records.append({"path": path.relative_to(ROOT).as_posix(), "bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest()})
records.sort(key=lambda item: item["path"])
manifest = {"scope": "Reviewer output inventory; excludes .work scratch and itself.",
            "candidateCommit": verification["candidateCommit"],
            "auditRoot": "deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/",
            "fileCount": len(records), "totalBytes": sum(r["bytes"] for r in records),
            "excluded": [".work/**", "audit-output-hashes.json"], "files": records}
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"auditRoot": str(ROOT), "captureImages": len(checks),
                  "capturePass": sum(c["status"] == "PASS" for c in checks),
                  "captureFail": sum(c["status"] != "PASS" for c in checks),
                  "auditFilesHashed": len(records), "auditBytesHashed": manifest["totalBytes"]}, indent=2))
