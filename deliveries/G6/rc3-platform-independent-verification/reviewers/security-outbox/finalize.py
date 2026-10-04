import hashlib,json,pathlib,subprocess
own=pathlib.Path(__file__).parent
repo=pathlib.Path('C:/Users/yoray/Projects/Yor World')
app=pathlib.Path('C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186/app')
head='2a1864a0648146462b45ba25e0bbc797cf37f3cd'
implementation='02380c323154fdf0815e10543de0a936619f2b79'
paths=['supabase/migrations/20261001000000_a3_owner_auth_rls.sql','supabase/migrations/20261001000001_a4_publication_media.sql','supabase/operations/harden-publication-grants.sql','src/server/jobs/outbox-worker.ts','src/server/jobs/runner.ts','src/server/contact/email-adapter.ts','src/server/database.ts','src/server/content/publish.ts','src/server/content/revisions.ts','src/server/auth/require-owner.ts','src/server/auth/clients.ts','src/app/api/admin/rollback/route.ts','src/app/api/admin/publish/route.ts','tests/integration/platform/scp-publication-outbox.test.ts']
identity={'auditedHead':head,'implementationCommit':implementation,'appTree':'3586e0c8674faac3f73bcab4d17f646e3b2e9191','verifier':'Fresh GPT-6.1 Sol/Codex agent, not correction maker','requestedGemini':'UNAVAILABLE / NOT RUN','providerIndependence':False,'executionApp':str(app),'moduleFallback':False,'sourceFiles':[]}
for rel in paths:
 p=subprocess.run(['git','show',head+':app/'+rel],cwd=repo,capture_output=True)
 assert p.returncode==0,rel
 disk=(app/rel).read_bytes()
 # Git checkout CRLF normalization is an expected representation difference.
 equal=disk.replace(b'\r\n',b'\n')==p.stdout.replace(b'\r\n',b'\n')
 assert equal,rel
 identity['sourceFiles'].append({'path':'app/'+rel,'gitBlobSha256':hashlib.sha256(p.stdout).hexdigest(),'executedDiskSha256':hashlib.sha256(disk).hexdigest(),'normalizedEqual':equal})
 (own/('source-'+rel.replace('/','_')+'.txt')).write_text('\n'.join(f'{i+1}: {line}' for i,line in enumerate(disk.decode().splitlines())),encoding='utf8')
for commit in [head,implementation]:
 p=subprocess.run(['git','rev-parse',commit+':app'],cwd=repo,capture_output=True,text=True)
 assert p.returncode==0 and p.stdout.strip()==identity['appTree']
identity['focusedResult']={'files':1,'tests':63,'passed':63,'skipped':0,'exitCode':0,'result':'vitest-results.json','log':'command-11.log'}
(own/'verification-identity.json').write_text(json.dumps(identity,indent=2),encoding='utf8')
findings=[
 {'id':'SCP-01','severity':'P1','status':'FIXED','blocksRC4':False,'reason':'Actual SQL denies PUBLIC inheritance and all unprivileged role DML/helper calls; canonical privileged transactions work.','source':['app/supabase/operations/harden-publication-grants.sql:5','app/supabase/operations/harden-publication-grants.sql:16','app/src/server/content/publish.ts:368'],'evidence':['fresh.test.ts','vitest-results.json','observations.json'],'residualRisk':'Hosted role/grant authority and application of operational DCL NOT RUN; mandatory G7 post-migration step.'},
 {'id':'SCP-02','severity':'P1','status':'FIXED','blocksRC4':False,'reason':'Fourteen stale SQL interleavings against SENT/PROCESSING preserve authoritative claim; every stale completion zero/count zero.','source':['app/src/server/jobs/outbox-worker.ts:60','app/src/server/jobs/outbox-worker.ts:94','app/src/server/database.ts:53'],'evidence':['fresh.test.ts','vitest-results.json','observations.json'],'residualRisk':'Separate external-send gap below; autocommit required; independent sessions and distributed clocks NOT RUN.'},
 {'id':'SCP-03','severity':'P2','status':'FIXED','blocksRC4':False,'reason':'Thirty failure/attempt cases prove schedule and fifth terminalization; persistent storage outage propagates.','source':['app/src/server/jobs/outbox-worker.ts:64','app/src/server/jobs/outbox-worker.ts:66','app/src/server/jobs/outbox-worker.ts:114'],'evidence':['fresh.test.ts','vitest-results.json'],'residualRisk':'Cannot persist terminal outcome during continuing database outage; later recovery/reclaim required.'},
 {'id':'ROLLBACK-CONTRACT','severity':'contract','status':'PRESERVED','blocksRC4':False,'reason':'Route authorization, invalid targets/content, new revision/history/audit and durable validation executed. Caller expectedRevision is not required.','source':['app/src/server/content/publish.ts:291','app/src/server/content/publish.ts:398','app/src/app/api/admin/rollback/route.ts:9'],'evidence':['fresh.test.ts','vitest-results.json'],'residualRisk':'Independent-session serialization NOT RUN; stale-tab intent protection explicitly deferred.'},
 {'id':'RESIDUAL-OUTBOX-SEND-RACE','severity':'P2','status':'PARTIAL','blocksRC4':False,'reason':'Final ownership SELECT and external send are not atomic: fresh injection lets B send then A call provider once, while A cannot corrupt DB state.','source':['app/src/server/jobs/outbox-worker.ts:94','app/src/server/jobs/outbox-worker.ts:95','app/src/server/contact/email-adapter.ts:126'],'evidence':['fresh.test.ts','observations.json','vitest-results.json'],'residualRisk':'Real provider idempotency retention/late-send suppression UNVERIFIED; must be resolved or proven before G7 live delivery.'}
]
(own/'findings.json').write_text(json.dumps({'assignedLaneDecision':'READY FOR RC4 with disclosed G7 limitations','allPlatformDecision':'Parent combines other lanes; no G6/G7 approval','newP0P1':[],'findings':findings,'notRun':['Hosted Supabase Auth REST Storage RLS','Independent PostgreSQL sessions','Actual provider delivery deduplication','Production grants/role membership/DCL application','Distributed clocks','Hosted rollback restore','Physical devices'],'harnessFailureRetention':'harness-failures.md'},indent=2),encoding='utf8')
ledger=json.loads((own/'commands.json').read_text())
(own/'commands-and-exit-codes.md').write_text('Commands ran with Python subprocess capture from the pinned app checkout. Harness failures not retained in ledger are disclosed in harness-failures.md.\n\n| Command | Exit | Log |\n| --- | --- | --- |\n'+'\n'.join('| '+ ' '.join(x['command'])+' | '+str(x['exitCode'])+' | '+x['log']+' |' for x in ledger),encoding='utf8')
files=sorted(p for p in own.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt')
(own/'SHA256SUMS.txt').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(own).as_posix() for p in files)+'\n',encoding='utf8')
print('Final identity/source comparison PASS; artifacts and checksums written.')
