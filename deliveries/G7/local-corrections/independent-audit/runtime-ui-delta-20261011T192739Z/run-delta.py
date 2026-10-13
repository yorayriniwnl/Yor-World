import pathlib,subprocess,hashlib,json,datetime,os
OUT=pathlib.Path(__file__).resolve().parent
ROOT=OUT.parents[4];APP=ROOT/'app'
paths=['app/src/features/world/WorldInteractionBinding.ts','app/tests/unit/world-interaction-binding.test.ts','app/src/features/experience/controller.ts','app/src/features/experience/interaction-registry.ts','app/src/features/world/LowQualityBatch.ts','app/pnpm-lock.yaml','app/package.json','deliveries/G7/local-corrections/independent-audit/runtime-ui-20261011T191548Z/report.md','deliveries/G7/local-corrections/independent-audit/runtime-ui-20261011T191548Z/findings.json']
def hashes():return [{'path':p,'bytes':(ROOT/p).stat().st_size,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in paths]
before=hashes();(OUT/'input-hashes.json').write_text(json.dumps(before,indent=2)+'\n');receipts=[]
def run(args,cwd=ROOT,env=None,name=None):
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();r=subprocess.run(args,cwd=cwd,env=env,capture_output=True)
    receipt={'command':args,'cwd':str(cwd),'startedAt':started,'exit':r.returncode,'stdout':r.stdout.decode('utf8','replace'),'stderr':r.stderr.decode('utf8','replace')}
    if name:
        (OUT/(name+'.stdout.log')).write_bytes(r.stdout);(OUT/(name+'.stderr.log')).write_bytes(r.stderr);receipt['rawLogs']=[name+'.stdout.log',name+'.stderr.log']
    receipts.append(receipt);return r
identity={'role':'Local Codex independent delta audit only; not external GPT Plus #2 or acceptance.','worktree':str(ROOT),'head':run(['git','rev-parse','HEAD']).stdout.decode().strip(),'requestedCommits':[]}
for ref in ['179cb341','e75109a6']:
    identity['requestedCommits'].append({'ref':ref,'commit':run(['git','rev-parse',ref]).stdout.decode().strip(),'details':run(['git','show','--format=fuller','--stat',ref]).stdout.decode('utf8','replace')})
identity['trackedDeltaToSecondCommitExit']=run(['git','diff','--exit-code','e75109a6','--',*paths[:2]]).returncode
identity['nodeVersion']=run(['node','--version']).stdout.decode().strip();identity['vitestVersion']=run(['node',str(APP/'node_modules/vitest/vitest.mjs'),'--version']).stdout.decode().strip()
env=dict(os.environ);env['DELTA_OBSERVATIONS']=str(OUT/'observations.jsonl')
r=run(['node',str(APP/'node_modules/vitest/vitest.mjs'),'run','--config',str(OUT/'vitest.config.mjs'),'--reporter=json','--outputFile='+str(OUT/'independent-results.json')],APP,env,'independent')
maker=run(['node',str(APP/'node_modules/vitest/vitest.mjs'),'run','--config','vitest.config.ts','tests/unit/world-interaction-binding.test.ts','--reporter=json','--outputFile='+str(OUT/'retained-unit-results.json')],APP,None,'retained-unit')
after=hashes();identity['inputChangesDuringExecution']=[p['path'] for p,q in zip(before,after) if p['sha256']!=q['sha256']]
(OUT/'identity.json').write_text(json.dumps(identity,indent=2)+'\n');(OUT/'after-hashes.json').write_text(json.dumps(after,indent=2)+'\n');(OUT/'command-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
summary={}
for name in ['independent','retained-unit']:
    data=json.loads((OUT/(name+'-results.json')).read_text('utf8'));summary[name]={k:data[k] for k in ['numTotalTests','numPassedTests','numFailedTests','success']};summary[name]['cases']=[{'title':t['title'],'status':t['status']} for s in data['testResults'] for t in s['assertionResults']]
summary['independent']['exit']=r.returncode;summary['retained-unit']['exit']=maker.returncode
(OUT/'result-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
rows={p['path']:p for p in before}
sourceHash=rows[paths[0]]['sha256'];testHash=rows[paths[1]]['sha256']
advice='PASS' if r.returncode==0 and maker.returncode==0 and not identity['inputChangesDuringExecution'] else 'REWORK'
report=f'''# Local independent RUI delta audit

**{advice} for the bounded RUI-01/RUI-02 correction scope.** Both prior findings are closed at source/actual Three.js Node probe scope. This is local Codex audit advice only, not external GPT Plus #2 review, implementation acceptance, browser/GPU proof or G7 acceptance.

Audited commits `179cb341` / `{identity['requestedCommits'][0]['commit']}` and `e75109a6` / `{identity['requestedCommits'][1]['commit']}` in `fix/local-studio-check`, current HEAD `{identity['head']}`. The current binding/test tracked diff against `e75109a6` is empty (exit {identity['trackedDeltaToSecondCommitExit']}); all recorded input raw hashes stayed unchanged during execution.

- `app/src/features/world/WorldInteractionBinding.ts`: SHA-256 `{sourceHash}`.
- `app/tests/unit/world-interaction-binding.test.ts`: SHA-256 `{testHash}`.

Independent execution: **6/6 PASS**, exit {r.returncode}. Retained focused maker suite: **4/4 PASS**, exit {maker.returncode}. These are separate suites with overlapping behavior; do not report them as ten unique requirement cases.

| Independent actual raycast check | Result |
| --- | --- |
| Essential named monitor opens launcher before optional arrival | PASS |
| Proxy expands a visible target outside original mesh triangles | PASS |
| Opaque front mesh prevents proxy activation | PASS — RUI-01 closed |
| Hidden production target is rejected | PASS — RUI-02 closed |
| Hidden target ancestor is rejected | PASS |
| Disposed binding rejects late optional attachment | PASS |

The expansion case proves the production raycast has zero hits at canvas x=69 while the 2.4 m proxy has actual hits; its hit point falls inside the production bounds expanded by 0.12 m. The same click is inactive before attachment and opens the launcher after attachment. This confirms useful proxy expansion remains intact. Observed hit coordinates and resulting panels are captured in `observations.jsonl`.

Source inspection confirms `isVisibleInHierarchy` at `WorldInteractionBinding.ts:89` excludes hidden meshes/ancestors, the nearest visible unregistered solid now returns before optional fallback (`:119`), and optional targets require hierarchy visibility (`:123`). `attachInteractionScene` retains its disposal guard (`:78`). Commit `e75109a6` changes the regression to a true outside-mesh proxy hit; it does not change product source.

The probe uses real Three.js mesh intersection and the actual binding/controller with an EventTarget canvas; no WebGL renderer or browser is mocked into a claim of rendered proof. {identity['nodeVersion']} / {identity['vitestVersion']} observed. This narrow delta does not rerun the earlier broad runtime/UI suites, final combined E2E, native GPU/pixel budgets, physical/assistive/provider sessions or leak measurements. Those statuses remain separately bound to their existing/pending evidence. Product source and prior audit artifacts were not modified. Parent owns Git coordination and separate acceptance.

Returned: report, exact input/after/output hashes, identity/commit receipts, independent probe/config, raw command stdout/stderr/exits, both result JSON files, case summary and observations.
'''
(OUT/'report.md').write_text(report,encoding='utf8');(OUT/'findings.json').write_text(json.dumps({'advice':advice,'closedAtLocalSourceNodeScope':['RUI-01','RUI-02'],'remainingAcceptance':True,'browserGpuPhysicalProof':'NOT RUN','role':identity['role']},indent=2)+'\n')
outputs=[{'path':str(p.relative_to(ROOT)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='output-hashes.json']
(OUT/'output-hashes.json').write_text(json.dumps({'hashPolicy':'SHA-256 raw bytes; .gitattributes * -text','outputs':outputs},indent=2)+'\n')
print(json.dumps({'advice':advice,'sourceSha256':sourceHash,'testSha256':testHash,'summary':summary,'inputChanged':identity['inputChangesDuringExecution']},indent=2))
