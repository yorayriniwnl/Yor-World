import hashlib, json, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[6]
AUDIT=ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33"
REPLAY=AUDIT/".work/a1-exact-base"
COMMIT="76d679dcb98064152021830b98f16eb456b3ae19"
PREFIX="deliveries/FINISH-A1/r5-07"
PATCH=AUDIT/".work/a1-source.patch"

def run(args,cwd=ROOT):
    return subprocess.run(args,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
def git(*args,cwd=ROOT):
    p=run(["git",*args],cwd)
    if p.returncode: raise RuntimeError(f"git {args} failed {p.returncode}: {p.stderr.decode(errors='replace')}")
    return p.stdout

raw=git("show",f"{COMMIT}:{PREFIX}/source.patch")
PATCH.write_bytes(raw)
check=run(["git","apply","--check",str(PATCH)],REPLAY)
apply=None
if check.returncode==0: apply=run(["git","apply",str(PATCH)],REPLAY)
else: apply=check
diffcheck=run(["git","diff","--check"],REPLAY) if apply.returncode==0 else None
paths=git("diff","--name-only","--","app" ,cwd=REPLAY).decode().splitlines() if apply.returncode==0 else []
tree_before=git("rev-parse","HEAD:app",cwd=REPLAY).decode().strip()
if apply.returncode==0: git("add","--","app",cwd=REPLAY)
index_tree=git("write-tree",cwd=REPLAY).decode().strip() if apply.returncode==0 else None
tree_after=git("rev-parse",f"{index_tree}:app",cwd=REPLAY).decode().strip() if index_tree else None
candidate_source_tree=git("rev-parse",f"{COMMIT}:{PREFIX}/source/app").decode().strip()
source_entries={}
for row in git("ls-tree","-r","-z",COMMIT).split(b"\0"):
    if not row: continue
    meta,path=row.split(b"\t",1); mode,kind,oid=meta.decode().split(); name=path.decode()
    if kind=="blob" and name.startswith(PREFIX+"/source/app/"):
        source_entries[name[len(PREFIX+"/source/"):]]=oid
replacement_mismatches=[]
for rel in paths:
    oid=source_entries.get(rel)
    local=(REPLAY/rel).read_bytes() if (REPLAY/rel).is_file() else None
    packaged=git("cat-file","blob",oid) if oid else None
    if oid is None or local!=packaged:
        replacement_mismatches.append(rel)
patchhash=hashlib.sha256(raw).hexdigest()
result={
 "baseCommit":git("rev-parse","HEAD",cwd=REPLAY).decode().strip(),
 "baseAppTree":tree_before,
 "candidateAppTreeExpected":"ba8f952edc34e94393c48b25779071daab9a9812",
 "candidateAppTreeActual":tree_after,
 "candidatePackageSourceAppTree":candidate_source_tree,
 "patchSha256":patchhash,
 "patchBytes":len(raw),
 "patchCheckExit":check.returncode,
 "applyExit":apply.returncode,
 "diffCheckExit":diffcheck.returncode if diffcheck else None,
 "changedPathCount":len(paths),
 "changedPaths":paths,
 "sourceReplacementMismatchPaths":replacement_mismatches,
 "passed":check.returncode==0 and apply.returncode==0 and diffcheck is not None and diffcheck.returncode==0 and tree_before=="42ea29ec235225046a75959eb19eb386ac2f821d" and tree_after=="ba8f952edc34e94393c48b25779071daab9a9812" and candidate_source_tree==tree_after and len(paths)==25 and not replacement_mismatches
}
(AUDIT/"evidence/patch-replay.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
(AUDIT/"evidence/patch-replay.stdout.log").write_bytes(check.stdout+apply.stdout+(diffcheck.stdout if diffcheck else b""))
(AUDIT/"evidence/patch-replay.stderr.log").write_bytes(check.stderr+apply.stderr+(diffcheck.stderr if diffcheck else b""))
(AUDIT/"evidence/patch-replay.exit-code.txt").write_text(str(0 if result["passed"] else 1)+"\n",encoding="ascii")
print(json.dumps(result,indent=2))
if not result["passed"]: raise SystemExit(1)
