import json, os, socket, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[6]
AUDIT=ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33"
APP=AUDIT/".work/a1-exact-base/app"; EV=AUDIT/"evidence"; PORT=3159
NODE=r"C:\Program Files\nodejs\node.exe"; COREPACK=r"C:\Program Files\nodejs\node_modules\corepack\dist\corepack.js"
with socket.socket() as s:
    if s.connect_ex(("127.0.0.1",PORT))==0: raise SystemExit(f"Port {PORT} is occupied; choose a free port before running.")
db=AUDIT/".work/a1-e2e-pglite"
if db.exists(): raise SystemExit(f"Fixture DB path already exists; preserve it: {db}")
env=os.environ.copy(); env.update({"CI":"1","PORT":str(PORT),"YOR_E2E_FIXTURE":"1","YOR_TEST_DATABASE_PATH":str(db),"A1_EVIDENCE_DIR":str(EV),"B5_EVIDENCE_DIR":str(EV),"NEXT_TELEMETRY_DISABLED":"1"})
cmd=[NODE,COREPACK,"pnpm","exec","playwright","test","tests/e2e/platform/admin-publish.spec.ts","tests/e2e/platform/completion-authoring-workflow.spec.ts"]
print("START chromium: " + " ".join(cmd),flush=True); started=time.time()
p=subprocess.run(cmd,cwd=APP,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=300)
(EV/"chromium.stdout.log").write_bytes(p.stdout); (EV/"chromium.stderr.log").write_bytes(p.stderr); (EV/"chromium.exit-code.txt").write_text(str(p.returncode)+"\n",encoding="ascii")
build=(APP/".next/BUILD_ID").read_text(encoding="utf-8").strip()
tree=subprocess.run(["git","write-tree"],cwd=AUDIT/".work/a1-exact-base",stdout=subprocess.PIPE,check=True).stdout.decode().strip()
app_tree=subprocess.run(["git","rev-parse",f"{tree}:app"],cwd=AUDIT/".work/a1-exact-base",stdout=subprocess.PIPE,check=True).stdout.decode().strip()
pw=json.loads((APP/"node_modules/@playwright/test/package.json").read_text(encoding="utf-8"))
binding={"candidateCommit":"76d679dcb98064152021830b98f16eb456b3ae19","baseCommit":"f62a43c5e71c00dcb89e28275ea81d842167db80","replayedAppTree":app_tree,"expectedAppTree":"ba8f952edc34e94393c48b25779071daab9a9812","buildId":build,"playwrightVersion":pw.get("version"),"chromiumPort":PORT,"fixture":"YOR_E2E_FIXTURE=1; disposable PGlite path under audit .work; owner cookie fixture","command":cmd,"exitCode":p.returncode,"elapsedSeconds":round(time.time()-started,3),"stdoutBytes":len(p.stdout),"stderrBytes":len(p.stderr)}
(EV/"browser-binding.json").write_text(json.dumps(binding,indent=2)+"\n",encoding="utf-8")
print(json.dumps(binding,indent=2),flush=True)
if p.returncode: raise SystemExit(p.returncode)
