"""Package only this W3-A1-r3 delivery and verify every archived byte against its manifest."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
paths = [root / 'README.md', root / 'report.md']
if (root / '.gitattributes').is_file():
    paths.append(root / '.gitattributes')
for directory in ['source', 'tools', 'evidence/a1-current']:
    paths.extend(p for p in (root / directory).rglob('*') if p.is_file())
paths = sorted(paths)
if any('node_modules' in p.parts or '.next' in p.parts or '__pycache__' in p.parts for p in paths):
    raise SystemExit('Unexpected dependency/build/cache artifacts inside returned source.')

def sha(data):
    return hashlib.sha256(data).hexdigest()

records = [{'path': p.relative_to(root).as_posix(), 'bytes': p.stat().st_size,
            'sha256': sha(p.read_bytes())} for p in paths]
manifest = root / 'output-manifest.json'
manifest.write_text(json.dumps({
    'createdAt': datetime.now(timezone.utc).isoformat(), 'packet': 'W3-CORR-02 / W3-A1-r3',
    'status': 'RETURNED; independent review and parent audit pending',
    'algorithm': 'SHA-256',
    'bytePolicy': 'Enforced scoped .gitattributes (* -text) preserving exact bytes across checkout, Git blob, and immutable archive.',
    'exclusions': 'Manifest self-hash and archive/checksum/verification wrappers are outside the recursive file list.',
    'files': records,
}, indent=2), encoding='utf-8')
archive = root / 'W3-A1-r3-handoff.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for p in [*paths, manifest]:
        bundle.write(p, p.relative_to(root).as_posix())

with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    for record in records:
        assert sha(bundle.read(record['path'])) == record['sha256'], record['path']
    assert bundle.read('output-manifest.json') == manifest.read_bytes()

envelope = {p.name: sha(p.read_bytes()) for p in [archive, manifest]}
(root / 'SHA256SUMS.txt').write_text(''.join(f'{digest}  {name}\n' for name, digest in envelope.items()), encoding='utf-8')
(root / 'package-verification.json').write_text(json.dumps({
    'command': [sys.executable, '-X', 'utf8', str(Path(__file__).resolve())],
    'exitCode': 0, 'archiveIntegrity': 'PASS', 'archivedFileHashes': 'PASS',
    'fileCountExcludingManifest': len(records), 'archiveBytes': archive.stat().st_size,
    'sha256': envelope,
}, indent=2), encoding='utf-8')
print(json.dumps({'files': len(records), 'archiveBytes': archive.stat().st_size,
                  'verified': True, 'sha256': envelope}, indent=2))
