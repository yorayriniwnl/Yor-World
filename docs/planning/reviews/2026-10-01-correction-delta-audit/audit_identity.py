"""Read-only delta identity audit; writes only beside this reviewer script."""
from pathlib import Path
import datetime, difflib, hashlib, json, struct, subprocess, zipfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
HEAD = '00d9d93f0cf70150cd64681dcabee425936da64c'
BASE = 'f4cd0a3be5fc7899e2fd20932bf40da2d4c2195c'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(*args):
    p = subprocess.run(['git', *args], cwd=ROOT, capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf8', errors='replace'))
    return p.stdout

def record(path):
    data = path.read_bytes()
    rel = path.relative_to(ROOT).as_posix()
    blob = git('show', f'{HEAD}:{rel}')
    return {'path': rel, 'bytes': len(data), 'sha256': sha(data),
            'gitBlobSha256': sha(blob), 'gitBlobId': git('rev-parse', f'{HEAD}:{rel}').decode().strip(),
            'checkoutEqualsGit': data == blob,
            'lineEndingsOnly': data.replace(b'\r\n', b'\n') == blob.replace(b'\r\n', b'\n')}

def manifest_audit(directory, manifest_name, archive_name):
    m = json.loads((directory / manifest_name).read_text(encoding='utf8'))
    archive = directory / archive_name
    rows = []
    with zipfile.ZipFile(archive) as z:
        crc = z.testzip()
        for f in m['files']:
            path = f['path']
            expected = f['sha256']
            data = (directory / path).read_bytes()
            blob = git('show', f'{HEAD}:{(directory / path).relative_to(ROOT).as_posix()}')
            archived = z.read(path) if path in z.namelist() else None
            rows.append({'path': path, 'expected': expected,
                         'checkout': sha(data), 'checkoutMatch': sha(data) == expected,
                         'git': sha(blob), 'gitMatch': sha(blob) == expected,
                         'gitDifferenceOnlyLineEndings': data.replace(b'\r\n', b'\n') == blob.replace(b'\r\n', b'\n'),
                         'archive': sha(archived) if archived is not None else None,
                         'archiveMatch': sha(archived) == expected if archived is not None else False})
        members = z.namelist()
    return {'archiveIdentity': record(archive), 'manifestIdentity': record(directory / manifest_name),
            'declaredArchiveSha256': m.get('packageSha256'), 'crcError': crc, 'members': members,
            'fileCount': len(rows), 'checkoutMatches': sum(r['checkoutMatch'] for r in rows),
            'gitMatches': sum(r['gitMatch'] for r in rows), 'archiveMatches': sum(r['archiveMatch'] for r in rows),
            'rows': rows}

w1 = ROOT / 'deliveries/W1/revisions/W1-F1-r2'
w3 = ROOT / 'deliveries/W3/revisions/W3-A1-r2'
result = {'executedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'auditedHead': HEAD, 'originalPacketCommit': BASE,
          'observedHead': git('rev-parse', 'HEAD').decode().strip(),
          'liveRemoteMain': git('ls-remote', 'origin', 'refs/heads/main').decode().strip(),
          'worktreeStatusBefore': git('status', '--short', '--branch').decode(),
          'w1': manifest_audit(w1, 'manifest.json', 'w1-f1-r2-proof.zip'),
          'w3': manifest_audit(w3, 'output-manifest.json', 'W3-A1-r2-handoff.zip')}
paths = [w1 / x for x in ['build-blockout.py', 'blockout.blend', 'room-blockout.glb', 'asset-register.json', 'report.md']]
paths += [w3 / x for x in ['source/package.json', 'source/pnpm-lock.yaml', 'source/tests/unit/boundaries.test.ts', 'source/tests/e2e/payload.spec.ts', 'tools/proof.py']]
paths += [ROOT / 'deliveries/W2' / x for x in ['build-avatar-proof.py', 'avatar-proof.blend', 'avatar-proof.glb', 'fixture-proof.glb', 'w2-avatar-proof-r2.zip']]
paths += list((ROOT / 'reviews').glob('claude-*/review.md'))
paths += [ROOT / 'reviews/claude-13/W1-F1-r2.md', ROOT / 'reviews/gemini-3/W1-F1-r2-review.md']
result['identities'] = [record(p) for p in paths]
result['sourceTrees'] = {name: git('rev-parse', f'{HEAD}:{path}').decode().strip() for name, path in {
    'w1': 'deliveries/W1/revisions/W1-F1-r2', 'w3': 'deliveries/W3/revisions/W3-A1-r2/source'}.items()}
result['w2DeltaSinceOriginalPacket'] = git('diff', '--name-only', BASE, HEAD, '--', 'deliveries/W2').decode().splitlines()
source_diffs = []
changed = []
for new in sorted((w3 / 'source').rglob('*')):
    if not new.is_file():
        continue
    rel = new.relative_to(w3 / 'source')
    old = ROOT / 'deliveries/W3/source' / rel
    a, b = old.read_bytes(), new.read_bytes()
    if a != b:
        changed.append({'path': rel.as_posix(), 'oldSha256': sha(a), 'newSha256': sha(b)})
        source_diffs.extend(difflib.unified_diff(a.decode().splitlines(True), b.decode().splitlines(True),
                           fromfile='original/' + rel.as_posix(), tofile='corrected/' + rel.as_posix()))
for old, new in [(ROOT / 'deliveries/W3/tools/proof.py', w3 / 'tools/proof.py'),
                 (ROOT / 'deliveries/W1/build-blockout.py', w1 / 'build-blockout.py')]:
    source_diffs.extend(difflib.unified_diff(old.read_text(encoding='utf8').splitlines(True), new.read_text(encoding='utf8').splitlines(True),
                       fromfile=old.relative_to(ROOT).as_posix(), tofile=new.relative_to(ROOT).as_posix()))
result['w3SourceChanged'] = changed
result['w3SourceFileCount'] = sum(p.is_file() for p in (w3 / 'source').rglob('*'))
result['w3ExecutionRecords'] = [{k: c[k] for k in ['label', 'argv', 'cwd', 'startedAt', 'endedAt', 'exitCode', 'log']}
                              for c in json.loads((w3 / 'evidence/a1-current/execution.json').read_text())['commands']]
raw = (w1 / 'room-blockout.glb').read_bytes()
g = json.loads(raw[20:20 + struct.unpack_from('<I', raw, 12)[0]])
result['w1GlbCounts'] = {key: len(g.get(key, [])) for key in ['nodes', 'meshes', 'materials', 'cameras']}
result['w1GlbCounts']['triangles'] = sum(g['accessors'][p['indices']]['count'] // 3 for m in g['meshes'] for p in m['primitives'])
result['w3PayloadArchived'] = {}
for browser in ['chrome', 'edge']:
    p = json.loads((w3 / f'evidence/a1-current/{browser}/payload.json').read_text())
    result['w3PayloadArchived'][browser] = {'buildId': p['buildId'], 'runs': len(p['runs']),
       'jsBytes': sorted(set(r['encodedJsBytes'] for r in p['runs'])),
       'transferBytes': sorted(set(r['totalTransferBytes'] for r in p['runs']))}
(OUT / 'source-delta.diff').write_text(''.join(source_diffs), encoding='utf8')
(OUT / 'revision-identity.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8')
print(json.dumps({
    'head': result['observedHead'], 'remote': result['liveRemoteMain'], 'sourceTrees': result['sourceTrees'],
    'archives': {k: {x: result[k][x] for x in ['archiveIdentity', 'manifestIdentity', 'declaredArchiveSha256', 'fileCount', 'checkoutMatches', 'gitMatches', 'archiveMatches', 'crcError']} for k in ['w1', 'w3']},
    'manifestFailures': {k: [r for r in result[k]['rows'] if not r['checkoutMatch'] or not r['archiveMatch']] for k in ['w1', 'w3']},
    'changedW3Source': changed, 'w1GlbCounts': result['w1GlbCounts'], 'w3PayloadArchived': result['w3PayloadArchived']}, indent=2))
