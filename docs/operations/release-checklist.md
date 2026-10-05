# Current RC5 release candidate checklist

Current release: **v1.0.0-rc5 candidate**. Canonical deployment/CI root: **`app/`**. G1-G5 ACCEPTED; G6 ACTIVE / REWORK — awaiting GPT Plus #2 independent audit; G7 LOCKED. **RC4 HISTORICAL / SUPERSEDED BY RC5**; RC1-RC4 dossiers and evidence remain immutable.

The [RC5 maker packet](../../deliveries/G6/rc5-candidate/parent-packet.txt) authorizes the active-world benchmark contract correction and directly required release rebinding. The production quality policy, thresholds, watchdog, frozen assets, platform corrections and contact R2 remain unchanged. Schema remains `20261005000000_schema_v2`.

RC5 execution requirements — checked only from completed RC5 records:

- [x] Bind exact sourceCommit, app tree, asset/publication/schema/contact revisions, deterministic archive and all required evidence hashes.
- [x] Fresh detached checkout with dependencies and production build initially absent; frozen install, lint and typecheck.
- [x] Full unit and integration suites, including AUTO descent to STATIC and explicit LOW remaining authoritative.
- [x] Khronos validation of the nine frozen production GLBs and production build.
- [x] All 97 Chromium E2E, 17 automated accessibility and six performance tests, with zero failed/flaky/skipped cases.
- [x] Continuous rendered-world LOW route for at least 60 seconds, 60 acknowledged actions, positive calls/triangles, median <=33.3 ms and p95 <=45 ms; raw samples and precise failure snapshots.
- [x] Actual route/module composition, performance budgets, deterministic source-bound bundle reproducibility and strict RC5 manifest validation.
- [ ] Push bound candidate evidence and observe Repository integrity and CI / Release Quality Gate SUCCESS on the exact candidate with all 13 required release steps successful.
- [ ] Archive observed candidate SHA/run/job/step evidence and inventory; push the evidence-only handoff and verify both workflows on that final HEAD. A committed record identifies the earlier observed candidate and does not predict its own future CI result.

Authoritative maker records: [RC5 report](../../deliveries/G6/rc5-candidate/report.md), `release-manifest.json`, `source-binding.json`, `release-composition.json`, `bundle-receipt.json`, `commands-and-exit-codes.md`, `evidence/execution.jsonl`, `release-manifest-validation.receipt.json`, `ci-results.json` and `SHA256SUMS.txt` under `deliveries/G6/rc5-candidate/`. Results remain PASS/FAIL/NOT RUN according to actual execution; no historical PASS is fresh RC5 proof.

Review and release boundary:

- [ ] GPT Plus #2 independent full-stack RC5 audit; assigned-maker correction and delta audit if required.
- [ ] GPT Plus #1 final G6 adjudication. Maker cannot self-accept.
- [ ] Separate explicit owner authorization before G7 deployment/live work.
- [ ] All ten [G7 requirements](../planning/releases/2026-10-02-g7-production-release-protocol.md) freshly verified on production, including real services, physical/manual tests, monitoring and rollback RTO<=5m/RPO=0.

Before owner-authorized hosted setup, apply the three exact migrations in filename order and `app/supabase/operations/harden-publication-grants.sql`; configure production secrets/auth/TOTP/private bucket/mail/jobs; prohibit fixture variables on hosts. Real Supabase Auth/REST/Storage, independent native PostgreSQL sessions, mail/GitHub services, physical devices, screen readers, hosted restore, CDN behavior and live rollback remain NOT RUN/G7-required. Stop at the maker handoff.
