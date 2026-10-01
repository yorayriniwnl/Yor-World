"""Follow-up negative check after HTML-only injection was not served by Next.
Mutates and restores only the external scratch copy, never a delivered file.
"""
from pathlib import Path
import datetime, hashlib, json, os, random, socket, subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
D = ROOT / 'deliveries/W3/revisions/W3-A1-r2'
previous = json.loads((OUT / 'w3-delta-execution.json').read_text())
app = Path(previous['app'])
scratch = app.parent
node = previous['commands'][0]['argv'][0]
pnpm = previous['commands'][0]['argv'][1]
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
env = {k: v for k, v in os.environ.items() if k.upper() in {
    'PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'LOCALAPPDATA',
    'APPDATA', 'USERPROFILE', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
    'PROGRAMFILES', 'PROGRAMFILES(X86)', 'COMMONPROGRAMFILES'}}
env.update({'NEXT_TELEMETRY_DISABLED': '1', 'CI': '1', 'PORT': str(port),
    'W3_EVIDENCE_DIR': str(OUT / 'w3-preload-retest'),
    'NPM_CONFIG_USERCONFIG': str(scratch / 'empty.npmrc'), 'NPM_CONFIG_GLOBALCONFIG': str(scratch / 'empty.npmrc')})
record = {'scope': 'Independent oversized link-only preload correction check; scratch build only',
          'priorAttempt': 'Direct generated-HTML modification produced no oversized network request. Its passing test is NOT evidence that the budget guard failed.',
          'generatedSourceDrift': 'next build regenerated next-env.d.ts; delivered file is unchanged. Restore scratch bytes below.',
          'sourceSha256': previous['sourceSha256'], 'commands': []}

def run(label, args):
    argv = [node, pnpm, *args]
    log = OUT / f'w3-preload-{label}.log'
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with log.open('w', encoding='utf8') as f:
        f.write('COMMAND: ' + subprocess.list2cmdline(argv) + '\nCWD: ' + str(app) + '\n')
        f.flush()
        p = subprocess.run(argv, cwd=app, env=env, stdout=f, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
        f.write(f'\nEXIT: {p.returncode}\n')
    record['commands'].append({'argv': argv, 'cwd': str(app), 'startedAtUtc': start,
         'endedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exitCode': p.returncode, 'log': log.name})
    print(label, p.returncode, flush=True)
    return p.returncode

layout = app / 'src/app/layout.tsx'
clean = (D / 'source/src/app/layout.tsx').read_bytes()
fixture = app / 'public/reviewer-oversized-fixture.js'
rng = random.Random(20261001)
data = ('/*' + ''.join(rng.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=600000)) + '*/').encode()
record['fixture'] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
injected = clean.replace(b'<html lang="en">', b'<html lang="en"><head><link rel="preload" as="script" href="/reviewer-oversized-fixture.js" /></head>')
assert injected != clean
record['mutatedLayoutSha256'] = hashlib.sha256(injected).hexdigest()
try:
    layout.write_bytes(injected)
    fixture.write_bytes(data)
    if run('build', ['build']) == 0:
        record['negativeBuildId'] = (app / '.next/BUILD_ID').read_text().strip()
        record['testExit'] = run('budget-negative', ['test:e2e', 'tests/e2e/payload.spec.ts', '--project=chrome'])
finally:
    layout.write_bytes(clean)
    fixture.unlink(missing_ok=True)
    (app / 'next-env.d.ts').write_bytes((D / 'source/next-env.d.ts').read_bytes())
    record['scratchSourceRestored'] = all(hashlib.sha256((app / p).read_bytes()).hexdigest() == h
                                        for p, h in previous['sourceSha256'].items())
    record['deliverySourceUnchanged'] = all(hashlib.sha256((D / 'source' / p).read_bytes()).hexdigest() == h
                                        for p, h in previous['sourceSha256'].items())
    (OUT / 'w3-preload-retest.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf8')
