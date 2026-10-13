# FINISH-41 Parent-local A1 technical recheck

**Local result: PASS.** The six FINISH-24 corrections pass source review, targeted regression evidence, exact-base replay checks, and the fresh focused unit/integration reruns. This is a Parent-local technical recheck; it is not the required GPT Plus #2 audit, implementation acceptance, or canonical integration.

Candidate: `76d679dcb98064152021830b98f16eb456b3ae19` on `codex/finish-29-a1-r5-r7-20261011`, parent `f62a43c5e71c00dcb89e28275ea81d842167db80`. The remote branch matches. The package subtree is `61026e89795d28aa212ee2e03c8edc05b2aea97a`; all 79 output rows (1,695,825 bytes) match raw Git blobs. The 236,517-byte patch has SHA-256 `aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8` and applies to the exact base `f62a43c5e71c00dcb89e28275ea81d842167db80`. Its 25 changed source files match the replay and are within the frozen 26-path allowlist. The candidate commit preserves the canonical root `app/` tree `42ea29ec235225046a75959eb19eb386ac2f821d`.

The six earlier findings are corrected:

1. **DTO compatibility:** `approvalAudit` retains `eventId`; `PrivateDraftReview` has the allocated four fields and rejects `previewProjectId`; `ReviewCheckSchema` accepts generic site scope and string IDs. Supplemental schema probes pass.
2. **Publication refresh:** both healthy refresh paths consume `activePublication`. The candidate Chromium evidence is bound to the exact replay source tree and build ID; its results show 6 expected, no unexpected, skipped, or flaky tests. Publish and rollback refresh without reload.
3. **Missing private drafts:** the owner API returns 404 for an absent requested draft, and the page reaches `notFound()`. The focused integration rerun passed.
4. **Stale saves:** the authorized 409 includes the current draft identity and content; unauthorized requests receive no draft content; state remains unchanged. The browser evidence verifies the losing editor retains its unsaved rich buffer.
5. **Draft media URLs:** only the exact encoded same-origin owner-preview URL renders. Reviewer probes rejected absolute and protocol-relative URLs, query, fragment, path traversal, raw slash, altered/double encoding, and trailing slash variants.
6. **Authoring defaults:** new sections, paragraphs, list items, code and links start empty; link URL/check time are empty and evidence starts unknown/null. Candidate browser assertions pass.

On the isolated exact-base replay, the focused unit suite passed **5/5** and the focused integration suite passed **22/22**. The independent supplemental contract probe passed **3/3**. Its first fixture used one site check and failed the candidate’s intentional five-check-per-scope coherence invariant; the final probe supplies all five required check kinds and passes. Candidate source was not changed by these probes.

Maker receipts report full suites, lint and typecheck exit 0. Their package hashes match raw Git. The original worker build attempt exited 1 because Turbopack rejected a `node_modules` junction outside the filesystem root; the later clean exact-base replay build receipt exited 0. Build manifest, browser results and Chromium receipt hashes match the candidate binding. The Parent did not rehash physical build-output files or launch a fresh browser run.

**Process-boundary disclosure:** after FINISH-37, Parent inadvertently read `report.md` from both original FINISH-36 output roots and wrote temporary verification/replay scratch under the then-active FINISH-37 roots. FINISH-38 roots were occupied; only their immediate top-level names were recorded. This report uses none of the FINISH-37/38/39/40 output contents. It was regenerated under FINISH-41 from raw Git objects. No candidate commit or canonical `app/` source was modified.

GPT Plus #2 audit, Parent acceptance, canonical integration, native PostgreSQL/Auth/Storage tests, deployed origin/CDN, physical-device/accessibility checks, recovery/manual operations, and G7 remain **NOT RUN**. No production deployment or acceptance is claimed.

Raw identities, command receipts, matrix, findings and hashes are in this directory. `output-hashes.json` covers all stable files and excludes itself and `.work/`.
