"""Run W3 proof only in a fresh external temp directory; preserve command evidence.

python tools/proof.py prepare
python tools/proof.py install  # consumes the returned lockfile without resolving again
python tools/proof.py lint typecheck test:unit build test:e2e
python tools/proof.py audit
"""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
evidence = Path(os.environ.get('W3_PROOF_EVIDENCE', str(root / 'evidence/a1-current'))).resolve()
if not evidence.is_relative_to(root / 'evidence'):
    raise SystemExit('Evidence output must stay under deliveries/W3/evidence/.')
evidence.mkdir(parents=True, exist_ok=True)
state_file = evidence / 'execution.json'
hidden = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

def now():
    return datetime.now(timezone.utc).isoformat()

def save(state):
    state_file.write_text(json.dumps(state, indent=2), encoding='utf-8')

if sys.argv[1:] == ['prepare']:
    if state_file.exists():
        raise SystemExit('Evidence already exists. Set W3_PROOF_EVIDENCE to a fresh directory under evidence/.')
    scratch = Path(tempfile.mkdtemp(prefix='yor-world-w3-a1-')).resolve()
    if scratch.is_relative_to(root.parents[1]):
        raise SystemExit('Scratch must be outside the workspace.')
    app = scratch / 'app'
    shutil.copytree(root / 'source', app)
    (scratch / 'empty.npmrc').write_text('', encoding='utf-8')
    pnpm = Path(shutil.which('pnpm.cmd') or shutil.which('pnpm') or '')
    pnpm_js = pnpm.parent / 'node_modules/pnpm/bin/pnpm.cjs'
    if not pnpm_js.is_file():
        raise SystemExit(f'Cannot find installed pnpm CLI: {pnpm_js}')
    state = {'createdAt': now(), 'provider': 'OpenAI', 'model': 'GPT-6 (Codex; session declared)',
             'lane': 'GPT-1 / W3 / A1', 'scratch': str(scratch), 'app': str(app),
             'node': shutil.which('node'), 'pnpmJs': str(pnpm_js), 'commands': []}
    save(state)
    print(json.dumps(state, indent=2))
    raise SystemExit(0)

state = json.loads(state_file.read_text(encoding='utf-8'))
scratch, app = Path(state['scratch']), Path(state['app'])
env = {k: v for k, v in os.environ.items() if k.upper() in {
    'PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'LOCALAPPDATA',
    'APPDATA', 'USERPROFILE', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
    'PROGRAMFILES', 'PROGRAMFILES(X86)', 'COMMONPROGRAMFILES'}}
env.update({'NEXT_TELEMETRY_DISABLED': '1', 'CI': '1',
            'NPM_CONFIG_USERCONFIG': str(scratch / 'empty.npmrc'),
            'NPM_CONFIG_GLOBALCONFIG': str(scratch / 'empty.npmrc'),
            'W3_EVIDENCE_DIR': str(evidence), 'PORT': '3147'})

def run(label, args):
    command = [state['node'], state['pnpmJs'], *args]
    number = len(state['commands']) + 1
    log = evidence / f'{number:02}-{label}.log'
    rec = {'label': label, 'argv': command, 'cwd': str(app), 'startedAt': now(),
           'log': log.relative_to(root).as_posix(),
           'environment': 'System runtime variables only; no backend/service credentials; telemetry disabled.'}
    with log.open('w', encoding='utf-8') as stream:
        stream.write('COMMAND: ' + subprocess.list2cmdline(command) + '\nCWD: ' + str(app) + '\n')
        stream.flush()
        process = subprocess.run(command, cwd=app, env=env, stdout=stream, stderr=subprocess.STDOUT,
                                 creationflags=hidden)
        rec.update({'exitCode': process.returncode, 'endedAt': now()})
        stream.write(f'\nEXIT: {process.returncode}\n')
    state['commands'].append(rec)
    save(state)
    print(label, 'exit', process.returncode, 'log', log, flush=True)
    return process.returncode

for action in sys.argv[1:]:
    if action == 'sync':
        shutil.copytree(root / 'source', app, dirs_exist_ok=True)
        print('Source synchronized to', app)
    elif action == 'resolve':
        opts = ['--store-dir', str(scratch / 'store'), '--config.cache-dir=' + str(scratch / 'cache')]
        # Explicit maintenance command only; frozen reproduction uses install instead.
        (app / 'pnpm-lock.yaml').unlink(missing_ok=True)
        code = run('generate-lockfile', ['install', '--lockfile-only', *opts])
        if code: raise SystemExit(code)
        shutil.copy2(app / 'pnpm-lock.yaml', root / 'source/pnpm-lock.yaml')
    elif action == 'install':
        opts = ['--store-dir', str(scratch / 'store'), '--config.cache-dir=' + str(scratch / 'cache')]
        code = run('frozen-install', ['install', '--frozen-lockfile', *opts])
        if code: raise SystemExit(code)
    elif action == 'audit':
        run('audit-all', ['audit', '--json'])
        run('audit-production', ['audit', '--prod', '--json'])
    elif action == 'list':
        run('installed-versions', ['list', '--depth', '0', '--json'])
    else:
        code = run(action.replace(':', '-'), [action])
        if code: raise SystemExit(code)
