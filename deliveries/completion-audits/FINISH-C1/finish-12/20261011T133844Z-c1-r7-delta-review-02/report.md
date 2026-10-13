# FINISH-26 independent C1-R7 delta audit

Date: 2026-10-11 UTC. Reviewer: local Codex independent reviewer, not external GPT Plus #2. Recommendation to Parent: **REWORK for E-02, bounded verifier coverage**. Parent acceptance and E-01 adjudication remain pending.

The exact candidate receipts are correct. The independent audit reproduced all ten R7 output rows, all 29 R6 input receipts, all 32 R5 predecessor rows, the separate predecessor manifest, installed Three.js evidence, and the one-byte diagnostic explanation. The original verifier returns PASS and exit 0 on this exact candidate. Disposable negative tests reveal that it also returns PASS when some duplicated manifest/package receipt declarations contradict the authoritative values. That violates the requested fail-closed coverage; no application or runtime defect is inferred.

## Exact identity and preservation

Candidate delivery commit: `e2670d4152c461005da86b392dbcea12cec740bf`; full Git tree: `419950200cc9705a101468d44e5b589b40f609f0`; parent: `1058676cb74d8239aae7fed3dfa91defcc8a30a1`; app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`. Its diff adds exactly eleven stable files under `deliveries/FINISH-C1-R7/`, including the output manifest. The ten manifest rows total 186,448 bytes and all match raw blobs at the exact candidate. Every candidate working file also matched its raw pinned Git bytes before execution. `evidence/candidate-binding.json` records all paths, blob OIDs, hashes, sizes, and the observed descendant HEAD; the candidate was never substituted with that later HEAD.

The newly assigned finish-12 reviewer root was absent immediately before creation. Reviewer writes and scratch are confined to this root. The occupied FINISH-23 root was not opened, read, copied, or used. No prior candidate/audit, canonical app, Git index, or production dependency file was edited. No commit, push, integration, or acceptance was performed. The original R5/R6 manifest objects are bound independently and the candidate diff changes neither manifest nor application/history paths.

## Independent receipt results

| Requirement | Outcome | Evidence |
| --- | --- | --- |
| Exact candidate identity, only eleven R7 additions, unchanged app tree | PASS | `evidence/candidate-binding.json`, `evidence/commands.log` |
| R7 output manifest: ten raw committed rows, 186,448 bytes | PASS | `evidence/candidate-binding.json` |
| R6 inputs: 19 direct Git rows, eight exact mapped Git rows | PASS, 27/27 raw Git receipts | `evidence/r6-independent-receipts.json` |
| Remaining two R6 inputs: installed Three.js files, explicitly non-Git | PASS, 2/2 | `evidence/three-installed-package.json` |
| R5 predecessor rows and separate original manifest | PASS, 32/32 | `evidence/r5-independent-receipts.json` |
| One added CR at offset 2872 explains historical diagnostic receipt | PASS | `evidence/one-byte-proof.json` |
| Original unmodified candidate verifier positive rerun | PASS, exit 0 | `evidence/verifier-rerun.log`, `evidence/verifier-rerun.json` |
| Fail-closed negative coverage across receipt fields | FAIL, E-02 | `evidence/negative-probes.json`, `evidence/package-negative-probes.json`, `evidence/cli-negative-false-pass.log` |
| Maker report, requirement matrix, binding, log and structured result agree with exact candidate values | PASS | `evidence/agreement-and-preservation.json` |

The original R6 receipt has 22/29 matches and seven historical mismatches; six match the declared historical values under an explicitly diagnostic LF-to-CRLF conversion. The remaining diagnostic blob is 2,873 bytes, SHA-256 `d952aef28ae996208471a13b5dc3aafe2a12e85a219a677463d06691cf03663a`. Inserting exactly one CR at offset 2872 reproduces the original 2,874-byte SHA-256 `f19932723c3644d4cc25b65d919317bc28e89520c3c47c926b49e08d2fd22235`; the pinned FINISH-16 log independently records that result. Corrected receipts always use raw blobs, not those diagnostic conversions.

The R5 historical manifest has 9/32 raw matches and 23 documentation/evidence mismatches; each mismatching row reproduces the historic declared hash/size with diagnostic LF-to-CRLF conversion. Its separate raw manifest is 6,147 bytes, SHA-256 `0825971fdb19d2bd04aee8d250fe0bb58ff93857792365d432778df9ad1ccaf2`. The correction preserves the original expected values and separately states every corrected blob OID/hash/size.

The installed dependency is `three@0.180.0`. `three.module.js` is 603,113 bytes / SHA-256 `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a`; `three.core.js` is 1,403,455 bytes / SHA-256 `eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20`. The audit verified the installed package name/version, both raw files, R6 package manifest, exact lock blob/integrity string, source-build lock identity and pnpm version, and pinned successful `pnpm install --offline --frozen-lockfile` receipt. It fetched no replacement registry/package bytes. The original install was inspected as inherited evidence; a new installation was NOT RUN.

## E-02: verifier ignores contradictory duplicated receipt fields

Severity: P2, evidence verifier contract. Status: CONFIRMED.

At candidate `verify-input-provenance.py:332`, `candidate-input-provenance.json.sourceManifest` is checked only for `blobOid`. Its `commit`, `path`, `sha256`, and `bytes` are not validated. Independent disposable mutations of those four fields returned PASS. A separate mutation of `source-binding.json.threeDependencyEvidence.packageFiles[0].sha256` also returned PASS because that duplicated list is not validated. In the real candidate all these fields are correct; the auditor verified them against raw Git/installed bytes independently.

The strongest reproduction uses the exact unmodified verifier CLI main, real Git subprocesses without caching, and a disposable receipt copy whose `sourceManifest.sha256` is 64 zeros. It returns JSON status PASS and exit 0 even with the output-manifest check enabled. The output check binds the raw Git candidate package; this probe specifically establishes that the working receipt's contradictory metadata is ignored. The probe does not claim the modified scratch receipt was committed as the candidate.

Thirty of 36 negative checks correctly reject invalid inputs. Five distinct ignored metadata changes account for the remaining six failures, because the zero-hash case was repeated through the CLI. Corrected primary hashes, paths, commits, counts, duplicate aliases/paths, missing files, unpinned commits, lock integrity, and wrong installed package name/version/bytes are rejected. The finding does not demonstrate bypass of the protected primary corrected Git/installed bytes.

Recommendation: issue an evidence-only maker correction that validates every authoritative field of the candidate input manifest receipt and the duplicated installed-package declarations, then return a fresh exact package for independent review. No runtime or historical-file edit is indicated. The auditor has not implemented that correction or closed E-01. The complete raw receipt reconstruction supports Parent's evaluation of E-01 separately, while the explicit verifier requirement fails here.

## Execution and limits

The stable scripts reproduce the evidence: run `python -B audit-recompute.py`, then `python -B audit-package-negatives.py`, then `python -B audit-cli-negative.py` from this root. They write only this audit's stable evidence and disposable `.work/` files. The original candidate positive command and raw stdout/stderr/exit are preserved in `evidence/verifier-rerun.log`. Git command arguments, working directory, UTC observations, stdout/exit/stderr and raw binary blob hash/size receipts are in `evidence/commands.json` and `evidence/commands.log`. Tool versions are Python 3.12.10 and Git 2.55.0.windows.5. The probe helpers preserve exact candidate verifier bytes and route disposable input directories explicitly; immutable Git-object results are cached only for the multi-case imported-module probes. The CLI confirmation has no cache.

The first independent harness attempt stopped at an auditor assertion because the maker structured result is wrapped under `result`; the audit harness was corrected to compare that nested result and rerun. This was not a candidate failure. The later final raw reconstruction and all negative checks completed; records are in `evidence/execution-receipt.json`.

Application/runtime/unit/integration/build/browser checks are inherited from FINISH-16 and **NOT RUN by this evidence-only delta audit**. Its earlier source/behavior PASS advice is not promoted to acceptance. Historical R5 red invocation, external GPT Plus #2, Parent acceptance, provider/CDN, physical/manual-device, accessibility/assistive-technology, deployment and G7 remain NOT RUN or pending. Installed package negative checks use copied files, never production dependencies. No visible or runtime claim is inferred from those receipt checks.

## Returned artifacts

All requested stable artifacts are returned: `report.md`, `findings.json`, `requirement-matrix.json`, `evidence/candidate-binding.json`, raw commands/exits/tool versions, independently recomputed receipts, positive rerun, negative reproductions and `output-hashes.json`. None is missing. The output manifest lists every stable reviewer file except itself and `.work/`; `.gitattributes` sets LF for authored text and preserves raw `.log` bytes, and `.gitignore` excludes scratch. Parent must independently verify the stable hashes and publish/adjudicate the package.
