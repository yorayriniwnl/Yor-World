# PRE-G7-18 parent disposition

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Decision:** **NOT ACCEPTED — required default unit gate unresolved.**
- **Scope:** This ruling covers the bounded PRE-G7-18 unit-boundary closeout only. G7 remains unaccepted and all work remains local-only.

## Candidate and evidence

PRE-G7-18 used a fresh branch from the exact PRE-G7-17 source `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf` (source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`; app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`). No application or test source changed. The source app tree remains unchanged.

The maker evidence bundle is on `codex/pre-g7-18-unit-boundary-closeout-20261015`:

- Initial evidence commit: `7c3ac083de929ce20f507322e4f606ffeba75b7b`.
- Audited formatting-only evidence correction: `ce7cb39a09f7829f0f25ed2147cfcbc35a11d82a`.
- Final evidence tree: `e40cfa3115317e4b83913851b8c31a4e14222e36`.
- Final evidence inventory SHA-256: `35cca07cd1edac4af4898b76e7845aa42c26f6c2f541232e0b48cd57d47a1e91`.

The final bundle records one exact default `pnpm run test:unit` invocation on unchanged source: **326/327 passed; the boundary test failed its unchanged 5,000 ms timeout**. Raw pnpm output reports exit code 1; the PowerShell wrapper's `.ExitCode` receipt was blank and is disclosed. Attempt 02 was **NOT RUN** because the measured profiling did not justify a safe targeted correction. The 327/327 gate therefore remains unresolved. Integration was not rerun; PRE-G7-17's two default 286/286 passes carry forward only because the app/integration source and configuration are unchanged. Focused test, lint, typecheck, and build were not run, as no source correction was made.

The independent reviewer was a **local Codex substitute for GPT Plus #2**, not the external account. The read-only audit verified local/remote refs, cleanliness, evidence-only scope, strict inventory validation (65 entries and 11 JSON files), source/app identity, unchanged source bytes, mirror parity, 117-path coverage, raw unit result, attempt cap, and diagnosis. The follow-up delta audit verified the formatting-only correction and its inventory update. Both audits passed their evidence checks; neither issued acceptance. The final bundle is maker evidence plus independent local audit, not external-account review.

## Parent decision

The evidence is internally consistent, but it does not satisfy the required 327/327 default-unit pass. PRE-G7-18 is therefore closed **not accepted**, with no source revision produced. PRE-G7-17 remains unaccepted as previously ruled. Do not treat the integration carry-forward, standalone profiler timings, or the separate misrouted 327/327 run as closing the unit gate.

Physical-device/accessibility sessions remain **NOT RUN**; the user's Chrome GPU state remains **NOT PROVIDED**. Providers, DNS/domain configuration, deployment, and production verification remain outside this local-only work and are **NOT RUN**. No production-readiness or G7-complete claim is made.

Any further unit-boundary source change or additional suite invocation requires a new parent packet with an explicit run budget and evidence boundary. Keep the source and evidence commits above immutable.
