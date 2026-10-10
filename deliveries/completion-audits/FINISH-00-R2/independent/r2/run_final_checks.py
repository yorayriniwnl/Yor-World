"""Read-only final packet diagnostic receipts. Never invokes --bind."""
from pathlib import Path
import datetime, hashlib, json, subprocess, sys

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
PACK = ROOT / 'docs/planning/reconciliation-packets/finish-contracts-r2'
EXPECTED = '8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af'
INPUT = '516295623cb233c88d358729db0ef7ee4867bf070b61c0d37e33ed59d4883a76'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
receipts = []
commands = [('parent-validator', [sys.executable, 'docs/planning/reconciliation-packets/finish-contracts-r2/validate-contracts.py']),
            ('python-version', [sys.executable, '--version']), ('node-version', ['node', '--version']),
            ('git-version', ['git', '--version']), ('head', ['git', 'rev-parse', 'HEAD']),
            ('app-tree', ['git', 'rev-parse', 'HEAD:app']),
            ('app-diff', ['git', 'diff', 'f62a43c5e71c00dcb89e28275ea81d842167db80', '--', 'app'])]
before = {'outputManifestSha256': sha(PACK / 'output-hashes.json'), 'inputManifestSha256': sha(PACK / 'input-hashes.json')}
for label, argv in commands:
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result = subprocess.run(argv, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    end = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (OUT / (label + '.stdout.txt')).write_bytes(result.stdout)
    (OUT / (label + '.stderr.txt')).write_bytes(result.stderr)
    receipts.append({'label': label, 'argv': argv, 'cwd': str(ROOT), 'startUTC': start, 'endUTC': end,
                     'exitCode': result.returncode, 'stdoutPath': label + '.stdout.txt', 'stderrPath': label + '.stderr.txt'})
after = {'outputManifestSha256': sha(PACK / 'output-hashes.json'), 'inputManifestSha256': sha(PACK / 'input-hashes.json')}
errors = []
if before != after or after != {'outputManifestSha256': EXPECTED, 'inputManifestSha256': INPUT}:
    errors.append('Final live packet changed or differs from assigned manifests')
if any(x['exitCode'] for x in receipts): errors.append('Command failed')
validator = json.loads((OUT / 'parent-validator.stdout.txt').read_bytes())
if validator['status'] != 'PASS': errors.append('Parent diagnostic did not pass')
if (OUT / 'app-tree.stdout.txt').read_text().strip() != '42ea29ec235225046a75959eb19eb386ac2f821d' or (OUT / 'app-diff.stdout.txt').read_bytes():
    errors.append('Application base changed')
read_attempts = [
    {'path': 'docs/planning/reconciliation-packets/finish-contracts-r2/validate_contracts.py', 'result': 'MISSING INPUT guessed underscore filename; actual validate-contracts.py directly read and executed'},
    {'path': 'docs/planning/production-prompts/completion-2026-10-10/p22-independent-delta-audit.md', 'result': 'MISSING INPUT guessed split filename; actual audit-and-acceptance.md P22 section directly read'},
    {'path': 'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/audit.json', 'result': 'MISSING INPUT; external report.md, diagnostic program/results and candidate manifests directly read instead'}
]
result = {'before': before, 'after': after, 'receipts': receipts, 'exploratoryReadAttempts': read_attempts,
          'validatorResult': validator, 'errors': errors,
          'scope': 'Diagnostic-only document validator, local versions and app source stability; no --bind, app suite, browser or provider execution'}
(OUT / 'command-receipts.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'validator': validator, 'finalPacketStable': before == after, 'errors': errors}, indent=2))
raise SystemExit(bool(errors))
