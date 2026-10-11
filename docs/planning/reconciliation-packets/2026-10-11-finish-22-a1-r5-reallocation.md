# FINISH-22 — Parent reallocation: A1-R5 after r5-04 collision

Date: 2026-10-11 UTC
Status: authorized A1-R5 maker candidate at a fresh root. Independent audit and separate Parent acceptance remain required.

## Reallocation decision

FINISH-19 assigned the exact A1-R5 correction to `deliveries/FINISH-A1/r5-04/` from a clean isolated worktree. That output root became occupied during preparation. A read-only inventory on 2026-10-11 found only empty `source/` and `evidence/` directories plus `evidence/install-offline.log` (6,162 bytes, SHA-256 `8b00b9349a708d998dee699278d156b48b8896a6ae86260cb6011b192482da1d`) and `evidence/install-offline.log.exit` (`0`, SHA-256 `13bf7b3039c63bf5a50491fa3cfd8eb4e699d1ba1436315aef9cbe5711530354`). The offline frozen install succeeded, but there is no source file, patch, report, hash manifest, requirement matrix, browser evidence, or candidate commit. Preserve `r5-04/` unchanged; its writer and any source identity are unknown.

Preserve `r5/`, `r5-02/`, `r5-03/`, `r5-04/`, all R4 material, and every prior audit unchanged. Do not copy candidate bytes from those roots or from `C:\yw-r5b\app`. The new exclusive output root is `deliveries/FINISH-A1/r5-05/`; it was absent in the main checkout and this isolated worktree when allocated. Recheck immediately before creating it. If it is occupied, stop and send Parent an exact read-only inventory for another reallocation.

## Exact source and requirements

- Immutable patch base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; accepted app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- This isolated worktree is based on `8cc31356a5cb832b20b4f716a0551360fd919d5f`; its `app/` tree was checked equal to the accepted base tree. Use only those byte-identical application inputs and prove the final patch replays from the immutable base.
- Accepted FINISH-00-R2 design output-manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.
- Follow FINISH-12 and FINISH-14, with the exact 26-path A1 allowlist (19 production and 7 test paths) in `finish-contracts-r2/02-platform-schema-recovery.md` and `04-path-ownership.md`. Change only the required subset and report every changed path.
- A1-R4 remains rejected and diagnostic only. Do not modify canonical `app/`, SQL/migrations, content contracts, dependencies, authentication helpers, public pages, any other lane, or acceptance/integration records.

## Required implementation and evidence

1. Bind the review hash to every publishable `PublishedProject` document, sorted by project ID in code-point order, the accepted site, asset-manifest revision, and complete reviewed media vector. Exclude CandidateX, preserve array order, recursively sort object keys, and prove body/section/block order changes alter the hash while key insertion order does not.
2. Stream private Storage reads with a 5 MiB in-flight cap. Reject oversized declared lengths before reading; incrementally cap and cancel on overflow/error; validate declared length at EOF; enforce one 10-second deadline across signed-URL creation and streaming; never log or return signed URLs. Bind metadata, approval audit, bytes, type, dimensions, size, and hash. Test overflow, mismatch, stream failure/cancel, and deadline abort.
3. Strictly validate complete private review draft records, frozen content schemas, ID agreement, unique projects, safe revisions, timestamps/actor, sorted unique identity vectors, known scopes/kinds/IDs, check timestamps, failure reasons, coherent `canPublish`, and CandidateX nonpublishability. Reproduce the FINISH-10 malformed DTO probes and keep positive parsing cases.
4. Run the local Chromium picker → clearly synthetic test-only approved PNG → save/reopen draft → guarded private preview flow. Bind result, screenshots, and browser receipt to final source/build hashes; do not imply provider approval.
5. Return a standalone `requirement-matrix.json` mapping every FINISH-04/A1 clause, A3-01 through A3-05, and FINISH-12 correction to PASS/FAIL/NOT RUN, exact source and evidence paths, and scope limits. Distinguish unit, PGlite, mocked Storage/auth, Chromium, native provider/database, deployment/CDN, device, recovery, and manual evidence.

Return `source/`, valid UTF-8 `source.patch` with canonical `app/` prefixes, changed-path inventory, input/output hashes, `report.md`, the standalone requirement matrix, and complete evidence. Bind the exact base tree, patch and replacement bytes, candidate tree, tool versions, commands/exits, raw logs, and browser captures. Run exact-base patch replay and byte comparisons, focused/full local suites, lint, typecheck, production build, and the source-bound Chromium flow. Mark native provider/database, deployment/CDN, device, recovery, and manual checks NOT RUN unless actually performed.

The actual maker is local Codex; do not claim Gemini execution or external review. Commit and push only the completed stable `r5-05/` delivery root after verifying its staged paths and committed bytes. Stop for an independent exact-candidate audit and separate Parent ruling. No self-acceptance or canonical integration is authorized.
