import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[6]
AUDIT=ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33"
REPLAY=AUDIT/".work/a1-exact-base"
COMMIT="76d679dcb98064152021830b98f16eb456b3ae19"; PREFIX="deliveries/FINISH-A1/r5-07"; PATCH=AUDIT/".work/a1-source.patch"
def run(args,cwd=ROOT): return subprocess.run(["git",*args],cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
def git(*args,cwd=ROOT):
 p=run(args,cwd)
 if p.returncode: raise RuntimeError(f"git {args} failed {p.returncode}: {p.stderr.decode(errors='replace')}")
 return p.stdout
ev=AUDIT/"evidence"; attempt_path=ev/"patch-replay.json"
attempt=json.loads(attempt_path.read_text(encoding="utf-8"))
attempt_no=1 if not (ev/"patch-replay-attempt-01.json").exists() else 2
(ev/f"patch-replay-attempt-0{attempt_no}.json").write_text(json.dumps(attempt,indent=2)+"\n",encoding="utf-8")
(ev/f"patch-replay-attempt-0{attempt_no}.exit-code.txt").write_text("1\n",encoding="ascii")
raw=git("show",f"{COMMIT}:{PREFIX}/source.patch"); patch_sha=hashlib.sha256(raw).hexdigest()
base=git("rev-parse","HEAD",cwd=REPLAY).decode().strip()
forward_check=attempt.get("forwardApplyCheckExit",attempt.get("patchCheckExit")); forward_apply=attempt.get("forwardApplyExit",attempt.get("applyExit")); forward_diff=attempt.get("forwardDiffCheckExit",attempt.get("diffCheckExit"))
rev=run(["apply","--reverse","--check",str(PATCH)],REPLAY)
cached=git("diff","--cached","--name-only","--","app",cwd=REPLAY).decode().splitlines()
unstaged=git("diff","--name-only","--","app",cwd=REPLAY).decode().splitlines()
paths=sorted(set(cached+unstaged))
patch_paths=sorted(set(line.decode() for line in __import__("re").findall(rb"^diff --git a/(.*?) b/.*$",raw,__import__("re").M)))
entries={}
for rec in git("ls-tree","-r","-z",COMMIT).split(b"\0"):
 if not rec: continue
 meta,path=rec.split(b"\t",1); mode,kind,oid=meta.decode().split(); name=path.decode()
 if kind=="blob" and name.startswith(PREFIX+"/source/app/"): entries[name[len(PREFIX+"/source/"):]]=oid
mismatches=[]
for rel in paths:
 oid=entries.get(rel); local=(REPLAY/rel).read_bytes() if (REPLAY/rel).is_file() else None
 packaged=git("cat-file","blob",oid) if oid else None
 if local is None or packaged is None or local!=packaged: mismatches.append(rel)
index_tree=git("write-tree",cwd=REPLAY).decode().strip(); app_tree=git("rev-parse",f"{index_tree}:app",cwd=REPLAY).decode().strip()
diffcheck=run(["diff","--cached","--check"],REPLAY)
ok=base=="f62a43c5e71c00dcb89e28275ea81d842167db80" and patch_sha=="aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8" and forward_check==0 and forward_apply==0 and forward_diff==0 and rev.returncode==0 and diffcheck.returncode==0 and paths==patch_paths and len(paths)==25 and not mismatches and app_tree=="ba8f952edc34e94393c48b25779071daab9a9812"
result={"baseCommit":base,"baseAppTree":"42ea29ec235225046a75959eb19eb386ac2f821d","expectedPatchedAppTree":"ba8f952edc34e94393c48b25779071daab9a9812","actualPatchedAppTree":app_tree,"patchSha256":patch_sha,"patchBytes":len(raw),"forwardApplyCheckExit":forward_check,"forwardApplyExit":forward_apply,"forwardDiffCheckExit":forward_diff,"reverseApplyCheckExit":rev.returncode,"cachedDiffCheckExit":diffcheck.returncode,"changedPathCount":len(paths),"patchPaths":patch_paths,"replayedPaths":paths,"packagedReplacementMismatchPaths":mismatches,"passed":ok}
attempt_path.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
(ev/"patch-replay.exit-code.txt").write_text(("0" if ok else "1")+"\n",encoding="ascii")
(ev/"patch-replay.reverse-check.stdout.log").write_bytes(rev.stdout)
(ev/"patch-replay.reverse-check.stderr.log").write_bytes(rev.stderr)
(ev/"patch-replay.cached-diff-check.stderr.log").write_bytes(diffcheck.stderr)
print(json.dumps(result,indent=2))
if not ok: raise SystemExit(1)
