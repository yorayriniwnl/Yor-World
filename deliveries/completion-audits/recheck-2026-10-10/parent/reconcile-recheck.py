"""Bind actual recheck evidence; never modifies production or maker artifacts."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[4]
PARENT = Path(__file__).resolve().parent
BASE = '090f27878d2ec2ff88903f36aac2208d3ca39075'
TREE = '42ea29ec235225046a75959eb19eb386ac2f821d'
AUDIT_ROOTS = [ROOT / 'deliveries/completion-audits/FINISH-B1/2026-10-10-r1',
               ROOT / 'deliveries/completion-audits/FINISH-C1/2026-10-10-r1',
               ROOT / 'deliveries/completion-audits/recheck-2026-10-10']

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def read(file):
    return json.loads(file.read_text(encoding='utf-8-sig'))

def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

preserved = ['app', 'scripts', '.github', 'deliveries/FINISH-B1', 'deliveries/FINISH-C1',
             'docs/planning/reconciliation-packets/finish-contracts',
             'docs/planning/reviews/2026-10-09-finish-00-contract-ruling.md',
             'deliveries/audits/2026-10-09-completion']
source_delta = git('diff', '--name-only', BASE, '--', *preserved)
actual_tree = git('rev-parse', 'HEAD:app')
if actual_tree != TREE or source_delta:
    raise SystemExit('FAIL preserved source/maker/history delta; inspect before binding')
for folder in AUDIT_ROOTS:
    report = folder / ('governance/report.md' if folder.name == 'recheck-2026-10-10' else 'report.md')
    if not report.exists():
        raise SystemExit('MISSING INPUT: ' + str(report))

c1 = AUDIT_ROOTS[1]
b1 = AUDIT_ROOTS[0]
targets = read(c1 / 'targeted-results-final.json')
validation = read(b1 / 'validator-result.json')
if targets['numPassedTests'] != 13 or targets['numFailedTests'] or targets['numPendingTests']:
    raise SystemExit('FAIL unexpected independent targeted result count')
if len(validation['results']) != 7 or any(item['issues']['numErrors'] or item['issues']['numWarnings'] for item in validation['results']):
    raise SystemExit('FAIL asset validation count/result')

result = {
    'observedAtUtc': datetime.now(timezone.utc).isoformat(),
    'scope': 'Independent recheck reconciliation; no production acceptance',
    'auditedCoordinationCommit': BASE, 'observedHead': git('rev-parse', 'HEAD'),
    'canonicalAppTree': actual_tree, 'preservedSourceMakerHistoryDelta': source_delta,
    'independentTargetedCases': {'passed': 13, 'failed': 0, 'pending': 0,
                                'includesTwoDefectObservationChecks': True,
                                'notRenderedBrowserOrBroadSuiteAcceptance': True},
    'freshGltfValidation': {'assets': 7, 'errors': 0, 'warnings': 0},
    'parentImplementationAcceptancesFound': 0, 'canonicalFixesIntegrated': False,
    'platformDeliveryFound': (ROOT / 'deliveries/FINISH-A1').exists(),
    'productionProven': {'g7': '0/10', 'ledger': '0/56', 'manual': '0/6'},
    'statusBeforeSha256': sha(PARENT / 'status-before.json'),
    'statusAfterSha256': sha(PARENT / 'status-after.json'),
    'advice': {'runtime': 'REWORK', 'art': 'REWORK', 'contractHandoff': 'VERSIONED AMENDMENT REQUIRED'},
    'exclusions': ['FINISH-C1 transient candidate except two independent diagnostic tests',
                   'node_modules junctions, __pycache__, SHA256SUMS.txt self-hash'],
}
(PARENT / 'reconciliation.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')

files = []
allowed_tests = {'completion-independent.test.ts', 'completion-real-bones.test.ts'}
for folder in AUDIT_ROOTS:
    for directory, directories, names in os.walk(folder, followlinks=False):
        current = Path(directory)
        parts = current.relative_to(folder).parts
        directories[:] = [name for name in directories if name not in {'node_modules', '__pycache__'}]
        if parts == ('candidate',):
            directories[:] = [name for name in directories if name == 'tests']
        elif parts == ('candidate', 'tests'):
            directories[:] = [name for name in directories if name == 'unit']
        elif parts == ('candidate', 'tests', 'unit'):
            directories[:] = []
        for name in names:
            if name == 'SHA256SUMS.txt':
                continue
            if 'candidate' in parts and not (name in allowed_tests and parts == ('candidate', 'tests', 'unit')):
                continue
            files.append(current / name)
files += [ROOT / 'docs/planning/reviews/2026-10-10-completion-recheck.md',
          ROOT / 'docs/planning/reconciliation-packets/2026-10-10-completion-recheck.md']
raw_files = sorted(set(files), key=lambda file: file.relative_to(ROOT).as_posix())
inventory = ''.join(sha(file) + '  ' + file.relative_to(ROOT).as_posix() + '\n' for file in raw_files)
(AUDIT_ROOTS[2] / 'SHA256SUMS.txt').write_text(inventory, encoding='utf-8')
print(json.dumps({'status': 'PASS', 'files': len(raw_files), 'bytes': sum(file.stat().st_size for file in raw_files),
                  'sourceTree': actual_tree, 'targetedCases': 13, 'gltfAssets': 7}))
