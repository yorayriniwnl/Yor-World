"""Bounded closure checks of existing W3 helper/payload and W2 manifest drift."""
from pathlib import Path
import datetime, hashlib, json, shutil, subprocess, sys, tempfile, zipfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
W3 = ROOT / 'deliveries/W3/revisions/W3-A1-r2'
result = {'evidenceClass': 'REVIEWER EXECUTED', 'executedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'helperMatrix': [], 'payloadRecalculation': {}, 'semanticArchiveDifferences': {}}

scratch = Path(tempfile.mkdtemp(prefix='yor-recon03-helper-'))
helper_root = scratch / 'helper'
(helper_root / 'tools').mkdir(parents=True)
shutil.copy2(W3 / 'tools/proof.py', helper_root / 'tools/proof.py')
evidence = helper_root / 'evidence/a1-current'
evidence.mkdir(parents=True)
(scratch / 'empty.npmrc').write_text('', encoding='utf-8')
node = shutil.which('node')
fake = scratch / 'injected-child.cjs'
for action, codes in [('audit', [1,1]), ('audit', [0,1]), ('audit', [1,0]), ('audit', [0,0]), ('list', [1]), ('list', [0])]:
    fake.write_text('process.exit(process.argv.includes("--prod") ? ' + str(codes[-1]) + ' : ' + str(codes[0]) + ');\n', encoding='utf-8')
    state = {'scratch': str(scratch), 'app': str(scratch), 'node': node, 'pnpmJs': str(fake), 'commands': []}
    (evidence / 'execution.json').write_text(json.dumps(state), encoding='utf-8')
    proc = subprocess.run([sys.executable, '-X', 'utf8', str(helper_root / 'tools/proof.py'), action], capture_output=True, text=True, encoding='utf-8')
    final = json.loads((evidence / 'execution.json').read_text(encoding='utf-8'))
    actual = [c['exitCode'] for c in final['commands']]
    result['helperMatrix'].append({'action': action, 'injectedExits': codes, 'observedExits': actual,
        'helperExit': proc.returncode, 'pass': actual == codes and (proc.returncode == 0) == all(c == 0 for c in codes),
        'stdout': proc.stdout, 'stderr': proc.stderr})

for browser in ['chrome', 'edge']:
    path = W3 / f'evidence/a1-current/{browser}/payload.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    records = []
    for r in data['runs']:
        js_responses = {n['url'] for n in r['network'] if n['type'] == 'script' or 'javascript' in (n.get('contentType') or '') or n['url'].split('?')[0].endswith('.js')}
        # Inputs record application resources; explicitly join response URLs to resource timings.
        resources = {t['url']:t for t in r['resources'] if t['url'] in js_responses}
        js = sum(t['encodedBodySize'] for t in resources.values())
        preloads = [{'url':t['url'], 'bytes':t['encodedBodySize'], 'initiatorType':t['initiatorType']} for t in resources.values() if t['initiatorType'] != 'script']
        records.append({'profile':r['profile']['name'], 'run':r['run'], 'computedEncodedJsBytes':js,
                        'reportedEncodedJsBytes':r['encodedJsBytes'], 'matches':js == r['encodedJsBytes'], 'nonScriptJsResources':preloads})
    result['payloadRecalculation'][browser] = {'buildId':data['buildId'], 'inputSha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'runs':records,
        'scope':'Independent arithmetic over MAKER EVIDENCE; not a new browser execution.'}

def diff(a,b,path=''):
    if isinstance(a,dict) and isinstance(b,dict):
        return sum((diff(a.get(k),b.get(k),path+'/'+k) for k in a.keys() | b.keys()), [])
    if isinstance(a,list) and isinstance(b,list):
        if len(a) != len(b):
            return [{'path':path, 'archiveLength':len(a), 'checkoutLength':len(b)}]
        return sum((diff(x,y,path+'/'+str(i)) for i,(x,y) in enumerate(zip(a,b))), [])
    return [] if a == b else [{'path':path, 'archive':a, 'checkout':b}]

for root,archive,paths in [
    ('deliveries/W1/revisions/W1-F1-r2','w1-f1-r2-proof.zip',['evidence/export-validation.json','evidence/fault-injection.json']),
    ('deliveries/W2','w2-avatar-proof-r2.zip',['evidence/r2/avatar-proof.glb.validator.json','evidence/r2/export-inspection.json','evidence/r2/fixture-proof.glb.validator.json'])]:
    with zipfile.ZipFile(ROOT / root / archive) as z:
        for p in paths:
            a = json.loads(z.read(p))
            b = json.loads((ROOT / root / p).read_text(encoding='utf-8-sig'))
            result['semanticArchiveDifferences'][root+'/'+p] = diff(a,b)

(OUT / 'closure-records.json').write_text(json.dumps(result,indent=2), encoding='utf-8')
print(json.dumps({'helperAllPass':all(c['pass'] for c in result['helperMatrix']),
    'payloadAllMatch':all(r['matches'] for b in result['payloadRecalculation'].values() for r in b['runs']),
    'helperScratch':str(scratch), 'semanticArchiveDifferences':result['semanticArchiveDifferences']},indent=2))
