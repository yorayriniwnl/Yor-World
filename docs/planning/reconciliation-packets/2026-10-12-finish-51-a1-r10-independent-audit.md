# FINISH-51 — A1-R10 exact-candidate independent audit

Date: 2026-10-12 UTC. Status: **GPT Plus #2 handoff prepared; not dispatched.** The Parent-local raw-Git and browser-evidence recheck recommends PASS for the FINISH-49 evidence correction only. This packet requests independent verification; it does not accept A1 or authorize integration.

## Exact candidate and evidence

- Candidate branch: `codex/finish-49-a1-r8b-r10-provenance-correction-20261012`.
- Exact R10 commit/tree: `7a201eef928c5b42897a33333f9ff5694645560b` / `c4385c60932c778af06e36dc0c1314a88c5044a7`.
- Exact R10 parent: R8B `f5978b91ea981d740ab0ba42b46368175f045cf8`, tree `278bd3a724d3af78a2eb685e60a10acb1b14c701`.
- R10 delivery root/subtree: `deliveries/FINISH-A1-R10/` / `6abc893f820877aa3cee3d4d9fe6317f4708dfb5`.
- R10 output-manifest SHA-256: `9016bd5f442da116bf4921fe9c0ab9be85eb439e20cdd2bc3667ad3dd098d72b`; 40 rows / 932,350 payload bytes.
- Exact source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; frozen root `app/` tree `42ea29ec235225046a75959eb19eb386ac2f821d`.
- R8 source patch: 238,701 bytes, SHA-256 `6241ab27996cea9518d0d202e6cf3c9a362c63e283a91e2180158814e871f061`; R10 replay tree `5dc26a201e715ca15757ae661639589948ab4800`, patched app tree `0fdc8972f303cd5304f812f89ece493fef170ea1`.
- R8 commit `e377e06c514819ee6dbd82da2216c95813bedd2f`; R9 evidence candidate `a2f0e218f8153ceec311616f49b7b654c9892bb2` is preserved. The R10 branch was read back from GitHub at the exact R10 commit on 2026-10-12.
- R8B adds two review files as newly committed `PARENT-LOCAL-COPY` bytes: `findings.json` 8,980 bytes, SHA-256 `bcb50fae65b6e51fddb561c0a60c7ca0941ef155aed2fb97373892f1ca3e4f9a`; `report.md` 10,043 bytes, SHA-256 `cd5930619153ae1fec6b71ac821fdbd92aa2fa5647a24b3805e62dc6f28ea586`. The original R8 history has no Git blobs at those paths. Do not imply original R8 provenance.
- The candidate root `app/` remains the frozen tree above. Only `deliveries/FINISH-A1-R10/` is added by the R10 commit.

Read `AGENTS.md`, `START_HERE.md`, the work-order hub, account operating model, `ALL-PROMPTS.md` P20, `common-execution.md`, accepted FINISH-00-R2, FINISH-32, FINISH-45, FINISH-48, FINISH-49, the A1-R10 maker prompt, the original review files recovered into R8B, and the candidate reports, matrices, raw receipts, source patch and manifests directly from the bound Git objects.

## Independent scope

Audit the A1 R10 package lineage and the FINISH-49/48 evidence correction. Independently bind branch, commit, parent, trees, complete changed-path inventory and every raw-Git output/input hash. Confirm all 15 R8 audit inputs are accounted for as 13 original R8 Git objects plus the two exact R8B copies; clearly separate historical local-copy origin from later Git storage. Recompute the 40 R10 manifest rows and check that no source, test, dependency, R8, R9 or historical review bytes changed.

Inspect the three FINISH-45 outcome claims against actual source, tests and matrix: absent private-draft page renders not-found, preview URL rejection includes the assigned noncanonical cases while retaining a valid canonical URL, and new evidence defaults remain blank/unknown. Verify R8 patch replay and R8/R9/R10 app-tree agreement. Independently assess the R10 build and both Chromium receipts, including the omitted-draft flag, normal fixture, browser/build identity, logs, captures, exact exits and two distinct fresh `YOR_TEST_DATABASE_PATH` values. A reproduced assertion that a defect exists is not a desired-behavior PASS. State that unit/integration/lint/typecheck receipts are inherited from R8 unless independently rerun; provider Auth/Storage, production DB, deployed origin, physical devices, assistive technology, recovery, integration and G7 remain NOT RUN absent new evidence.

The prepared exclusive audit root is `deliveries/completion-audits/FINISH-A1/finish-10/20261012T070831Z-a1-r10-independent-delta-review-01/`; it was absent when this handoff was issued. Recheck immediately before writing. If occupied, preserve it and report the collision for Parent reallocation.

Return `report.md`, `findings.json`, requirement matrix, candidate binding, input/output hash manifests, tool versions, commands/exits, raw diagnostics and evidence under that root. Recommend PASS or REWORK for the bounded R10 correction. Do not fix code/assets, edit maker evidence, accept A1, integrate, deploy, or claim G7. Parent makes the separate P23 decision. The Parent-local result and maker's PASS labels are context, not independent conclusions.
