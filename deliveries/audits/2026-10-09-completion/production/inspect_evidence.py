import hashlib, json, pathlib, re, subprocess, tarfile
ROOT = pathlib.Path.cwd()
OUT = ROOT / 'deliveries/audits/2026-10-09-completion/production'
def digest(path, mode='raw'):
    data = (ROOT / path).read_bytes()
    if mode == 'lf': data = data.replace(b'\r\n', b'\n')
    return hashlib.sha256(data).hexdigest()
def read(path): return json.loads((ROOT / path).read_text(encoding='utf-8-sig'))
r6='deliveries/G7/rc6-candidate-r6'
m=read(r6+'/release-manifest.json')
d=read('docs/planning/reviews/2026-10-08-rc6-r1/decision.json')
checks=[]
def check(path, expected, mode):
    actual=digest(path, mode)
    checks.append(dict(path=path, mode=mode, expected=expected, actual=actual, result='PASS' if actual==expected else 'FAIL'))
check(m['releaseBundlePath'], m['releaseBundleSha256'], 'raw')
check(r6+'/release-manifest.json', d['manifestSha256'], 'lf')
for item in m['evidenceHashes']: check(item['path'], item['sha256'], item.get('hashMode','raw'))
for item in m['requiredChecks']:
    if item.get('evidenceSha256'): check(item['evidencePath'],item['evidenceSha256'],item.get('evidenceHashMode','raw'))
for key in ['independentAuditor','majorGateAdvice','hostedEvidence']:
    item=d[key];check(item['path'],item['sha256'],item['hashMode'])
zipfile=next((ROOT/r6/'evidence/github-actions').rglob('quality-artifact.zip'))
check(zipfile.relative_to(ROOT).as_posix(),d['hostedArtifact']['sha256'],'raw')
counts={}
case_sets={}
def cases(suites):
    output=set()
    for suite in suites:
        for spec in suite.get('specs',[]):
            output.add((spec.get('file'),spec.get('line'),spec.get('title')))
        output.update(cases(suite.get('suites',[])))
    return output
for kind in ['e2e','accessibility','performance']:
    j=read(r6+'/evidence/'+kind+('/performance-results.json' if kind=='performance' else '/browser-results.json'))
    counts[kind]=j.get('stats')
    case_sets[kind]=cases(j.get('suites',[]))
counts['overlap']={'e2eCases':len(case_sets['e2e']),'accessibilityCases':len(case_sets['accessibility']),'sharedE2EAccessibility':len(case_sets['e2e'] & case_sets['accessibility']),'accessibilitySubsetOfE2E':case_sets['accessibility'].issubset(case_sets['e2e'])}
for kind, filename in [('unit','04-unit-tests.log'),('integration','05-integration-tests.log')]:
    log=(ROOT/r6/'evidence'/filename).read_text(encoding='utf-8-sig')
    counts[kind]=re.findall(r'Tests\s+(\d+) passed \((\d+)\)',log)
with tarfile.open(ROOT/m['releaseBundlePath']) as archive:
    members=[x for x in archive.getmembers() if x.isfile()]
    archive_summary={'files':len(members),'uncompressedBytes':sum(x.size for x in members),'declared':m['bundleMetadata']}
inputs=['AGENTS.md','START_HERE.md','docs/planning/reconciliation-packets/2026-10-09-completion-audit.md','docs/superpowers/specs/2026-09-30-yor-world-design.md','docs/planning/validation-and-production.md','docs/planning/delegation-and-work-orders.md','docs/planning/current-status.json','docs/planning/releases/2026-10-02-g7-production-release-protocol.md','docs/operations/pre-g7-prerequisites.md','docs/operations/production-execution-runbook.md','docs/operations/manual-device-checklist-template.md','docs/planning/reviews/2026-10-08-rc6-r1.md','docs/releases/v1.0.0-rc6.md','deliveries/G7/preparation/access-status-2026-10-07.json','deliveries/G7/preparation/ops-readiness-2026-10-08/report.md']
ledgerpath='deliveries/G7/evidence/initial-ledger-r6-2026-10-08.json'
ledger=read(ledgerpath)
result={'scope':'Fresh local hash/count/archive inspection of historical retained evidence; no fresh production or test execution','head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'appTree':subprocess.check_output(['git','rev-parse','HEAD:app'],text=True).strip(),'hashChecks':checks,'parsedCounts':counts,'archive':archive_summary,'g7Ledger':{'path':ledgerpath,'sha256':digest(ledgerpath),'overallStatus':ledger['overallStatus'],'requirements':[{'id':r['id'],'status':r['status'],'criteria':len(r['observations']),'provenCriteria':sum(o['status']=='PASS' for o in r['observations'])} for r in ledger['requirements']]},'inputs':[{'path':p,'rawSha256':digest(p)} for p in inputs]}
(OUT/'evidence.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'hashChecks':len(checks),'failures':[x for x in checks if x['result']=='FAIL'],'counts':counts,'archive':archive_summary,'head':result['head'],'appTree':result['appTree']},indent=2))
