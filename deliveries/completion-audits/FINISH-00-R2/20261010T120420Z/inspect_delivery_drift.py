"""Bind unchanged B1/C1 to prior evidence without rerunning behavior suites."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
def rec(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
def read(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))
start = dt.datetime.now(dt.timezone.utc).isoformat()
result = {'scope': 'raw identity comparisons only; prior REWORK findings reused', 'lanes': {}}
observed = []
for lane in ['B1', 'C1']:
    folder = ROOT / ('deliveries/FINISH-' + lane)
    audit = ROOT / ('deliveries/completion-audits/FINISH-' + lane + '/2026-10-10-r1')
    files = {p.relative_to(ROOT).as_posix(): rec(p) for p in folder.rglob('*') if p.is_file()}
    manifest = read(folder / 'output-hashes.json')
    outputs = manifest.get('outputs', manifest)
    maker_checks = []
    for rel, item in outputs.items():
        key = (folder / rel).relative_to(ROOT).as_posix()
        actual = files.get(key)
        expected_bytes = item.get('byteSize', item.get('sizeBytes'))
        maker_checks.append({'path': key, 'expectedSha256': item['sha256'], 'expectedBytes': expected_bytes,
                             'actual': actual, 'result': 'PASS' if actual and actual['sha256'] == item['sha256'] and actual['bytes'] == expected_bytes else 'FAIL'})
    old = read(audit / 'input-hashes.json')
    prefix = folder.relative_to(ROOT).as_posix() + '/'
    old_rows = [{'path': p, 'sha256': h} for p,h in old.items()] if isinstance(old, dict) else old
    original_delivery = [x for x in old_rows if x['path'].startswith(prefix)]
    if lane == 'C1':
        old_rows = [x for x in read(audit / 'maker-hash-verification.json') if x['kind'] == 'output']
        original_delivery = [{'path': x['path'], 'sha256': x['actualSha256'], 'bytes': x['actualBytes']} for x in old_rows]
    comparisons = [{'prior': x, 'actual': files.get(x['path']),
                    'result': 'PASS' if files.get(x['path']) and files[x['path']]['sha256'] == x['sha256']
                              and ('bytes' not in x or files[x['path']]['bytes'] == x['bytes']) else 'FAIL'} for x in original_delivery]
    expected_paths = {x['path'] for x in original_delivery}
    result['lanes'][lane] = {'inventory': list(files.values()), 'fileCount': len(files),
                             'totalBytes': sum(x['bytes'] for x in files.values()),
                             'priorComparisons': comparisons, 'makerChecks': maker_checks,
                             'unboundByPrior': sorted(set(files) - expected_paths),
                             'missingFromCurrent': sorted(expected_paths - set(files)),
                             'makerManifestIdentity': rec(folder / 'output-hashes.json')}
    observed.extend(files.values())
    for p in [folder / 'input-hashes.json', audit / 'input-hashes.json', audit / 'report.md']:
        observed.append(rec(p))
    if lane == 'C1':
        observed.append(rec(audit / 'maker-hash-verification.json'))
result['successorPresence'] = {p: (ROOT / ('deliveries/' + p)).exists() for p in
                              ['FINISH-A1', 'FINISH-A1/r2', 'FINISH-B1-R2', 'FINISH-C1-R2', 'FINISH-C2', 'FINISH-C3', 'FINISH-I1']}
result['receipt'] = {'commandArgv': [sys.executable, '-B', str(Path(__file__).resolve())], 'cwd': str(ROOT),
                     'startUTC': start, 'endUTC': dt.datetime.now(dt.timezone.utc).isoformat(),
                     'exitCode': 0, 'python': sys.version,
                     'scope': 'independent raw-byte comparison; no behavior tests'}
(OUT / 'delivery-drift.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')
inputs = read(OUT / 'input-hashes.json')
combined = {x['path']: x for x in inputs['inputs']}
combined.update({x['path']: x for x in observed})
inputs['inputs'] = [combined[p] for p in sorted(combined)]
(OUT / 'input-hashes.json').write_text(json.dumps(inputs, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({lane: {'files': value['fileCount'], 'priorBound': len(value['priorComparisons']),
                        'priorMismatch': sum(x['result'] == 'FAIL' for x in value['priorComparisons']),
                        'makerOutputs': len(value['makerChecks']), 'makerMismatch': sum(x['result'] == 'FAIL' for x in value['makerChecks']),
                        'unboundByPrior': value['unboundByPrior']} for lane,value in result['lanes'].items()}, indent=2))
