# FINISH-43 A1 local technical recheck

**Recommendation: PASS for the narrow FINISH-36 A1 correction and lineage checks. This is a Parent-local technical recheck, not an external audit or acceptance.**

Candidate `76d679dcb98064152021830b98f16eb456b3ae19` remains the exact remote head of `codex/finish-29-a1-r5-r7-20261011`; parent, full tree, delivery subtree and unchanged canonical `app/` tree match the packet. Raw Git recomputation verified all 79 package output rows (1,695,825 bytes). The source patch is 236,517 bytes with SHA-256 `aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8`. A clean sparse worktree at the pinned base applied the 25 declared replacements, matched every packaged source byte-for-byte, stayed inside the 26-path frozen allowlist, and reproduced app tree `ba8f952edc34e94393c48b25779071daab9a9812`; root `app/` stayed unchanged.

The six FINISH-24 corrections were confirmed: frozen review/media DTOs and generic site checks are preserved; publication and rollback refresh read `activePublication`; absent drafts reach not-found handling; stale saves return `currentDraft` without partial writes while the losing editor retains its buffer; draft media renders only at the exact canonical private URL; and new authoring values are blank with unknown evidence null. The source review and test references are in `evidence/a1-source-review.md`.

Fresh exact-replay checks passed: focused unit **5/5**, focused integration **22/22**, and independent boundary probes **3/3**. Candidate-provided full unit/integration, lint and typecheck receipts report exit 0 and are bound to raw package bytes. Candidate Chromium evidence binds to its tree/build identity and reports **6 expected, 0 unexpected, 0 skipped, 0 flaky**. Browser/build results are maker evidence; no new Parent browser run occurred and physical build files were not independently rehashed.

An initial full-worktree setup failed before tests with ?No space left on device?; the isolated sparse app-only replay then completed successfully. This is an environment/setup failure, not a candidate test failure.

GPT Plus #2 review, Parent acceptance, canonical integration, native providers, deployment, physical/device/accessibility checks, recovery/manual operations and G7 are **NOT RUN**. This report does not close those gates or accept/integrate the candidate.

Process-boundary disclosure: after FINISH-37, the parent inadvertently read `report.md` from the original FINISH-36 roots and wrote temporary verification/replay scratch under the then-active FINISH-37 roots. FINISH-38 roots were occupied; only immediate names were recorded. FINISH-42 roots were also occupied before use; only `.work/` and `evidence/` names were recorded and their contents were not opened. No FINISH-37 through FINISH-42 output is evidence in this FINISH-43 report.
