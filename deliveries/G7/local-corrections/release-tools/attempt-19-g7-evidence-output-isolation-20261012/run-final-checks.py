from datetime import datetime, timezone
from pathlib import Path
import hashlib, json, os, subprocess, sys
attempt = Path(__file__).resolve().parent
repo = Path.cwd()
sources = ['deliveries/G7/preparation/tools/g7-evidence.py', 'deliveries/G7/preparation/tools/test_g7_evidence.py']
syntax_code = "import pathlib; [compile(pathlib.Path(p).read_text(encoding='utf-8'), p, 'exec') for p in " + repr(sources) + "]; print('syntax=PASS')"
checks = [
    ('g7-evidence-tests', [sys.executable, '-B', sources[1]], {'PYTHONDONTWRITEBYTECODE': '1'}),
    ('python-syntax', [sys.executable, '-B', '-c', syntax_code], {}),
    ('scoped-diff-check', ['git', 'diff', '--check', '--', *sources], {}),
]
receipts = []
overall = 0
for name, command, extra_env in checks:
    env = os.environ.copy()
    env.update(extra_env)
    started = datetime.now(timezone.utc).isoformat()
    result = subprocess.run(command, cwd=repo, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    completed = datetime.now(timezone.utc).isoformat()
    log_name = f'{name}.log'
    (attempt / log_name).write_bytes(result.stdout)
    (attempt / f'{name}.exit').write_text(str(result.returncode) + '\n', encoding='ascii')
    receipts.append({'name': name, 'cwd': str(repo), 'command': command, 'startedAt': started,
                     'completedAt': completed, 'exitCode': result.returncode, 'log': log_name})
    overall = overall or result.returncode
(attempt / 'commands.json').write_text(json.dumps({'python': sys.version, 'checks': receipts}, indent=2) + '\n', encoding='utf-8')
(attempt / 'overall-exit.txt').write_text(str(overall) + '\n', encoding='ascii')
files = [*sources, 'g7-evidence-tests.log', 'g7-evidence-tests.exit', 'python-syntax.log', 'python-syntax.exit',
         'scoped-diff-check.log', 'scoped-diff-check.exit', 'commands.json', 'overall-exit.txt', Path(__file__).name]
(attempt / 'output-hashes.json').write_text(json.dumps({'hashAlgorithm': 'SHA-256', 'files': [
    {'path': item, 'sha256': hashlib.sha256((repo / item).read_bytes()).hexdigest()} if item in sources else
    {'path': item, 'sha256': hashlib.sha256((attempt / item).read_bytes()).hexdigest()}
    for item in files]}, indent=2) + '\n', encoding='utf-8')
for row in receipts:
    print(f"{row['name']}: exit={row['exitCode']}; log={row['log']}")
print(f'overall={overall}; evidence={attempt}')
sys.exit(overall)
