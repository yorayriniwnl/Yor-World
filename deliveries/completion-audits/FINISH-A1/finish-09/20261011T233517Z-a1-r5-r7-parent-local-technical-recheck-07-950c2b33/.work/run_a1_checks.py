import json, os, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[6]
AUDIT=ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33"
APP=AUDIT/".work/a1-exact-base/app"
EV=AUDIT/"evidence"
NODE=r"C:\Program Files\nodejs\node.exe"
COREPACK=r"C:\Program Files\nodejs\node_modules\corepack\dist\corepack.js"
def pnpm(*args): return [NODE,COREPACK,"pnpm",*args]
jobs=[
 ("pnpm-install",pnpm("install","--frozen-lockfile")),
 ("unit-focused",pnpm("exec","vitest","run","--config","vitest.config.ts","tests/unit/platform/completion-authoring-blocks.test.ts")),
 ("integration-focused",pnpm("exec","vitest","run","--config","vitest.integration.config.ts","tests/integration/platform/completion-authoring-preview.test.ts")),
 ("unit-full",pnpm("run","test:unit")),
 ("integration-full",pnpm("run","test:integration")),
 ("lint",pnpm("run","lint")),
 ("typecheck",pnpm("run","typecheck")),
 ("build",pnpm("run","build")),
]
env=os.environ.copy(); env["NEXT_TELEMETRY_DISABLED"]="1"; env["CI"]="1"
results=[]
for name,cmd in jobs:
 print(f"START {name}: {' '.join(cmd)}",flush=True); started=time.time()
 p=subprocess.run(cmd,cwd=APP,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 (EV/f"{name}.stdout.log").write_bytes(p.stdout)
 (EV/f"{name}.stderr.log").write_bytes(p.stderr)
 (EV/f"{name}.exit-code.txt").write_text(str(p.returncode)+"\n",encoding="ascii")
 row={"name":name,"command":cmd,"exitCode":p.returncode,"elapsedSeconds":round(time.time()-started,3),"stdoutBytes":len(p.stdout),"stderrBytes":len(p.stderr)}
 results.append(row); print(f"DONE {name}: exit={p.returncode} elapsed={row['elapsedSeconds']}s stdout={len(p.stdout)} stderr={len(p.stderr)}",flush=True)
report={"schemaVersion":1,"cwd":str(APP),"node":subprocess.run([NODE,"--version"],stdout=subprocess.PIPE,text=True).stdout.strip(),"python":subprocess.run(["python","--version"],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True).stdout.strip(),"pnpm":subprocess.run(pnpm("--version"),cwd=APP,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True).stdout.strip(),"commands":results,"passed":all(x["exitCode"]==0 for x in results)}
(EV/"a1-command-results.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"passed":report["passed"],"results":[{"name":x["name"],"exitCode":x["exitCode"],"elapsedSeconds":x["elapsedSeconds"]} for x in results],"node":report["node"],"pnpm":report["pnpm"]},indent=2),flush=True)
if not report["passed"]: raise SystemExit(1)
