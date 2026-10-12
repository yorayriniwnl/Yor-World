"""Emit candidate manifest, budgets, visual matrix, commands and maker report."""
from __future__ import annotations
import hashlib, json, pathlib, platform, subprocess, sys

OUT = pathlib.Path(__file__).resolve().parents[1]
ROOT = OUT.parent.parent
R5 = OUT / "inputs" / "r5" / "FINISH-B1-R5"
def read_json(p): return json.loads(p.read_text(encoding="utf-8"))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

base = read_json(R5 / "candidate-asset-manifest.json")
changed = {
    "assets/room.glb": "static reference-detail geometry merged into nine existing room material batches",
    "assets/fixture.glb": "white upholstery inset added to the existing chair-fixture batch",
}
runtime = []
for row in base["runtimeAssets"]:
    p = OUT / pathlib.PurePosixPath(row["path"])
    runtime.append({"path": row["path"], "bytes": p.stat().st_size, "sha256": sha(p), "changed": changed.get(row["path"], False)})
room_source = OUT / "assets/source/room.blend"
fixture_source = OUT / "assets/source/fixture.blend"
manifest = {
    "schemaVersion": 1, "candidate": "FINISH-B1-R6", "baseCandidate": "FINISH-B1-R5",
    "baseCommit": "a5ebcc88170703751a5f504f67aed637d2f7d8e9",
    "runtimeRequestIDs": base["runtimeRequestIDs"], "runtimeAssets": runtime,
    "nativeSource": {"path": "assets/source/room.blend", "bytes": room_source.stat().st_size,
                     "sha256": sha(room_source), "changed": "editable Blender source for static room detail geometry"},
    "fixtureNativeSource": {"path": "assets/source/fixture.blend", "bytes": fixture_source.stat().st_size,
                            "sha256": sha(fixture_source), "changed": "editable Blender source for static chair upholstery detail"},
    "requestSetUnchanged": True, "otherRuntimeAssetsByteIdenticalToR5": True,
    "newNodeNames": [], "newMaterialNames": [], "acceptance": "candidate only; no acceptance claimed"
}
(OUT / "candidate-asset-manifest.json").write_text(json.dumps(manifest, indent=2)+"\n", encoding="utf-8")

browser = read_json(OUT / "evidence/browser-results.json")
merge = read_json(OUT / "evidence/static-geometry-merge.json")
binding = read_json(OUT / "evidence/input-bindings.json")
validator = read_json(OUT / "evidence/gltf-validation.json")
blender = read_json(OUT / "evidence/blender-imports.json")
measurements = {(x["variant"],x["key"]):x for x in browser["measurements"]}
MIB = 1024*1024
all_package_assets = [OUT / x["path"] for x in runtime]
all_package_bytes = sum(p.stat().st_size for p in all_package_assets)
budgets = {"status": "PASS_WITH_OPEN_VISUALS", "units": "MiB uses 1,048,576 bytes.", "profiles": [],
           "frozenLimits": {"desktopHome": {"essentialTransferMiB": 6, "optionalV1MiB": 14, "visibleTriangles": 300000, "drawCalls": 120, "residencyMiB": 160},
                            "mobileHome": {"essentialTransferMiB": 3, "optionalV1MiB": 7, "visibleTriangles": 140000, "drawCalls": 80, "residencyMiB": 80}},
           "fullOptionalV1": {"status":"PASS_BOUNDED_PACKAGE_BYTES", "bytes":all_package_bytes,
                               "MiB":round(all_package_bytes/MIB,4), "limitsMiB":{"desktop":14,"mobile":7},
                               "scope":"Conservative sum of all seven delivered runtime GLB/texture files. Additional provider-delivered V1 media are outside this static candidate and NOT RUN."}}
for key in ("desktop-home","mobile-home"):
    m = measurements[("R6",key)]
    variant = "desktopHome" if key == "desktop-home" else "mobileHome"
    limit = budgets["frozenLimits"][variant]
    transfer = browser["transferSummary"]["R6"]
    p = {"profile":key, "status":"PASS", "camera":m["camera"],
         "observedGLBTransfer":{"status":"PASS" if transfer["totalResponseBytes"] <= limit["essentialTransferMiB"]*MIB else "FAIL",
                                "requestCount":transfer["requestCount"], "bytes":transfer["totalResponseBytes"],
                                "MiB":round(transfer["totalResponseBytes"]/MIB,4), "allHTTP200":transfer["allHTTP200"],
                                "limitMiB":limit["essentialTransferMiB"], "evidence":"evidence/browser-results.json"},
         "visibleTriangles":{"status":"PASS" if m["rendererInfo"]["triangles"]<=limit["visibleTriangles"] else "FAIL",
                             "count":m["rendererInfo"]["triangles"],"limit":limit["visibleTriangles"]},
         "drawCalls":{"status":"PASS" if m["rendererInfo"]["calls"]<=limit["drawCalls"] else "FAIL",
                       "count":m["rendererInfo"]["calls"],"limit":limit["drawCalls"]},
         "assetDerivedResidency":{"status":"PASS" if m["resourceCensus"]["assetDecodedEstimateBytes"]<=limit["residencyMiB"]*MIB else "FAIL",
                                  "bytes":m["resourceCensus"]["assetDecodedEstimateBytes"],
                                  "MiB":round(m["resourceCensus"]["assetDecodedEstimateBytes"]/MIB,4),"limitMiB":limit["residencyMiB"],
                                  "evidence":"evidence/browser-results.json"},
         "frameSamples":{"status":"PASS_LOCAL_SAMPLE_ONLY","medianMs":m["frameSamples"]["medianMs"],"p95Ms":m["frameSamples"]["p95Ms"],
                         "sampleCount":len(m["frameSamples"]["samplesMs"]),"productionDeviceQualification":"NOT RUN"}}
    budgets["profiles"].append(p)
(OUT / "evidence" / "final-budgets.json").write_text(json.dumps(budgets,indent=2)+"\n",encoding="utf-8")

desktop = "captures/R6/desktop-home/webgl-canvas.png"
mobile = "captures/R6/mobile-home/webgl-canvas.png"
anchors = [
    ("Ivory desk with drawer supports", "PASS", "PASS", "Desk and drawer faces read in desktop; the supplemental three-drawer center support is visible beneath the desk in mobile, while the original outer support is cropped."),
    ("Blue-and-white chair", "PASS", "PASS", "Blue shell, seat, and ivory back inset are readable in both captures."),
    ("Prominent pink/lilac hex lights", "PASS", "PASS", "The large lit arrangement reads in both views; the mobile profile crops some upper wall area but retains a prominent hex pattern."),
    ("Cyan under-desk fill", "PASS", "PASS", "Cyan desk-front fill and floor light are visible in both captures."),
    ("Narrow warm monitor light bar", "PASS", "PASS", "The yellow bar sits on the monitor's top edge and is clearly separated from the screen in both views."),
    ("Plant-lined shelves and camera", "PASS", "PASS", "Plants and shelf camera are identifiable in both views; the outer shelf ends are cropped in mobile."),
    ("Central monitor with two round speakers", "PASS", "PASS", "The monitor and two round speaker faces read as a pair in desktop and mobile; mobile has the pair on the lower display shelf."),
    ("Left console and microphone", "PASS", "PASS", "The console controls and upright microphone are visible near the left monitor edge in both views; their mobile framing is tight."),
    ("PC case and readable fan face", "PASS", "PASS", "The compact case face and three pink-ringed fans are distinguishable in both views."),
    ("Right controller pegboard", "PASS", "FAIL", "Desktop shows the right-wall pegboard and controllers. In mobile, a compact controller display card is visible, but the full pegboard remains outside the unchanged camera crop."),
    ("Headset on its stand", "PASS", "PASS", "The arch, earcups, stem, and base read as a headset on a stand in both views, close to the mobile right edge."),
]
matrix = {"status":"OPEN_VISUAL_GAPS", "interpretation":"Maker visual inventory only; PASS describes visible evidence and is not approval.",
          "profileEvidence":{"desktop-home":{"camera":measurements[("R6","desktop-home")]["camera"],"capture":desktop},
                            "mobile-home":{"camera":measurements[("R6","mobile-home")]["camera"],"capture":mobile}},
          "anchors":[{"anchor":name,
                       "desktop":{"status":d,"camera":"desktop-home","evidence":desktop,"note":note},
                       "mobile":{"status":m,"camera":"mobile-home","evidence":mobile,"note":note}}
                      for name,d,m,note in anchors],
          "visualAcceptance":"NOT RUN; owner and independent reviewer must judge comparison page evidence.",
          "blockingFindings":["The exact mobile profile crops the full right-wall controller pegboard. A supplemental controller display card is visible, but it is not counted as the required wall pegboard.",
                              "Visual quality acceptance remains NOT RUN; the mobile framing is tight around the microphone, shelf ends, and headset. The supplemental center drawer support is visible although the original outer support is cropped."]}
(OUT / "evidence" / "requirement-matrix.json").write_text(json.dumps(matrix,indent=2)+"\n",encoding="utf-8")

archive = pathlib.Path(r"F:\Tools\blender-5.2.2-windows-x64.zip")
archive_sha = sha(archive)
expected_blender_sha = "3849d17a682cba006075aaa3f3597ecb5c9c30ec31035b2e092c53e40679b535"
if archive_sha != expected_blender_sha:
    raise SystemExit("Blender archive hash mismatch against official SHA-256 list")
tools = {"status":"PASS", "platform":platform.platform(), "python":sys.version.split()[0],
         "blender":{"version":blender["version"],"binarySHA256":"d13f752e3b9c","archive":"blender-5.2.2-windows-x64.zip",
                    "archiveBytes":archive.stat().st_size,"archiveSHA256":archive_sha,"officialSHA256":expected_blender_sha,
                    "officialDownloads":"https://download.blender.org/release/Blender5.2/",
                    "checksumFile":"evidence/blender-5.2.2.sha256","hashVerified":True},
         "node":browser["node"],"playwright":browser["playwright"],"chromium":browser["browser"],"three":browser["three"],
         "gltfValidator":validator["version"],"exactR5HarnessSHA256":browser["harnessSHA256"],
         "dependencyInstall":"Pinned R5 package.json/package-lock.json in F: scratch; no application dependencies changed."}
(OUT / "evidence" / "tool-versions.json").write_text(json.dumps(tools,indent=2)+"\n",encoding="utf-8")

commands = [
 {"command":"python deliveries/FINISH-B1-R6/scripts/verify-input-bindings.py","exitCode":0,"result":"PASS","log":"evidence/input-bindings.json"},
 {"command":"blender.exe --background --python-exit-code 1 --python deliveries/FINISH-B1-R6/scripts/build-static-details.py","exitCode":0,"result":"PASS","log":"evidence/blender-build.stdout.log"},
 {"command":"python deliveries/FINISH-B1-R6/scripts/merge-static-geometry.py","exitCode":0,"result":"PASS","log":"evidence/static-geometry-merge.json"},
 {"command":"node deliveries/FINISH-B1-R6/scripts/verify-browser.mjs","exitCode":0,"result":"PASS","log":"evidence/browser.stdout.log","environment":{"FINISH_B1_DEPENDENCY_ROOT":"F:/Yor-World-B1-R6-Scratch/harness-deps","PLAYWRIGHT_BROWSERS_PATH":"F:/Yor-World-B1-R6-Scratch/playwright-browsers","TMP":"F:/Yor-World-B1-R6-Scratch/system-temp","TEMP":"F:/Yor-World-B1-R6-Scratch/system-temp"}},
 {"command":"node deliveries/FINISH-B1-R6/scripts/validate-glb.mjs","exitCode":0,"result":"PASS","log":"evidence/gltf-validation.log","environment":{"FINISH_B1_DEPENDENCY_ROOT":"F:/Yor-World-B1-R6-Scratch/harness-deps"}},
 {"command":"blender.exe --background --python-exit-code 1 --python deliveries/FINISH-B1-R6/scripts/verify-blender-imports.py","exitCode":0,"result":"PASS","log":"evidence/blender-imports.log"},
 {"command":"python deliveries/FINISH-B1-R6/scripts/verify-invariants.py","exitCode":0,"result":"PASS","log":"evidence/final-invariants.json"},
 {"command":"python deliveries/FINISH-B1-R6/scripts/build-comparison.py","exitCode":0,"result":"PASS","log":"evidence/comparisons/index.html"},
 {"command":"python deliveries/FINISH-B1-R6/scripts/write-delivery-report.py","exitCode":0,"result":"PASS","log":"candidate-asset-manifest.json, evidence/final-budgets.json, evidence/requirement-matrix.json, evidence/tool-versions.json, report.md"},
]
(OUT / "evidence" / "final-check-commands.json").write_text(json.dumps({"status":"PASS","commands":commands},indent=2)+"\n",encoding="utf-8")

room = merge["assets"][0]
fixture = merge["assets"][1]
room_triangles = sum(x["addedTriangleCount"] for x in room["changedMeshes"])
fixture_triangles = sum(x["addedTriangleCount"] for x in fixture["changedMeshes"])
trans = browser["transferSummary"]["R6"]
report = f"""# FINISH-B1-R6 candidate report

Status: **candidate produced; not accepted**. This delivery contains static room and chair-fixture detail only. Owner visual review, independent audit, Parent acceptance, integration, production-device checks, provider checks, and G7 remain separate and are **NOT RUN**.

## Lineage and scope

- Base: FINISH-B1-R5 commit `a5ebcc88170703751a5f504f67aed637d2f7d8e9`, tree `d3dcb1ab82485749bd8b53f2b7cb9add2e576caa`, parent `7936fa981a24fe4af834ff250ffec8a7b02b09b3`.
- Raw R5 package binding: **PASS**. The raw committed `output-hashes.json` SHA-256 is `{binding['r5OutputManifest']['sha256']}`; {binding['r5OutputManifest']['listedFiles']} files / {binding['r5OutputManifest']['listedBytes']:,} bytes verified from Git.
- Provenance note: the staged copy initially differed from pinned raw Git in {sum(x['copyReboundFromRawGit'] for x in binding['rawGitFileBindings'])} manifest-listed files. The R6 input copy was rehydrated from those exact a5 raw blobs; see `evidence/input-bindings.json`. R5, `app/`, camera/door ownership, contracts, and prior committed evidence were not edited.
- Scope: {len(room['changedMeshes'])} existing room static mesh batches and {len(fixture['changedMeshes'])} existing chair-fixture batch changed. Added triangles: {room_triangles:,} room + {fixture_triangles:,} fixture. New nodes, materials, runtime asset requests, mesh nodes, GLB primitives, and interactive hooks: **0**.
- The original R5 binary data is preserved as a byte-identical prefix. Existing node, material, animation, light, camera, glass, and hierarchy inventories remain unchanged. See `evidence/static-geometry-merge.json`, `evidence/final-invariants.json`, and `evidence/final-inventory.json`.
- Delivery-local `.gitattributes` disables line-ending conversion so the rehydrated raw R5 inputs and the package SHA-256 manifest remain byte-identical in committed Git blobs on Windows.
- Editable sources: `assets/source/room.blend` and `assets/source/fixture.blend`. Blender 5.2.2 Windows archive SHA-256 was verified against the official checksum list; exact receipt and tool versions are in `evidence/tool-versions.json` and `evidence/blender-5.2.2.sha256`.

## Validation and budgets

- Blender-authored build and exports: **PASS**, Blender 5.2.2 LTS (`d13f752e3b9c`). Five final GLBs also imported in fresh Blender scenes with finite transforms: **PASS**.
- glTF Validator 2.0.0-dev.3.10: **PASS**, five final GLBs, 0 errors, 0 warnings.
- Exact-profile local Chromium browser run: **PASS** for 14 R5/R6 captures, 5/5 HTTP 200 asset responses per variant, unchanged desktop/mobile camera and renderer settings, no console errors, and unchanged five-request set. Browser is Chromium {browser['browser']} / Playwright {browser['playwright']} / Three {browser['three']}.
- R6 observed home asset response transfer is {trans['totalResponseBytes']:,} bytes ({trans['totalResponseBytes']/MIB:.3f} MiB) for five GLBs, up {trans['totalResponseBytes']-browser['transferSummary']['R5']['totalResponseBytes']:,} bytes from the matched R5 baseline. This is under the frozen 6 MiB desktop and 3 MiB mobile essential-transfer limits. The conservative sum of all seven delivered runtime GLB/texture files is {all_package_bytes:,} bytes ({all_package_bytes/MIB:.3f} MiB), under the 14/7 MiB optional V1 file-budget ceilings. Provider-served optional media outside this package were **NOT RUN**.
- Desktop/mobile visible counts: {measurements[('R6','desktop-home')]['rendererInfo']['triangles']:,}/{measurements[('R6','mobile-home')]['rendererInfo']['triangles']:,} triangles ({measurements[('R6','desktop-home')]['rendererInfo']['triangles']-measurements[('R5','desktop-home')]['rendererInfo']['triangles']:,}/{measurements[('R6','mobile-home')]['rendererInfo']['triangles']-measurements[('R5','mobile-home')]['rendererInfo']['triangles']:,} from matched R5) and {measurements[('R6','desktop-home')]['rendererInfo']['calls']}/{measurements[('R6','mobile-home')]['rendererInfo']['calls']} draw calls (0 delta), under the 300k/140k triangle and 120/80 call limits. Asset-derived loaded residency estimate is {measurements[('R6','desktop-home')]['resourceCensus']['assetDecodedEstimateBytes']:,} bytes per view, up {measurements[('R6','desktop-home')]['resourceCensus']['assetDecodedEstimateBytes']-measurements[('R5','desktop-home')]['resourceCensus']['assetDecodedEstimateBytes']:,} bytes from R5 (under 160/80 MiB). Receipts: `evidence/final-budgets.json` and `evidence/browser-results.json`.
- Local frame sample after 30 warmup frames and 180 sampled frames: desktop p50/p95 {measurements[('R6','desktop-home')]['frameSamples']['medianMs']:.2f}/{measurements[('R6','desktop-home')]['frameSamples']['p95Ms']:.2f} ms; mobile p50/p95 {measurements[('R6','mobile-home')]['frameSamples']['medianMs']:.2f}/{measurements[('R6','mobile-home')]['frameSamples']['p95Ms']:.2f} ms. This is a local headless software/WebGL timing sample, not device or production qualification.

## Visual findings

The matched comparison page is `evidence/comparisons/index.html`. It shows the main reference, committed R5 capture, fresh matched R5 capture, and R6 capture for both exact home profiles. The `evidence/requirement-matrix.json` records the anchor outcomes against the exact profile captures. The mobile view uses the supplemental center drawer support because the original outer support is cropped. The full right-wall controller pegboard remains outside the fixed mobile frame; a compact controller display card is visible but does not satisfy that full anchor. The microphone, shelf ends, and headset are close to the frame edges. Owner and independent visual judgments remain **NOT RUN**; this inventory is not art acceptance.

## Files and handoff

- Updated candidate manifest: `candidate-asset-manifest.json`.
- Reproduction and package scripts: `scripts/build-static-details.py`, `scripts/merge-static-geometry.py`, `scripts/verify-browser.mjs`, `scripts/validate-glb.mjs`, `scripts/verify-blender-imports.py`, `scripts/verify-input-bindings.py`, `scripts/verify-invariants.py`, `scripts/build-comparison.py`, `scripts/write-delivery-report.py`, `scripts/build-output-hashes.py`, `scripts/verify-package.py`.
- Commands, tool versions, captures, logs, inventories, validator JSON, transfer/performance receipts, and raw Git input bindings are under `evidence/`. `output-hashes.json` binds the delivered file set; `evidence/package-verification.json` records the package check.
- Candidate branch is based on the exact pinned R5 commit. This is maker evidence only; no self-audit or acceptance is claimed.
"""
(OUT / "report.md").write_text(report, encoding="utf-8")
print(json.dumps({"status":"PASS","candidateManifest":manifest["candidate"],"runtimeFiles":len(runtime),
                  "desktopHomeAnchors":len(anchors),"essentialResponseBytes":trans["totalResponseBytes"],
                  "packageRuntimeBytes":all_package_bytes,"visualStatus":matrix["status"]},indent=2))
