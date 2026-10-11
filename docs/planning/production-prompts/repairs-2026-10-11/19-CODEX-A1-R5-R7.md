# Local Codex platform maker: FINISH-29 A1-R5 correction

Read `AGENTS.md`, `START_HERE.md`, FINISH-27, FINISH-29, the accepted FINISH-00-R2 contract, and the exact source/audit inputs named in those packets.

The previous destination `deliveries/FINISH-A1/r5-06/` is occupied by unknown-provenance `.work/` scratch. Preserve it byte-for-byte and do not inspect its contents. FINISH-29 reallocates the same assignment to `deliveries/FINISH-A1/r5-07/`; verify that destination is still absent immediately before writing. If occupied, stop.

Use exact base `f62a43c5e71c00dcb89e28275ea81d842167db80` and accepted app tree `42ea29ec235225046a75959eb19eb386ac2f821d`. Preserve prior candidates, audits, all other delivery roots, and canonical `app/`.

Implement all six corrections and targeted red/green regressions from FINISH-27. The frozen allowlist remains the same 26 exact paths; no path expansion is granted. Return complete source, canonical-path patch, exact input/output hashes, changed-path inventory, requirement matrix, focused/full tests, lint, typecheck, production build, source-bound Chromium evidence, and a report with exact commands, versions, exits, identities, PASS/FAIL/NOT RUN and limitations. Replay from the exact base and prove every patch path is in the frozen table.

Commit and push only the completed `r5-07/` package on its scoped branch. Do not self-approve, accept, or integrate. Parent assigns an independent exact-candidate delta audit.
