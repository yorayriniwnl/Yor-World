"""Independent targeted reproduction in a new external scratch tree; no maker fixes.
Outputs only reviewer evidence here and scratch copies outside the repository.
"""
from pathlib import Path
import datetime, hashlib, json, os, shutil, socket, subprocess, sys, tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
D = ROOT / 'deliveries/W3/revisions/W3-A1-r2'
scratch = Path(tempfile.mkdtemp(prefix='yor-correction-delta-audit-'))
app = scratch / 'app'
shutil.copytree(D / 'source', app)
(scratch / 'empty.npmrc').write_text('')
node = shutil.which('node')
pnpm = Path(shutil.which('pnpm.cmd')).parent / 'node_modules/pnpm/bin/pnpm.cjs'
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
env = {k: v for k, v in os.environ.items() if k.upper() in {
    'PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'LOCALAPPDATA',
    'APPDATA', 'USERPROFILE', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
    'PROGRAMFILES', 'PROGRAMFILES(X86)', 'COMMONPROGRAMFILES'}}
env.update({'NEXT_TELEMETRY_DISABLED': '1', 'CI': '1', 'PORT': str(port),
    'NPM_CONFIG_USERCONFIG': str(scratch / 'empty.npmrc'), 'NPM_CONFIG_GLOBALCONFIG': str(scratch / 'empty.npmrc'),
    'W3_EVIDENCE_DIR': str(OUT / 'w3-runtime')})

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def hashes(root):
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file()}

result = {'createdAtUtc': now(), 'evidenceClass': 'PARENT EXECUTED', 'scratch': str(scratch), 'app': str(app),
          'sourceSha256': hashes(D / 'source'), 'commands': [], 'scope': 'Delta checks only; no complete A1 re-audit.'}

def save():
    (OUT / 'w3-delta-execution.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8')

def run(label, args, expected=0, cwd=app):
    log = OUT / f'w3-{label}.log'
    rec = {'label': label, 'argv': args, 'cwd': str(cwd), 'startedAtUtc': now(), 'expectedExit': expected,
           'log': log.name, 'environment': 'System runtime variables; no service credentials; loopback only.'}
    with log.open('w', encoding='utf8') as stream:
        stream.write('COMMAND: ' + subprocess.list2cmdline(args) + '\nCWD: ' + str(cwd) + '\n')
        stream.flush()
        p = subprocess.run(args, cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT,
                           creationflags=subprocess.CREATE_NO_WINDOW)
        stream.write(f'\nEXIT: {p.returncode}\n')
    rec.update({'endedAtUtc': now(), 'exitCode': p.returncode, 'metExpectation': p.returncode == expected})
    result['commands'].append(rec)
    save()
    print(label, p.returncode, 'expected', expected, flush=True)
    return p.returncode

save()
if run('frozen-install', [node, str(pnpm), 'install', '--frozen-lockfile', '--store-dir', str(scratch / 'store'),
                         '--config.cache-dir=' + str(scratch / 'cache')]):
    raise SystemExit('Fresh frozen install failed; inspect archived log.')
result['installedVersions'] = {pkg: json.loads((app / 'node_modules' / pkg / 'package.json').read_text())['version']
                                for pkg in ['next', 'eslint-config-next', 'typescript', 'vitest', '@playwright/test']}
run('lint-clean', [node, str(pnpm), 'lint'])
run('boundaries-clean', [node, str(pnpm), 'test:unit', 'tests/unit/boundaries.test.ts'])
run('typecheck-clean', [node, str(pnpm), 'typecheck'])
# Repeat the original archived fixture mutation exactly in this scratch copy.
content = app / 'src/features/portfolio/public-content.ts'
clean = content.read_bytes()
fixture = app / 'tests/fixtures/reviewer-fixture.ts'
mutation = json.loads((D / 'evidence/a1-current/fixture-boundary-fault-injection.json').read_text())
try:
    content.write_text(mutation['mutation'], encoding='utf8')
    fixture.write_text(mutation['fixture'], encoding='utf8')
    run('original-dynamic-mutation', [node, str(pnpm), 'test:unit', 'tests/unit/boundaries.test.ts'], expected=1)
finally:
    content.write_bytes(clean)
    fixture.unlink(missing_ok=True)
# Changed AST surface: valid JS template literal and normalized contract escape.
extra = app / 'tests/unit/reviewer-delta.test.ts'
extra.write_text('''import { it, expect } from "vitest";
import { validateProductionModule, validateContractModule } from "./boundaries.test";
it("rejects a no-substitution template-literal dynamic fixture import", () => {
  const text = "export async function f() { return import(`../../../tests/fixtures/reviewer-fixture`); }";
  expect(() => validateProductionModule("src/features/portfolio/public-content.ts", text)).toThrow();
});
it("rejects a normalized relative contract escape into framework-bearing app code", () => {
  expect(() => validateContractModule("src/contracts/content.ts", 'export { default } from "./../app/layout";')).toThrow();
});
''', encoding='utf8')
try:
    run('changed-guard-adversarial', [node, str(pnpm), 'test:unit', 'tests/unit/reviewer-delta.test.ts'], expected=0)
finally:
    extra.unlink()
if run('build-clean', [node, str(pnpm), 'build']) == 0:
    result['buildId'] = (app / '.next/BUILD_ID').read_text().strip()
    result['fixtureSentinelBuiltFiles'] = [p.relative_to(app).as_posix()
        for p in (app / '.next').rglob('*') if p.is_file() and p.suffix in {'.html', '.rsc', '.js'}
        and b'REVIEWER_FIXTURE_LEAK' in p.read_bytes()]
    run('payload-clean', [node, str(pnpm), 'test:e2e', 'tests/e2e/payload.spec.ts'])
    # Inject a test-only preload into generated HTML in scratch; app source remains exact.
    # Fixed random seed makes the low-compressibility oversized fixture reproducible.
    import random
    rng = random.Random(20261001)
    data = ('/*' + ''.join(rng.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=600000)) + '*/').encode()
    html = app / '.next/server/app/index.html'
    original_html = html.read_bytes()
    public = app / 'public'
    public.mkdir(exist_ok=True)
    oversized = public / 'reviewer-oversized-fixture.js'
    oversized.write_bytes(data)
    result['oversizedPreload'] = {'rawBytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                                  'injectionTarget': '.next/server/app/index.html', 'kind': 'preload as=script; no script execution'}
    try:
        html.write_bytes(original_html.replace(b'</head>', b'<link rel="preload" as="script" href="/reviewer-oversized-fixture.js"></head>'))
        env['W3_EVIDENCE_DIR'] = str(OUT / 'w3-oversized')
        run('payload-oversized-preload', [node, str(pnpm), 'test:e2e', 'tests/e2e/payload.spec.ts', '--project=chrome'], expected=1)
    finally:
        html.write_bytes(original_html)
        oversized.unlink()
        env['W3_EVIDENCE_DIR'] = str(OUT / 'w3-runtime')
    result['generatedHtmlRestored'] = html.read_bytes() == original_html
    result['cleanPayloadSummaries'] = {}
    for browser in ['chrome', 'edge']:
        path = OUT / f'w3-runtime/{browser}/payload.json'
        if path.exists():
            payload = json.loads(path.read_text())
            result['cleanPayloadSummaries'][browser] = {'buildId': payload['buildId'], 'runs': len(payload['runs']),
                'jsBytes': sorted(set(r['encodedJsBytes'] for r in payload['runs'])),
                'transferBytes': sorted(set(r['totalTransferBytes'] for r in payload['runs']))}
# Reproduce the real helper's exit aggregation with a controlled child CLI.
helper_root = scratch / 'helper-check'
(helper_root / 'tools').mkdir(parents=True)
shutil.copy2(D / 'tools/proof.py', helper_root / 'tools/proof.py')
(helper_root / 'START_HERE.md').write_text('Reviewer scratch; no production repository.')
helper_evidence = helper_root / 'evidence/case'
helper_evidence.mkdir(parents=True)
fake = scratch / 'fake-pnpm.cjs'
fake.write_text("const fs=require('node:fs'); const p=__dirname+'/child-exits.json'; const a=JSON.parse(fs.readFileSync(p)); const code=a.shift(); fs.writeFileSync(p, JSON.stringify(a)); console.log('controlled child exit',code); process.exit(code);\n")
result['helperExitMatrix'] = []
for action, exits in [('audit', [1,1]), ('audit', [0,1]), ('audit', [1,0]), ('audit', [0,0]), ('list', [1]), ('list', [0])]:
    (scratch / 'child-exits.json').write_text(json.dumps(exits))
    (helper_evidence / 'execution.json').write_text(json.dumps({'scratch': str(scratch), 'app': str(app),
        'node': node, 'pnpmJs': str(fake), 'commands': []}))
    env['W3_PROOF_EVIDENCE'] = str(helper_evidence)
    label = 'helper-' + action + '-' + ''.join(str(x) for x in exits)
    outer = run(label, [sys.executable, str(helper_root / 'tools/proof.py'), action], expected=int(any(exits)))
    state = json.loads((helper_evidence / 'execution.json').read_text())
    child_exits = [c['exitCode'] for c in state['commands']]
    result['helperExitMatrix'].append({'action': action, 'injectedExits': exits, 'observedExits': child_exits,
         'outerExit': outer, 'pass': child_exits == exits and bool(outer) == any(exits), 'commands': state['commands']})
    for command in state['commands']:
        log = helper_root / command['log']
        shutil.copy2(log, OUT / f'w3-{label}-{log.name}')
result['sourceDeliveryUnchanged'] = result['sourceSha256'] == hashes(D / 'source')
result['scratchOriginalSourceRestored'] = all(hashlib.sha256((app / p).read_bytes()).hexdigest() == h
                                            for p, h in result['sourceSha256'].items())
result['finishedAtUtc'] = now()
save()
print(json.dumps({k: result[k] for k in ['installedVersions', 'sourceDeliveryUnchanged', 'scratchOriginalSourceRestored', 'helperExitMatrix']}, indent=2), flush=True)
