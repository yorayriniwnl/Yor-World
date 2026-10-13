import hashlib,json,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[6]
AUDIT=ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33"
APP=AUDIT/".work/a1-exact-base/app"; EV=AUDIT/"evidence"
commands=json.loads((EV/"a1-command-results.json").read_text(encoding="utf-8"))
browser=json.loads((EV/"browser-results.json").read_text(encoding="utf-8"))
binding=json.loads((EV/"browser-binding.json").read_text(encoding="utf-8"))
build_id=(APP/".next/BUILD_ID").read_text(encoding="utf-8").strip()
files=[]; total=0
base=APP/".next"
for here,dirs,names in os.walk(base):
    dirs[:]=sorted(d for d in dirs if not (Path(here)/d).is_symlink())
    for name in sorted(names):
        p=Path(here)/name
        if p.is_symlink(): continue
        b=p.read_bytes(); rel=p.relative_to(base).as_posix(); total+=len(b)
        files.append({"path":rel,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()})
manifest={"candidateCommit":binding["candidateCommit"],"replayedAppTree":binding["replayedAppTree"],"buildId":build_id,"fileCount":len(files),"totalBytes":total,"files":files}
(EV/"local-build-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
screens={}
for name in ("candidatex-private-preview.png","publish-rollback-review.png"):
 b=(EV/name).read_bytes(); screens[name]={"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}
stats=browser.get("stats",{})
summary={"candidateCommit":binding["candidateCommit"],"replayedAppTree":binding["replayedAppTree"],"expectedAppTree":binding["expectedAppTree"],"buildId":build_id,"browserBuildMatches":binding["buildId"]==build_id,"browserVersion":binding["playwrightVersion"],"playwrightExpected":stats.get("expected"),"playwrightSkipped":stats.get("skipped"),"playwrightUnexpected":stats.get("unexpected"),"playwrightFlaky":stats.get("flaky"),"playwrightPass":stats.get("expected")==6 and stats.get("skipped")==0 and stats.get("unexpected")==0 and stats.get("flaky")==0,"buildFileCount":len(files),"buildBytes":total,"buildManifestSha256":hashlib.sha256((EV/"local-build-manifest.json").read_bytes()).hexdigest(),"commands":commands["commands"],"screenshots":screens,"fixture":"synthetic PGlite/owner-cookie media; not provider approved","passed":binding["replayedAppTree"]==binding["expectedAppTree"] and binding["buildId"]==build_id and stats.get("expected")==6 and stats.get("unexpected")==0 and all(x["exitCode"]==0 for x in commands["commands"])}
(EV/"a1-evidence-summary.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:v for k,v in summary.items() if k not in ("commands","screenshots")},indent=2))
if not summary["passed"]: raise SystemExit(1)
