# FINISH-16 independent local audit — C1-R6

Date: 2026-10-11
Reviewer: local Codex reviewer; this is not the designated external GPT Plus #2 audit.
Candidate: 9188b413d37da0ec3381b5430e25dc375a45bb18
Recommendation to Parent: REWORK for evidence-hash consistency. Parent retains acceptance authority.

## Result

The C1-R6 source correction and runtime behaviors passed the independent replay, tests, production build, and source-bound Chromium checks. I found no additional R6 source-contract defect. The package has one confirmed evidence-integrity failure: declared predecessor/input hashes do not match the exact committed blobs. Most differences are line-ending conversions and the remaining test-file difference is one inserted carriage-return byte, so this does not establish a semantic or production-source mismatch. The raw-hash evidence still needs to be reconciled before Parent acceptance.

## Candidate binding and scope

The audited candidate commit is 9188b413d37da0ec3381b5430e25dc375a45bb18; its package tree is aaaef9759b66e4f680d5ab9306775a44e596e12f and its application tree matches the required base tree 42ea29ec235225046a75959eb19eb386ac2f821d. The base is f62a43c5e71c00dcb89e28275ea81d842167db80. I verified the R3 patch SHA-256 e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d, R5 patch SHA-256 d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d, and R6 patch SHA-256 17ae6aaab7910546d3527feec26926d8d1fd604e3bc60e2ae0eb9f549f7fc2a6.

A detached workspace under this audit root replayed base → R3 → R5 → R6. All patches applied; R6 applied with --check --whitespace=error. The final application change set is exactly the 28-path union of those patches, and the two R6 changes are limited to AssetLoader.ts and completion-essential-loader.test.ts. The final git diff --check passed. The R6 replacement files compare byte-for-byte with the sequential assembly. The candidate output manifest itself is SHA-256 a8dcd6700b2471b3a2d0d98d71a79ce398a33efcea5a1c48fc83d291cdeeb798 and all 35 declared package outputs match (1,415,587 total bytes).

The disputed FINISH-11 audit report, findings, matrix, receipts, and source-build identity were not inspected, copied, or relied upon. Only this fresh FINISH-16 root contains my new stable audit outputs; .work/ is scratch and excluded from the output hash manifest. I did not modify the candidate, canonical application, or prior audit roots.

## Finding E-01 — declared input hashes do not match committed bytes

Severity: P2 — evidence integrity / reproducibility. Status: FAIL.

The R6 input-hashes.json is itself byte-verified, but its declared inputs are only 22/29 raw-byte exact. Six mismatches become exact after LF→CRLF normalization. The seventh is the FINISH-08 retry-aggregation diagnostic test: its committed blob is 2,873 bytes, while the expected input is 2,874 bytes; a byte-level search confirms exactly one additional CR (0x0d) at offset 2,872. This one difference is not fixed by ordinary LF→CRLF normalization.

The R5 predecessor output manifest is also not raw-byte exact: expected SHA-256 6b758754ca70e4cf43451abc2a2f40b7e4fee801737e2100656ca161dde34e4d / 6,303 bytes, versus committed blob SHA-256 0825971fdb19d2bd04aee8d250fe0bb58ff93857792365d432778df9ad1ccaf2 / 6,147 bytes. Its 23/32 nonmatching outputs are all documentation/evidence; the six source replacements are exact. Every one of the 23 output files and the predecessor manifest becomes the declared byte count/hash after LF→CRLF normalization.

The package also records app/pnpm-lock.yaml as 158,580 bytes / hash f1637cfe2800e9065fdbc4d2975e8180865ff52775c8213473e2d888c2a8a38d in its input manifest, while its source-build identity records the committed LF blob at 153,898 bytes / hash 8034f04afa8cbdb28fa028ed574117177dfa8a4903c95775ea41405bcabea791. These are two different representations of the same file inside the evidence package.

This prevents exact raw-byte authentication of the inherited R5 evidence from the candidate receipts alone. It does not show an application-source discrepancy: R3’s 53 outputs, all six R5 source replacements, both R6 replacements, the R6 patch, and the full R6 output manifest were byte-verified. Independent tests/build/browser checks were run on the replayed assembly. The raw discrepancy transcript is evidence/logs/fin16-local-20261011-0625-input-eol-analysis.log; the single-byte proof is evidence/logs/fin16-local-20261011-0640-single-byte-diff.log, with explicit-command reruns in evidence/logs/fin16-local-20261011-0710-input-eol-verification-rerun.log and evidence/logs/fin16-local-20261011-0711-single-byte-verification-rerun.log.

Recommendation: re-emit or explicitly canonicalize the inherited input/output hash receipts against committed Git blobs and rerun the receipt verifier. No source fix is indicated by this finding.

## Source and behavior review

### Retry aggregate and representation trust — PASS

The runtime contract defines determinate bytes over the current attempts for the three required assets, excludes previous failed-attempt bytes, and requires validated positive identity representation lengths plus matching EOF byte counts. The R6 code resets per-attempt invalidity and byte/trust state when retry replaces that attempt; aggregate validity is computed from current entries. Unknown or malformed current representations stay indeterminate.

Independent red/green used the exact R6 regression against the R3+R5 pre-R6 assembly. Before R6, the test failed because final progress was indeterminate despite three parsed assets; after applying the exact R6 patch, the same assertion passed at exactly 12/12. Both runs executed one selected test with 17 skipped. The focused suite also retained unknown/missing encoding, compressed representation, chunked transfer, contradictory lengths, short/long EOF, and final-required-file EOF mismatch cases; those remain indeterminate.

### Required-load UI — PASS

The independent source-bound Chromium run drove the actual production UI and loader through a gzip room response that failed parsing, then an identity retry and two identity required assets. Final diagnostics were determinate at exactly 1,758,012 / 1,758,012 bytes from the three successful current GLBs; the failed four-byte body was excluded. Browser request order, observations, and visual capture are in evidence/browser-rerun/ and evidence/screenshots/compressed-attempt-retry-ui.png. Build ID was 4nRSPdeMK4UVYFeP4JD5W (BUILD_ID SHA-256 bf3c18318ad80b1b43b9f81487d6dfadd5d88325f064564a36fdcebc13f1ed5d); AssetLoader source SHA-256 was 68aab18db327e254736b4bbab896f8003ad504c5c2edb4ba90927be47c784045.

### Optional-map atomic rollback — PASS, bounded fault caveat

The browser harness executed the actual RuntimeMaterialQuality and LowQualityBatch modules with the installed Three.js build and real scene/material/texture objects. A controlled setter exception on the second target caused rollback after the first target had been modified. The observation confirms snapshot-equivalent target state, visible-state restoration, unchanged unrelated shared user, preserved original/low-tier maps, restored high-tier state and registries, one disposal each for generated derivative material/texture, and zero disposal for original/shared/incoming textures.

The injected second-target setter throws before changing that second target; this verifies rollback across the failure boundary after the first mutation, but does not model a custom setter that mutates its own value and then throws. No production defect was observed. The observation records exact source and Three.js module hashes.

### WorldRuntime greeting timers and disposal — PASS

The source-bound browser case executed the actual WorldRuntime. A second greeting replaced the first timer; invoking the captured old callback did not terminate the replacement transition. SPA route unmount synchronously cleared the outstanding timer in dispose; invoking its captured callback after disposal was safely rejected. The run captured timer IDs, clear calls, page errors, source SHA-256 089b84800f46f493335082f078d10444470c1e3ed0f02575ea63c1fcec84d515, and screenshot evidence/screenshots/greeting-transition.png.

## Independent verification

All commands below ran in the detached sequential assembly, except the candidate hash verification and hash-analysis scripts, which read pinned Git blobs. Raw logs record UTC/local times and exit codes.

| Check | Result | Evidence |
| --- | --- | --- |
| Candidate manifest and replacement verification | Package manifest 35/35 exact; hash verifier exits 1 only because inherited raw input/predecessor hashes differ | evidence/candidate-hash-receipt.json, evidence/logs/fin16-local-20261011-0615-candidate-hashes-rerun3.log |
| Base → R3 → R5 → R6 replay and exact path union | PASS; clean apply, whitespace check, exact 28-path union | evidence/logs/fin16-local-20261011-0615-sequential-replay.log |
| Frozen-lockfile install | PASS, exit 0 | evidence/logs/fin16-local-20261011-0615-install.log |
| Focused R6 loader suite | PASS, 18 tests / 1 file | evidence/logs/fin16-local-20261011-0626-focused-r6-test.log |
| All changed source/test paths | PASS, 63 tests / 4 files | evidence/logs/fin16-local-20261011-0705-full-changed-path-suite.log |
| Full unit suite | PASS, 356 tests / 26 files | evidence/logs/fin16-local-20261011-0628-full-unit.log |
| Integration suite | PASS, 290 tests / 28 files | evidence/logs/fin16-local-20261011-0629-integration.log |
| Lint / typecheck / production build | PASS / PASS / PASS; independent build ID 4nRSPdeMK4UVYFeP4JD5W | evidence/logs/fin16-local-20261011-0630-lint.log, evidence/logs/fin16-local-20261011-0631-typecheck.log, evidence/logs/fin16-local-20261011-0632-production-build.log |
| Source-bound production Chromium paths | PASS, 3/3 on Chromium 153.0.8010.12 | evidence/logs/fin16-local-20261011-0634-production-browser.log, evidence/browser-rerun/browser-results.json |
| Independent pre-R6 red / post-R6 green | PASS expected-red then PASS green; exact assertion and commands in logs | evidence/logs/fin16-local-20261011-0650-independent-pre-r6-red.log, evidence/logs/fin16-local-20261011-0653-independent-post-r6-green.log |
| Historical R5 red invocation | NOT RUN; preserved per packet | R6 maker receipt records this historical gap; no rewrite performed |

Tool versions: Git 2.55.0.windows.5; Node v24.19.0; pnpm 9.15.9; Python 3.12.10; Vitest 5.0.2; ESLint 9.39.5; TypeScript 6.0.3; Next.js 16.3.8; Playwright 1.63.0; Chromium 153.0.8010.12.

## Open gates and limits

- This report is a local Codex review, not GPT Plus #2. Parent acceptance remains open.
- Historical R5 red invocation remains NOT RUN because its command was not retained and the packet prohibits rewriting R5.
- Provider/CDN, deployment, physical/manual-device, accessibility/assistive-technology, and G7 acceptance were NOT RUN and are not implied by local checks.
- Optional-map rollback was tested at the second-target assignment exception boundary described above.
- No source-contract defect beyond the addressed retry aggregate issue was reproduced.

