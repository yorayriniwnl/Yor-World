# FINISH-36 A1 parent-local technical recheck

**Recommendation: PASS for the six FINISH-24 corrections, within this bounded local recheck.** This is Parent-local technical evidence. It is not the required external GPT Plus #2 audit, implementation acceptance, or canonical integration.

## Exact candidate

- Branch/remote: `codex/finish-29-a1-r5-r7-20261011` at `76d679dcb98064152021830b98f16eb456b3ae19`.
- Commit/tree: `76d679dcb98064152021830b98f16eb456b3ae19` / `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`; parent/base: `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- Package tree: `61026e89795d28aa212ee2e03c8edc05b2aea97a`. Canonical root `app/`: `42ea29ec235225046a75959eb19eb386ac2f821d` (unchanged).
- Package source subtree: `1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3`. Exact-base patch SHA-256: `aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8`; patched replay tree: `ba8f952edc34e94393c48b25779071daab9a9812`.
- Output manifest: 79 entries / 1,695,825 bytes, all recomputed from raw Git blobs.

## Six correction results

| Finding | Result | Reviewer result |
| --- | --- | --- |
| A1R5-01 | PASS | `approvalAudit.eventId` and accepted strict DTO shapes restored; generic project/site review checks retained. |
| A1R5-02 | PASS | Both healthy refresh paths consume `activePublication`; browser confirms publish and rollback refresh without reload. |
| A1R5-03 | PASS | Missing draft returns API 404 with private headers; page reaches `notFound()` by source inspection. |
| A1R5-04 | PASS | Authorized 409 includes current draft identity/content, no write occurs, unauthorized response has no draft content, and editor buffer survives. |
| A1R5-05 | PASS | Renderer allows only the exact canonical private-preview URL for that media ID. |
| A1R5-06 | PASS | New authored values start blank; evidence remains unknown/null until supplied. |

## Reviewer reruns

The patch was checked and applied in a clean detached worktree at base `f62a43c5e71c00dcb89e28275ea81d842167db80`. The exact changed set is 25 paths, all within the frozen 26-path allowlist. Every packaged replacement matches the replayed file byte-for-byte; the resulting `app/` tree is `ba8f952edc34e94393c48b25779071daab9a9812`. `app/` in the candidate commit remains the accepted baseline tree.

| Check | Result |
| --- | --- |
| Focused unit | PASS - 1 file, 5 tests |
| Focused integration | PASS - 1 file, 22 tests |
| Full unit | PASS - 24 files, 317 tests |
| Full integration | PASS - 28 files, 308 tests |
| Lint / typecheck | PASS - both exit 0 |
| Production build | PASS - exit 0; reviewer build ID `N5F-9B-D4Owa10IpgOBkn` |
| Chromium | PASS - 6/6; zero skipped, unexpected, or flaky; Playwright 1.63.0, Chromium 153.0.8010.12 |

The reviewer build and browser run bind to the same replayed app tree. The maker's package separately records a 6/6 run with build ID `ipOY1wZCZuOF_EBSv1XY8`; this rerun produced a fresh build ID and its own file-hash manifest. Both bind to the same source tree. Browser data used a disposable PGlite database, an owner-cookie fixture, and explicitly synthetic image bytes; the fixture is not provider-approved.

## Scope limits and coverage notes

- The missing-draft API branch was exercised; the page-level `notFound()` branch was verified by source inspection, not a separate browser request.
- The URL renderer's exact-string check rejects any noncanonical value. Unit cases cover absolute/origin-confused, traversal, wrong-ID, and query variants; there is no separate literal-fragment probe.
- Native PostgreSQL races, provider Auth/Storage, deployed origin/CDN, physical devices/accessibility, recovery/manual operations, and G7 were **NOT RUN**.
- GPT Plus #2 audit was **NOT DISPATCHED**. Parent acceptance and canonical integration remain **PENDING**.

The allocation history records a FINISH-37 process-boundary incident: those roots were opened and altered during earlier parent work despite the preceding no-open instruction. This report did not inspect or use FINISH-37 through FINISH-41 output contents as evidence; this recheck is based on the exact candidate's raw Git objects and fresh FINISH-42 reruns.
