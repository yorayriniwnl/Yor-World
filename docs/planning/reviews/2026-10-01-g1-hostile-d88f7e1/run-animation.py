from pathlib import Path
import json, subprocess, datetime, os
out=Path(__file__).resolve().parent
record=json.loads((out/'execution.json').read_text(encoding='utf-8'))
app=Path(record['app']); destination=app/'tests/reviewer';destination.mkdir(exist_ok=True)
(destination/'real-animation.test.ts').write_bytes((out/'real-animation.test.ts').read_bytes())
config=app/'reviewer.vitest.config.ts'
config.write_text("import { defineConfig } from 'vitest/config'; export default defineConfig({test:{include:['tests/reviewer/**/*.test.ts'],environment:'node'}});",encoding='utf-8')
argv=[record['node'],str(app/'node_modules/vitest/vitest.mjs'),'run','--config','reviewer.vitest.config.ts']
with (out/'real-animation.log').open('w',encoding='utf-8') as log:
    p=subprocess.run(argv,cwd=app,env={**os.environ,'REVIEWER_EVIDENCE':str(out)},stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
(out/'real-animation-execution.json').write_text(json.dumps({'evidenceClass':'REVIEWER EXECUTED','argv':argv,'sourceRevision':record['sourceRevision'],'exitCode':p.returncode,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidateChanges':'None; separate reviewer tests/config only in scratch copy'},indent=2),encoding='utf-8')
print('reviewer regression exit',p.returncode)
