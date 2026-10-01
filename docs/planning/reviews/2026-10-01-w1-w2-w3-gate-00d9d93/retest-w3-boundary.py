"""Fresh frozen installation and bounded W3-CORR-01 closure checks.

No delivery edits. Mutate only a fresh external temporary source copy and restore
it after exercising the candidate's actual boundary suite.
"""
from pathlib import Path
import datetime, hashlib, json, os, shutil, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'deliveries/W3/revisions/W3-A1-r2/source'
scratch = Path(tempfile.mkdtemp(prefix='yor-recon03-w3-')).resolve()
assert not scratch.is_relative_to(ROOT)
app = scratch / 'app'
shutil.copytree(SOURCE, app)
(scratch / 'empty.npmrc').write_text('', encoding='utf-8')
pnpm = Path(shutil.which('pnpm.cmd') or shutil.which('pnpm'))
cli = pnpm.parent / 'node_modules/pnpm/bin/pnpm.cjs'
node = shutil.which('node')
env = {k: v for k, v in os.environ.items() if k.upper() in {
    'PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'LOCALAPPDATA',
    'APPDATA', 'USERPROFILE', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
    'PROGRAMFILES', 'PROGRAMFILES(X86)', 'COMMONPROGRAMFILES'}}
env.update({'NEXT_TELEMETRY_DISABLED': '1', 'CI': '1', 'NO_COLOR': '1',
            'NPM_CONFIG_USERCONFIG': str(scratch / 'empty.npmrc'),
            'NPM_CONFIG_GLOBALCONFIG': str(scratch / 'empty.npmrc')})
result = {'evidenceClass': 'REVIEWER EXECUTED', 'candidateRevision': '20950576f8b9a149fe521ac4ac44056ff263aba9',
          'scratch': str(scratch), 'environment': 'System runtime variables only; no backend/service credentials; telemetry disabled.',
          'commands': [], 'mutations': []}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

before = {p.relative_to(SOURCE).as_posix(): sha(p) for p in SOURCE.rglob('*') if p.is_file()}

def save():
    (OUT / 'w3-boundary-retest.json').write_text(json.dumps(result, indent=2), encoding='utf-8')

def run(label, args):
    rec = {'label': label, 'argv': [node, str(cli), *args], 'cwd': str(app),
           'startedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    path = OUT / f'w3-{label}.log'
    with path.open('w', encoding='utf-8') as log:
        proc = subprocess.run(rec['argv'], cwd=app, env=env, stdout=log, stderr=subprocess.STDOUT,
                              creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    rec.update({'exitCode': proc.returncode, 'log': path.name,
                'endedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat()})
    result['commands'].append(rec)
    save()
    print(label, proc.returncode, flush=True)
    return proc.returncode

assert run('frozen-install', ['install', '--frozen-lockfile', '--store-dir', str(scratch / 'store'), '--config.cache-dir=' + str(scratch / 'cache')]) == 0
assert run('lint-final', ['lint']) == 0
assert run('typecheck-final', ['typecheck']) == 0
assert run('unit-final', ['test:unit']) == 0

content = app / 'src/features/portfolio/public-content.ts'
original = content.read_bytes()
fixture = app / 'tests/fixtures/reviewer-fixture.ts'
fixture.write_text('console.log("RECON03: production module evaluated test fixture");\nexport const unverifiedName = "RECON03_FIXTURE_LEAK";\n', encoding='utf-8')
try:
    for label, argument in [
        ('quoted-fixture-control', '"../../../tests/fixtures/reviewer-fixture"'),
        ('backtick-fixture-negative', '`../../../tests/fixtures/reviewer-fixture`'),
    ]:
        mutation = f'const reviewerFixture = await import({argument});\n' + original.decode('utf-8').replace('name: "Ayush Roy / YOR"', 'name: reviewerFixture.unverifiedName')
        content.write_text(mutation, encoding='utf-8')
        code = run(label, ['test:unit', 'tests/unit/boundaries.test.ts'])
        result['mutations'].append({'id': label, 'source': mutation, 'expectedExit': 'nonzero', 'actualExit': code,
                                    'fixtureLogObserved': 'RECON03: production module evaluated test fixture' in (OUT / f'w3-{label}.log').read_text(encoding='utf-8')})
finally:
    content.write_bytes(original)
    fixture.unlink()

after = {p.relative_to(SOURCE).as_posix(): sha(p) for p in SOURCE.rglob('*') if p.is_file()}
assert before == after
result['deliveredSourceUnchanged'] = True
result['scratchContentRestored'] = content.read_bytes() == original
result['lockfileUnchanged'] = sha(app / 'pnpm-lock.yaml') == before['pnpm-lock.yaml']
save()
