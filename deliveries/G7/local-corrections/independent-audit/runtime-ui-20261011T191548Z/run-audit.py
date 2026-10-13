import pathlib, subprocess, json, hashlib, datetime, shutil
OUT=pathlib.Path(__file__).resolve().parent
ROOT=OUT.parents[4]
APP=ROOT/'app'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
sources=['app/src/features/world/'+p for p in ['AssetLoader.ts','CameraDirector.ts','LifecycleManager.ts','SceneIntegrator.ts','WorldRuntime.ts','WorldRoot.tsx','WorldInteractionBinding.ts','EntranceCoordinator.ts','ConstantMaterialBatch.ts','RigidWorldBatch.ts','LowQualityBatch.ts','RuntimeMaterialQuality.ts','asset-locations.ts','replay-entrance-actions.ts','ProductionLighting.ts','world.module.css']]
sources += ['app/src/features/experience/'+p for p in ['controller.ts','preferences-store.ts','return-snapshot.ts','audio.ts']]
sources += ['app/src/ui/ModalDialog.tsx','app/src/ui/RouteFocus.tsx','app/src/features/room/room-controls.tsx','app/src/features/portfolio/accessibility-controls.tsx','app/src/features/monitor/launcher.tsx','app/src/features/world/WorldFallback.tsx','app/src/features/room/static-fallback.tsx','app/src/contracts/experience.ts','app/package.json','app/pnpm-lock.yaml','app/playwright.config.ts','app/vitest.config.ts','app/vitest.integration.config.ts','app/public/asset-manifest.json']
unit=['tests/unit/'+p for p in ['asset-loader.test.ts','camera-director.test.ts','constant-material-batch.test.ts','entrance-coordinator.test.ts','lifecycle-manager.test.ts','rigid-world-batch.test.ts','world-runtime-recovery.test.ts','world-interaction-binding.test.ts','preferences-resilience.test.ts','return-storage-and-audio.test.ts','project-transition.test.ts','interaction-controller.test.ts']]
integration=['tests/integration/production-camera.test.ts','tests/integration/production-lighting.test.ts']
e2e=['app/tests/e2e/'+p for p in ['local-studio-usability.spec.ts','renderer-recovery.spec.ts','world-lifecycle.spec.ts','physical-interactions.spec.ts','browser-behavior.spec.ts','accessibility.spec.ts']]
reports=['docs/planning/reconciliation-packets/2026-10-09-local-corrections-03.md','deliveries/G7/local-corrections/rendering/attempt-20261011T-runtime-ui-finalization-02/worker-report.md','deliveries/G7/local-corrections/rendering/attempt-20261011T-camera-fov-continuity-ui-reentry/worker-report-2026-10-11.md','deliveries/G7/local-corrections/rendering/attempt-20261011T1811Z-sound-diagnostics-regression/worker-report-2026-10-11.md','deliveries/G7/local-corrections/coordination/attempt-20261011T-parent-final-09-e2e/attempt-note.md','deliveries/G7/local-corrections/coordination/attempt-20261011T-parent-final-09-e2e/browser-results.json','deliveries/G7/local-corrections/rendering/attempt-20261011T1811Z-sound-diagnostics-regression/sound-corrected-browser-results.json','deliveries/G7/local-corrections/rendering/attempt-20261011T1811Z-sound-diagnostics-regression/monitor-isolated-browser-results.json']
inputs=sources+['app/'+p for p in unit+integration]+e2e+reports
def hashes(paths):return [{'path':p,'bytes':(ROOT/p).stat().st_size,'sha256':sha(ROOT/p)} for p in paths]
before=hashes(inputs);(OUT/'input-hashes.json').write_text(json.dumps(before,indent=2)+'\n')
identity={}
for label,args in [('head',['git','rev-parse','HEAD']),('branch',['git','branch','--show-current']),('appTree',['git','rev-parse','HEAD:app']),('status',['git','status','--short']),('node',['node','--version']),('vitest',['node',str(APP/'node_modules/vitest/vitest.mjs'),'--version'])]:
    r=subprocess.run(args,cwd=ROOT,capture_output=True);identity[label]={'command':args,'exit':r.returncode,'stdout':r.stdout.decode('utf8','replace'),'stderr':r.stderr.decode('utf8','replace')}
identity['scope']='Local Codex independent runtime/UI audit of exact current uncommitted worktree; not external GPT Plus #2; no source or canonical correction writes.'
identity['startedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
identity['worktree']=str(ROOT)
identity['sourceInventorySha256']=hashlib.sha256(json.dumps(hashes(sources),sort_keys=True,separators=(',',':')).encode()).hexdigest()
(OUT/'identity.json').write_text(json.dumps(identity,indent=2)+'\n')
commands=[('focused-unit',['node',str(APP/'node_modules/vitest/vitest.mjs'),'run','--config','vitest.config.ts',*unit,'--reporter=json','--outputFile='+str(OUT/'focused-unit-results.json')]),('focused-integration',['node',str(APP/'node_modules/vitest/vitest.mjs'),'run','--config','vitest.integration.config.ts',*integration,'--reporter=json','--outputFile='+str(OUT/'focused-integration-results.json')]),('optional-probe',['node',str(APP/'node_modules/vitest/vitest.mjs'),'run','--config',str(OUT/'vitest-probe.config.mjs'),'--reporter=json','--outputFile='+str(OUT/'optional-probe-results.json')])]
receipts=[]
for name,args in commands:
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();r=subprocess.run(args,cwd=APP,capture_output=True)
    (OUT/(name+'.stdout.log')).write_bytes(r.stdout);(OUT/(name+'.stderr.log')).write_bytes(r.stderr)
    receipts.append({'command':args,'cwd':str(APP),'startedAt':started,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':r.returncode,'stdout':name+'.stdout.log','stderr':name+'.stderr.log'})
    print(name+': exit '+str(r.returncode),flush=True)
(OUT/'command-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
after=hashes(inputs);changes=[r['path'] for r,s in zip(before,after) if r['sha256']!=s['sha256']]
(OUT/'after-hashes.json').write_text(json.dumps({'sourceOrInputChangesDuringExecution':changes,'rows':after},indent=2)+'\n')
summary={}
for name,_ in commands:
    result=json.loads((OUT/(name+'-results.json')).read_text('utf8'))
    summary[name]={k:result[k] for k in ['numTotalTests','numPassedTests','numFailedTests','numPendingTests','success']}
    if name=='optional-probe':
        summary[name]['cases']=[{'title':t['title'],'status':t['status'],'messages':t['failureMessages']} for s in result['testResults'] for t in s['assertionResults']]
(OUT/'execution-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2),flush=True)
