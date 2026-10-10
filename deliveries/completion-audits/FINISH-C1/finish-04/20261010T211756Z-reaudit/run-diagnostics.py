import pathlib, shutil, subprocess, json, datetime, os
OUT=pathlib.Path(__file__).resolve().parent
ROOT=OUT.parents[4]
candidate=OUT/'candidate'
source=OUT/'reaudit-contract.test.ts'
shutil.copyfile(source,candidate/'tests/unit/reaudit-contract.test.ts')
commands=[['node',str(ROOT/'app/node_modules/vitest/vitest.mjs'),'run','tests/unit/reaudit-contract.test.ts','--reporter=json','--outputFile='+str(OUT/'diagnostic-results.json')]]
prior=OUT/'diagnostic-results.json'
if prior.exists(): shutil.copyfile(prior,OUT/'diagnostic-results-before-final.json')
(OUT/'observations.jsonl').write_text('')
environment=dict(os.environ)
environment['FINISH_AUDIT_OBSERVATIONS']=str(OUT/'observations.jsonl')
receipts=[]
for i,args in enumerate(commands):
    started=datetime.datetime.now(datetime.timezone.utc).isoformat()
    r=subprocess.run(args,cwd=candidate,env=environment,capture_output=True)
    (OUT/f'diagnostic-{i}.stdout.log').write_bytes(r.stdout)
    (OUT/f'diagnostic-{i}.stderr.log').write_bytes(r.stderr)
    receipts.append({'command':args,'cwd':str(candidate),'environmentOverrides':{'FINISH_AUDIT_OBSERVATIONS':str(OUT/'observations.jsonl')},'startedAt':started,'exit':r.returncode,'stdout':f'diagnostic-{i}.stdout.log','stderr':f'diagnostic-{i}.stderr.log','priorDiagnosticRuns':'Initial 22-case diagnostic was expanded to 28 cases and then final 29. Final unique case count only; prior 28-case results are preserved separately.'})
(OUT/'diagnostic-command-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
results=json.loads((OUT/'diagnostic-results.json').read_text('utf8'))
print(json.dumps({k:results[k] for k in ['numTotalTests','numPassedTests','numFailedTests','success']},indent=2))
for suite in results['testResults']:
    for test in suite['assertionResults']:
        print(test['status'].upper()+': '+test['title'])
