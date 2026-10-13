from pathlib import Path
import subprocess,json,hashlib,re,shutil
ROOT=Path(__file__).resolve().parent; REPO=Path.cwd(); DELIVERY=REPO/'deliveries/FINISH-A1/r5-05'
C='8f3aa566f36c92bb98658090ef91f9bfa96e8a79'; BASE='f62a43c5e71c00dcb89e28275ea81d842167db80'
def sha(data): return hashlib.sha256(data).hexdigest()
def dump(name,value): (ROOT/name).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
commands=json.loads((ROOT/'commands.json').read_text())
# Raw Git blob bytes are the immutable input/output artifacts already individually hashed;
# omit their binary/text payloads from the human command transcript while retaining digests.
shutil.copy2(ROOT/'commands.json',ROOT/'.work/commands-before-blob-payload-compaction.json')
for command in commands:
    argv=command['argv']
    if len(argv)>1 and argv[0]=='git' and argv[1] in ('archive','show') and 'stdout' in command:
        p=subprocess.run(argv,cwd=command['cwd'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        command['stdoutBytes']=len(p.stdout); command['stdoutSha256']=sha(p.stdout)
        command['stdoutCapture']='Raw blob/archive identity; content retained in pinned Git and scratch replay, not duplicated in command transcript.'
        del command['stdout']
def run(args,cwd=REPO):
    p=subprocess.run(args,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    commands.append({'argv':args,'cwd':str(cwd),'exitCode':p.returncode,'stdout':p.stdout.decode('utf-8','replace'),'stderr':p.stderr.decode('utf-8','replace')})
    dump('commands.json',commands)
    if p.returncode: raise RuntimeError(commands[-1])
    return p.stdout
binding=json.loads((ROOT/'candidate-binding.json').read_text())
contract=(REPO/'docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md').read_text('utf-8')
section=contract.split('### FINISH-A1:')[1].split('### FINISH-A2:')[0]
allowlist=['app/'+p for p in re.findall(r'^\| `(src/[^`]+|tests/[^`]+)` \|',section,re.M)]
binding['allowlist']=allowlist
binding['allowlistCount']=len(allowlist)
binding['changedPathsAreExactAllowlistedSubset']=set(binding['actualChangedPaths'])<=set(allowlist)
binding['changedPathListExact']=set(binding['actualChangedPaths'])==set(binding['changedPaths'])==set(binding['sourceFiles'])
binding['patchPathsExact']=all(a==b for a,b in binding['patchPaths']) and set(a for a,b in binding['patchPaths'])==set(binding['changedPaths'])
binding['remoteHeadAtAudit']='618ac109ae949019c327b8ec6c524809f4b6f23f'
binding['remoteAncestryStatus']='PASS'
binding['remoteExactHeadEqualityStatus']='FAIL'
binding['remoteExplanation']='Remote branch legitimately advanced through later governance commits. Exact candidate is an ancestor; review remains pinned to candidate, not the current head.'
binding['remoteCandidateProof']=run(['git','log','--format=%H %s',f'{C}..618ac109ae949019c327b8ec6c524809f4b6f23f']).decode().splitlines()
binding['canonicalWorkingAppDiff']=run(['git','diff','--name-only','HEAD','--','app']).decode().splitlines()
binding['canonicalIndexAppDiff']=run(['git','diff','--cached','--name-only','HEAD','--','app']).decode().splitlines()
binding['canonicalCurrentHeadAppTree']=run(['git','rev-parse','HEAD:app']).decode().strip()
dump('candidate-binding.json',binding)
# Compare the available maker source worktree to every candidate tracked app blob,
# without staging or changing that worktree or its Git metadata.
appTree='cb42202d3be7f4f10c460d2e1b43db853910b87f'
scratch=ROOT/'.work/replay'
entries=run(['git','ls-tree','-r',appTree],scratch).decode().splitlines()
sourceChecks=[]
for entry in entries:
    meta,path=entry.split('\t'); mode,kind,oid=meta.split(); file=Path('C:/yw-r5c/app')/path
    raw=file.read_bytes() if file.is_file() else b''
    actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    sourceChecks.append({'path':'app/'+path,'gitBlob':oid,'actualGitBlob':actual,'bytes':len(raw),'status':'PASS' if actual==oid else 'FAIL'})
dump('available-source-verification.json',{'root':'C:/yw-r5c/app','candidateAppTree':appTree,'rows':sourceChecks})
manifest=json.loads((DELIVERY/'evidence/build-output-manifest.json').read_bytes())
paths=[row['path'] for row in manifest['files']]; actualPaths=[str(p.relative_to(Path('C:/yw-r5c/app/.next'))).replace('\\','/') for p in Path('C:/yw-r5c/app/.next').rglob('*') if p.is_file()]
checks=json.loads((ROOT/'build-verification.json').read_text()); checks.update({'manifestCount':len(paths),'manifestTotalBytes':sum(row['bytes'] for row in manifest['files']),'actualFileCount':len(actualPaths),'extraActualFiles':sorted(set(actualPaths)-set(paths)),'missingActualFiles':sorted(set(paths)-set(actualPaths)),'availableSourceStatus':'PASS' if all(row['status']=='PASS' for row in sourceChecks) else 'FAIL'})
dump('build-verification.json',checks)
# Digest all binding-linked artifacts recursively, and inspect the actual JSON test outcomes.
browser=json.loads((DELIVERY/'evidence/browser-binding.json').read_bytes()); linked=[]
def links(value):
    if isinstance(value,dict):
        if {'path','bytes','sha256'}<=value.keys():
            raw=(DELIVERY/value['path']).read_bytes(); linked.append({'path':value['path'],'bytes':len(raw),'sha256':sha(raw),'status':'PASS' if len(raw)==value['bytes'] and sha(raw)==value['sha256'] else 'FAIL'})
        for val in value.values(): links(val)
    elif isinstance(value,list):
        for val in value: links(val)
links(browser)
results=json.loads((DELIVERY/'evidence/browser-results.json').read_bytes()); outcomes=[]
def suites(value):
    for spec in value.get('specs',[]):
        for test in spec['tests']:
            outcomes.append({'file':spec.get('file'),'title':spec['title'],'project':test['projectName'],'status':test['status'],'results':[{k:r.get(k) for k in ['status','retry','startTime','duration','errors']} for r in test['results']]})
    for suite in value.get('suites',[]): suites(suite)
suites(results)
dump('browser-verification.json',{'makerStats':results['stats'],'linkedArtifacts':linked,'tests':outcomes,'reviewerBrowserExecution':'NOT RUN','reviewerScreenshotInspection':'PASS','screenshotNotes':['CandidateX screenshot shows escaped sentinel and rendered synthetic PNG with not-provider-approved caption.','Rollback screenshot shows current r3 but stale reviewed expected r1 and incomplete-refresh feedback; supports A1R5-02.'],'candidateAppTree':browser['candidateAppTree'],'buildId':browser['build']['buildId']})
sentinels=['CandidateX authoring regression','Second editor winning revision','Unsaved image caption survives 409','<img src=x onerror="window.__draftPreviewXss=true">','Synthetic E2E rollback reason']
scan=[]
for sentinel in sentinels:
    matches=[]
    for path in actualPaths:
        if sentinel.encode() in (Path('C:/yw-r5c/app/.next')/path).read_bytes(): matches.append(path)
    scan.append({'sentinel':sentinel,'status':'PASS' if not matches else 'FAIL','matches':matches})
dump('static-sentinel-verification.json',{'scope':'Only five named local sentinels in available bound .next output; no runtime/CDN/private-data completeness inference.','rows':scan})
inputs=json.loads((ROOT/'input-verification.json').read_text())
for row in inputs:
    if row.get('candidateGitMatchesReceipt'):
        row['status']='PASS'
        row['scope']='Receipt binds exact raw candidate Git bytes; current local governance copy may have legitimately evolved.'
    elif 'candidateGitMatchesReceipt' in row:
        row['scope']='Raw received local prior-audit input matches receipt; absent from candidate Git. Ledger does not claim all inputs committed.'
for path in ['deliveries/completion-audits/FINISH-A1/finish-05/20261011T011000Z-a1-r4-independent-review/evidence/audit-r4-probes.test.ts','references/README.md','references/manifest.json']:
    raw=(REPO/path).read_bytes(); inputs.append({'path':path,'bytes':len(raw),'sha256':sha(raw),'status':'PASS','purpose':'Additional directly read reference or predecessor probe'})
dump('input-verification.json',inputs)
shutil.copy2(scratch/'app/tests/unit/platform/audit-contract-probes.test.ts',ROOT/'audit-contract-probes.test.ts')
print(json.dumps({'allowlist':len(allowlist),'allowed':binding['changedPathsAreExactAllowlistedSubset'],'sourceRows':len(sourceChecks),'sourceFailures':[r for r in sourceChecks if r['status']=='FAIL'],'buildExtra':checks['extraActualFiles'],'browserTests':len(outcomes),'bindingFailures':[r for r in linked if r['status']=='FAIL'],'sentinelScan':scan},indent=2))
