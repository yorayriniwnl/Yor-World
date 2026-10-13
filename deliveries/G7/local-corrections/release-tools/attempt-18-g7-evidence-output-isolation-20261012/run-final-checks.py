from datetime import datetime, timezone
from pathlib import Path
import hashlib, json, subprocess, sys
attempt = Path(__file__).resolve().parent
repo = Path.cwd()
sources = ['deliveries/G7/preparation/tools/g7-evidence.py', 'deliveries/G7/preparation/tools/test_g7_evidence.py']
syntax_code = "import pathlib; [compile(pathlib.Path(p).read_text(encoding='utf-8'), p, 'exec') for p in " + repr(sources) + "]; print('syntax=PASS')"
checks = [
    ('python-syntax', [sys.executable, '-B', '-c', syntax_code]),
    ('scoped-diff-check', ['git', 'diff', '--check', '--', *sources]),
]
receipts = []
for name, command in checks:
    started = datetime.now(timezone.utc).isoformat()
    result = subprocess.run(command, cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    completed = datetime.now(timezone.utc).isoformat()
    (attempt / f'{name}.log').write_bytes(result.stdout)
    (attempt / f'{name}.exit').write_text(str(result.returncode) + '\n', encoding='ascii')
    receipts.append({'name': name, 'cwd': str(repo), 'command': command, 'startedAt': started,
                     'completedAt': completed, 'exitCode': result.returncode, 'log': f'{name}.log'})
(attempt / 'final-checks.json').write_text(json.dumps(receipts, indent=2) + '\n', encoding='utf-8')
hashed = [*sources, 'g7-evidence-tests.log', 'g7-evidence-tests.exit', 'python-syntax.log', 'python-syntax.exit',
          'scoped-diff-check.log', 'scoped-diff-check.exit', 'final-checks.json']
(attempt / 'output-hashes.json').write_text(json.dumps({'hashAlgorithm': 'SHA-256', 'files': [
    {'path': item, 'sha256': hashlib.sha256((repo / item).read_bytes()).hexdigest()} if item in sources else
    {'path': item, 'sha256': hashlib.sha256((attempt / item).read_bytes()).hexdigest()}
    for item in hashed]}, indent=2) + '\n', encoding='utf-8')
for item in receipts:
    print(f"{item['name']}: exit={item['exitCode']}; log={item['log']}")
if any(item['exitCode'] for item in receipts):
    sys.exit(1)
