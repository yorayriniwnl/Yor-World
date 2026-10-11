# FINISH-29 - A1-R5 output-root reallocation

Date: 2026-10-11 UTC
Status: Parent reallocation of the existing FINISH-27 maker assignment. It changes the output destination only.

## Collision and preserved candidate

FINISH-27 assigned the six-finding A1-R5 correction to `deliveries/FINISH-A1/r5-06/`. At the required pre-write recheck, that path existed and contained a top-level `.work/` directory of unknown provenance. Its contents were not inspected. Treat the root as occupied and preserve it byte-for-byte. Do not reuse or clean it.

FINISH-29 reassigns the same authorized work to `deliveries/FINISH-A1/r5-07/`. This root was absent at allocation and must be rechecked immediately before writing. If it is occupied, stop and request another Parent reallocation.

## Unchanged source and scope

FINISH-27 remains the governing implementation packet. Use exact base commit `f62a43c5e71c00dcb89e28275ea81d842167db80`, whose accepted `app/` tree is `42ea29ec235225046a75959eb19eb386ac2f821d`. Preserve candidate commit `8f3aa566f36c92bb98658090ef91f9bfa96e8a79`, all prior A1 roots and audits, the separate `32af5dc7` branch, and canonical `app/` unchanged.

The same six findings, accepted FINISH-00-R2 contracts, exact 26-path allowlist, required regressions, verification, evidence, and stop conditions from FINISH-27 apply without expansion. The new package must replay from the exact base and contain only allowlisted canonical source paths. Do not treat any earlier delivery as the base or as accepted work.

Use the matching [FINISH-29 maker prompt](../production-prompts/repairs-2026-10-11/19-CODEX-A1-R5-R7.md). Commit and push only the completed `r5-07/` delivery on its scoped branch. Parent will assign a separate exact-candidate delta audit; maker completion does not imply acceptance or canonical integration.
