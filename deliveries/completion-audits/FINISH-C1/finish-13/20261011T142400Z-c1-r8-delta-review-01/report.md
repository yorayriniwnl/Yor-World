# FINISH-29 independent C1-R8 delta audit

## Recommendation: REWORK for E-02

Exact candidate `364d8ff690d3dc814a09406873433d9cb397b574` fails the required fail-closed handling of contradictory receipt metadata. **One blocking finding, FIN29-E02-01:** ordinary JSON parsing discards earlier duplicate object members; later authoritative values make contradictory raw receipts return `PASS`, exit `0`. This local cross-lane reviewer did not author C1-R8 and has made no candidate corrections. External GPT Plus #2 remains **NOT RUN**; Parent acceptance is pending.

## Exact candidate and admitted scope

| Identity | Independently recomputed value |
| --- | --- |
| Candidate | `364d8ff690d3dc814a09406873433d9cb397b574` |
| Parent | `b33631a9bcbd74cfca9e8f2495140a5eee322a9a` |
| Full tree | `a29a29f7027f5d72e496c58f327d2e03058d2ad1` |
| R8 subtree | `b3b98efa08045f520a00abf4569145ffa3ba3ee7` |
| App tree | `42ea29ec235225046a75959eb19eb386ac2f821d` |
| Corrected verifier SHA-256 | `4ba2f9eb3538bd61a6e82d4ef0958bfa96aad6ce3e50921f8323e3a1e7d114e2` |
| Output manifest SHA-256 | `0f1a4fd53ca549f35b724fb548272d7b2bd068d0f8f7d41467d5a1d6dd8e1e97` |

All 26 changed paths are additions under `deliveries/FINISH-C1-R8/`; all 25 stable manifest rows match raw Git bytes, totaling 237,622 bytes. The three input receipt files match exact R7 commit `e2670d4152c461005da86b392dbcea12cec740bf` byte-for-byte. See `candidate-binding.json` for every raw blob OID, length and SHA-256. The FINISH-29 and FINISH-28 authority packet hashes are in `audit-authority-inputs.json`.

The assigned audit destination was absent before creation in a fresh isolated candidate worktree. Only this audit root and its ignored `.work/` scratch were written. The separate C1-R8 lineage, occupied canonical candidate path, and unrelated audit collision roots were not inspected or modified.

## Blocking reproduction and exact ordering

In a disposable copy of exact `candidate-input-provenance.json`, replace only its `sourceManifest` object with these raw bytes:

```json
{"sha256":"0000000000000000000000000000000000000000000000000000000000000000","commit":"9188b413d37da0ec3381b5430e25dc375a45bb18","path":"deliveries/FINISH-C1-R6/input-hashes.json","blobOid":"45180bef8d5170c52bad992733c0e6306816ac38","sha256":"5ae6775351c82c861b4748a25421ac5e67afcfc331b01aab1a64ef26543295de","bytes":48257}
```

The first `sha256` is 64 zeroes. The second is the authoritative raw R6 manifest SHA-256 `5ae6775351c82c861b4748a25421ac5e67afcfc331b01aab1a64ef26543295de`. Every other receipt field, the verifier and the installed build files stay unchanged. Run the unchanged verifier with the recorded private `GIT_DIR`/`GIT_WORK_TREE` environment:

```text
python -B <disposable-root>/deliveries/FINISH-C1-R8/verify-input-provenance.py --json --check-output-manifest --commit e2670d4152c461005da86b392dbcea12cec740bf
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
| primary-001 | exact independent positive control | 0 | 0 / PASS | PASS |
| primary-002 | former sourceManifest commit false-pass control | 1 | 1 / FAIL | PASS |
| primary-003 | duplicate contradictory sourceManifest commit wrong then correct | 1 | 0 / PASS | FAIL |
| primary-004 | former sourceManifest path false-pass control | 1 | 1 / FAIL | PASS |
| primary-005 | duplicate contradictory sourceManifest path wrong then correct | 1 | 0 / PASS | FAIL |
| primary-006 | former sourceManifest blobOid false-pass control | 1 | 1 / FAIL | PASS |
| primary-007 | duplicate contradictory sourceManifest blobOid wrong then correct | 1 | 0 / PASS | FAIL |
| primary-008 | former sourceManifest sha256 false-pass control | 1 | 1 / FAIL | PASS |
| primary-009 | duplicate contradictory sourceManifest sha256 wrong then correct | 1 | 0 / PASS | FAIL |
| primary-010 | former sourceManifest bytes false-pass control | 1 | 1 / FAIL | PASS |
| primary-011 | duplicate contradictory sourceManifest bytes wrong then correct | 1 | 0 / PASS | FAIL |
| primary-012 | duplicate sourceManifest sha256 correct then wrong order control | 1 | 1 / FAIL | PASS |
| primary-013 | former duplicated installed-Three SHA false-pass control | 1 | 1 / FAIL | PASS |
| primary-014 | duplicate packageFiles row 0 alias wrong then correct | 1 | 0 / PASS | FAIL |
| primary-015 | duplicate packageFiles row 0 packageFile wrong then correct | 1 | 0 / PASS | FAIL |
| primary-016 | duplicate packageFiles row 0 sha256 wrong then correct | 1 | 0 / PASS | FAIL |
| primary-017 | duplicate packageFiles row 0 bytes wrong then correct | 1 | 0 / PASS | FAIL |
| primary-018 | duplicate packageFiles row 1 alias wrong then correct | 1 | 0 / PASS | FAIL |
| primary-019 | duplicate packageFiles row 1 packageFile wrong then correct | 1 | 0 / PASS | FAIL |
| primary-020 | duplicate packageFiles row 1 sha256 wrong then correct | 1 | 0 / PASS | FAIL |
| primary-021 | duplicate packageFiles row 1 bytes wrong then correct | 1 | 0 / PASS | FAIL |
| primary-022 | duplicate installed identity packageName wrong then correct | 1 | 0 / PASS | FAIL |
| primary-023 | duplicate installed identity packageVersion wrong then correct | 1 | 0 / PASS | FAIL |
| additional-001 | source-binding schemaVersion | 1 | 0 / PASS | FAIL |
| additional-002 | candidate schemaVersion | 1 | 0 / PASS | FAIL |
| additional-003 | source-binding r6InputManifest sha256 | 1 | 0 / PASS | FAIL |
| additional-004 | source-binding r6InputManifest blobOid | 1 | 0 / PASS | FAIL |
| additional-005 | predecessor sourceManifest sha256 | 1 | 0 / PASS | FAIL |
| additional-006 | predecessor output sha256 | 1 | 0 / PASS | FAIL |
| additional-007 | predecessor output blobOid | 1 | 0 / PASS | FAIL |
| additional-008 | candidate corrected Git sha256 | 1 | 0 / PASS | FAIL |
| additional-009 | installed package.json name | 1 | 0 / PASS | FAIL |
| additional-010 | installed package.json version | 1 | 0 / PASS | FAIL |

Each entry has exact executable arguments, private Git environment, unchanged verifier SHA-256, mutated receipt hashes, command times, raw stdout/stderr and exit in `case-inventory.json` and its linked case receipt. Additional cases preserve exact first/last values and complete raw duplicate-containing object bytes. The 76 schema probes and 51 maker negatives have separate complete per-case inventories.

## Separate gates and limitations

E-01, external GPT Plus #2, application/runtime/build/browser/physical device/provider checks, Parent acceptance, canonical integration, deployment and G7 are **NOT RUN** by this audit and remain separate. No overall project acceptance is claimed. The recommendation is **REWORK for E-02 only**. The correction must be implemented by its allocated maker and then independently re-audited against a new exact candidate.
