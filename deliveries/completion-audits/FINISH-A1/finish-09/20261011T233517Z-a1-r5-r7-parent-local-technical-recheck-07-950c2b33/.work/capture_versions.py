import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[6]
AUDIT=ROOT/"deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33"
APP=AUDIT/".work/a1-exact-base/app"; NODE=r"C:\Program Files\nodejs\node.exe"
script='import { chromium } from "@playwright/test"; const b=await chromium.launch({headless:true}); console.log(JSON.stringify({version:b.version()})); await b.close();'
p=subprocess.run([NODE,"--input-type=module","-e",script],cwd=APP,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
if p.returncode: raise SystemExit(p.stderr.decode(errors="replace"))
browser=json.loads(p.stdout.decode().strip().splitlines()[-1])
def version(pkg):
 return json.loads((APP/"node_modules"/pkg/"package.json").read_text(encoding="utf-8"))["version"]
tools={"audit":"Parent-local exact-candidate recheck","python":"3.12.10","node":"v24.19.0","pnpm":"9.15.9","next":version("next"),"vitest":version("vitest"),"playwright":version("@playwright/test"),"chromium":browser["version"],"pglite":version("@electric-sql/pglite"),"typescript":version("typescript"),"eslint":version("eslint")}
(AUDIT/"evidence/tool-versions.json").write_text(json.dumps(tools,indent=2)+"\n",encoding="utf-8")
print(json.dumps(tools,indent=2))
