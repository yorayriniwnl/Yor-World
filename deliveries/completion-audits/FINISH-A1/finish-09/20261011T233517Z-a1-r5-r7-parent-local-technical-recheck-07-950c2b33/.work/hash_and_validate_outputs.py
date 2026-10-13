import hashlib,json,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[6]
ROOTS={
 "A1":ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33",
 "C1":ROOT/"deliveries/completion-audits/FINISH-C1/finish-16/20261011T233517Z-c1-r9-parent-local-technical-recheck-07-950c2b33",
}
required=["report.md","findings.json","requirement-matrix.json","candidate-binding.json","commands.json","tool-versions.json"]
summary={}
for lane,base in ROOTS.items():
 for name in required:
  if not (base/name).is_file(): raise SystemExit(f"{lane} missing required file {name}")
 matrix=json.loads((base/"requirement-matrix.json").read_text(encoding="utf-8"))
 unresolved=[]
 for row in matrix.get("requirements",[]):
  for ref in row.get("evidencePaths",[]):
   if not (base/ref).is_file(): unresolved.append({"requirement":row.get("requirement"),"path":ref})
 if unresolved: raise SystemExit(f"{lane} unresolved matrix evidence: {unresolved}")
 files=[]; total=0
 for here,dirs,names in os.walk(base):
  dirs[:]=sorted(d for d in dirs if d!=".work" and not (Path(here)/d).is_symlink())
  for name in sorted(names):
   path=Path(here)/name
   if path.name=="output-hashes.json" or path.is_symlink(): continue
   data=path.read_bytes(); rel=path.relative_to(base).as_posix(); total+=len(data)
   files.append({"path":rel,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()})
 manifest={"format":"YOR-WORLD-FINISH36-PARENT-LOCAL-AUDIT-OUTPUT-HASHES-v1","hashPolicy":"SHA-256 of raw stable output file bytes; output-hashes.json self-hash and .work/ are omitted","lane":lane,"fileCount":len(files),"totalBytes":total,"files":files}
 out=base/"output-hashes.json"; out.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
 # Recompute the manifest rows after writing the file.
 mismatches=[]
 for row in files:
  data=(base/row["path"]).read_bytes()
  if len(data)!=row["bytes"] or hashlib.sha256(data).hexdigest()!=row["sha256"]: mismatches.append(row["path"])
 summary[lane]={"fileCount":len(files),"totalBytes":total,"unresolvedEvidence":unresolved,"mismatches":mismatches,"manifestSha256":hashlib.sha256(out.read_bytes()).hexdigest(),"passed":not unresolved and not mismatches}
if not all(x["passed"] for x in summary.values()): raise SystemExit(1)
print(json.dumps(summary,indent=2))
