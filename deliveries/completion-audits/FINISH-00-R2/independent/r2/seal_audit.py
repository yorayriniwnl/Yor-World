"""Seal this audit revision; checks inputs, never changes source/contracts."""
from pathlib import Path
import datetime, hashlib, json

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
PACK = ROOT / 'docs/planning/reconciliation-packets/finish-contracts-r2'
sha = lambda b: hashlib.sha256(b).hexdigest()
def record(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': sha(b)}
def read(name): return json.loads((OUT / name).read_bytes())
expected_output = '8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af'
expected_input = '516295623cb233c88d358729db0ef7ee4867bf070b61c0d37e33ed59d4883a76'
if record(PACK / 'output-hashes.json')['sha256'] != expected_output or record(PACK / 'input-hashes.json')['sha256'] != expected_input:
    raise ValueError('Live final contract changed before audit sealing')
owned_inputs = read('input-hashes.json')
for item in owned_inputs['inputs']:
    actual = record(ROOT / item['path'])
    if any(actual[k] != item[k] for k in ('sha256', 'bytes')):
        raise ValueError('Preserved audit input changed: ' + item['path'])
delta = read('delta-results.json')
provenance = read('source-provenance-results.json')
media = read('review-media-delta-results.json')
receipts = read('command-receipts.json')
advisor = read('advisor-manifest-verification.json')
if delta['errors'] or provenance['errors'] or receipts['errors'] or not media['requiredBehaviorAtDesignBoundary']:
    raise ValueError('Diagnostic defect prevents PASS seal')
execution = {
 'scope': 'Exact command/result metadata for independent delta diagnostics; hashes/rows are not application test cases',
 'workingDirectory': str(ROOT),
 'commands': [
   {'argv': ['python', 'deliveries/completion-audits/FINISH-00-R2/independent/r2/inspect_delta.py', expected_output], 'result': 'delta-results.json', 'exitCode': 0, 'endObservationUTC': delta['timestampUTC'], 'startUTC': None, 'timingLimit': 'Initial invocation start time not retained; no invented timestamp'},
   {'argv': ['node', 'deliveries/completion-audits/FINISH-00-R2/independent/r2/review-media-delta.mjs'], 'result': 'review-media-delta-results.json', **media['command']},
   {'argv': ['python', 'deliveries/completion-audits/FINISH-00-R2/independent/r2/check_source_provenance.py'], 'result': 'source-provenance-results.json', 'exitCode': 0, 'startUTC': provenance['startUTC'], 'endUTC': provenance['endUTC']},
   {'argv': ['python', 'deliveries/completion-audits/FINISH-00-R2/independent/r2/run_final_checks.py'], 'result': 'command-receipts.json', 'exitCode': 0, 'timing': 'Individual child commands have exact times and raw streams in command-receipts.json'},
   {'argv': ['python', 'deliveries/completion-audits/FINISH-00-R2/independent/r2/archive_inputs.py'], 'result': 'input-hashes.json and advisor-manifest-verification.json', 'exitCode': 0, 'endObservationUTC': owned_inputs['timestampUTC']}
 ],
 'exploratoryFailures': [*receipts['exploratoryReadAttempts'],
   {'command': "rg -n <patterns> docs/planning/reconciliation-packets/finish-contracts-r2/0*.md", 'exitCode': 1, 'result': 'Windows literal wildcard IO error123; corrected with -g *.md and directory path, exit0. No missed-file inspection claimed.'}],
 'freshApplicationTests': 0,
 'priorTypeSeamProof': 'r1 TS6.0.3 diagnostic reproduced two TS2322 and one TS2353; original programs/results and two unsuccessful attempts remain intact and were not rerun as successor proof'
}
(OUT / 'execution-notes.json').write_text(json.dumps(execution, indent=2) + '\n', encoding='utf-8')
findings = [
 ('R2-AUD-01','HIGH','C2 CameraPreset types allowance','04-path-ownership.md:53'),
 ('R2-AUD-02','HIGH','A2/C2 exact fixtures/tests, literal intent and bound I1 composition','01-runtime-lifecycle.md:91;02-platform-schema-recovery.md:260;04-path-ownership.md:105'),
 ('R2-AUD-03','HIGH','Consistent frame/hinge sibling hierarchy','03-asset-bindings.md:51,88'),
 ('R2-AUD-04','MEDIUM','C1/C2 quality responsibility and bounded C3 verification','03-asset-bindings.md:37'),
 ('PLAT-R2-01','HIGH','Media row/object/bytes metadata and approval audit identity in reviewed hash, complete review boundaries and no-partial-write regression','02-platform-schema-recovery.md:73,97,100,102,104,106,118')
]
not_run = ['successor app tests/build/typecheck/broad suites','real browser/WebGL/rendered startup/catalog/framing/cache/cancellation/pause','native Blender export/visual/deformed geometry/clearance','native PostgreSQL concurrency/effective grants and policies','actual Auth/Storage/media or PDF approval/mail/scheduler/provider operations','physical iOS/Android/thermal/assistive sessions','deployment/hosted CI/rollback/full-service recovery','new received maker implementation acceptance','external Gemini dispatch/control']
audit = {
 'packet': 'FINISH-00-R2', 'revision': 'independent/r2', 'reviewType': 'P22 exact contract delta',
 'timestampUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'advice': 'PASS', 'scope': 'Exact final contracts/design consistency and architectural finding closure only',
 'implementationAcceptance': False, 'parentRuling': False,
 'reviewer': {'task': '/root/r2_independent_audit', 'invocationModel': 'gpt-6.1-sol', 'invocationReasoningEffort': 'ultra', 'forkTurns': 'none', 'identitySource': 'Parent-confirmed actual explicit collaboration invocation metadata', 'servingBackendIntrospection': False, 'separatePaidAccountClaim': False},
 'candidate': {'outputManifest': record(PACK / 'output-hashes.json'), 'inputManifest': record(PACK / 'input-hashes.json'), 'sourceBaseCommit': 'f62a43c5e71c00dcb89e28275ea81d842167db80', 'sourceAppTree': delta['sourceAppTree'], 'observedHead': delta['observedHead'], 'branch': delta['branch'], 'appDiff': delta['appDiff'], 'ownedPreservedCopy': 'reviewed-contracts/'},
 'history': {'initialOutputManifestSha256': delta['oldOutputManifest']['sha256'], 'initialInputManifestSha256': delta['oldInputManifest']['sha256'], 'intermediateOutputManifestSha256': '65126f6a196449f0167263574b84bbc8aaa439760f17323e2cca447f1f74056d', 'priorAdvice': 'REWORK remains immutable', 'externalFindingReport': 'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/report.md', 'preservedInitialRoot': '../r1/', 'preservedIntermediateRoot': 'intermediate-contracts-65126f6a/'},
 'ownedInputManifest': record(OUT / 'input-hashes.json'),
 'findingClosures': [{'id': identifier, 'severity': severity, 'status': 'CLOSED_AT_DESIGN_LEVEL', 'ownerOfCorrection': 'Parent', 'summary': summary, 'evidence': evidence, 'implementationStatus': 'NOT_VERIFIED'} for identifier,severity,summary,evidence in findings],
 'clarifications': [{'id': 'PLAT-R2-C01', 'status': 'CLARIFIED', 'evidence': '02-platform-schema-recovery.md:118', 'implementationStatus': 'NOT_VERIFIED'}],
 'newArchitecturalBlockers': [],
 'evidence': {'rawHashChecks': 200, 'rawHashPasses': delta['hashPasses'], 'rawInputRows': 146, 'rawOutputRows': 54, 'independentBaseBlobChecks': provenance['baseBlobChecks'], 'priorRawIdentityMatches': provenance['priorRawIdentityMatches'], 'preservedSnapshots': provenance['snapshots'], 'EOLReconstructionOrigins': provenance['reconstructionOrigins'], 'allowlistTableRows': delta['allowlistRows'], 'catalogIds': delta['catalogIds'], 'localLinksDiagnostic': receipts['validatorResult']['localLinkChecks'], 'historicalMigrations': 3, 'publicApplicationTables': 16, 'changedContractFilesIncludingSnapshots': delta['changedContractFiles'], 'contractHashDiagnostic': {'result': 'PASS at deterministic preimage boundary', 'count': 1, 'fieldSensitivityCases': len(media['fieldSensitivity']), 'validSameIdMappingChangesIdentity': media['validMappingRetargetChangesIdentity'], 'objectKeyOrderStable': media['objectKeyOrderStable'], 'actualImplementationOrProviderTest': False}, 'parentValidator': receipts['validatorResult'], 'sourceOrContractEdits': 0, 'commits': 0, 'freshApplicationTests': 0},
 'versions': {name: (OUT / (name + '-version.stdout.txt')).read_text().strip() for name in ('python','node','git')},
 'separateAdvisor': {'path': 'deliveries/completion-audits/FINISH-00-R2/architecture/r3/', 'invocationModel': 'gpt-6-astra', 'advice': advisor['advice'], 'scope': advisor['scope'], 'outputManifestSha256': advisor['manifestSha256'], 'verifiedOutputs': len(advisor['checks']), 'exactFinalCandidateBound': True, 'parentAcceptance': False},
 'notRun': not_run,
 'limitations': ['Hash/path/link diagnostics overlap and are not application test counts.', 'Old source/GLB/SQL and TS6 observations retained from r1 without new execution claim.', 'No permanent Storage immutability or invented unaudited SQL edit history.', 'Received maker candidates and reported audits are preserved history; occupied roots require bound fresh continuation/correction packets.', 'A2/C2/C3/I1 remain dependent on exact accepted predecessors; all6 extensions and G7 proof remain open.'],
 'next': 'Parent may adjudicate only this exact contracts/design revision using independent final advice; production candidate corrections/audits/acceptance and integration remain separate'
}
(OUT / 'audit.json').write_text(json.dumps(audit, indent=2) + '\n', encoding='utf-8')
manifest = {'packet': 'FINISH-00-R2', 'revision': 'independent/r2', 'hashPolicy': 'SHA-256 of raw bytes',
            'exclusions': ['This root output-hashes.json only (self-reference); nested predecessor output manifests are included'],
            'outputs': [record(p) for p in sorted(OUT.rglob('*')) if p.is_file() and p != OUT / 'output-hashes.json']}
(OUT / 'output-hashes.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
for item in manifest['outputs']:
    if record(ROOT / item['path']) != item: raise ValueError('Audit output changed during sealing')
print(json.dumps({'advice': audit['advice'], 'report': record(OUT / 'report.md'), 'audit': record(OUT / 'audit.json'), 'inputManifest': record(OUT / 'input-hashes.json'), 'outputManifest': record(OUT / 'output-hashes.json'), 'outputs': len(manifest['outputs'])}, indent=2))
