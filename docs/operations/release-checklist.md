# Current RC5 release candidate checklist

Current release: **v1.0.0-rc5 accepted release candidate** under [G6-R1](../planning/reviews/2026-10-06-g6-r1.md). **G1-G6 ACCEPTED; G7 LOCKED — awaiting explicit owner production authorization.** Accepted source, maker proof, independent audit and RC1–RC4 history remain immutable.

The [independent RC5 audit](../planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md) and Parent ruling identify the actual scope: no confirmed P0/P1, explicit P2/P3 deferrals, all 13 exact-candidate hosted steps PASS at audited HEAD 2a0b1ad. No production/manual NOT RUN result is converted to PASS. Current setup/remaining obligations are in [pre-G7 prerequisites](pre-g7-prerequisites.md); the legacy environment contract is preserved historical evidence.

RC5 execution requirements — checked only from completed RC5 records:

- [x] Bind exact sourceCommit, app tree, asset/publication/schema/contact revisions, deterministic archive and all required evidence hashes.
- [x] Fresh detached checkout with dependencies and production build initially absent; frozen install, lint and typecheck.
- [x] Full unit and integration suites, including AUTO descent to STATIC and explicit LOW remaining authoritative.
- [x] Khronos validation of the nine frozen production GLBs and production build.
- [x] All 97 Chromium E2E, 17 automated accessibility and six performance tests, with zero failed/flaky/skipped cases.
- [x] Continuous rendered-world LOW route for at least 60 seconds, 60 acknowledged actions, positive calls/triangles, median <=33.3 ms and p95 <=45 ms; raw samples and precise failure snapshots.
- [x] Actual route/module composition, performance budgets, deterministic source-bound bundle reproducibility and strict RC5 manifest validation.
- [x] Push bound candidate evidence and observe Repository integrity and CI / Release Quality Gate SUCCESS on the exact candidate with all 13 required release steps successful.
- [x] Archive observed candidate SHA/run/job/step evidence and inventory; push the evidence-only handoff and verify both workflows on that final HEAD. A committed record identifies the earlier observed candidate and does not predict its own future CI result.

Authoritative maker records: [RC5 report](../../deliveries/G6/rc5-candidate/report.md), `release-manifest.json`, `source-binding.json`, `release-composition.json`, `bundle-receipt.json`, `commands-and-exit-codes.md`, `evidence/execution.jsonl`, `release-manifest-validation.receipt.json`, `ci-results.json` and `SHA256SUMS.txt` under `deliveries/G6/rc5-candidate/`. Results remain PASS/FAIL/NOT RUN according to actual execution; no historical PASS is fresh RC5 proof.

Review and release boundary:

- [x] GPT Plus #2 independent full-stack RC5 audit completed; six P2/P3 findings explicitly retained in G6-R1. No correction packet is dispatched here.
- [x] Parent final G6 adjudication: G6 ACCEPTED (G6-R1). Maker proof and independent audit remain separate.
- [ ] Separate explicit owner authorization before G7 deployment/live work.
- [ ] All ten [G7 requirements](../planning/releases/2026-10-02-g7-production-release-protocol.md) freshly verified on production, including real services, physical/manual tests, monitoring and rollback RTO<=5m/RPO=0.

Before owner-authorized hosted setup, apply the three exact migrations in filename order and `app/supabase/operations/harden-publication-grants.sql`; configure production secrets/auth/TOTP/private bucket/mail/jobs; prohibit fixture variables on hosts. Real Supabase Auth/REST/Storage, independent native PostgreSQL sessions, mail/GitHub services, physical devices, screen readers, hosted restore, CDN behavior and live rollback remain NOT RUN/G7-required. Stop after the Parent ruling; G7 remains locked.
