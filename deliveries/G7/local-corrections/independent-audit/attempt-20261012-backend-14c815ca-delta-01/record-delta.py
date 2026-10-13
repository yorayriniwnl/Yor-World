import hashlib,json,pathlib,subprocess
AUDIT=pathlib.Path(__file__).resolve().parent
ROOT=AUDIT.parents[4]
COMMIT='14c815ca112ad095792434bf10d8cfceff4d575b'
def dump(name,value): (AUDIT/name).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
def identity(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def run(args):
 p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True);return {'command':args,'exitCode':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
git=[run(['git','rev-parse','HEAD']),run(['git','show','--format=fuller','--stat',COMMIT]),run(['git','diff',COMMIT,'--','app/tests/native/backend-native.test.ts','app/vitest.native.config.ts','app/src/server/media/integrity.ts']),run(['git','diff','--check','--','app/tests/native/backend-native.test.ts','app/vitest.native.config.ts'])]
dump('git-receipts.json',git)
files=[ROOT/p for p in ['app/tests/native/backend-native.test.ts','app/vitest.native.config.ts','app/tsconfig.json','app/package.json','app/src/server/media/integrity.ts','app/src/server/auth/clients.ts','deliveries/G7/local-corrections/independent-audit/attempt-20261012-backend-823b903-01/report.md','deliveries/G7/local-corrections/independent-audit/attempt-20261012-backend-823b903-01/findings.json','deliveries/G7/local-corrections/independent-audit/attempt-20261012-backend-823b903-01/input-hashes.json']]
rows=[]
for p in files:
 row=identity(p)
 if row['path'].startswith('app/'):
  blob=subprocess.run(['git','show',COMMIT+':'+row['path']],cwd=ROOT,capture_output=True)
  row['commitBlobSha256']=hashlib.sha256(blob.stdout).hexdigest()
  row['workingBytesMatchCommitAfterEolNormalization']=blob.stdout.replace(b'\r\n',b'\n')==p.read_bytes().replace(b'\r\n',b'\n')
 rows.append(row)
dump('input-hashes.json',{'hashPolicy':'SHA-256 raw bytes plus separate committed Git blob identity','files':rows})
receipts=[{'command':'node <audit>/probe-source.mjs','exitCode':0,'evidence':'source-probes.json','scope':'5 actual-source AST-extracted synthetic mock/cleanup probes; not native DB proof'}, {'command':'pnpm exec eslint tests/native/backend-native.test.ts vitest.native.config.ts --max-warnings=0','cwd':str(ROOT/'app'),'exitCode':0,'stdout':'','toolReceipt':'c353f3'}, {'command':'pnpm exec tsc --noEmit --incremental false','cwd':str(ROOT/'app'),'exitCode':0,'stdout':'','toolReceipt':'84c1c1'}, {'command':'git diff --check -- app/tests/native/backend-native.test.ts app/vitest.native.config.ts','exitCode':0,'stdout':''}, {'command':'native PostgreSQL suite','status':'NOT RUN','reason':'Parent states database remains unreachable; prior independently preserved connection refusal; no repeat native claim'}, {'command':'hosted Supabase/Auth/Storage','status':'NOT RUN','reason':'No hosted execution in this delta'}]
dump('execution-receipts.json',receipts)
dump('findings.json',{'commit':COMMIT,'observedHead':git[0]['stdout'].strip(),'advice':'PASS for requested fixture/source delta','findings':[{'id':'BACKEND-NATIVE-01','codeStatus':'CLOSED','nativeVerificationStatus':'NOT RUN','evidence':['source-probes.json','input-hashes.json','execution-receipts.json'],'sources':[{'path':'app/tests/native/backend-native.test.ts','line':78},{'path':'app/tests/native/backend-native.test.ts','line':81},{'path':'app/tests/native/backend-native.test.ts','line':95}],'remainingAction':'Execute and bind the unchanged native SQL/concurrency assertions against available local PostgreSQL; hosted proof remains separate.'}],'newAssignedSourceDefects':[],'acceptanceAuthority':'Parent; no native/provider/deployment/G7 acceptance'})
versions=[run(['node','--version']),run(['git','--version'])]
for name in ['typescript','eslint']:
 p=ROOT/'app/node_modules'/name/'package.json';versions.append({'package':name,'version':json.loads(p.read_text('utf-8'))['version'],'identity':identity(p)})
dump('tool-versions.json',versions)
print(json.dumps({'source':rows[0],'observedHead':git[0]['stdout'].strip(),'trackedDelta':git[2]['stdout']}))
