import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1];sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
manifest=json.loads((ROOT/"evidence/package-manifest.json").read_text(encoding="utf-8"));inv=json.loads((ROOT/"evidence/palette-invariants.json").read_text(encoding="utf-8"))
assets=[]
for p in sorted((ROOT/"assets").rglob("*")):
 if p.is_file() and not p.name.endswith(".blend1"):
  assets.append({"file":p.relative_to(ROOT).as_posix(),"bytes":p.stat().st_size,"sha256":sha(p)})
captures=[]
for p in sorted((ROOT/"captures/R5").rglob("*.png")):
 captures.append({"file":p.relative_to(ROOT).as_posix(),"bytes":p.stat().st_size,"sha256":sha(p)})
changed=[{"file":"assets/room.glb","sha256":sha(ROOT/"assets/room.glb")},{"file":"assets/fixture.glb","sha256":sha(ROOT/"assets/fixture.glb")},{"file":"assets/source/room.blend","sha256":sha(ROOT/"assets/source/room.blend")}]
receipt={"schemaVersion":1,"candidate":"FINISH-B1-R5","baseCommit":"7936fa981a24fe4af834ff250ffec8a7b02b09b3","packageManifestSha256":manifest["manifestRowsSha256"],"packageFileCount":manifest["fileCount"],"changedOutputFiles":changed,"allAssetOutputs":assets,"untouchedAssetsByteIdentical":inv["untouchedAssetsByteIdentical"],"candidateCaptures":captures,"sourcePatchSha256":sha(ROOT/"source.patch"),"candidateBuilderSha256":sha(ROOT/"source/blender/scripts/build-environment.py"),"appChanged":False,"makerAcceptance":False}
(ROOT/"output-hashes.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8");print(json.dumps({"packageManifestSha256":receipt["packageManifestSha256"],"packageFileCount":receipt["packageFileCount"],"assetCount":len(assets),"captureCount":len(captures)}))
