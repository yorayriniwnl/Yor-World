# FINISH-19 — Parent reallocation: A1-R5 after candidate binding failures

Date: 2026-10-11 UTC  
Status: authorized A1-R5 maker candidate at a fresh root. Independent audit and separate Parent acceptance remain required.

## Reallocation decision

FINISH-17 assigned `deliveries/FINISH-A1/r5-03/` based on a claimed isolated candidate under `C:\yw-r5b\app`. The assigned A1 maker does not own or authenticate that checkout. Read-only inspection found the checkout at the pinned base but with staged deletions and staged/unstaged changes; its app diff is 25 paths and is not a clean, attributable source binding. The R5 maker also confirmed it had not copied from or authored that checkout.

The `r5-03/` root is now occupied by an incomplete, uncommitted package: 25 source replacements, a 25-path patch that omits the frozen table's `published-media.test.ts`, partial/red or empty logs, no report, hash manifests, standalone requirement matrix, or candidate commit. Its scratch replay tree also contains 22 unrelated C1/runtime edits. Preserve `r5-03/` and all of its scratch/evidence unchanged. Preserve `r5-02/`, `r5/`, all R4 material, and every prior audit unchanged. Do not use any of these candidates as source or as the stable return.

The fresh exclusive delivery root is `deliveries/FINISH-A1/r5-04/`. It was absent when this packet was issued. Recheck immediately before creating it; if occupied, stop and send Parent an exact read-only inventory for another reallocation. Do not edit or replace FINISH-12 through FINISH-18 or any occupied root.

## Exact source and requirements

- Immutable patch base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; accepted app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Current project branch may contain later documentation/delivery commits, but its `app` tree must be checked against that exact accepted app tree before implementation. Use a dedicated isolated worktree; never edit the main checkout's `app/`.
- Accepted FINISH-00-R2 design output manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.
- FINISH-12 correction requirements and test matrix remain in force, with only FINISH-14's exact-count clarification: 26 frozen A1 paths (19 production, 7 tests). Change only the required subset; report every changed path. Do not expand wildcards.
- A1-R4 remains rejected and diagnostic only. Do not treat it as the source base, reuse candidate bytes from `r5-02/`, `r5-03/`, or `C:\yw-r5b\app`, or claim an unverified reuse/source identity. Start from the clean exact source tree and make the correction anew. The full 26-path table is in `docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md` and `04-path-ownership.md`.
- No canonical `app/`, SQL/migrations, content contracts, dependencies, authentication helpers, public pages, other lane, or acceptance/integration records may be changed.

## Required implementation and evidence

Follow FINISH-12 unchanged: candidate-content hashing and array-order semantics; streamed private-media reads with a 5 MiB in-flight bound and shared 10-second deadline; strict coherent review DTO validation; a real local Chromium picker/save/reopen/private-preview flow using an explicitly synthetic, test-only approved PNG; and the complete standalone requirement matrix.

Return `source/`, valid UTF-8 `source.patch`, changed-path inventory, input/output hashes, `report.md`, standalone `requirement-matrix.json`, and complete evidence. The patch must apply from the exact base and every replacement must compare byte-for-byte. Run the FINISH-12 focused and full local suites, lint, typecheck, production build, and source-bound Chromium flow against the final bytes. Bind commands, exits, counts, tool versions, source/build/browser identities, raw logs, and screenshots. Mark provider/native database, deployment/CDN, device, recovery, and manual checks NOT RUN unless actually performed. A synthetic fixture is not provider approval.

The actual worker is local Codex; do not claim Gemini execution or external review. Commit and push only the stable `r5-04/` delivery paths after the full package is complete. Stop for an independent audit and separate Parent ruling. No self-acceptance or canonical integration is authorized.
