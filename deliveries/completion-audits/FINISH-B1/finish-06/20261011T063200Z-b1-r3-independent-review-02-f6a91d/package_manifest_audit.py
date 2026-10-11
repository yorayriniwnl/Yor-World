from __future__ import annotations
import csv, hashlib, json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(sys.argv[1]).resolve()
REV = sys.argv[2]
PREFIX = 'deliveries/FINISH-B1-R3/'
ROOT = Path(sys.argv[3]).resolve()

def run(args, input_bytes=None):
    return subprocess.run(['git', '-C', str(REPO), *args], input=input_bytes, capture_output=True, check=True)

def git_text(*args):
    return run(list(args)).stdout.decode('utf-8', 'replace')

lst = run(['ls-tree', '-r', '-z', '--format=%(objectname)%x09%(objectmode)%x09%(path)', REV, '--', PREFIX]).stdout
records = []
for raw in lst.split(b'\0'):
    if not raw:
        continue
    oid, mode, path = raw.split(b'\t', 2)
    records.append((oid.decode(), mode.decode(), path.decode('utf-8', 'surrogateescape')))
if not records:
    raise SystemExit('candidate package not found in commit')
batch_input = ''.join(oid + '\n' for oid, _, _ in records).encode('ascii')
batch = run(['cat-file', '--batch'], batch_input).stdout
contents = {}
pos = 0
for oid, _, path in records:
    end = batch.find(b'\n', pos)
    header = batch[pos:end].decode('ascii').split()
    if len(header) != 3 or header[0] != oid or header[1] != 'blob':
        raise RuntimeError(f'bad cat-file header for {path}: {header}')
    size = int(header[2]); pos = end + 1
    data = batch[pos:pos+size]
    if len(data) != size or batch[pos+size:pos+size+1] != b'\n':
        raise RuntimeError(f'bad cat-file byte framing for {path}')
    contents[path] = data
    pos += size + 1
manifest_path = PREFIX + 'output-hashes.json'
manifest = json.loads(contents[manifest_path].decode('utf-8-sig'))
expected = manifest.get('files', {})
physical = {path[len(PREFIX):]: (oid, mode, path, contents[path]) for oid, mode, path in records}
exclusions = {'output-hashes.json', 'validator-logs/manifest-verification.json'}
missing = sorted(set(expected) - set(physical))
unmanifested = sorted(path for path in physical if path not in expected and path not in exclusions)
rows = []
for rel, expected_row in sorted(expected.items()):
    entry = physical.get(rel)
    if entry is None:
        rows.append({'path': rel, 'status': 'MISSING', 'expected': expected_row, 'actual': None})
        continue
    oid, mode, fullpath, data = entry
    actual = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'gitBlobOid': oid, 'mode': mode}
    status = 'PASS' if actual['bytes'] == expected_row.get('bytes') and actual['sha256'] == expected_row.get('sha256') else 'FAIL'
    rows.append({'path': rel, 'status': status, 'expected': expected_row, 'actual': actual})
for rel in sorted(exclusions):
    if rel in physical:
        data = physical[rel][3]
        rows.append({'path': rel, 'status': 'EXCLUDED_BY_DECLARED_SCOPE', 'actual': {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'gitBlobOid': physical[rel][0], 'mode': physical[rel][1]}})
readback_path = PREFIX + 'validator-logs/manifest-verification.json'
readback = json.loads(contents[readback_path].decode('utf-8-sig')) if readback_path in contents else None
commit = {
    'candidateCommit': REV,
    'candidateTree': git_text('show', '-s', '--format=%T', REV).strip(),
    'candidateParent': git_text('show', '-s', '--format=%P', REV).strip(),
    'candidatePackageTreeOid': git_text('rev-parse', REV + ':' + PREFIX.rstrip('/')).strip(),
}
manifest_checks = {
    'declaredFileCount': manifest.get('fileCount'),
    'manifestRowCount': len(expected),
    'manifestCountMatchesRows': manifest.get('fileCount') == len(expected),
    'physicalTrackedFiles': len(records),
    'physicalExclusionsPresent': sorted(p for p in exclusions if p in physical),
    'allRowsPass': all(row['status'] == 'PASS' for row in rows if row['path'] not in exclusions),
    'missingManifestPaths': missing,
    'unmanifestedPaths': unmanifested,
    'readbackRecord': readback,
}
receipt = {
    'generatedAtUtc': datetime.now(timezone.utc).isoformat(), **commit,
    'candidatePackagePrefix': PREFIX,
    'trackedFileCount': len(records),
    'totalTrackedBytes': sum(len(contents[path]) for _, _, path in records),
    'manifestSha256': hashlib.sha256(contents[manifest_path]).hexdigest(),
    'manifestChecks': manifest_checks,
    'files': rows,
}
(ROOT / 'candidate-package-verification.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
with (ROOT / 'candidate-package-hashes.csv').open('w', newline='', encoding='utf-8') as f:
    w=csv.writer(f); w.writerow(['path','status','expected_bytes','actual_bytes','expected_sha256','actual_sha256','git_blob_oid'])
    for row in rows:
        exp=row.get('expected',{}) or {}; act=row.get('actual',{}) or {}
        w.writerow([row['path'],row['status'],exp.get('bytes',''),act.get('bytes',''),exp.get('sha256',''),act.get('sha256',''),act.get('gitBlobOid','')])
print(json.dumps({'candidateCommit':REV,'candidateTree':commit['candidateTree'],'candidateParent':commit['candidateParent'],'candidatePackageTreeOid':commit['candidatePackageTreeOid'],'trackedFileCount':len(records),'totalTrackedBytes':receipt['totalTrackedBytes'],'declaredManifestRows':len(expected),'manifestRowsPass':sum(1 for r in rows if r['status']=='PASS'),'manifestRowFailures':sum(1 for r in rows if r['status']=='FAIL'),'manifestMissing':missing,'unmanifested':unmanifested,'exclusions':manifest_checks['physicalExclusionsPresent']},indent=2))
