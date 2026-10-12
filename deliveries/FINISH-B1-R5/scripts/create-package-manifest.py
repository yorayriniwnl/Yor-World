import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
fixed=[".gitattributes",".gitignore","report.md","issue-matrix.json","source.patch"]
script_names=["apply-gltf-palette.py","apply-native-palette.py","build-comparison-sheets.py","create-output-hashes.py","create-package-manifest.py","dump-native-inventory.py","normalize-browser-results.py","run-finish35-checks.py","validate-glb.mjs","verify-blender-imports.py","verify-browser.mjs","verify-final-budgets.py","verify-palette-invariants.py","verify-package-integrity.py","verify-source-patch.py"]
evidence_names=["browser-results.json","browser-runner-adaptation.patch","browser-runner-raw.json","blender-imports.json","commands-and-exit-codes.json","final-budgets.json","gltf-palette-replay.json","gltf-validation.json","input-bindings.json","mobile-comparison.png","native-inventory-r4.json","native-inventory-r5.json","package-manifest.json","palette-invariants.json","source-patch-replay.json","tool-versions.json","visual-comparison.png"]
paths=set(fixed)
for name in script_names:paths.add("scripts/"+name)
for name in evidence_names:paths.add("evidence/"+name)
for dirname in ["assets","source","captures/R5","inputs/r3","inputs/r4","inputs/reviews","inputs/finish-35","checkpoints/material-only/assets"]:
 for p in (ROOT/dirname).rglob("*"):
  if p.is_file() and not p.name.endswith(".blend1"):paths.add(p.relative_to(ROOT).as_posix())
checkpoint=ROOT/"checkpoints/material-only/checkpoint-hashes.json"
if checkpoint.is_file():paths.add(checkpoint.relative_to(ROOT).as_posix())
for p in (ROOT/"evidence/logs").rglob("*"):
 if p.is_file():paths.add(p.relative_to(ROOT).as_posix())
paths.discard("evidence/package-manifest.json");paths.discard("output-hashes.json")
missing=[x for x in sorted(paths) if not (ROOT/x).is_file()]
if missing:raise SystemExit("missing package paths: "+", ".join(missing))
rows=[]
for rel in sorted(paths):
 b=(ROOT/rel).read_bytes();rows.append({"path":rel,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()})
canonical=json.dumps(rows,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode();digest=hashlib.sha256(canonical).hexdigest()
receipt={"schemaVersion":1,"candidate":"FINISH-B1-R5","fileCount":len(rows),"totalBytes":sum(r["bytes"] for r in rows),"manifestRowsSha256":digest,"exclusions":["evidence/package-manifest.json (self-reference)","output-hashes.json (records this manifest digest)","ignored .work, .blend1 and generated __pycache__ files"],"files":rows}
(ROOT/"evidence/package-manifest.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8");print(json.dumps({k:receipt[k] for k in ("candidate","fileCount","totalBytes","manifestRowsSha256")}))
