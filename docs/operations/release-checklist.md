# Current RC6 completion and production checklist

**Current candidate: v1.0.0-rc6 — source amendment and validation pending.** Accepted baseline: **G6-R1 / RC5** remains immutable. **G7 AUTHORIZED / PREPARATION** under owner instruction “Complete it.”, recorded as **G7-OWNER-AUTH-20261006**. RC6 needs independent delta review/Parent acceptance and real production-service/device evidence before completion. See [current status](../planning/current-status.json) and [RC6 dossier](../releases/v1.0.0-rc6.md).

Current work must produce fresh RC6 source-bound local/hosted evidence, independent delta review, accepted successor, real production setup and all ten G7 criteria. Existing RC5 checks below are historical completed baseline evidence and do not substitute for new RC6 or live proof. Physical/manual/service requirements remain NOT RUN until executed.

## Historical completed RC5 baseline checks

These checked items belong to accepted RC5/G6-R1 and the separate returned audit:

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
- [x] Owner authorization received: G7-OWNER-AUTH-20261006.
- [x] Exact R6 source/bundle, all-thirteen fresh/hosted and primary proof, independently verified raw CI artifact and RC6-R1 source ruling.
- [ ] Real provider configuration, source/deployment binding, monitoring and recovery/thermal/manual evidence.
- [ ] All ten [G7 requirements](../planning/releases/2026-10-02-g7-production-release-protocol.md) freshly verified on production, including real services, physical/manual tests, monitoring and rollback RTO<=5m/RPO=0.

Before owner-authorized hosted setup, apply the three exact migrations in filename order and `app/supabase/operations/harden-publication-grants.sql`; configure production secrets/auth/TOTP/private bucket/mail/jobs; prohibit fixture variables on hosts. Real Supabase Auth/REST/Storage, independent native PostgreSQL sessions, mail/GitHub services, physical devices, screen readers, hosted restore, CDN behavior and live rollback remain NOT RUN/G7-required. Continue the owner-authorized completion scope; do not accept G7 before all mandatory live evidence exists.
