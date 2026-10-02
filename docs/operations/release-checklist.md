# Current RC3 release candidate checklist

Current release: **v1.0.0-rc3 candidate**. Canonical deployment/CI root: **`app/`**. G1-G5 ACCEPTED; G6 ACTIVE / REWORK; G7 LOCKED. Historic RC1/RC2 dossiers and C4 evidence remain preserved; they do not establish final RC3 success.

Architecture/source checks inspected during integration:

- [x] A new single deployable app combines public/runtime, platform/server and frozen world assets; historical accepted roots remain inputs.
- [x] Every28 overlapping conflict and every58 A6-only input has a recorded semantic merge/destination.
- [x] Final source-bound build contains all22 required public/admin/API routes, including `/api/contact`, `/admin/login`, `/api/admin/publish`, `/api/internal/jobs/[job]`.
- [x] Working Contact invokes actual R2 imports; production storage is configured PostgreSQL, with honest503 and no automatic ephemeral fallback.
- [x] Verified owner/AAL2/current-active-owner checks protect admin pages/APIs; public snapshot/terminal/static fallback exclude private drafts and CandidateX.
- [x] Nine production GLBs and actual loader URLs resolve from canonical public root; no frozen art regenerated; obsolete proof binaries excluded from canonical app.
- [x] Exact accepted dependency pins merged; stable server-only contact/quota hash secrets and names-only env contract documented.
- [x] Original numbered migrations retained. Operational publication RPC grant hardening is included and explicitly identified for audit/G7 application.
- [x] CI/release scripts target app only and reject missing routes/modules, unbound assets, skipped browser tests and mismatched source/archive/evidence.

Final execution and artifact checklist — fill only from definitive parent-captured evidence:

- [x] Record exact implementation `sourceCommit`, tool versions and unchanged app/tools/CI trees on later evidence-only HEAD.
- [x] Fresh `pnpm install --frozen-lockfile` from a clean canonical environment.
- [x] Fresh lint and strict typecheck.
- [x] Full unified unit and platform/runtime integration tests, including actual R2, role denial and fifteen-table restore.
- [x] Khronos validation of all final canonical GLBs, exact freeze hash/size checks.
- [x] Final production build and actual compiled-route/module composition.
- [x] Full relevant Playwright E2E with isolated new temporary fixture and zero skipped/flaky/failed tests.
- [x] Automated accessibility/keyboard/reflow checks; clearly separate unrun manual screen-reader/physical checks.
- [x] Fresh build-bound production HTTP payloads, five cold contexts/profile, complete raw60s frame pacing and cleanup cycles.
- [x] Measured canonical payload/asset/geometry/GPU estimate/performance budget receipt; no old timings/fallback PASS values.
- [x] Generate deterministic RC3 app archive; record exact file count, archive bytes, per-file/archive hashes, inclusion/exclusion policy.
- [x] Detached RC3 manifest binds source, asset/publication/schema/contact identities, composition and all13 required check hashes.
- [x] Automated final manifest/archive validation receipt binds the final manifest without a circular receipt hash.
- [ ] Push the source-bound candidate bundle/manifest/local proof; observe **Repository integrity SUCCESS** and **CI / Release Quality Gate SUCCESS** on that exact pushed candidate, with no required skipped step.
- [ ] Commit `ci-results.json` with the observed candidate SHA/run/job IDs, conclusions and required-step execution; update report/dossier from definitive local and observed CI records.
- [ ] Push the evidence-only commit containing that record; observe both workflows green on its exact final HEAD. Report the final SHA/run IDs in the handoff and retain provider artifacts/validation `verifiedHead`; do not rewrite the committed record to claim its own future CI result.

Authoritative records live in `deliveries/G6/full-stack-integration/`: `release-manifest.json`, `release-composition.json`, `bundle-receipt.json`, `commands-and-exit-codes.md`, `evidence/execution.jsonl`, `release-manifest-validation.receipt.json`, `ci-results.json`, `SHA256SUMS.txt`. These are final only when actually created and verified by the parent. Interim maps and historical logs are not substitutes.

Review and release boundary:

- [ ] Gemini #1 backend/platform verification.
- [ ] GPT Plus #2 independent RC3 full-stack audit, followed by assigned-maker correction/delta audit if needed.
- [ ] GPT Plus #1 final G6 adjudication; maker cannot self-accept.
- [ ] Separate explicit owner authorization before any G7 deployment/live work.
- [ ] All ten [G7 requirements](../planning/releases/2026-10-02-g7-production-release-protocol.md) freshly verified on production, including real services, physical/manual limits, actual monitoring and rehearsed rollback RTO<=5m/RPO=0.

Before authorized hosted setup: apply the exact A3/A4 migrations in order, then `app/supabase/operations/harden-publication-grants.sql`; configure production secrets/auth/TOTP/private bucket/mail/jobs; prohibit `YOR_E2E_FIXTURE`/`YOR_TEST_DATABASE_PATH` on hosts. Current four baseline response headers do not claim a complete production CSP/HSTS policy. `/api/health`, live monitoring, external service behavior and zero-downtime rollback are G7 prerequisites, not inferred from a deployment command or partial HTTP probe.

Physical devices, real screen readers, sustained mobile thermal testing, hosted independent PostgreSQL sessions, Supabase services/Storage/Resend, managed DB/blob restore, CDN cache/compression and live rollback are **NOT RUN / G7 REQUIRED**. Local SQL/browser success remains explicitly local. Stop at G6 handoff; do not deploy or unlock G7.
