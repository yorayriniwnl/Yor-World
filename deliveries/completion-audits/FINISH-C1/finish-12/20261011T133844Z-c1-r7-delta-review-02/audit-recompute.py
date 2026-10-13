"""Independent FINISH-26 audit: raw Git receipts and disposable verifier probes."""
from __future__ import annotations
import copy
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = next(p for p in ROOT.parents if (p / '.git').exists())
EVIDENCE = ROOT / 'evidence'
WORK = ROOT / '.work'
C = 'e2670d4152c461005da86b392dbcea12cec740bf'
R6 = '9188b413d37da0ec3381b5430e25dc375a45bb18'
R5 = '5e85e6a8a248581fe3893fd80c7da3d05079f305'
BASE = 'f62a43c5e71c00dcb89e28275ea81d842167db80'
F16 = '27938c5c3a224a52849f2508cc7ebfcefa61fe6f'
APP = '42ea29ec235225046a75959eb19eb386ac2f821d'
PREFIX = 'deliveries/FINISH-C1-R7/'
MAPPINGS = {
    'candidate-app/app/src/features/world/AssetLoader.ts': (R6, 'deliveries/FINISH-C1-R6/source/app/src/features/world/AssetLoader.ts'),
    'candidate-app/app/tests/unit/world/completion-essential-loader.test.ts': (R6, 'deliveries/FINISH-C1-R6/source/app/tests/unit/world/completion-essential-loader.test.ts'),
    'candidate-app/app/src/features/world/RuntimeMaterialQuality.ts': (R5, 'deliveries/FINISH-C1-R5/source/app/src/features/world/RuntimeMaterialQuality.ts'),
    'candidate-app/app/src/features/world/WorldRuntime.ts': (R5, 'deliveries/FINISH-C1-R5/source/app/src/features/world/WorldRuntime.ts'),
    'candidate-app/app/src/features/world/LowQualityBatch.ts': (R5, 'deliveries/FINISH-C1-R3/source/src/features/world/LowQualityBatch.ts'),
    'candidate-app/app/public/models/production-room-full.glb': (BASE, 'app/public/models/production-room-full.glb'),
    'candidate-app/app/public/models/resident-production.glb': (BASE, 'app/public/models/resident-production.glb'),
    'candidate-app/app/public/models/fixture-production.glb': (BASE, 'app/public/models/fixture-production.glb'),
}
PACKAGE_MAPPINGS = {
    'candidate-app/node_modules/three/build/three.module.js': 'build/three.module.js',
    'candidate-app/node_modules/three/build/three.core.js': 'build/three.core.js',
}
COMMANDS = []

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(value, ensure_ascii=False, indent=2) + '\n' if not isinstance(value, str) else value
    path.write_bytes(data.encode('utf-8'))

def digest(data):
    return {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}

def git(*args, binary=False, permitted=(0,)):
    p = subprocess.run(['git', *args], cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    row = {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'argv': ['git', *args], 'cwd': str(REPO), 'exitCode': p.returncode, 'stderr': p.stderr.decode('utf-8', errors='replace')}
    if binary:
        row['stdoutBytes'] = digest(p.stdout)
    else:
        row['stdout'] = p.stdout.decode('utf-8', errors='strict')
    COMMANDS.append(row)
    assert p.returncode in permitted, row
    return p.stdout if binary else row['stdout'].strip()

def blob(commit, path):
    oid = git('rev-parse', '--verify', f'{commit}:{path}')
    assert git('cat-file', '-t', oid) == 'blob'
    data = git('cat-file', 'blob', oid, binary=True)
    return {'commit': commit, 'path': path, 'blobOid': oid, **digest(data)}, data

def load(commit, path):
    row, data = blob(commit, path)
    return row, json.loads(data)

def same_receipt(row, expected):
    return all(row[k] == expected[k] for k in ('sha256', 'bytes'))

def main():
    began = datetime.datetime.now(datetime.timezone.utc).isoformat()
    assert git('rev-parse', C+'^{tree}') == '419950200cc9705a101468d44e5b589b40f609f0'
    parent = git('rev-parse', C+'^')
    assert parent == '1058676cb74d8239aae7fed3dfa91defcc8a30a1'
    assert git('rev-parse', C+':app') == APP
    names = git('diff-tree', '--no-commit-id', '--name-only', '-r', C).splitlines()
    assert len(names) == 11 and all(n.startswith(PREFIX) for n in names)
    statuses = git('diff-tree', '--no-commit-id', '--name-status', '-r', C).splitlines()
    assert all(n.startswith('A\t'+PREFIX) for n in statuses)
    head = git('rev-parse', 'HEAD')
    assert git('rev-parse', head+':app') == APP
    git('merge-base', '--is-ancestor', C, head)
    output_manifest_receipt, manifest = load(C, PREFIX+'output-hashes.json')
    outputs = manifest['outputs']
    assert len(outputs) == manifest['fileCount'] == 10
    assert len({r['path'] for r in outputs}) == 10
    assert set(r['path'] for r in outputs) == set(n.removeprefix(PREFIX) for n in names) - {'output-hashes.json'}
    checked_outputs = []
    package_dir = WORK / 'exact-candidate' / 'deliveries' / 'FINISH-C1-R7'
    candidate_files = {}
    for name in sorted(names):
        row, data = blob(C, name)
        relative = name.removeprefix(PREFIX)
        candidate_files[relative] = data
        p = package_dir / relative
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        checkout = REPO / name
        assert checkout.read_bytes() == data, 'Working candidate differs from raw pinned candidate: '+name
        if relative != 'output-hashes.json':
            expected = next(r for r in outputs if r['path'] == relative)
            assert same_receipt(row, expected), (row, expected)
            checked_outputs.append({'relativePath': relative, **row, 'status': 'PASS'})
    assert sum(r['bytes'] for r in checked_outputs) == 186448
    write(EVIDENCE/'candidate-binding.json', {'candidateCommit': C, 'candidateTree': '419950200cc9705a101468d44e5b589b40f609f0', 'candidateParent': parent, 'candidateAppTree': APP, 'observedHead': head, 'headAppTree': APP, 'headDescendsFromCandidate': True, 'changedPaths': names, 'nameStatuses': statuses, 'r7ManifestReceipt': output_manifest_receipt, 'stableOutputCountExcludingManifest': 10, 'stableOutputBytesExcludingManifest': 186448, 'outputs': checked_outputs})
    binding = json.loads(candidate_files['source-binding.json'])
    corrected_input = json.loads(candidate_files['candidate-input-provenance.json'])
    corrected_predecessor = json.loads(candidate_files['predecessor-output-git-blobs.json'])
    input_manifest_receipt, old = load(R6, 'deliveries/FINISH-C1-R6/input-hashes.json')
    assert corrected_input['sourceManifest'] == input_manifest_receipt
    assert len(old['r6Inputs']) == 29 and len({r['path'] for r in old['r6Inputs']}) == 29
    assert len(corrected_input['inputs']) == 29
    assert len({r['alias'] for r in corrected_input['inputs']}) == 29
    expected_aliases = {r['path'] for r in old['r6Inputs']}
    assert expected_aliases == {r['alias'] for r in corrected_input['inputs']}
    index = {r['alias']: r for r in corrected_input['inputs']}
    installed_root = (REPO/'app/node_modules/three').resolve(strict=True)
    package_info_bytes = (installed_root/'package.json').read_bytes()
    package_info = json.loads(package_info_bytes)
    assert package_info['name'] == 'three' and package_info['version'] == '0.180.0'
    input_rows = []
    for original in old['r6Inputs']:
        alias = original['path']
        record = index[alias]
        expected = {k: original[k] for k in ('sha256', 'bytes')}
        assert record['originalExpected'] == expected
        if alias in PACKAGE_MAPPINGS:
            path = installed_root / PACKAGE_MAPPINGS[alias]
            data = path.read_bytes()
            actual = digest(data)
            provenance = {'kind': 'installed-package-file', 'package': 'three', 'version': '0.180.0', 'packageFile': PACKAGE_MAPPINGS[alias]}
            assert record['provenance'] == provenance
            assert same_receipt(actual, expected)
            assert record['installedPackageRoot'] == installed_root.relative_to(REPO).as_posix()
        else:
            commit, path = MAPPINGS.get(alias, (R6, alias))
            assert not alias.startswith('candidate-app/') or alias in MAPPINGS
            actual, data = blob(commit, path)
            provenance = {'kind': 'mapped-git-blob' if alias in MAPPINGS else 'direct-git-blob', 'commit': commit, 'path': path}
            assert record['provenance'] == provenance
        assert record['corrected'] == actual, (alias, record['corrected'], actual)
        match = same_receipt(actual, expected)
        assert record['originalReceiptMatches'] is match
        crlf_match = same_receipt(digest(data.replace(b'\n', b'\r\n')), expected) if not match else None
        input_rows.append({'alias': alias, 'provenance': provenance, 'originalExpected': expected, 'corrected': actual, 'originalReceiptMatches': match, 'historicalCrLfConversionMatches': crlf_match, 'status': 'PASS'})
    counts = {'total': 29, 'directGitBlobs': sum(r['provenance']['kind']=='direct-git-blob' for r in input_rows), 'mappedGitBlobs': sum(r['provenance']['kind']=='mapped-git-blob' for r in input_rows), 'installedPackageFiles': sum(r['provenance']['kind']=='installed-package-file' for r in input_rows), 'gitBacked': 27}
    assert corrected_input['counts'] == counts == {'total': 29, 'directGitBlobs': 19, 'mappedGitBlobs': 8, 'installedPackageFiles': 2, 'gitBacked': 27}
    assert len({(r['provenance']['commit'], r['provenance']['path']) for r in input_rows if r['provenance']['kind']!='installed-package-file'}) == 27
    assert sum(r['originalReceiptMatches'] for r in input_rows) == 22
    write(EVIDENCE/'r6-independent-receipts.json', {'sourceManifest': input_manifest_receipt, 'counts': counts, 'originalMatches': 22, 'originalMismatches': 7, 'inputs': input_rows})
    r5_manifest_receipt, r5_manifest = load(R5, 'deliveries/FINISH-C1-R5/output-hashes.json')
    assert len(r5_manifest['outputs']) == len(corrected_predecessor['outputs']) == 32
    r5_by_path = {r['path']: r for r in corrected_predecessor['outputs']}
    assert len(r5_by_path) == 32
    assert corrected_predecessor['sourceManifest'] == r5_manifest_receipt
    r5_rows = []
    for relative, expected in r5_manifest['outputs'].items():
        path = 'deliveries/FINISH-C1-R5/'+relative
        actual, data = blob(R5, path)
        record = r5_by_path[path]
        assert record['originalExpected'] == expected
        assert all(record[k] == v for k, v in actual.items())
        match = same_receipt(actual, expected)
        assert record['originalReceiptMatches'] is match
        crlf_match = same_receipt(digest(data.replace(b'\n', b'\r\n')), expected) if not match else None
        if not match: assert crlf_match
        r5_rows.append({**actual, 'originalExpected': expected, 'originalReceiptMatches': match, 'historicalCrLfConversionMatches': crlf_match, 'status': 'PASS'})
    assert set(r5_by_path) == {r['path'] for r in r5_rows}
    assert sum(r['originalReceiptMatches'] for r in r5_rows) == 9
    write(EVIDENCE/'r5-independent-receipts.json', {'sourceManifest': r5_manifest_receipt, 'count': 32, 'originalMatches': 9, 'originalMismatches': 23, 'outputs': r5_rows})
    diagnostic = next(r for r in input_rows if r['alias'].endswith('retry-aggregation-diagnostic.test.ts'))
    _, diagnostic_data = blob(R6, diagnostic['alias'])
    altered_diagnostic = diagnostic_data[:2872] + b'\r' + diagnostic_data[2872:]
    assert same_receipt(digest(altered_diagnostic), diagnostic['originalExpected'])
    audit_log_receipt, audit_log = blob(F16, binding['singleByteAuditLog']['path'])
    assert audit_log_receipt == binding['singleByteAuditLog']
    assert 'ONE_BYTE_INSERTION_MATCHES [{"offset":2872,"byte":13,"hex":"0d"}]' in audit_log.decode('utf-8').replace(' ', '') or re.search(r'ONE_BYTE_INSERTION_MATCHES.*"offset":\s*2872.*"byte":\s*13', audit_log.decode('utf-8'))
    write(EVIDENCE/'one-byte-proof.json', {'status': 'PASS', 'rawReceipt': diagnostic['corrected'], 'originalExpected': diagnostic['originalExpected'], 'extraByte': {'offset': 2872, 'byte': 13, 'hex': '0d'}, 'afterInsertion': digest(altered_diagnostic), 'pinnedFinish16Log': audit_log_receipt, 'noSourceChangeInferred': True})
    package_evidence = {}
    dependency = binding['threeDependencyEvidence']
    for key in ('packageManifest', 'lockfile', 'sourceBuildIdentity', 'frozenInstallLog'):
        row, data = blob(R6, dependency[key]['path'])
        assert row == dependency[key]
        package_evidence[key] = {'receipt': row, 'data': data.decode('utf-8')}
    package_json = json.loads(package_evidence['packageManifest']['data'])
    build_identity = json.loads(package_evidence['sourceBuildIdentity']['data'])
    assert package_json['dependencies']['three'] == '0.180.0' and package_json['packageManager']=='pnpm@9.15.9'
    integrity = 'sha512-o+qycAMZrh+TsE01GqWUxUIKR1AL0S8pq7zDkYOQw8GqfX8b8VoCKYUoHbhiX5j+7hr8XsuHDVU6+gkQJQKg9w=='
    m = re.search(r'(?m)^  three@0\.180\.0:\r?\n\s+resolution: \{integrity: ([^}\r\n]+)\}', package_evidence['lockfile']['data'])
    assert m and m.group(1) == dependency['threeIntegrity'] == integrity
    assert same_receipt(package_evidence['lockfile']['receipt'], build_identity['dependencyLock'])
    assert build_identity['toolVersions']['Pnpm']=='9.15.9'
    assert dependency['packageName'] == 'three' and dependency['packageVersion'] == '0.180.0'
    assert dependency['packageManager'] == 'pnpm' and dependency['packageManagerVersion'] == '9.15.9'
    assert dependency['installedPackageRoot'] == installed_root.relative_to(REPO).as_posix()
    assert len(dependency['packageFiles']) == 2
    assert len({r['alias'] for r in dependency['packageFiles']}) == 2
    for declaration in dependency['packageFiles']:
        independent = next(r for r in input_rows if r['alias'] == declaration['alias'])
        assert declaration['packageFile'] == independent['provenance']['packageFile']
        assert same_receipt(declaration, independent['corrected'])
    install = package_evidence['frozenInstallLog']['data']
    assert 'COMMAND=pnpm install --offline --frozen-lockfile' in install and 'EXIT_CODE=0' in install and 'using pnpm v9.15.9' in install
    write(EVIDENCE/'three-installed-package.json', {'status': 'PASS', 'installedRoot': str(installed_root), 'packageJson': {'path': str(installed_root/'package.json'), **digest(package_info_bytes), 'name': package_info['name'], 'version': package_info['version']}, 'installedFileReceipts': [r for r in input_rows if r['provenance']['kind']=='installed-package-file'], 'lockIntegrity': integrity, 'pinnedGitEvidence': {k:{'receipt': v['receipt']} for k,v in package_evidence.items()}, 'sourceBuildIdentityDependencyLock': build_identity['dependencyLock'], 'sourceBuildIdentityPnpm': build_identity['toolVersions']['Pnpm'], 'originalFrozenInstallReceiptText': install, 'registryFetch': 'NOT RUN; no substitute registry bytes were used'})
    for key in ('r6InputManifest', 'r6OutputManifest', 'r5OutputManifest'):
        actual, _ = blob(binding[key]['commit'], binding[key]['path'])
        assert all(binding[key][k]==v for k,v in actual.items())
    # Execute the original unmodified pinned candidate script in the real repository.
    command = [sys.executable, '-B', str(REPO/PREFIX/'verify-input-provenance.py'), '--json', '--check-output-manifest', '--commit', C]
    p = subprocess.run(command, cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    write(EVIDENCE/'verifier-rerun.log', 'COMMAND='+json.dumps(command)+'\nCWD='+str(REPO)+'\nSTDOUT\n'+p.stdout.decode('utf-8')+'\nSTDERR\n'+p.stderr.decode('utf-8')+'\nEXIT_CODE='+str(p.returncode)+'\n')
    assert p.returncode==0
    rerun = json.loads(p.stdout)
    write(EVIDENCE/'verifier-rerun.json', rerun)
    original_envelope = json.loads(candidate_files['evidence/verification.json'])
    assert original_envelope['exitCode'] == 0 and original_envelope['stderr'] == ''
    original_result = original_envelope['result']
    assert {k:v for k,v in rerun.items() if k!='outputManifest'} == original_result
    assert rerun['candidateInputs']['total']==29 and rerun['predecessorOutputs']['count']==32
    # Import exact pinned bytes; route only disposable receipt inputs to .work.
    spec = importlib.util.spec_from_file_location('fin26_pinned_verifier', package_dir/'verify-input-provenance.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.REPO_ROOT = REPO
    mod.PACKAGE_DIR = package_dir
    # Raw immutable Git-object results are cached after real subprocess reads.
    candidate_git = mod.git_bytes
    cache = {}
    def cached_git(*args):
        if args not in cache: cache[args] = candidate_git(*args)
        return cache[args]
    mod.git_bytes = cached_git
    assert mod.run_verification(C)==rerun
    probes = []
    def probe(label, relative=None, change=None, action=None, expected_fail=True):
        for n,d in candidate_files.items():
            (package_dir/n).write_bytes(d)
        if relative and change:
            value = json.loads(candidate_files[relative])
            change(value)
            write(package_dir/relative, value)
        try:
            result = action() if action else mod.run_verification(C)
            rejected = False
            detail = 'Verifier returned PASS'
        except Exception as error:
            rejected = True
            detail = type(error).__name__+': '+str(error)
        probes.append({'case': label, 'expectedRejection': expected_fail, 'rejected': rejected, 'status': 'PASS' if rejected==expected_fail else 'FAIL', 'result': detail})
    inp = 'candidate-input-provenance.json'
    pred = 'predecessor-output-git-blobs.json'
    sb = 'source-binding.json'
    probe('missing receipt file', action=lambda: ((package_dir/inp).unlink(), mod.run_verification(C))[1])
    probe('missing R6 input row', inp, lambda v:v['inputs'].pop())
    probe('duplicate R6 input alias', inp, lambda v:v['inputs'].__setitem__(1, copy.deepcopy(v['inputs'][0])))
    probe('wrong direct Git path', inp, lambda v:v['inputs'][0]['provenance'].__setitem__('path', 'app/nonexistent-file'))
    probe('wrong direct Git commit', inp, lambda v:v['inputs'][0]['provenance'].__setitem__('commit', '0'*40))
    probe('wrong corrected Git hash', inp, lambda v:v['inputs'][0]['corrected'].__setitem__('sha256', '0'*64))
    probe('missing corrected Git hash', inp, lambda v:v['inputs'][0]['corrected'].pop('sha256'))
    probe('wrong corrected Git byte count', inp, lambda v:v['inputs'][0]['corrected'].__setitem__('bytes', -1))
    probe('wrong input counts', inp, lambda v:v['counts'].__setitem__('total', 30))
    probe('original historical expected hash altered', inp, lambda v:v['inputs'][0]['originalExpected'].__setitem__('sha256', '0'*64))
    probe('wrong source binding tree', sb, lambda v:v['commits']['R6'].__setitem__('tree', '0'*40))
    probe('wrong source binding manifest hash', sb, lambda v:v['r6InputManifest'].__setitem__('sha256', '0'*64))
    probe('wrong package integrity', sb, lambda v:v['threeDependencyEvidence'].__setitem__('threeIntegrity', 'bad'))
    probe('wrong corrected installed file hash', inp, lambda v:next(r for r in v['inputs'] if r['provenance']['kind']=='installed-package-file')['corrected'].__setitem__('sha256', '0'*64))
    probe('package mislabeled as Git-backed', inp, lambda v:next(r for r in v['inputs'] if r['provenance']['kind']=='installed-package-file')['provenance'].__setitem__('kind', 'direct-git-blob'))
    probe('duplicate R5 output path', pred, lambda v:v['outputs'].__setitem__(1, copy.deepcopy(v['outputs'][0])))
    probe('wrong R5 manifest receipt hash', pred, lambda v:v['sourceManifest'].__setitem__('sha256', '0'*64))
    probe('wrong R5 output commit', pred, lambda v:v['outputs'][0].__setitem__('commit', '0'*40))
    probe('wrong R5 output hash', pred, lambda v:v['outputs'][0].__setitem__('sha256', '0'*64))
    probe('wrong R5 output count', pred, lambda v:v.__setitem__('count', 31))
    probe('missing Git object path', action=lambda:mod.resolve_git_blob(R6, 'app/no-such-file.fin26'))
    probe('unpinned Git commit', action=lambda:mod.resolve_git_blob('0'*40, 'app/package.json'))
    probe('duplicate authoritative path', action=lambda:mod.validate_unique_rows([{'path':'same'},{'path':'same'}], 'path', 2, 'audit-probe'))
    probe('candidate sourceManifest redundant hash mismatch', inp, lambda v:v['sourceManifest'].__setitem__('sha256', '0'*64))
    probe('candidate sourceManifest redundant commit mismatch', inp, lambda v:v['sourceManifest'].__setitem__('commit', '0'*40))
    probe('candidate sourceManifest redundant byte count mismatch', inp, lambda v:v['sourceManifest'].__setitem__('bytes', -1))
    write(EVIDENCE/'negative-probes.json', {'method': 'Unmodified exact-candidate verifier imported from extracted Git bytes; REPO_ROOT redirected to actual repository, PACKAGE_DIR to disposable exact-candidate receipts. Every probe resets receipt bytes. Cached results come from real Git subprocesses for immutable objects; cache does not change parsing or checks.', 'pinnedVerifierReceipt': next(r for r in checked_outputs if r['relativePath']=='verify-input-provenance.py'), 'cases': probes, 'passed': sum(r['status']=='PASS' for r in probes), 'failed': sum(r['status']=='FAIL' for r in probes), 'missingOrMismatchedInstalledPackageBytes': 'NOT RUN by this script; supplemental audit-package-negatives.py checks disposable package copies without editing production dependencies'})
    # Reset all disposable files to candidate bytes at the end.
    for n,d in candidate_files.items(): (package_dir/n).write_bytes(d)
    assert mod.run_verification(C)==rerun
    matrix = json.loads(candidate_files['requirements-matrix.json'])
    assert matrix['counts']['r6Inputs']['originalReceiptMatches']==22 and matrix['counts']['r5Outputs']['originalReceiptMatches']==9
    assert matrix['counts']['r6Inputs']['gitBacked']==27
    assert not matrix['missingFiles']
    assert set(matrix['expectedStableFiles']) == set(candidate_files)
    assert len(matrix['originalR6ReceiptMismatches'])==7 and len(matrix['originalR5ReceiptMismatches'])==23
    for r in matrix['originalR6ReceiptMismatches']:
        actual = next(i for i in input_rows if i['alias']==r['alias'])
        assert r['expected']==actual['originalExpected'] and r['committedOrInstalled']==actual['corrected']
    for r in matrix['originalR5ReceiptMismatches']:
        actual = next(i for i in r5_rows if i['path']==r['path'])
        assert r['expected']==actual['originalExpected']
        assert all(r['committed'][k]==actual[k] for k in ('blobOid','sha256','bytes'))
    assert 'Exit code: **0**' in candidate_files['report.md'].decode('utf-8')
    assert 'EXIT_CODE=0' in candidate_files['evidence/verifier.log'].decode('utf-8')
    assert git('diff', C+'^', C, '--', 'app', 'deliveries/FINISH-C1-R5', 'deliveries/FINISH-C1-R6')==''
    write(EVIDENCE/'agreement-and-preservation.json', {'status': 'PASS', 'makerStructuredResultEqualsIndependentRerunExcludingOutputManifest': True, 'makerMatrixMismatchDetailsEqualsIndependentReceipts': True, 'stableExpectedInventoryExact': True, 'historicCandidatesAndAppDiffAtDelivery': '', 'r5AndR6ManifestRawBindingsVerified': True, 'candidateInputSourceManifestAllFieldsIndependentlyVerified': True, 'sourceBindingPackageFilesAllFieldsIndependentlyVerified': True, 'candidateCheckoutEqualsPinnedGitBytes': True, 'runtimeTests': 'NOT RUN by this evidence-only delta audit; inherited from FINISH-16', 'applicationChanges': [], 'disputedFinish23Root': 'Not opened, read, copied, or used'})
    write(EVIDENCE/'tool-versions.json', {'python': sys.version, 'pythonExecutable': sys.executable, 'git': git('--version'), 'auditBeganUtc': began, 'auditEndedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat()})
    print(json.dumps({'status':'PASS_IDENTITY_AND_RECEIPTS', 'r7Outputs':10, 'r7OutputBytes':186448, 'r6Inputs':29, 'r5Outputs':32, 'negativeProbeFailures': [r for r in probes if r['status']=='FAIL']}, indent=2))

if __name__=='__main__':
    try:
        main()
    finally:
        write(EVIDENCE/'commands.json', COMMANDS)
        lines=[]
        for row in COMMANDS:
            lines.append('UTC='+row['utc']+'\nCOMMAND='+json.dumps(row['argv'])+'\nCWD='+row['cwd']+'\nSTDOUT\n'+(row.get('stdout') if 'stdout' in row else 'RAW_BLOB_STDOUT '+json.dumps(row['stdoutBytes'])+'\n')+'\nSTDERR\n'+row['stderr']+'\nEXIT_CODE='+str(row['exitCode'])+'\n')
        write(EVIDENCE/'commands.log', '\n'.join(lines))
