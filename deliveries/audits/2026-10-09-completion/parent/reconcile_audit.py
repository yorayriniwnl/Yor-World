"""Bind the actual completion audit receipts without modifying production."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
AUDIT = ROOT / 'deliveries/audits/2026-10-09-completion'
PARENT = AUDIT / 'parent'
EXPECTED_HEAD = 'f6a8df58095807b09004c2f0ab8a2382c3971e80'
EXPECTED_TREE = '42ea29ec235225046a75959eb19eb386ac2f821d'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def read(file):
    return json.loads(file.read_text(encoding='utf-8-sig'))

head = git('rev-parse', 'HEAD')
tree = git('rev-parse', 'HEAD:app')
source_delta = git('diff', '--name-only', '--', 'app', 'scripts', '.github')
if head != EXPECTED_HEAD or tree != EXPECTED_TREE or source_delta:
    raise SystemExit('FAIL: audit baseline drift; inspect before rebinding')

checks = []
for name in ['lint', 'typecheck', 'unit', 'integration', 'build', 'e2e', 'performance', 'gltf', 'composition', 'budgets']:
    file = PARENT / (name + '-receipt.json')
    value = read(file)
    log = ROOT / value['log'].replace('\\', '/')
    checks.append({**value, 'receiptSha256': digest(file), 'logSha256': digest(log)})
    if value['status'] != 'PASS' or value['exitCode'] != 0:
        raise SystemExit('FAIL local suite receipt: ' + name)

counts = {}
for name in ['unit', 'integration']:
    data = read(PARENT / (name + '-results.json'))
    counts[name] = {'total': data['numTotalTests'], 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests']}
    if counts[name]['failed'] or counts[name]['pending'] or not data['success']:
        raise SystemExit('FAIL raw Vitest counts')

def specs(suite):
    yield from suite.get('specs', [])
    for child in suite.get('suites', []):
        yield from specs(child)

browser = read(PARENT / 'browser-results.json')
performance = read(PARENT / 'performance-results.json')
for name, data in [('e2e', browser), ('performance', performance)]:
    counts[name] = data['stats']
    if any(data['stats'][key] for key in ['skipped', 'unexpected', 'flaky']):
        raise SystemExit('FAIL raw Playwright results')
accessibility = sum(str(item['file']).replace('\\', '/').endswith('accessibility.spec.ts') for item in specs(browser))
unique_tests = counts['unit']['passed'] + counts['integration']['passed'] + counts['e2e']['expected'] + counts['performance']['expected']
if unique_tests != 713 or accessibility != 17:
    raise SystemExit('FAIL unexpected case identity/count')

inputs = ['AGENTS.md', 'START_HERE.md', 'docs/planning/delegation-and-work-orders.md',
          'docs/superpowers/specs/2026-09-30-yor-world-design.md', 'docs/planning/validation-and-production.md',
          'docs/planning/interaction-catalog.md', 'docs/planning/engineering-and-content.md',
          'docs/planning/art-and-experience.md', 'docs/planning/current-status.json',
          'docs/planning/reviews/2026-10-08-rc6-r1.md',
          'docs/planning/reconciliation-packets/2026-10-09-completion-audit.md']
diagnostic_files = ['parent/character-startup-result.json', 'parent/optional-load-result.json',
                    'parent/native-entry-result.json', 'world/fresh-browser/results.json',
                    'world/pause-proof/results.json', 'world/render-quality-proof/results.json']
diagnostics = []
for relative in diagnostic_files:
    file = AUDIT / relative
    diagnostics.append({'artifact': relative, 'sha256': digest(file),
                        'artifactLastModifiedUtc': datetime.fromtimestamp(file.stat().st_mtime, timezone.utc).isoformat(),
                        'scope': 'Associated by Parent with the unchanged audited app and fresh build; file modification time is not a claimed process start time'})

result = {
    'observedAtUtc': datetime.now(timezone.utc).isoformat(),
    'scope': 'Parent evidence reconciliation, not gate acceptance or live deployment proof',
    'baselineHead': head, 'sourceAppTree': tree, 'productionSourceDelta': source_delta,
    'buildId': (ROOT / 'app/.next/BUILD_ID').read_text().strip(),
    'nodeVersion': subprocess.check_output(['node', '--version'], text=True).strip(),
    'inputs': [{'path': file, 'sha256': digest(ROOT / file)} for file in inputs],
    'checks': checks, 'freshTestCounts': counts, 'accessibilityCasesIncludedInE2e': accessibility,
    'distinctPassingTests': unique_tests, 'diagnostics': diagnostics,
    'diagnosticCommandExitPolicy': 'Diagnostic utility exit 0 means observations were recorded; its observed FAIL finding is not relabeled PASS',
    'productionProven': {'g7Requirements': '0/10', 'ledgerObservations': '0/56', 'physicalManualSessions': '0/6'},
    'excludedFromPortableInventory': ['parent/*-fixture-db/', 'parent/browser-output/', 'parent/performance-output/', 'SHA256SUMS.txt self-hash'],
    'independentAdvice': 'platform PASS; production PASS subject to final binding; world and production corroborate diagnostic scope',
}
(PARENT / 'reconciliation.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')

files = []
for file in AUDIT.rglob('*'):
    if not file.is_file() or file.name == 'SHA256SUMS.txt':
        continue
    relative = file.relative_to(AUDIT)
    if any(part.endswith('-fixture-db') or part in ['browser-output', 'performance-output'] for part in relative.parts):
        continue
    files.append(file)
files.extend([ROOT / 'docs/planning/reviews/2026-10-09-completion-audit.md',
              ROOT / 'docs/planning/reconciliation-packets/2026-10-09-completion-audit.md'])
files = sorted(set(files), key=lambda file: file.relative_to(ROOT).as_posix())
inventory = ''.join(digest(file) + '  ' + file.relative_to(ROOT).as_posix() + '\n' for file in files)
(AUDIT / 'SHA256SUMS.txt').write_text(inventory, encoding='utf-8')
print(json.dumps({'status': 'PASS', 'head': head, 'tree': tree, 'build': result['buildId'],
                  'distinctPassingTests': unique_tests, 'hashedFiles': len(files), 'bytes': sum(file.stat().st_size for file in files)}))
