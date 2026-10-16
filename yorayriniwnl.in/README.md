# yorayriniwnl.in

This folder mirrors the canonical YOR WORLD application in `app/`, with the intentional domain URL override at `src/config/public-base-url.ts`. Local tooling for this candidate used Node 24.19.0 and pnpm 9.15.9.

## Current source candidate: PRE-G7-27

Candidate source is commit `d86d3d68c34fcdff6319c7945c7d74e87ce81946`, app tree `6ab180f831661e43cc035fe9d70eec67372dd708`, based on PRE-G7-26 source commit `ffd4635242362774c7981f8d54405fd0ccb2b0c9`, app tree `9895fcc5c09ba695674fc5ff0342f5afb35b3d0c`. The renderer and capture baseline remains the accepted PRE-G7-22 root `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`.

PRE-G7-27 changes one performance-test locator to use the existing Projects link inside the active studio modal. Product runtime, assets, performance thresholds, and timeouts are unchanged. The focused four-cycle test passes all four enter/exit cycles. The complete six-test performance suite was run twice with the pinned toolchain; both runs pass the four payload and cold-load checks but fail the active-route and cycle checks while waiting for HOME. A direct captured browser diagnostic reaches HOME and receives all three required GLBs successfully. The unresolved suite-level startup issue is recorded in `deliveries/G7/preparation/maker-evidence/pre-g7-27/REPORT.md`; no timeout or assertion was relaxed.

This candidate remains **unaccepted and undeployed**. The complete performance-suite gate, independent audit, and parent acceptance remain pending. See `source-delivery-manifest.json` for source identity and source/mirror parity hashes.
