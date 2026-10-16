# PRE-G7-25 attempt-03

**Disposition: FAIL / unaccepted.** See [REPORT.md](REPORT.md) for exact source/evidence binding, all eight inclusive render-call snapshots, accepted-root pixel comparison, command outcomes, physical-device NOT RUN items, and the bounded section 6 follow-up proposal.

The source-only candidate is commit `28fb4187445206bcc62e2ef0ae2678e44ac6604b` (root/app/mirror trees `f04e1ff586f9523b28f7a3d47860a7d001ac5eec` / `f68074b41b8d2eea228d7fa964d3db8358a9fea4` / `be03089ce9abae0f487bd829b4f24ddac9bb3dfd`), based on accepted root commit `500d10fa5901be48d4ff877e608d65ba0e271bb9` and app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. Its dynamic synchronization correction is committed separately. The current evidence records source commit 28fb418; it does not accept itself.

The named composition E2E passed 6/6 behavior checks and produced all eight same-tier Chrome/Edge snapshots. Inclusive draws were 129 (`118 main + 11 shadow`) in every viewport: +9 over each HIGH ceiling and +49 over each MEDIUM ceiling. Triangle limits pass. Pixel differences are small but nonzero; see [pixel-parity-06.json](commands/pixel-parity-06.json) for exact RGBA metrics and PNG hashes. The original performance suite failed 5/6 at the resource-stability navigation click. Full unit, focused tests, lint, typecheck, production builds, and the consecutive integration pair passed.

Independent GPT Plus #2 audit: **NOT RUN**. Parent acceptance: **PENDING**. Physical-device, screen-reader, mobile-soak, service, and deployment checks: **NOT RUN**.
