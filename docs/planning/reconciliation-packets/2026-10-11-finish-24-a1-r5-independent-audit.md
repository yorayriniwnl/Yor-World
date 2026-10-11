# FINISH-24 — A1-R5 exact-candidate independent audit

Date: 2026-10-11 UTC  
Status: Parent-authorized local read-only independent audit. External GPT Plus #2 review and Parent implementation acceptance remain pending.

## Candidate binding

- Candidate delivery commit: `8f3aa566f36c92bb98658090ef91f9bfa96e8a79`.
- Candidate full Git tree: `4b0f51f7462af578422cca05c3e30c9bfc0b4c8f`.
- Candidate parent: `29400979676c1005e18cead5d1457924a2394963`.
- Candidate `app/` tree: `cb42202d3be7f4f10c460d2e1b43db853910b87f`.
- Immutable base commit: `f62a43c5e71c00dcb89e28275ea81d842167db80`; base `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Delivery root: `deliveries/FINISH-A1/r5-05/`; 88 committed files, all within that root. `output-hashes.json` covers 87 files and has SHA-256 `a54f2796bd8cee902b4b0f70266545d4130698914bede71fedd00b85f19f24f1`.
- Source patch SHA-256: `945bee3ccf793d56f6ffc2319cf3d6ede52a9f8bec665ac3d568272f1a179b41`; candidate app tree as reported by the maker is `cb42202d3be7f4f10c460d2e1b43db853910b87f`.
- Governing inputs include FINISH-04, FINISH-10, FINISH-12, FINISH-14 and FINISH-22; the FINISH-00-R2 accepted design ruling/output manifest; frozen A1 ownership table; A1-R4 intake/audit/Parent decision; and the maker packet and return.
- Exclusive audit root: `deliveries/completion-audits/FINISH-A1/finish-06/20261011T132805Z-a1-r5-independent-review-01/`. It was absent at allocation. Recheck immediately before creating it. If occupied, preserve it and report exact inventory for Parent reallocation.

## Reviewer boundaries

This is a local Codex independent review of the exact pushed candidate. The reviewer must not modify the candidate, source worktree, prior A1 roots, FINISH-22, accepted contracts, or canonical `app/`; must not fix defects, accept the candidate, integrate it, or commit/push the review. Write reviewer-authored files only under the exclusive audit root; keep disposable scratch under its `.work/`. Parent will inspect and separately publish the report. State explicitly that external GPT Plus #2 review is NOT RUN.

Preserve `r5/`, `r5-02/`, `r5-03/`, and `r5-04/` unchanged. Do not use them or `C:\\yw-r5b\\app` as candidate source or evidence. Do not infer historical writer attribution from names, timestamps, or commit metadata.

## Required review

1. Bind exact candidate and parent commits, full tree, `app/` tree, 88 committed paths, all source paths, patch, and output manifest. Verify the pushed remote points to this exact commit. Recompute all 87 output-hash rows from raw file bytes and confirm the standalone matrix, input hashes, report, logs, screenshots, and browser binding are present and internally consistent.
2. Independently inspect the input ledger against raw files, including FINISH-00-R2's accepted output manifest SHA-256 `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`. Validate the patch as strict UTF-8 without BOM/NUL, exact canonical `app/` paths, base applicability, whitespace, changed-path set, and byte-for-byte equality of all replacements. The frozen A1 allowlist has 26 paths; the candidate should change only the necessary subset. Confirm `published-media.test.ts`, content contract, dependencies, SQL/migrations, auth helper, public pages, other lanes, and canonical `app/` remain unchanged.
3. Inspect the review hash preimage and tests: full publishable project documents, code-point project ordering, recursive object-key canonicalization, preserved document/section/block array order, complete reviewed media vector, A1 `site=null`, and no revision-vector substitution. Reproduce body/order/key-order sensitivity assertions; verify CandidateX remains private and nonpublishable.
4. Inspect private media reading for rejection of an oversized declared length before read; bounded streaming accumulation at 5 MiB; cancellation on overflow and stream error; EOF declared-length verification; 10-second deadline spanning signed-URL creation and byte streaming; URL secrecy; and binding of database metadata, approval audit, bytes, type, dimensions, size, and hash. Check the FINISH-10 malformed DTO probes and positive cases: complete frozen draft parse, ID/content agreement, unique projects, safe integer revisions, timestamp/actor validity, sorted unique identity vectors, known checks, coherent check semantics and `canPublish`.
5. Review PGlite/mocked Storage/auth cases for stale review and metadata/approval-audit mutations, no partial writes, ordered locks, revision handling, save validation, media proxy denial/header branches, rollback, and selected public/private isolation. Keep local embedded/mock results distinct from native PostgreSQL/Auth/Storage and multi-process races.
6. Inspect the actual Chromium test and result JSON. Confirm it selects the explicitly synthetic PNG through the real picker, saves and reopens the draft, and renders bytes through the guarded private preview route. Bind 6/6 test results, raw browser log, exact final build ID/manifest, screenshots and tool versions to this candidate. Do not describe the test asset as provider-approved.
7. Recompute the build manifest against the available exact candidate build output when that output is available. If not available to the reviewer, record that independent byte-level build check as NOT RUN and distinguish the maker's manifest from reviewer execution. Review the static sentinel scan and its limited local scope.
8. Independently review each FINISH-04/A1, A3-01 through A3-06, and FINISH-12 row in `requirement-matrix.json`. Report unsupported PASS claims, gaps, contradictory artifacts, malformed hashes, bad paths, or unsupported scope. Reconcile every concern to exact evidence. Native providers, deployment/CDN, devices, recovery, manual operations, independent external review, Parent acceptance and G7 stay NOT RUN unless separately proven.

Return `report.md`, `findings.json`, `requirement-matrix.json`, exact candidate binding, raw commands/exits/tool versions, and an output-hash manifest for all stable reviewer files except that manifest and `.work/`. Use only PASS/FAIL/NOT RUN and state each scope limit. Recommend PASS or REWORK; Parent alone adjudicates acceptance and any next maker allocation.


