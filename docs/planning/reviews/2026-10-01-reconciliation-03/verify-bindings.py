"""Read-only candidate/review identity checks for PARENT-RECON-03."""
from pathlib import Path
import datetime, hashlib, json, re, struct, subprocess, zipfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
BASE = '00d9d93f0cf70150cd64681dcabee425936da64c'

def sha(b):
    return hashlib.sha256(b).hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def identity(path):
    p = ROOT / path
    b = p.read_bytes()
    try:
        blob = git('show', f'{BASE}:{path}')
    except subprocess.CalledProcessError:
        blob = None
    return {'path': path, 'bytes': len(b), 'sha256': sha(b),
            'gitBlobSha256': sha(blob) if blob is not None else None,
            'lastChangeRevision': git('log', '-1', '--format=%H', BASE, '--', path).decode().strip()}

result = {'executedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'evidenceClass': 'REVIEWER EXECUTED', 'candidateRevision': BASE,
          'head': git('rev-parse', 'HEAD').decode().strip(),
          'remoteMain': git('ls-remote', 'origin', 'refs/heads/main').decode().strip(),
          'candidates': {}, 'reviews': [], 'reviewDigestClaims': []}

configs = {
    'W1': ('deliveries/W1/revisions/W1-F1-r2', 'manifest.json', 'w1-f1-r2-proof.zip'),
    'W2': ('deliveries/W2', 'output-hashes.json', 'w2-avatar-proof-r2.zip'),
    'W3': ('deliveries/W3/revisions/W3-A1-r2', 'output-manifest.json', 'W3-A1-r2-handoff.zip'),
}
for packet, (root, mf, archive) in configs.items():
    base = ROOT / root
    manifest_path = base / mf
    if not manifest_path.exists():
        # W2's exact historical manifest filename is discovered, not inferred.
        options = list((base / 'evidence/r2').glob('*sha*')) + list((base / 'evidence/r2').glob('*manifest*'))
        raise RuntimeError(f'Missing {manifest_path}; candidates: {options}')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    entries = manifest.get('files', manifest) if isinstance(manifest, dict) else manifest
    if isinstance(entries, dict):
        entries = [{'path': p, **(v if isinstance(v, dict) else {'sha256': v})} for p, v in entries.items()]
    with zipfile.ZipFile(base / archive) as z:
        names = set(z.namelist())
        checks = []
        for entry in entries:
            p = entry['path']
            expected = entry['sha256']
            b = (base / p).read_bytes() if (base / p).is_file() else None
            ab = z.read(p) if p in names else None
            blob = git('show', f'{BASE}:{root}/{p}')
            checks.append({'path': p, 'expected': expected,
                           'checkout': sha(b) if b is not None else None,
                           'archive': sha(ab) if ab is not None else None,
                           'gitBlob': sha(blob),
                           'checkoutMatches': b is not None and sha(b) == expected,
                           'archiveMatches': ab is not None and sha(ab) == expected,
                           'gitMatches': sha(blob) == expected})
        candidate = {'manifest': identity(f'{root}/{mf}'), 'archive': identity(f'{root}/{archive}'),
                     'manifestEntries': len(entries), 'archiveMembers': len(names),
                     'checkoutMatches': sum(c['checkoutMatches'] for c in checks),
                     'archiveMatches': sum(c['archiveMatches'] for c in checks),
                     'gitMatches': sum(c['gitMatches'] for c in checks), 'checks': checks}
        if packet == 'W1':
            candidate['declaredArchiveSha256'] = manifest['packageSha256']
        result['candidates'][packet] = candidate

for name in ['reviews/claude-01/review.md', 'reviews/claude-02/review.md',
             'reviews/claude-05/review.md', 'reviews/claude-13/review.md',
             'reviews/claude-13/W1-F1-r2.md', 'reviews/gemini-3/w1-review.md',
             'reviews/gemini-3/w2-review.md', 'reviews/gemini-3/W1-F1-r2-review.md',
             'reviews/gemini-3/evidence/gemini3-reproduced-evidence.json',
             'deliveries/W3/reviews/2026-10-01-independent/report.md',
             'deliveries/W3/reviews/2026-10-01-independent/review-manifest.json',
             'docs/planning/reviews/2026-10-01-reconciliation.md',
             'docs/planning/reviews/2026-10-01-reconciliation-02.md']:
    result['reviews'].append(identity(name))
    for line_no, line in enumerate((ROOT / name).read_text(encoding='utf-8-sig').splitlines(), 1):
        quoted = re.findall(r'`([^`]+)`', line)
        digests = [q for q in quoted if re.fullmatch('[a-f0-9]{64}', q)]
        paths = [q for q in quoted if (ROOT / q).is_file()]
        if len(digests) == len(paths) == 1:
            b = (ROOT / paths[0]).read_bytes()
            gb = git('show', f'{BASE}:{paths[0]}')
            variants = {sha(b), sha(gb), sha(b.replace(b'\r\n', b'\n')), sha(b.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n'))}
            result['reviewDigestClaims'].append({'review': name, 'line': line_no,
                'path': paths[0], 'claimedSha256': digests[0], 'actualSha256': sha(b),
                'matchesKnownByteVariant': digests[0] in variants})

old = ROOT / 'deliveries/W3/source'
new = ROOT / configs['W3'][0] / 'source'
diffs = []
unchanged = []
for p in sorted(new.rglob('*')):
    if not p.is_file():
        continue
    rel = p.relative_to(new)
    original = old / rel
    same = original.is_file() and original.read_bytes().replace(b'\r\n', b'\n') == p.read_bytes().replace(b'\r\n', b'\n')
    (unchanged if same else diffs).append(rel.as_posix())
result['w3OriginalToR2'] = {'comparison': 'LF-normalized text, unchanged binary bytes', 'changedOrAdded': diffs, 'unchanged': unchanged}

result['glbCounts'] = {}
for file in ['deliveries/W1/revisions/W1-F1-r2/room-blockout.glb', 'deliveries/W2/avatar-proof.glb', 'deliveries/W2/fixture-proof.glb']:
    data = (ROOT / file).read_bytes()
    length, chunk_type = struct.unpack_from('<II', data, 12)
    assert chunk_type == 0x4E4F534A
    doc = json.loads(data[20:20 + length])
    result['glbCounts'][file] = {k: len(doc.get(k, [])) for k in ['nodes', 'meshes', 'materials', 'cameras', 'animations', 'skins']}

(OUT / 'bindings.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({
    'candidates': {p: {k: v for k, v in c.items() if k != 'checks'} for p, c in result['candidates'].items()},
    'badReviewDigests': [r for r in result['reviewDigestClaims'] if not r['matchesKnownByteVariant']],
    'glbCounts': result['glbCounts'], 'w3Changed': diffs,
}, indent=2))
