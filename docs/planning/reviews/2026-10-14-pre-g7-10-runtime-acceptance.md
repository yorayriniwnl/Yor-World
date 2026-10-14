# PRE-G7-10 runtime repair acceptance - 2026-10-14

**Authority:** Parent Codex, Architect and Acceptance Authority  
**Scope:** `docs/planning/reconciliation-packets/2026-10-14-pre-g7-10-webgl-context-replay.md`  
**Maker source commit:** `95729282af3d84b4e3158158546643935e737b7a`  
**Evidence closeout:** `9040dbecb9bd71804e95f91cd9bebea9b7507fee`  
**Independent audit:** `deliveries/G7/preparation/pre-g7-10-parent-acceptance/independent-audit.md`

## Ruling

**PRE-G7-10-R1 ACCEPTED as a narrow runtime source delta for subsequent local integration.** The accepted result app tree is `e53f3ea9c6c80f471832e46d548206105699c32b`. The exact app source archive and binding are recorded in `deliveries/G7/preparation/pre-g7-10-parent-acceptance/`.

This decision accepts the canvas-context replay correction and its assigned regression/evidence package. RC6-R1 (`8e5b954e147a87e36a6869d9940c40f3d4c123f0`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`) remains immutable. PRE-G7-10-R1 is not a full release candidate, does not satisfy G7, and does not authorize deployment.

## Evidence adjudication

- The maker reproduced the Strict Mode failure from the accepted baseline and reported the `doubleInvokeEffectsInDEV` / `reconnectPassiveEffects` stack without a clean-profile hydration mismatch.
- The source change disposes renderer resources while preserving a connected canvas context across effect replay. Detached teardown still releases the context.
- Focused recovery tests passed 13/13. Lint, typecheck, integration (286/286), and production build passed.
- The complete unit suite passed 316/316 with a 15-second per-test timeout. The default `pnpm test:unit` command failed twice when an existing boundary test exceeded the 5-second timeout. This remains a disclosed failed command; it is not represented as a default-command pass.
- Production browser evidence shows supported Intel/ANGLE rendering, real context loss and retry recovery, plus fallback under actual `--disable-webgl`. The disabled context correctly remained in fallback; recovery was shown in a separate fresh enabled context.
- The independent auditor passed the exact source and corrected evidence revision. The final 43/43 checksum audit matches exact committed blobs.

## Separate known issue

The fallback action labels have insufficient visual contrast on the pale fallback panel in the original-resolution screenshots. The relevant fallback component and stylesheet were unchanged from RC6-R1 and outside this packet. This runtime acceptance does not accept that visual accessibility state; a separate parent-owned packet must correct and review it before full visual/accessibility acceptance.

## Remaining release boundary

Physical and mobile-device matrices, service/provider integration, deployment, production monitoring/recovery, and manual G7 evidence were not run here. G7 remains **AUTHORIZED / PREPARATION; NOT ACCEPTED**. No live deployment was made.
