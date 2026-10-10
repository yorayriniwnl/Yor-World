"""Independent base Git/raw snapshot provenance checks; audit-owned writes only."""
from pathlib import Path
import datetime, hashlib, json, subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
PACK = OUT / 'reviewed-contracts'
OLD = OUT.parent / 'r1' / 'before-contracts'
PREFIX = 'docs/planning/reconciliation-packets/finish-contracts-r2/'
BASE = 'f62a43c5e71c00dcb89e28275ea81d842167db80'
sha = lambda b: hashlib.sha256(b).hexdigest()
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
old_bytes = (OLD / 'input-hashes.json').read_bytes()
old = {x['path']: x for x in json.loads(old_bytes)['inputs']}
current = json.loads((PACK / 'input-hashes.json').read_bytes())
errors = []
if current['priorRawInputManifestSha256'] != sha(old_bytes):
    errors.append('Prior raw manifest link differs from preserved r1 bytes')
if set(old) != {x['path'] for x in current['inputs']}:
    errors.append('Raw input path inventory changed')
rows = []
for item in current['inputs']:
    rel = item['path']
    result = subprocess.run(['git', 'cat-file', 'blob', BASE + ':' + rel], cwd=ROOT,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    blob = result.stdout
    bound = item.get('snapshotPath', rel)
    p = PACK / bound[len(PREFIX):] if bound.startswith(PREFIX) else ROOT / bound
    raw = p.read_bytes()
    previous = old.get(rel)
    raw_same = bool(previous and all(previous[k] == item[k] for k in ('bytes', 'sha256')))
    blob_valid = result.returncode == 0 and sha(blob) == item.get('baseGitBlobSha256') and len(blob) == item.get('baseGitBlobBytes')
    raw_valid = sha(raw) == item['sha256'] and len(raw) == item['bytes']
    eol_equal = raw.replace(b'\r\n', b'\n') == blob.replace(b'\r\n', b'\n')
    origin = item.get('snapshotOrigin')
    origin_valid = not origin or (raw_same and eol_equal and raw in [blob, blob.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')])
    preserved_difference = raw == blob or 'snapshotPath' in item
    ok = raw_same and blob_valid and raw_valid and origin_valid and preserved_difference
    row = {'path': rel, 'previousRawIdentityUnchanged': raw_same, 'baseBlobIdentityValid': blob_valid,
           'rawIdentityValid': raw_valid, 'rawEqualsBase': raw == blob, 'rawAndBaseDifferOnlyEOL': eol_equal,
           'hasSnapshot': 'snapshotPath' in item, 'snapshotOrigin': origin,
           'reconstructionProvedByPriorRawHashAndBaseEOL': origin_valid if origin else None,
           'differentRawBytesPreserved': preserved_difference, 'pass': ok}
    rows.append(row)
    if not ok: errors.append(rel)
result = {'startUTC': start, 'endUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'scope': 'Raw input identity continuity, immutable base Git blob identities, and hash-proved EOL snapshot reconstruction; no source execution or application behavior',
          'baseCommit': BASE, 'priorRawInputManifestSha256': sha(old_bytes),
          'inputRows': len(rows), 'baseBlobChecks': sum(x['baseBlobIdentityValid'] for x in rows),
          'priorRawIdentityMatches': sum(x['previousRawIdentityUnchanged'] for x in rows),
          'snapshots': sum(x['hasSnapshot'] for x in rows),
          'reconstructionOrigins': sum(bool(x['snapshotOrigin']) for x in rows),
          'rawDifferentFromBase': sum(not x['rawEqualsBase'] for x in rows),
          'nonEOLDifferences': [x['path'] for x in rows if not x['rawAndBaseDifferOnlyEOL']],
          'errors': errors, 'rows': rows}
(OUT / 'source-provenance-results.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k != 'rows'}, indent=2))
raise SystemExit(bool(errors))
