# yorayriniwnl.in

This folder mirrors the canonical YOR WORLD application in `app/`, with the intentional domain URL override at `src/config/public-base-url.ts`. Local tooling for this candidate used Node 24.19.0 and pnpm 9.15.9.

## Current source candidate: PRE-G7-26

Candidate source is commit `ffd4635242362774c7981f8d54405fd0ccb2b0c9`, app tree `9895fcc5c09ba695674fc5ff0342f5afb35b3d0c`, based on PRE-G7-25 source commit `8ff3c929030c77208d31b937dc800e6ebdd2e6a2`, app tree `385c7e967837e3a4e76e6c92c8dd19900ab99428`. The renderer/capture baseline remains the accepted PRE-G7-22 root `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`.

PRE-G7-26 removes unused texture downloads from the required startup path and loads optional interaction hit proxies after the world starts. The existing production-mesh interactions stay active before proxies arrive; canceled or stale loads release parsed resources. The full unit suite passes 337/337; lint, typecheck, build, and focused loader checks pass.

The performance suite now reaches and passes the 60-second active world route (60 actions, 3,605 frames, median 16.7 ms, p95 16.9 ms). Its four-cycle test still fails when it clicks the page-level navigation behind the intentionally modal studio dialog. The dialog already has an in-scope Projects link; the test is being corrected to use that link without changing product behavior or performance assertions. See `deliveries/G7/preparation/maker-evidence/pre-g7-26/REPORT.md` for the full evidence and preserved failure.

The candidate remains **unaccepted and undeployed**. Independent audit and parent acceptance remain pending. See `source-delivery-manifest.json` for source identity and source/mirror parity hashes.
