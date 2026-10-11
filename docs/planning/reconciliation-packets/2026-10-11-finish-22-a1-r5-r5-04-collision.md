# FINISH-22 — Parent reallocation: A1-R5 after `r5-04/` collision

Date: 2026-10-11 UTC
Status: authorized A1-R5 output-root reallocation only; independent audit and Parent acceptance remain required.

## Collision and preservation

FINISH-19 allocated `deliveries/FINISH-A1/r5-04/` after earlier A1-R5 roots were found incomplete or misbound. The latest assigned maker confirmed that it did not create or change the newly observed contents. The path is untracked and has unknown provenance. Preserve it byte-for-byte; do not use it as source, evidence, or a stable delivery.

Parent's read-only inventory at allocation:

| Path | Bytes | Last write UTC | SHA-256 |
| --- | ---: | --- | --- |
| `deliveries/FINISH-A1/r5-04/evidence/build.log` | 2,722 | 2026-10-11T07:21:09.5075299Z | `907499d0b8c0b0f94c92694797ba29b2a32eb5b96e9ce327e721fbba33f2c188` |
| `deliveries/FINISH-A1/r5-04/evidence/install-offline.log` | 6,162 | 2026-10-11T06:57:55.3441761Z | `8b00b9349a708d998dee699278d156b48b8896a6ae86260cb6011b192482da1d` |
| `deliveries/FINISH-A1/r5-04/evidence/install-offline.log.exit` | 3 | 2026-10-11T06:57:55.4018200Z | `13bf7b3039c63bf5a50491fa3cfd8eb4e699d1ba1436315aef9cbe5711530354` |

The root also contains an empty `source/` directory. No ownership is inferred from names, timestamps, or content. Preserve `r5-04/` and all earlier A1 roots and audit attempts unchanged.

## New exclusive output root

Reallocate only the FINISH-19 destination to `deliveries/FINISH-A1/r5-05/`. It was absent at this packet's allocation check. Immediately before writing, recheck that the full root is absent. If occupied, stop, preserve it, and return an exact read-only inventory for another Parent decision. Do not copy any bytes from `r5-04/`, `r5-03/`, `r5-02/`, `r5/`, rejected R4, or the unauthenticated `C:\yw-r5b\app` checkout.

## Unchanged work order

FINISH-19, FINISH-14, FINISH-12, and all frozen A1 contracts remain in force. Only the delivery root and collision record change. Keep the exact accepted base `f62a43c5e71c00dcb89e28275ea81d842167db80`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`, 26-path A1 allowlist, implementation requirements, test-first workflow, complete evidence, and independent-review/Parent-acceptance gates. Continue source and test work only in the existing clean isolated worktree. No main-checkout app edits, canonical integration, or acceptance is authorized.

Return the complete stable package under `r5-05/`, verify the staged path allowlist and Git-blob hashes, then commit and push only that root. Record actual tests, commands, exit codes, versions, logs, and browser captures. The provider/database/deployment/device/manual limitations remain NOT RUN unless genuinely executed. Stop after the maker return for a fresh independent audit and Parent ruling.
