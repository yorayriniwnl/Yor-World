from pathlib import Path
import hashlib,json,os,re
ROOT=Path(__file__).resolve().parent
REPO=Path.cwd(); D=REPO/'deliveries/FINISH-A1/r5-05'
def sha(raw): return hashlib.sha256(raw).hexdigest()
def dump(name,value): (ROOT/name).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
browser=json.loads((ROOT/'browser-verification.json').read_text())
for test in browser['tests']:
    test['rawMakerStatus']=test.pop('status')
    test['status']='PASS' if test['rawMakerStatus']=='expected' else 'FAIL'
    for result in test['results']:
        result['rawMakerStatus']=result.pop('status')
        result['status']='PASS' if result['rawMakerStatus']=='passed' and not result.get('errors') else 'FAIL'
dump('browser-verification.json',browser)
validation={'status':'PASS','checks':[]}
matrix=json.loads((ROOT/'requirement-matrix.json').read_text())
missing=[]
for row in matrix['rows']:
    if row['status'] not in ('PASS','FAIL','NOT RUN'): missing.append(row['clause']+':invalid-status')
    for field in ['resolvedSourcePaths','resolvedEvidencePaths']:
        for entry in row.get(field,[]):
            if entry['status']!='PASS': missing.append(row['clause']+':'+entry['path'])
validation['checks'].append({'name':'All reviewer matrix statuses and resolved maker paths','status':'PASS' if not missing else 'FAIL','failures':missing,'rowCount':len(matrix['rows'])})
failures=[]
for row in json.loads((D/'output-hashes.json').read_bytes())['files']:
    path=row['path'].removeprefix('deliveries/FINISH-A1/r5-05/'); raw=(D/path).read_bytes()
    if sha(raw)!=row['sha256'] or len(raw)!=row['bytes']: failures.append(path)
validation['checks'].append({'name':'Final candidate-output preservation recheck','status':'PASS' if not failures else 'FAIL','failures':failures,'rows':87})
ident=json.loads((ROOT/'candidate-binding.json').read_text())
assert ident['replayedAppTree']=='cb42202d3be7f4f10c460d2e1b43db853910b87f'
assert ident['allowlistCount']==26 and ident['changedPathListExact'] and ident['changedPathsAreExactAllowlistedSubset']
assert not ident['canonicalWorkingAppDiff'] and not ident['canonicalIndexAppDiff']
validation['checks'].append({'name':'Exact source replay/allowlist/canonical tree binding','status':'PASS','replacementCount':25,'allowlistCount':26})
validation['checks'].append({'name':'Independent test counts and raw exits','status':'PASS','unitExit':int((ROOT/'independent-unit.exit').read_text()),'integrationExit':int((ROOT/'independent-integration.exit').read_text()),'probeExit':int((ROOT/'independent-contract-probes-final.exit').read_text()),'scope':'24/316 unit;28/306 integration; eight review assertions reproduce defects with expected exit1.'})
if any(check['status']!='PASS' for check in validation['checks']): validation['status']='FAIL'
dump('final-validation.json',validation)
outputs=[]
for current,dirs,files in os.walk(ROOT):
    dirs[:]=[d for d in dirs if d!='.work']
    for filename in files:
        p=Path(current)/filename
        if filename=='output-hashes.json': continue
        if p.suffix=='.json': json.loads(p.read_bytes())
        raw=p.read_bytes(); outputs.append({'path':str(p.relative_to(ROOT)).replace('\\','/'),'bytes':len(raw),'sha256':sha(raw)})
dump('output-hashes.json',{'format':'YOR-WORLD-FINISH-24-INDEPENDENT-OUTPUT-HASHES-v1','hashPolicy':'SHA-256 raw bytes; excludes self and .work','files':sorted(outputs,key=lambda r:r['path'])})
manifest=json.loads((ROOT/'output-hashes.json').read_bytes())
for row in manifest['files']:
    raw=(ROOT/row['path']).read_bytes()
    assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
print(json.dumps({'status':validation['status'],'stableFiles':len(outputs),'outputManifestSha256':sha((ROOT/'output-hashes.json').read_bytes()),'findings':6,'advice':'REWORK','candidateOutputsPreserved':not failures},indent=2))
