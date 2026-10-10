import hashlib,json,pathlib,subprocess
AUDIT=pathlib.Path(__file__).resolve().parent
ROOT=AUDIT.parents[4]
BASE='f62a43c5e71c00dcb89e28275ea81d842167db80'
def dump(name,obj): (AUDIT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
initial=(AUDIT/'requirements.test.tsx').read_text('utf-8').split("  it('API rejects disagreed review publication revision with 422'")[0]+'});\n'
(AUDIT/'requirements-initial.test.ts').write_text(initial,encoding='utf-8')
(AUDIT/'observations-delta.json').write_bytes((AUDIT/'candidate/app/tests/integration/platform/observations.json').read_bytes())
versions={}
for label,args in [('node',['node','--version']),('python',['python','--version']),('git',['git','--version'])]:
 p=subprocess.run(args,capture_output=True,text=True);versions[label]={'command':args,'exitCode':p.returncode,'output':p.stdout.strip()}
for name in ['vitest','typescript','eslint','@electric-sql/pglite','sharp','react','next']:
 p=ROOT/'app/node_modules'/name/'package.json';versions[name]={'version':json.loads(p.read_text('utf-8'))['version'],'installedPackageIdentity':sha(p)}
versions['pnpm']={'command':['pnpm','--version'],'exitCode':0,'output':'9.15.9','evidence':'Executed PowerShell tool receipt cb586e'}
dump('tool-versions.json',versions)
receipts=[
 {'command':'python verify-inputs.py','exitCode':1,'scope':'auditor setup','output':'LookupError: unknown encoding: utf8-sig; corrected audit script only; no candidate mutation'},
 {'command':'python verify-inputs.py','exitCode':0,'scope':'raw identity/applicability/diagnostic assembly','evidence':'identity-command-receipts.json'},
 {'command':'pnpm exec vitest run --config audit.config.ts --reporter=json --outputFile=requirement-results.json','cwd':str(AUDIT),'exitCode':1,'scope':'auditor setup','output':'ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE'},
 {'command':'node node_modules/vitest/vitest.mjs run --config audit.config.ts --reporter=json --outputFile=requirement-results.json','cwd':str(AUDIT),'exitCode':1,'scope':'auditor setup','status':'INTERRUPTED','output':'Vite config ESM/CommonJS native-loader warning; no test result returned before bounded interruption; no behavior claimed'},
 {'command':'pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/audit-requirements.test.tsx --maxWorkers=1','cwd':str(AUDIT/'candidate/app'),'exitCode':1,'scope':'auditor setup','output':'No test files found: retained config matches **/*.test.ts, not tsx; fixed audit test extension only'},
 {'command':'Copy-Item ../../../requirements.test.tsx; pnpm exec vitest run ...audit-requirements.test.ts','cwd':str(AUDIT/'candidate/app'),'exitCode':1,'scope':'auditor setup','output':'Incorrect audit-relative copy path; no test files found; corrected to ../../'},
 {'command':'Copy-Item ../../requirements.test.tsx tests/integration/platform/audit-requirements.test.ts; pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/audit-requirements.test.ts --maxWorkers=1 --reporter=verbose --reporter=json --outputFile.json=<audit>/requirement-results.json','cwd':str(AUDIT/'candidate/app'),'exitCode':1,'scope':'21 unique required-outcome diagnostic cases','evidence':['requirement-results.json','observations.json','requirements-initial.test.ts'],'passed':5,'failed':16},
 {'command':"pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/audit-requirements.test.ts --maxWorkers=1 --testNamePattern 'API rejects disagreed|publication rechecks|changed draft after' --reporter=verbose --reporter=json --outputFile.json=<audit>/requirement-delta-results.json",'cwd':str(AUDIT/'candidate/app'),'exitCode':1,'scope':'3 additional unique required-outcome cases','evidence':['requirement-delta-results.json','observations-delta.json','requirements.test.tsx'],'passed':1,'failed':2,'skippedPreviousCases':21},
 {'command':'node node_modules/eslint/bin/eslint.js src/server/content/preview.ts --max-warnings=0','cwd':str(AUDIT/'candidate/app'),'exitCode':1,'scope':'targeted changed-source lint','output':"src/server/content/preview.ts:10:8 warning 'ProjectId' is defined but never used @typescript-eslint/no-unused-vars; ESLint found too many warnings (maximum: 0)."},
 {'command':'git diff --name-only -- app','exitCode':0,'output':'','scope':'canonical tracked application unchanged'},
 {'command':'python summary output','exitCode':1,'scope':'auditor receipt parsing only','output':'UnicodeEncodeError in cp1252 terminal while printing HTML; raw JSON retained; recovered with ensure_ascii=True'}]
dump('execution-receipts.json',receipts)
inputs=json.loads((AUDIT/'input-hashes.json').read_text('utf-8'))
extra=['app/package.json','app/pnpm-lock.yaml','app/vitest.integration.config.ts','app/vitest.config.ts','app/src/server/database.ts','app/src/server/auth/require-owner.ts','app/src/server/auth/page-owner.ts','app/src/server/media/validate-upload.ts','app/src/app/admin/editor/page.tsx','app/src/app/api/admin/projects/route.ts','app/src/app/api/admin/rollback/route.ts','app/src/app/api/admin/media/route.ts','app/src/proxy.ts','app/src/content/publication-reader.ts','app/tests/integration/platform/publication.test.ts','app/tests/integration/platform/canonical-platform.test.ts','app/tests/e2e/platform/admin-publish.spec.ts']
for rel in extra:
 p=ROOT/rel; row=sha(p);raw=subprocess.run(['git','show',BASE+':'+rel],cwd=ROOT,capture_output=True);row['baseGitBlobSha256']=hashlib.sha256(raw.stdout).hexdigest() if raw.returncode==0 else None;row['scope']='source/consumer identity; relevant source sections and retained tests read';inputs.append(row)
for rel in ['app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql','app/supabase/migrations/20261001000001_a4_publication_media.sql','app/supabase/migrations/20261005000000_github_refresh_state.sql','app/supabase/operations/harden-publication-grants.sql']:
 row=sha(ROOT/rel);row['scope']='executed embedded SQL fixture input';inputs.append(row)
dump('input-hashes.json',sorted({x['path']:x for x in inputs}.values(),key=lambda x:x['path']))
checks=[]
for rel,expected in json.loads((ROOT/'deliveries/FINISH-A1/r2/output-hashes.json').read_text('utf-8-sig')).items():
 actual=sha(ROOT/'deliveries/FINISH-A1/r2'/rel);checks.append({'path':actual['path'],'unchanged':all(actual[k]==expected[k] for k in ['bytes','sha256'])})
implementation=[]
for p in (ROOT/'deliveries/FINISH-A1/r2/source').rglob('*'):
 if p.is_file():
  c=AUDIT/'candidate/app'/p.relative_to(ROOT/'deliveries/FINISH-A1/r2/source');implementation.append({'path':p.relative_to(ROOT/'deliveries/FINISH-A1/r2/source').as_posix(),'matchesReplacement':p.read_bytes()==c.read_bytes()})
dump('post-execution-integrity.json',{'makerOutputs':checks,'allMakerOutputsUnchanged':all(x['unchanged'] for x in checks),'diagnosticReplacementIdentity':implementation,'allTestedReplacementsUnmodified':all(x['matchesReplacement'] for x in implementation),'canonicalAppDiff':subprocess.run(['git','diff','--name-only','--','app'],cwd=ROOT,capture_output=True,text=True).stdout})
results=[]
for name in ['requirement-results.json','requirement-delta-results.json']:
 j=json.loads((AUDIT/name).read_text('utf-8'))
 for suite in j['testResults']:
  for test in suite['assertionResults']:
   if test['status'] in ['passed','failed']:results.append({'name':test['title'],'status':test['status'],'run':name})
dump('unique-test-summary.json',{'uniqueExecutedCases':len({x['name'] for x in results}),'passed':sum(x['status']=='passed' for x in results),'failed':sum(x['status']=='failed' for x in results),'overlap':len(results)-len({x['name'] for x in results}),'rows':results,'discoveredDeltaCount':24,'deltaSkippedPriorCases':21,'scope':'embedded PGlite/synthetic auth/mocked Storage/React server rendering; no browser/native/provider'})
print(json.dumps({'unique':len(results),'failed':sum(x['status']=='failed' for x in results),'makerUnchanged':all(x['unchanged'] for x in checks),'testedReplacementsUnmodified':all(x['matchesReplacement'] for x in implementation)}))
