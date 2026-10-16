# yorayriniwnl.in

This folder mirrors the canonical YOR WORLD application in `app/`, with the intentional domain URL override at `src/config/public-base-url.ts`. It is a local source candidate; this folder has not been deployed. Local tooling for earlier candidates used Node 24.19.0 and pnpm 9.15.9.

## Current source candidate: PRE-G7-31

Source commit `bd01478617b4166866f3f44196c56fc5add94acd` binds app tree `3975e40c59a04b8696efa2ca3605eb37a0617165` and domain mirror tree `8c34adf791c678a4e9e8bfe90f92426026994e68`. PRE-G7-31 is based on the unaccepted PRE-G7-28 source candidate `d86d3d68c34fcdff6319c7945c7d74e87ce81946`, app tree `6ab180f831661e43cc035fe9d70eec67372dd708`, following the PRE-G7-30 diagnostic evidence commit `848463d6d5c44e2575ada644baedb327176dc356`.

The only product-source adjustment is the `home-mobile` camera target Y value, from `0.96` to `0.55`; the position, FOV, desktop camera, world assets, and interaction behavior are unchanged. A projection calculation based on PRE-G7-25 browser measurements predicts that the named required anchors remain in the 390×844 frame. That calculation is not a browser capture or visual acceptance. PRE-G7-31 tests, build, and browser review were not run under its bounded packet. The candidate remains **unaccepted and undeployed** pending regression evidence, an independent source/mirror audit, a fresh read-only visual review, and Parent ruling.

## PRE-G7-28 history

PRE-G7-28 is a reclassification of a previously pushed test candidate after discovering that PRE-G7-27 was already an active, measurement-only renderer-attribution packet. Its test change uses the existing Projects link inside the active modal. Product runtime, assets, thresholds, and timeouts were unchanged. The focused four-cycle test passed all four cycles. Two complete six-test performance-suite runs each passed four payload and cold-load checks but failed the active-route and cycle checks while waiting for HOME. A direct browser diagnostic reached HOME and received all three required GLBs successfully. The unresolved suite-level readiness stall is recorded in `deliveries/G7/preparation/maker-evidence/pre-g7-28/REPORT.md`; no timeout or assertion was relaxed.

The PRE-G7-28 performance candidate remains **unaccepted**. PRE-G7-30 later captured a full 6/6 pass with all six traces; both startup-dependent tests reached HOME, so the earlier stall did not reproduce and its cause remains unresolved. This diagnostic run did not accept PRE-G7-28. PRE-G7-27 retains its separate `pre-g7-27/` evidence directory. See `source-delivery-manifest.json` for the current source identity and source/mirror parity hashes.
