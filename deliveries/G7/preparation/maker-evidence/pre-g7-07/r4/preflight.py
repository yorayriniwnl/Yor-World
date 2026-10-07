"""Read-only maker preflight. Does not create candidate proof or accept a gate."""
import ast
import hashlib
import json
from pathlib import Path
import re
import shlex
import subprocess

evidence = Path('scratch/pre-g7-07-r4')
policy = json.loads(Path('scripts/release/rc6-policy.json').read_text())
base_policy = json.loads(subprocess.check_output(['git', 'show', 'HEAD:scripts/release/rc6-policy.json'], text=True))
assert policy['deliveryRoot'] == 'deliveries/G7/rc6-candidate-r4'
assert policy['bundle']['path'] == policy['deliveryRoot'] + '/yor-world-v1.0.0-rc6.bundle.tar.gz'
assert policy['requiredChecks'] == base_policy['requiredChecks'] and len(policy['requiredChecks']) == 13
assert policy['expectedBrowserChecks'] == base_policy['expectedBrowserChecks']
before = json.loads((evidence / 'preserved-proof-before.json').read_text())
for item in before['files']:
    data = Path(item['path']).read_bytes()
    assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256'], item['path']
proof_roots = ['deliveries/G7/rc6-candidate', 'deliveries/G7/rc6-candidate-r2', 'deliveries/G7/rc6-candidate-r3']
actual_names = sorted(path.as_posix() for root in proof_roots for path in Path(root).rglob('*') if path.is_file())
assert actual_names == sorted(item['path'] for item in before['files'])
assert not Path(policy['deliveryRoot']).exists(), 'Maker preflight must not create candidate proof'
workflow = Path('.github/workflows/ci.yml').read_text()
numbers = [int(value) for value in re.findall(r'^      - name: (\d+)\.', workflow, re.M)]
assert numbers == list(range(1, 14)), numbers
assert 'assertPolicyOutputs(); console.log("RC6_DELIVERY_ROOT="+policy.deliveryRoot)' in workflow
base_workflow = subprocess.check_output(['git', 'show', 'HEAD:.github/workflows/ci.yml'], text=True)
def numbered_step(text, number):
    return re.search(rf'^      - name: {number}\..*?(?=^      - name:|\Z)', text, re.M | re.S).group()
for number in range(1, 13):
    assert numbered_step(workflow, number) == numbered_step(base_workflow, number), number
prepare_line = next(line.strip() for line in workflow.splitlines() if line.strip().startswith('node --input-type=module'))
prepare_command = shlex.split(prepare_line.split(' >> ')[0])
prepare_output = subprocess.check_output(prepare_command, text=True)
expected_environment = {'RC6_DELIVERY_ROOT': policy['deliveryRoot'], **{'RC_EXPECTED_' + name.upper(): str(count) for name, count in policy['expectedBrowserChecks'].items()}}
assert dict(line.split('=', 1) for line in prepare_output.splitlines()) == expected_environment
receipt_source = '"$RC6_DELIVERY_ROOT/ci-release-manifest-validation.receipt.json"'
validation = f'node scripts/release/validate-release.mjs --strict --receipt {receipt_source} | tee .rc6-ci/13-release-manifest-validation.log'
receipt_copy = f'cp {receipt_source} .rc6-ci/release-manifest-validation.receipt.json'
assert validation in workflow and receipt_copy in workflow
assert workflow.index(validation) < workflow.index(receipt_copy) < workflow.index('- name: Upload fresh CI execution evidence')
assert 'if: always()' in workflow and 'path: .rc6-ci/' in workflow and 'include-hidden-files: true' in workflow
assert 'set -o pipefail\n          ' + validation in workflow
assert not Path('.github/workflows/generate-rc6-r3.yml').exists()
changed = subprocess.check_output(['git', 'diff', '--name-only', '--', 'app'], text=True).strip()
assert not changed, 'App changes must stay outside maker scope: ' + changed
ast.parse(Path('deliveries/G7/preparation/tools/candidate-driver.py').read_text())
subprocess.run(['node', '--check', 'scripts/release/release-lib.mjs'], check=True)
subprocess.run(['git', 'diff', '--check'], check=True)
owned = ['scripts/release/rc6-policy.json', 'scripts/release/release-lib.mjs',
         'scripts/release/tests/immutable-output.test.mjs', 'scripts/release/tests/policy-output.test.mjs',
         'deliveries/G7/preparation/tools/candidate-driver.py', '.github/workflows/ci.yml',
         '.github/workflows/generate-rc6-r3.yml']
result = {'status': 'PASS', 'role': 'maker, acceptance pending', 'baseHead': before['head'],
          'preservedProofFilesVerified': len(before['files']), 'requiredChecks': policy['requiredChecks'],
          'expectedBrowserChecks': policy['expectedBrowserChecks'], 'qualityCheckNumbers': numbers,
          'deliveryRoot': policy['deliveryRoot'], 'archivePath': policy['bundle']['path'],
          'executedCiEnvironmentPreparation': expected_environment,
          'ciReceiptSource': receipt_source, 'ciReceiptArtifactPath': '.rc6-ci/release-manifest-validation.receipt.json',
          'workflowVerification': 'Read-only wiring check; exact-head hosted CI NOT RUN by maker',
          'candidateGeneration': 'NOT RUN; parent owns source freeze and fresh full checks',
          'files': [{'path': name, 'sha256': hashlib.sha256(Path(name).read_bytes()).hexdigest() if Path(name).exists() else None,
                     'status': 'modified' if Path(name).exists() else 'deleted'} for name in owned],
          'versions': {name: subprocess.check_output(args, text=True).strip() for name, args in
                       [('node', ['node', '--version']), ('python', ['python', '--version']), ('git', ['git', '--version'])]}}
(evidence / 'preflight.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
