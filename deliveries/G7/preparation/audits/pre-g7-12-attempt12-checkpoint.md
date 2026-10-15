# PRE-G7-12 attempt-12 checkpoint review

**Date:** 2026-10-15 (Asia/Calcutta)  
**Reviewer:** Parent Codex, read-only checkpoint review  
**Disposition:** **REWORK REQUIRED — not an auditable source candidate; no acceptance**

This is a checkpoint review of an uncommitted worktree and its attempt-12 captures. It is not the formal exact-source audit requested by PRE-G7-12 because the source has no candidate commit and the captures do not bind themselves to a source revision.

## Snapshot identity

- Worktree: `_worktrees/pre-g7-12`
- Branch: `codex/pre-g7-12-reference-composition-20261014`
- `HEAD`: `b40cd49d257eca4b18f9e2df54404088eb4181c2`; the configured origin branch matched at review time.
- Tracked working changes: `app/src/features/world/ProductionLighting.ts` and `app/src/features/world/ReferenceComposition.ts`.
- Untracked evidence: `deliveries/G7/preparation/maker-evidence/pre-g7-12/attempt-12/`.
- The source mirror and unit-test files are unchanged in this working tree. No attempt-12 `REPORT.md`, exact source commit, exact evidence commit, or attempt-12 checksum inventory is present.

SHA-256 values bind the files inspected in this checkpoint:

| File | SHA-256 |
|---|---|
| `app/src/features/world/ProductionLighting.ts` | `7b736213cc02881f10a8909315f5220a5766420f62fe58ca45271e0ac943558e` |
| `yorayriniwnl.in/src/features/world/ProductionLighting.ts` | `bb191537ad301f47088696fac708ea72f4bac59e95b964a832761feb27d1dfda` |
| `app/src/features/world/ReferenceComposition.ts` | `6cb1e095f64c1c1a5cd7658abf7e0501a994f5d2ca3199e1b2edd0a8a8af8d70` |
| `yorayriniwnl.in/src/features/world/ReferenceComposition.ts` | `16cb9d77dc5cd70e09829842bdfe5352204058638c9168a028816ed8a0200ef5` |
| `app/tests/unit/reference-composition.test.ts` | `69748dc26f7acb6219d57ebcd81d31ecbd589c3d3a314b6d5c103bd74a513d26` |
| `attempt-12/iteration-01/screenshots/studio-desktop-1440x900.png` | `362954b631a69bd8ca94058dad7646b2dd5e3edd86633f1ae025801c888b903a` |
| `attempt-12/iteration-01/screenshots/studio-mobile-390x844.png` | `ee063ab8b84ddd516575cee2ffed4a222a76e1efadc5cf0e7353d8a6da2df6b5` |
| `attempt-12/iteration-01/browser-errors.log` | `1b0134da3331ce6e2e7bf287a247bf7f26b4afa57f4e1b1e2816af97bf0ec31d` |

## Findings

### F1 — P1: existing unit assertions contradict the uncommitted composition values

The current `ReferenceComposition.ts` sets the plant root to `x=0.72`, scales the camera root by `1.8` about the documented center, and changes the hex panels to `scale(1.45, 1.45, 1)` with new positions. The unchanged `reference-composition.test.ts` still expects plant `x=0.3`, camera position `[0.7, 0.35, 0.18]`, panel scale `2.7`, first panel `y=1.836`, and left panel `x=-0.504, y=1.924`. The new camera formula computes position `[1.16, -1.28, 1.344]` for its stated center/target. These assertions conflict with the inspected source; the focused unit test cannot pass against these values as written. No test was run for this checkpoint.

### F2 — P1: captures do not establish the required visual composition

The inspected desktop and mobile captures remain dominated by pale, washed-out wall surfaces. The pink/lilac hex-light cluster is not recognizable. The plant/shelf camera and several required left/right peripheral groups are not independently recognizable in the opening views; the desktop resident also overlaps the central monitor area. No per-anchor evidence ledger or projected anchor bounds are supplied. The capture script records HUD boxes and pixel diversity, not required object visibility. The capture-to-source relationship is unproven because the source is uncommitted.

### F3 — P1: application source and local-domain mirror diverge

Only the two `app/` files are modified. The corresponding `yorayriniwnl.in/src/features/world/` files retain different SHA-256 values. PRE-G7-12 requires the canonical source changes to be mirrored and the source-delivery manifest updated and verified. No attempt-12 mirror update is present.

### F4 — P1: attempt-12 lacks required exact-source evidence

The attempt directory has screenshots, HUD measurements, a capture helper and a browser error log, but no report with commands/versions/exit codes, no source/evidence commit identities, and no attempt-specific evidence hash inventory. No logs establish the required focused E2E, unit, integration, lint, typecheck, production build, CandidateX guard or clean-profile production browser smoke results. The reported browser `404 (Not Found)` has no URL or classification.

## Partial observations

The capture measurements report no horizontal document overflow and fixed closed-drawer chrome ratios below 20% at all four viewports: 2.21% at 1440×900, 8.01% at 390×844, 11.65% at 320×600, and 8.70% at 844×390. These are partial layout measurements; they do not prove the source-bound visual, interaction, or test requirements.

## Return to maker

1. Reconcile the new scene transforms with meaningful unit coverage for the intended geometry and interaction behavior; do not merely replace expected values with constants.
2. Correct the lighting/composition until the required desktop and mobile anchor groups are recognizable, then provide a per-anchor ledger and projected bounds against raw captures.
3. Mirror canonical source changes, update only the appropriate manifest rows, and verify the complete manifest/mirror boundary.
4. Re-run the packet's required suites and browser checks against the exact source commit. Record commands, versions, exit codes, raw logs and physical-device limits; classify the 404.
5. Push exact source and evidence commits with an evidence inventory. Return the exact revisions for independent delta audit.

No product source was changed by this review. PRE-G7-12 and G7 remain unaccepted; no deployment is authorized by this packet.
