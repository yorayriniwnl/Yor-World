from datetime import datetime, timezone
from pathlib import Path
import json, os, subprocess, sys
attempt = Path(__file__).resolve().parent
repo = Path.cwd()
command = [sys.executable, '-B', 'deliveries/G7/preparation/tools/test_g7_evidence.py']
env = os.environ.copy()
env['PYTHONDONTWRITEBYTECODE'] = '1'
started = datetime.now(timezone.utc).isoformat()
result = subprocess.run(command, cwd=repo, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
ended = datetime.now(timezone.utc).isoformat()
(attempt / 'commands.json').write_text(json.dumps({'cwd': str(repo), 'command': command, 'python': sys.version, 'startedAt': started, 'completedAt': ended, 'exitCode': result.returncode, 'PYTHONDONTWRITEBYTECODE': '1'}, indent=2) + '\n', encoding='utf-8')
(attempt / 'g7-evidence-tests.log').write_bytes(result.stdout)
(attempt / 'g7-evidence-tests.exit').write_text(str(result.returncode) + '\n', encoding='ascii')
print(f'exit={result.returncode}; log={attempt / "g7-evidence-tests.log"}; bytes={len(result.stdout)}')
sys.exit(result.returncode)
