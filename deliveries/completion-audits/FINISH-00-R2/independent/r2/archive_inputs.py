"""Preserve read review inputs in the owned audit root; verify advisor manifest."""
from pathlib import Path
import datetime, hashlib, json

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
PACK = OUT / 'reviewed-contracts'
sha = lambda b: hashlib.sha256(b).hexdigest()
def record(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': sha(b)}
refs = [
 'deliveries/completion-audits/FINISH-00-R2/independent/r1/report.md',
 'deliveries/completion-audits/FINISH-00-R2/independent/r1/audit.json',
 'deliveries/completion-audits/FINISH-00-R2/independent/r1/input-hashes.json',
 'deliveries/completion-audits/FINISH-00-R2/independent/r1/output-hashes.json',
 'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/report.md',
 'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/input-hashes.json',
 'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/output-hashes.json',
 'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/review-media-identity.mjs',
 'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/review-media-identity-result.json',
 'deliveries/completion-audits/FINISH-00-R2/architecture/r2/report.md',
 'deliveries/completion-audits/FINISH-00-R2/architecture/r2/review.json',
 'deliveries/completion-audits/FINISH-00-R2/architecture/r3/report.md',
 'deliveries/completion-audits/FINISH-00-R2/architecture/r3/review.json',
 'deliveries/completion-audits/FINISH-00-R2/architecture/r3/output-hashes.json',
 'docs/planning/production-prompts/completion-2026-10-10/audit-and-acceptance.md',
 'docs/planning/production-prompts/completion-2026-10-10/common-execution.md',
 'docs/planning/production-prompts/completion-2026-10-10/parent-amendment.md',
 'docs/planning/account-operating-model.md'
]
inputs = []
for rel in refs:
    source = ROOT / rel
    target = OUT / 'reference-evidence' / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    b = source.read_bytes()
    if target.exists() and target.read_bytes() != b:
        raise ValueError('Previously archived reference changed: ' + rel)
    if not target.exists(): target.write_bytes(b)
    inputs.append({**record(target), 'originalPath': rel, 'copiedRawBytes': True})
for p in sorted(PACK.rglob('*')):
    if p.is_file(): inputs.append({**record(p), 'role': 'exact final reviewed contract copy'})
for name in ('input-hashes.json', 'output-hashes.json'):
    p = OUT / 'intermediate-contracts-65126f6a' / name
    inputs.append({**record(p), 'role': 'preserved intermediate identity, not final advice target'})
advisor_root = ROOT / 'deliveries/completion-audits/FINISH-00-R2/architecture/r3'
advisor_manifest = advisor_root / 'output-hashes.json'
advisor_hash = sha(advisor_manifest.read_bytes())
if advisor_hash != 'f36b94e51bea427766567595a8261a4a081c8b22f396125b6ec27c384848a63e':
    raise ValueError('Final Astra output manifest differs from Parent notification')
advisor_checks = []
for item in json.loads(advisor_manifest.read_bytes())['outputs']:
    actual = record(ROOT / item['path'])
    advisor_checks.append({'declared': item, 'actual': actual, 'pass': all(actual[k] == item[k] for k in ('bytes', 'sha256'))})
if not all(x['pass'] for x in advisor_checks): raise ValueError('Final Astra output hash mismatch')
review = json.loads((advisor_root / 'review.json').read_bytes())
if review['reviewedOutputManifestSha256'] != sha((PACK / 'output-hashes.json').read_bytes()) or review['reviewedInputManifestSha256'] != sha((PACK / 'input-hashes.json').read_bytes()):
    raise ValueError('Final Astra advice binds another contract')
result = {'packet': 'FINISH-00-R2', 'revision': 'independent/r2', 'hashPolicy': 'SHA-256 of raw bytes',
          'timestampUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'reviewedOutputManifestSha256': sha((PACK / 'output-hashes.json').read_bytes()),
          'reviewedInputManifestSha256': sha((PACK / 'input-hashes.json').read_bytes()),
          'sourceInputPolicy': 'The reviewed contract input manifest preserves 146 earlier observed raw identities at declared snapshotPath or canonical path, separately bound to immutable Git base blobs; independently verified in source-provenance-results.json.',
          'inputs': inputs}
(OUT / 'input-hashes.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
(OUT / 'advisor-manifest-verification.json').write_text(json.dumps({'manifestSha256': advisor_hash, 'advice': review['advice'], 'scope': review['scope'], 'checks': advisor_checks}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'ownedInputManifest': record(OUT / 'input-hashes.json'), 'preservedInputs': len(inputs), 'advisorOutputsVerified': len(advisor_checks), 'advisorAdvice': review['advice']}, indent=2))
