import hashlib,json,pathlib,subprocess
AUDIT=pathlib.Path(__file__).resolve().parent
ROOT=AUDIT.parents[4]
HEAD='823b90352b3ebd0d84cedf7b59cdfcdfb022449d'
def dump(name,value): (AUDIT/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def run(args):
 p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True);return {'command':args,'exitCode':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
git=[run(['git','rev-parse','HEAD']),run(['git','rev-parse','HEAD:app']),run(['git','diff','--name-only','--','app/src/server','app/src/app/api','app/supabase','app/tests/integration/platform']),run(['git','show','--format=','--name-only',HEAD]),run(['git','show','--format=','--no-ext-diff',HEAD,'--','app/tests/integration/platform/canonical-platform.test.ts'])]
dump('git-receipts.json',git)
versions=[]
for args in [['node','--version'],['git','--version'],['python','--version']]:versions.append(run(args))
for name in ['vitest','eslint','@electric-sql/pglite','@supabase/supabase-js','pg','sharp']:
 p=ROOT/'app/node_modules'/name/'package.json';versions.append({'package':name,'version':json.loads(p.read_text('utf-8'))['version'],'identity':row(p)})
versions.append({'command':['pnpm','--version'],'output':'9.15.9','evidence':'prior direct local version receipt; current pinned packageManager'})
dump('tool-versions.json',versions)
scoped=[ROOT/p for p in ['AGENTS.md','START_HERE.md','docs/planning/delegation-and-work-orders.md','docs/planning/reconciliation-packets/2026-10-09-local-corrections-03.md','docs/planning/handoffs/local-corrections-03/01-backend-release.md','app/package.json','app/vitest.integration.config.ts','app/vitest.native.config.ts','app/tests/native/backend-native.test.ts']]
for rel in ['app/src/server','app/supabase/migrations','app/supabase/operations']:
 scoped.extend(p for p in (ROOT/rel).rglob('*') if p.is_file() and p.suffix in ['.ts','.sql'])
tests=['canonical-platform','media-integrity','media-fail-closed','streamed-body-limits','contact','contact-idempotency-r2','schema-v3-identity','database-authorization']
scoped.extend(ROOT/'app/tests/integration/platform'/(name+'.test.ts') for name in tests)
scoped.extend([ROOT/'deliveries/G7/local-corrections/backend/correction-02-report.md',ROOT/'deliveries/G7/local-corrections/backend/backend-remediation-report.md',ROOT/'deliveries/G7/local-corrections/backend/attempt-06-native/tests.log'])
for rel in ['deliveries/G7/local-corrections/backend/attempt-11-backend-regression-20261011T165000Z','deliveries/G7/local-corrections/backend/attempt-13-approved-provider-fixture-retest-20261011']:
 scoped.extend(p for p in (ROOT/rel).iterdir() if p.is_file())
dump('input-hashes.json',{'hashPolicy':'SHA-256 raw on-disk bytes; broad source identities are not a claim of full manual source review','files':[row(p) for p in sorted(set(scoped))]})
source_paths=[p for p in scoped if p.relative_to(ROOT).as_posix().startswith(('app/src/server/','app/supabase/'))]
dump('backend-source-identity.json',{'head':HEAD,'appTree':git[1]['stdout'].strip(),'trackedBackendDiff':git[2]['stdout'],'scope':'Exact backend working bytes. Other lanes have concurrent uncommitted changes; this is not a combined source freeze. Native test/config are untracked supplied inputs.','files':[row(p) for p in sorted(set(source_paths))]})
declared=[]
for line in (ROOT/'deliveries/G7/local-corrections/backend/attempt-13-approved-provider-fixture-retest-20261011/final-hashes.txt').read_text('utf-8').splitlines():
 if len(line)>66 and line[64:66]=='  ':
  p=ROOT/line[66:];actual=row(p);declared.append({'path':line[66:],'expectedSha256':line[:64],'actualSha256':actual['sha256'],'match':line[:64]==actual['sha256']})
dump('maker-hash-verification.json',{'files':declared,'allMatch':all(x['match'] for x in declared)})
summary=[]
for name in ['focused-results.json','assigned-backend-results.json','native-focused-results.json']:
 j=json.loads((AUDIT/name).read_text('utf-8'));summary.append({'file':name,'passed':j['numPassedTests'],'failed':j['numFailedTests'],'pending':j['numPendingTests'],'totalDiscovered':j['numTotalTests'],'suiteSuccess':j['success']})
dump('test-summary.json',{'runs':summary,'uniqueEmbeddedCasesExecuted':113,'uniqueEmbeddedPassed':113,'nativeCasesExecuted':0,'nativeCasesSkipped':14,'scope':'8 distinct embedded/memory/synthetic-provider files; two nonoverlapping batches. Historical counts are not added.'})
receipts=[
 {'command':'pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/canonical-platform.test.ts tests/integration/platform/media-integrity.test.ts tests/integration/platform/media-fail-closed.test.ts --maxWorkers=1 --reporter=verbose --reporter=json --outputFile.json=<audit>/focused-results.json','cwd':str(ROOT/'app'),'exitCode':0,'evidence':'focused-results.json','toolReceipt':'fffd06','scope':'embedded PGlite plus mocked/installed SDK synthetic HTTP'},
 {'command':'pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/streamed-body-limits.test.ts tests/integration/platform/contact.test.ts tests/integration/platform/contact-idempotency-r2.test.ts tests/integration/platform/schema-v3-identity.test.ts tests/integration/platform/database-authorization.test.ts --maxWorkers=1 --reporter=verbose --reporter=json --outputFile.json=<audit>/assigned-backend-results.json','cwd':str(ROOT/'app'),'exitCode':0,'evidence':'assigned-backend-results.json','toolReceipt':['37b875','c8eeca'],'scope':'embedded PGlite/memory/synthetic streams'},
 {'command':"YOR_NATIVE_DATABASE_URL=postgresql://yor_test@127.0.0.1:54329/postgres pnpm exec vitest run --config vitest.native.config.ts --maxWorkers=1 --testNamePattern 'publication before deletion|publication-before-deletion|JSON-only AAL2' --reporter=verbose --reporter=json --outputFile.json=<audit>/native-focused-results.json",'cwd':str(ROOT/'app'),'exitCode':1,'evidence':'native-focused-results.json','toolReceipt':'a312c8','observed':'connect ECONNREFUSED 127.0.0.1:54329; beforeAll failed before database creation;14 tests skipped; preserved database undefined','classification':'SETUP BLOCKED, application outcomes NOT RUN'},
 {'command':'pnpm exec eslint tests/integration/platform/canonical-platform.test.ts --max-warnings=0','cwd':str(ROOT/'app'),'exitCode':0,'stdout':'','toolReceipt':'0b780c'},
 {'command':'git diff --check -- app/tests/integration/platform/canonical-platform.test.ts','cwd':str(ROOT),'exitCode':0,'stdout':''}]
dump('execution-receipts.json',receipts)
finding={'id':'BACKEND-NATIVE-01','severity':'MEDIUM','status':'OPEN','type':'stale test fixture and current native proof gap','owner':'Assigned backend maker','sources':[{'path':'app/tests/native/backend-native.test.ts','line':76},{'path':'app/src/server/media/integrity.ts','line':47},{'path':'app/src/server/media/integrity.ts','line':62},{'path':'app/tests/native/backend-native.test.ts','line':148},{'path':'app/tests/native/backend-native.test.ts','line':169},{'path':'app/tests/native/backend-native.test.ts','line':178}],'trigger':'Execute current native positive publication, approval-before-withdrawal and initial-publication rollback cases with the supplied mock returning valid bytes.','expected':'The valid native test provider delivers the exact object MIME through createAdminServiceRoleClient response observer; actual multi-connection SQL/race assertions then execute.','observed':'Source mock ignores observer argument, leaving providerResponse.contentType=null. Current verifier rejects before media-positive workflow completes. Native local execution could not reach this case because cluster refused connection; this rejection is a source-level deterministic inference supported by executed missing-header provider regression, not a claim of an executed native failure.','evidence':['focused-results.json','native-focused-results.json','backend-source-identity.json'],'makerAction':'Update only the native Storage stand-in to supply exact matching object MIME through the observer and truthful missing-object response, preserve race assertions, then rerun the native suite against an available isolated loopback PostgreSQL cluster and bind exact current source hashes.'}
dump('findings.json',{'fixtureCommitAdvice':'PASS','assignedBackendCompletionAdvice':'REWORK: current native fixture/proof gap','productionDefectsReproduced':[],'findings':[finding],'hostedProviderProof':'NOT RUN','acceptanceAuthority':'Parent; no implementation/deployment/G7 acceptance granted'})
print(json.dumps({'head':git[0]['stdout'].strip(),'hashesMatch':all(x['match'] for x in declared),'results':summary,'trackedBackendDiff':git[2]['stdout']}))
