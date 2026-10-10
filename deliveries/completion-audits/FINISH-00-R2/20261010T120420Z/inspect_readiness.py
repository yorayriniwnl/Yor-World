"""Independent read-only contract/readiness inspection; writes only this revision."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
PACK = ROOT / 'docs/planning/reconciliation-packets/finish-contracts-r2'
BASE = 'f62a43c5e71c00dcb89e28275ea81d842167db80'
receipts = []

def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def record(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}

def write(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')

def run(args, name):
    start = utc()
    result = subprocess.run(args, cwd=ROOT, capture_output=True)
    (OUT / (name + '.stdout.txt')).write_bytes(result.stdout)
    (OUT / (name + '.stderr.txt')).write_bytes(result.stderr)
    receipts.append({'commandArgv': args, 'cwd': str(ROOT), 'startUTC': start,
                     'endUTC': utc(), 'exitCode': result.returncode,
                     'stdout': name + '.stdout.txt', 'stderr': name + '.stderr.txt'})
    return result.stdout.decode('utf-8', errors='replace').strip()

start = utc()
identity = {'startUTC': start, 'workspace': str(ROOT),
            'head': run(['git', 'rev-parse', 'HEAD'], 'git-head'),
            'branch': run(['git', 'branch', '--show-current'], 'git-branch'),
            'appTree': run(['git', 'rev-parse', 'HEAD:app'], 'git-app-tree'),
            'declaredBase': BASE,
            'baseAppTree': run(['git', 'rev-parse', BASE + ':app'], 'git-base-tree'),
            'appDiff': run(['git', 'diff', BASE, '--', 'app'], 'git-app-diff'),
            'statusBefore': run(['git', 'status', '--porcelain=v1'], 'git-status-before'),
            'remote': run(['git', 'remote', 'get-url', 'origin'], 'git-remote'),
            'tools': {'python': sys.version, 'git': run(['git', '--version'], 'git-version'),
                      'node': run(['node', '--version'], 'node-version')}}
manifest_initial = record(PACK / 'output-hashes.json')
proposal = json.loads((PACK / 'output-hashes.json').read_text(encoding='utf-8'))
inputs = json.loads((PACK / 'input-hashes.json').read_text(encoding='utf-8'))
checks = []
for role, rows in [('input', inputs['inputs']), ('output', proposal['outputs'])]:
    for item in rows:
        bound = ROOT / item.get('snapshotPath', item['path'])
        actual = record(bound) if bound.is_file() else None
        checks.append({'role': role, 'declared': item, 'actual': actual,
                       'result': 'PASS' if actual and actual['bytes'] == item['bytes'] and actual['sha256'] == item['sha256'] else 'FAIL'})
snapshot = OUT / 'candidate-snapshot'
snapshot.mkdir()
snapshot_rows = []
for item in proposal['outputs'] + [{'path': manifest_initial['path']}]:
    source = ROOT / item['path']
    target = snapshot / source.relative_to(PACK)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(source.read_bytes())
    snapshot_rows.append({'source': record(source), 'snapshot': record(target)})
actual_paths = {p.relative_to(ROOT).as_posix() for p in PACK.rglob('*')
                if p.is_file() and p.name != 'output-hashes.json' and '__pycache__' not in p.parts}
declared_paths = {x['path'] for x in proposal['outputs']}
allowlists = []
for name in ['02-platform-schema-recovery.md', '04-path-ownership.md']:
    for number, line in enumerate((PACK / name).read_text(encoding='utf-8').splitlines(), 1):
        cells = [c.strip().strip('`') for c in line.split('|')[1:-1]]
        if len(cells) >= 3 and cells[0].startswith(('src/', 'tests/', 'supabase/')):
            path = ROOT / 'app' / cells[0]
            allowlists.append({'document': name, 'line': number, 'cells': cells,
                              'exists': path.is_file(), 'actual': record(path) if path.is_file() else None})
migrations = []
tables = set()
for path in sorted((ROOT / 'app/supabase/migrations').glob('*.sql')):
    found = re.findall(r'CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(public\.[a-z_]+)', path.read_text(encoding='utf-8'), re.I)
    migrations.append({'identity': record(path), 'publicTables': found})
    tables.update(found)
status_path = ROOT / 'docs/planning/current-status.json'
status = json.loads(status_path.read_text(encoding='utf-8'))
readiness = {'scope': 'P20 proposed FINISH-00-R2 contract review before acceptance; no maker or gate acceptance',
             'candidate': manifest_initial, 'base': identity,
             'currentStatusIdentity': record(status_path),
             'currentCompletionStatus': status.get('completionProgram'), 'g7': status.get('g7'),
             'deliveryRoots': {p: {'exists': (ROOT / p).exists(),
                                   'reports': [x.relative_to(ROOT).as_posix() for x in (ROOT / p).rglob('report.md')] if (ROOT / p).exists() else []}
                               for p in ['deliveries/FINISH-A1', 'deliveries/FINISH-B1', 'deliveries/FINISH-C1',
                                         'deliveries/FINISH-B1-R2', 'deliveries/FINISH-C1-R2', 'deliveries/FINISH-C2']},
             'parentR2RulingCandidates': [x.relative_to(ROOT).as_posix() for x in (ROOT / 'docs/planning/reviews').rglob('*')
                                        if x.is_file() and re.search(r'(finish.*00.*r2|finish.*r2.*ruling)', x.name, re.I)],
             'notRun': ['application suites', 'browser rendering', 'provider execution', 'physical/assistive devices',
                        'recovery rehearsals', 'maker corrections', 'Parent acceptance']}
previous = ROOT / 'deliveries/completion-audits/FINISH-00-R2/independent/r1/before-contracts/output-hashes.json'
delta = {'previousManifest': record(previous) if previous.exists() else None, 'currentManifest': manifest_initial, 'changed': []}
if previous.exists():
    old = {x['path']: x for x in json.loads(previous.read_text(encoding='utf-8'))['outputs']}
    new = {x['path']: x for x in proposal['outputs']}
    for p in sorted(set(old) | set(new)):
        if old.get(p) != new.get(p):
            delta['changed'].append({'path': p, 'before': old.get(p), 'after': new.get(p)})
validation_text = run([sys.executable, '-B', str(PACK / 'validate-contracts.py')], 'proposed-validator')
identity['endUTC'] = utc()
identity['manifestAfter'] = record(PACK / 'output-hashes.json')
identity['candidateStableDuringCheck'] = all(record(ROOT / row['source']['path']) == row['source'] for row in snapshot_rows)
write('candidate-identity.json', identity)
write('manifest-verification.json', {'checks': checks, 'counts': {'input': len(inputs['inputs']), 'output': len(proposal['outputs']),
      'pass': sum(x['result'] == 'PASS' for x in checks), 'fail': sum(x['result'] == 'FAIL' for x in checks)},
      'extra': sorted(actual_paths - declared_paths), 'missing': sorted(declared_paths - actual_paths),
      'snapshot': snapshot_rows, 'manifest': manifest_initial})
write('path-inventory.json', {'candidateOutputs': proposal['outputs'], 'allowlistRows': allowlists,
      'canonicalWriteAllowanceForAuditor': [], 'auditWriteRoot': OUT.relative_to(ROOT).as_posix(),
      'migrations': migrations, 'publicTables': sorted(tables)})
write('readiness.json', readiness)
write('proposal-delta.json', delta)
write('command-receipts.json', receipts)
all_inputs = {r['actual']['path']: r['actual'] for r in checks if r['actual']}
for path in [PACK / 'output-hashes.json', ROOT / 'AGENTS.md', ROOT / 'START_HERE.md', status_path,
             ROOT / 'docs/planning/delegation-and-work-orders.md',
             ROOT / 'docs/planning/account-operating-model.md',
             ROOT / 'docs/planning/reconciliation-packets/2026-10-10-finish-03.md',
             ROOT / 'docs/planning/reconciliation-packets/2026-10-10-finish-02.md',
             ROOT / 'docs/planning/reviews/2026-10-09-finish-00-contract-ruling.md',
             ROOT / 'docs/planning/reviews/2026-10-10-completion-recheck.md']:
    item = record(path)
    all_inputs[item['path']] = item
write('input-hashes.json', {'hashPolicy': 'SHA-256 raw bytes; identity inventory does not imply every input was semantically read',
                           'inputs': [all_inputs[p] for p in sorted(all_inputs)]})
print(json.dumps({'root': OUT.relative_to(ROOT).as_posix(), 'candidate': manifest_initial,
                  'hashPasses': sum(x['result'] == 'PASS' for x in checks), 'hashChecks': len(checks),
                  'inventoryExtra': sorted(actual_paths - declared_paths), 'stable': identity['candidateStableDuringCheck'],
                  'deltaPaths': [x['path'] for x in delta['changed']], 'tables': len(tables),
                  'validator': json.loads(validation_text)}, indent=2))
