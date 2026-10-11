"""Assemble FINISH-29 audit evidence and final read-only preservation checks."""
import datetime,json,pathlib,sys
from audit import OUT,ROOT,CANDIDATE,R7,PREFIX,THREE,blob,git,sha,write,tree_inventory

binding=json.loads((OUT/'candidate-binding.json').read_text())
main=json.loads((OUT/'independent-cli-probes.json').read_text())
extra=json.loads((OUT/'additional-duplicate-probes.json').read_text())
types=json.loads((OUT/'independent-schema-probes.json').read_text())
mre=json.loads((OUT/'minimal-reproduction.json').read_text())
positive=json.loads((OUT/'independent-positive.json').read_text())
assert len(main['cases'])==23 and main['failedExpectations']==15
assert extra['count']==10 and extra['falsePasses']==10
assert types['total']==76 and types['rejected']==76
before=json.loads((OUT/'preservation-before.json').read_text())
before_three=json.loads((OUT/'installed-three-before.json').read_text())
assert tree_inventory(ROOT/'deliveries/FINISH-C1-R8')==before['candidateFiles']
assert tree_inventory(THREE)==before_three['files']
assert git('rev-parse','HEAD').decode().strip()==CANDIDATE
assert git('rev-parse','HEAD:app').decode().strip()==binding['appTree']
assert all((ROOT/r['path']).read_bytes()==blob(CANDIDATE,r['path']) for r in binding['rawBlobs'])
write('final-preservation.json',dict(status='PASS',checkedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),candidateCommit=CANDIDATE,candidateFiles=26,candidateRawBlobsExact=True,installedThreeEntireTreeUnchanged=True,installedThreeFileCount=len(before_three['files']),appTree=binding['appTree'],allProbeMutationsInsideAssignedAuditScratch=True,otherLineageAndCollisionRootsNotInspectedOrModified=True))

packets=[('c2478400','docs/planning/reconciliation-packets/2026-10-11-finish-29-c1-r8-delta-audit.md'),('b33631a9','docs/planning/reconciliation-packets/2026-10-11-finish-28-c1-r7-verifier-correction.md')]
write('audit-authority-inputs.json',[dict(commit=git('rev-parse',c).decode().strip(),path=p,bytes=len(blob(c,p)),sha256=sha(blob(c,p)),blobOid=git('rev-parse',c+':'+p).decode().strip()) for c,p in packets])

inventory=[]
for i,r in enumerate(main['cases'],1):
    inventory.append(dict(case='primary-'+str(i).zfill(3),name=r['name'],expectedExit=r['expectedExit'],actualExit=r['exit'],actualStatus=r['returnedStatus'],auditStatus=r['status'],duplicateMembers=r['duplicateJSONMembers'],receipt='probes/case-'+str(i).zfill(3)+'.json',stdout=r['stdout'],stderr=r['stderr'],command=r['command'],gitEnvironment=r['gitEnvironment'],cacheUsed=False))
for i,r in enumerate(extra['cases'],1):
    inventory.append(dict(case='additional-'+str(i).zfill(3),name=r['name'],expectedExit=1,actualExit=r['actualExit'],actualStatus=r['returnedStatus'],auditStatus='FAIL' if r['actualExit']==0 else 'PASS',duplicateMembers=True,firstValue=r['firstValue'],lastValue=r['lastValue'],receipt='additional-probes/case-'+str(i).zfill(3)+'.json',stdout=r['stdout'],stderr=r['stderr'],command=r['command'],gitEnvironment=r['gitEnvironment'],cacheUsed=False))
write('case-inventory.json',dict(candidateCommit=CANDIDATE,uncachedCLIProcessCount=33,primaryCLIProcessCount=23,additionalCLIProcessCount=10,falsePassCount=25,positiveControls=1,expectedRejectionsActuallyRejected=7,cases=inventory,parsedSchemaProbeCount=76,parsedSchemaRejected=76,parsedSchemaReceipt='independent-schema-probes.json',makerSuiteCount=51,makerSuiteRejected=51,makerSuiteReceipt='maker-suite-independent-results.json'))

finding=dict(id='FIN29-E02-01',severity='HIGH',status='FAIL',scope='E-02 evidence verifier',recommendation='REWORK',title='Contradictory duplicate JSON object members are silently discarded before validation',candidateCommit=CANDIDATE,sourceLocations=[dict(path=PREFIX+'verify-input-provenance.py',line=n) for n in [159,170,388,534,608]],observed='25 separate uncached CLI processes return PASS/exit 0 despite contradictory repeated members; the correct authoritative value appears last.',expected='Reject duplicate receipt object members before parsed-field validation and return FAIL/nonzero.',mechanism='json.loads uses last-member-wins parsing. Field-set, row-uniqueness, strict type and source-value checks operate on a dict after earlier contradictory declarations have disappeared.',minimalReproduction='minimal-reproduction.json',primaryInventory='independent-cli-probes.json',additionalInventory='additional-duplicate-probes.json',completeInventory='case-inventory.json',orderingControl='probes/case-012.json',impact='E-02 fail-closed receipt contract is not met. The probes preserve actual pinned Git and installed build bytes; this is acceptance of contradictory declarations, not proof of arbitrary source replacement or a runtime vulnerability.',correctionRequest='Assigned maker should reject repeated JSON object member names at all nesting levels in receipt/parser entry points and add raw-byte uncached CLI regressions for contradictory and same-value duplicates. Apply the policy consistently to source-binding, candidate provenance, predecessor outputs, installed package identity and shared JSON loaders. Preserve exact source pins and current passing controls. Auditor makes no candidate edits.',limitations='Finite sampled duplicate keys; shared parser inspection indicates broader exposure but no exhaustive proof for every key. logged_json_value at line 170 was inspected only; no mutation of pinned historical log blobs or manifests was attempted.')
write('findings.json',dict(candidateCommit=CANDIDATE,recommendation='REWORK',scope='E-02 only',blockingFindingCount=1,findings=[finding],E01='NOT RUN',externalGPTPlus2='NOT RUN',parentAcceptance='PENDING'))

requirements=[
 ('FIN29-1-identity','PASS','Parent/full tree/R8 subtree/app tree and exactly 26 added paths match authoritative packet.','candidate-binding.json'),
 ('FIN29-1-output-manifest','PASS','All 25 stable raw Git outputs and 237622 bytes match; manifest self-excluded.','candidate-binding.json'),
 ('FIN29-2-primary-field-validation','PASS','Single wrong values for all five sourceManifest fields and package SHA reject; 76 target wrong-type/container probes reject.','case-inventory.json'),
 ('FIN29-2-fail-closed-duplicates','FAIL','25 contradictory raw repeated-member cases return PASS/exit 0. E-02 requires REWORK.','findings.json'),
 ('FIN29-3-independent-positive','PASS','Unchanged exact verifier and pinned receipt model return PASS/exit 0 with R7 output-manifest checking.','independent-positive.json'),
 ('FIN29-3-maker-negative-suite','PASS','Independent execution in disposable exact copy rejects all 51 maker negatives. Imported-function cases reuse cached immutable Git bytes.','maker-suite-independent-results.json'),
 ('FIN29-3-independent-negative-probes','FAIL','Reviewer designed 33 uncached CLI cases: 1 positive, 7 expected rejections confirmed, 25 contradictory duplicates falsely pass.','case-inventory.json'),
 ('FIN29-3-preservation','PASS','Candidate 26 files exact after all probes; entire installed Three package unchanged; app Git tree unchanged.','final-preservation.json'),
 ('FIN29-4-patch-replay','PASS','Raw supplied patch applies to exact R7 bytes and reproduces corrected verifier byte-for-byte.','patch-replay.json'),
 ('FIN29-4-harness-and-gaps','PASS','Raw JSON duplicate edge and parsed-dict mutation/cached Git harness limits documented.','report.md'),
 ('FIN29-5-audit-package','PASS','Report, findings, matrix, exact binding, command/version/raw logs and self-excluded hashes produced.','output-hashes.json'),
 ('E-01','NOT RUN','Historical mismatch adjudication is outside this delta audit.','report.md'),
 ('external-GPT-Plus-2','NOT RUN','No external browser reviewer was run.','report.md'),
 ('runtime-build-browser-device-provider','NOT RUN','Evidence verifier audit does not execute or accept application/runtime/build/browser/device/provider behavior.','report.md'),
 ('Parent-acceptance-integration-deployment-G7','NOT RUN','Separate Parent gates remain pending.','report.md')]
write('requirement-matrix.json',dict(candidateCommit=CANDIDATE,scope='FINISH-29 E-02 delta audit',recommendation='REWORK',requirements=[dict(id=i,status=s,result=r,evidence=e) for i,s,r,e in requirements]))

table='\n'.join('| '+r['case']+' | '+r['name']+' | '+str(r['expectedExit'])+' | '+str(r['actualExit'])+' / '+r['actualStatus']+' | '+r['auditStatus']+' |' for r in inventory)
report=f'''# FINISH-29 independent C1-R8 delta audit

## Recommendation: REWORK for E-02

Exact candidate `{CANDIDATE}` fails the required fail-closed handling of contradictory receipt metadata. **One blocking finding, FIN29-E02-01:** ordinary JSON parsing discards earlier duplicate object members; later authoritative values make contradictory raw receipts return `PASS`, exit `0`. This local cross-lane reviewer did not author C1-R8 and has made no candidate corrections. External GPT Plus #2 remains **NOT RUN**; Parent acceptance is pending.

## Exact candidate and admitted scope

| Identity | Independently recomputed value |
| --- | --- |
| Candidate | `{CANDIDATE}` |
| Parent | `{binding['parent']}` |
| Full tree | `{binding['fullTree']}` |
| R8 subtree | `{binding['subtree']}` |
| App tree | `{binding['appTree']}` |
| Corrected verifier SHA-256 | `{binding['verifierSHA256']}` |
| Output manifest SHA-256 | `{binding['outputManifestSHA256']}` |

All 26 changed paths are additions under `deliveries/FINISH-C1-R8/`; all 25 stable manifest rows match raw Git bytes, totaling 237,622 bytes. The three input receipt files match exact R7 commit `{R7}` byte-for-byte. See `candidate-binding.json` for every raw blob OID, length and SHA-256. The FINISH-29 and FINISH-28 authority packet hashes are in `audit-authority-inputs.json`.

The assigned audit destination was absent before creation in a fresh isolated candidate worktree. Only this audit root and its ignored `.work/` scratch were written. The separate C1-R8 lineage, occupied canonical candidate path, and unrelated audit collision roots were not inspected or modified.

## Blocking reproduction and exact ordering

In a disposable copy of exact `candidate-input-provenance.json`, replace only its `sourceManifest` object with these raw bytes:

```json
{mre['rawSourceManifestObject']}
```

The first `sha256` is 64 zeroes. The second is the authoritative raw R6 manifest SHA-256 `{mre['lastSha256']}`. Every other receipt field, the verifier and the installed build files stay unchanged. Run the unchanged verifier with the recorded private `GIT_DIR`/`GIT_WORK_TREE` environment:

```text
python -B <disposable-root>/deliveries/FINISH-C1-R8/verify-input-provenance.py --json --check-output-manifest --commit {R7}
```

**Actual:** case `primary-009`, `PASS`, exit `0`, empty errors and stderr. Full raw output is `logs/probe-009.stdout.log`; command/environment/hash bindings are `probes/case-009.json` and `minimal-reproduction.json`. **Expected:** `FAIL`, nonzero. Reverse the order so the zero hash is last: case `primary-012` returns `FAIL`, exit `1`, error `candidate receipt sourceManifest sha256 differs from the pinned R6 manifest blob`. A single zero-hash declaration also rejects (`primary-008`). This establishes last-member-wins behavior, rather than a disabled SHA comparison.

`json.loads` at candidate verifier lines 388, 534 and 608 parses the three mutable receipts. The shared `json_from_bytes` helper at line 159 parses installed package identity and pinned JSON. `logged_json_value` at line 170 uses the same parser but was inspected without altering historical log blobs. Subsequent exact field sets, strict types and unique row checks cannot see discarded object members. There is no cryptographic signature verifier in this scoped change; source integrity uses pinned Git OIDs and SHA-256. The probes demonstrate contradictory declaration acceptance while preserving actual authoritative source bytes.

All five `sourceManifest` fields falsely pass with an incorrect first member and correct last member. Both package rows also falsely pass for `alias`, `packageFile`, `sha256` and `bytes`; duplicated declared package name/version do likewise. Ten further probes show the same failure for source-binding/candidate schema versions, source-binding R6 SHA/OID, predecessor source-manifest SHA, predecessor output SHA/OID, candidate corrected-source SHA, and actual disposable installed `package.json` name/version. This is **25 false passes total: 15 target cases plus 10 additional cases**. Complete raw duplicate fragments and first/last values are preserved in `additional-probes/`, and reviewer scripts reproduce the primary mutations.

The assigned maker should reject repeated JSON member names at all nesting levels before validating receipt fields, apply that policy consistently to JSON entry points, and add raw-byte CLI regressions for both contradictory and same-value duplicates. The reviewer has made no implementation edits. Coverage is finite; behavior for every untested key is not claimed.

## Independent checks and test limits

- **PASS:** positive uncached CLI with R7 output-manifest checking. It checks 29 R6 inputs (27 Git-backed, 2 installed package files), 32 R5 predecessor outputs, and all 10 R7 outputs totaling 186,448 bytes. Historical original-receipt matches/mismatches are retained: R6 22/7 and R5 9/23; this audit does not adjudicate E-01.
- **PASS:** raw correction patch applies using `git -c core.autocrlf=false apply -p0` to exact R7 verifier bytes and reproduces exact R8 verifier SHA-256. Original R7 verifier SHA-256 is `bc8aaa4d97dcf6117c9fce9d319c3f96d9cbb94af453552ba3e224ea2ef7bb91`.
- **PASS:** reviewer executes all 51 maker negative cases in a disposable byte-exact copy: 51 rejected, zero failures. This verifies execution of the supplied suite. Its parsed-dict mutations cannot encode repeated raw JSON object members, and imported-function cases cache immutable Git evidence; the targeted uncached CLI case is separate. The maker suite alone does not establish independent edge coverage.
- **PASS:** reviewer-designed 76 wrong-type/container probes reject at the relevant sourceManifest and packageFiles schema paths. These call exact unmodified functions without the maker Git cache; they are distinct from CLI probes and do not prove every possible schema type combination.
- **FAIL:** reviewer-designed 33 separate uncached CLI processes yield one positive control, seven correct rejections, and 25 duplicate-member false passes. Main fixture contains exact installed `package.json` and both pinned build files; its positive control verifies fixture adequacy. The main positive/supplied suite uses a full exact installed-package copy.
- **PASS:** after every probe, all candidate 26 checkout files still match exact Git objects; the entire pre-existing installed Three package remains byte-for-byte unchanged; app Git tree is unchanged. Raw preservation inventories are included. Scratch mutations are confined to the assigned root.

The first disposable positive attempt lacked explicit private Git context and failed to resolve the predecessor path set; its raw output is retained in `logs/initial-disposable-git-context-failure.stdout.log`. Corrected reviewer setup binds `GIT_DIR` to the isolated candidate Git directory and `GIT_WORK_TREE` to each disposable root; no candidate code was changed. Successful commands, timestamps, stdout/stderr hashes and exits are in `commands.json`, individual case receipts and `rerun-maker-logs/`. Actual tool versions are in `tool-versions.json` (Python 3.12.10, Git 2.55.0.windows.5, PowerShell 5.1.26100.9549); Node/pnpm were not invoked.

## Complete uncached CLI case inventory

`FAIL` in the last column means the expected fail-closed behavior was violated. Expected exit `0` is the exact positive control; every other case expects `1`.

| Case | Mutation | Expected exit | Actual exit/status | Audit result |
| --- | --- | --- | --- | --- |
{table}

Each entry has exact executable arguments, private Git environment, unchanged verifier SHA-256, mutated receipt hashes, command times, raw stdout/stderr and exit in `case-inventory.json` and its linked case receipt. Additional cases preserve exact first/last values and complete raw duplicate-containing object bytes. The 76 schema probes and 51 maker negatives have separate complete per-case inventories.

## Separate gates and limitations

E-01, external GPT Plus #2, application/runtime/build/browser/physical device/provider checks, Parent acceptance, canonical integration, deployment and G7 are **NOT RUN** by this audit and remain separate. No overall project acceptance is claimed. The recommendation is **REWORK for E-02 only**. The correction must be implemented by its allocated maker and then independently re-audited against a new exact candidate.
'''
(OUT/'report.md').write_text(report,encoding='utf-8')
write('audit-command-index.json',dict(coreCommands='commands.json',CLICommands='case-inventory.json',schemaProbeCommand=[sys.executable,'-B',str(OUT/'scripts/probes.py')],additionalProbeCommand=[sys.executable,'-B',str(OUT/'scripts/additional_duplicate_probes.py')],assemblyCommand=[sys.executable,'-B',str(OUT/'scripts/assemble_report.py')],schemaProbeExit=0,additionalProbeExit=0,assemblyAssertions='All final preservation/count assertions passed; evidence hash manifest excludes only itself and ignored scratch.'))

files=[p for p in sorted(OUT.rglob('*')) if p.is_file() and not any(x in {'.work','__pycache__'} for x in p.relative_to(OUT).parts) and p.name!='output-hashes.json']
rows=[dict(path=p.relative_to(OUT).as_posix(),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in files]
write('output-hashes.json',dict(schemaVersion=1,scope='FINISH-29 independent E-02 audit',candidateCommit=CANDIDATE,recommendation='REWORK',selfExcluded=['output-hashes.json'],ignoredScratch=['.work/','__pycache__/'],outputCount=len(rows),outputBytes=sum(r['bytes'] for r in rows),outputs=rows))
print(json.dumps(dict(recommendation='REWORK',falsePassCount=25,outputCount=len(rows),outputBytes=sum(r['bytes'] for r in rows),outputManifestSHA256=sha((OUT/'output-hashes.json').read_bytes()),finalPreservation='PASS')))
