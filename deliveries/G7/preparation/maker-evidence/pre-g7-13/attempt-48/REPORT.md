# PRE-G7-13D Attempt 48 Maker Report

Date: 2026-10-15  
Worktree: `C:\p13-iso`  
Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`  
Base HEAD before this correction: `2a9e50576f2e88b11c2c30380cee16ede9e24983`  
Status: reviewable maker checkpoint; parent/auditor review pending. No deployment or G7 acceptance is claimed.

## Scope and source

The correction changes only transforms/scales of the existing `chair-root` and `chair-base` in `ReferenceComposition.ts`. It adds, removes, or reshapes no geometry and makes no camera, lighting, desk, resident, or other anchor changes.

- `chair-root` world shift: X `+0.05`, Z `-0.735`; shared yaw `+18°`; scale `[0.55, 0.8, 0.55]`, with the bottom re-anchored after scaling.
- `chair-base` world shift: X `+0.20`, Z `-0.735`; shared yaw `+18°`; scale `[0.75, 1, 0.75]`, with the bottom re-anchored after scaling.
- The `0.15` world-unit X offset between root and base is preserved.

Changed implementation paths:

- `app/src/features/world/ReferenceComposition.ts`
- `yorayriniwnl.in/src/features/world/ReferenceComposition.ts`
- `yorayriniwnl.in/source-delivery-manifest.json`

Final SHA-256 of app and mirrored `ReferenceComposition.ts`: `4953029b354cf81ac7105341429122d8d8bffff5d1b98374d4e350886ae89e9d`.

Frozen GLB: `deliveries/production-environment/runtime/production-room-full.glb`  
SHA-256: `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307` (matches expected; unchanged).

## Runtime and mirror evidence

The package engine is `>=24.19.0 <25`. Checks used the official Node `v24.19.0` portable runtime. The saved archive `node-v24.19.0-win-x64.zip` matched its `SHASUMS256.txt` entry: `57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73`. The runtime/version record and verifier command are in this attempt directory. No package or lockfile was changed.

Mirror verifier: PASS, exit 0, command `node deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-48/verify-mirror.mjs` (run through `run-mirror-verifier.ps1`). It checked 116 source rows and 9 test rows: 125/125 normalized pairs matched, 13 pairs were raw-byte equal, and the changed `ReferenceComposition.ts` pair was byte-identical. Unchanged manifest rows were preserved. The `public-base-url.ts` override has the same committed blob hash as its manifest, normalized content is preserved, and the tracked path is clean. The worktree bytes differ from the Git blob only because checkout EOL conversion is active; the verifier records this as `checkoutEolConversionOnly: true`.

`git diff --check -- app/src/features/world/ReferenceComposition.ts yorayriniwnl.in/src/features/world/ReferenceComposition.ts yorayriniwnl.in/source-delivery-manifest.json`: PASS, exit 0. Git emitted only its checkout-EOL notices for the mirror files.

## Visual evidence

Raw closed-HUD captures and same-page diagnostics:

- Desktop 1440×900: `screenshots/studio-reference-desktop-1440x900.png`, `measurements/desktop-1440x900-anchor-diagnostics.json`, `measurements/desktop-1440x900-capture-trace.json`.
- Mobile 390×844: `screenshots/studio-reference-mobile-390x844.png`, `measurements/mobile-390x844-anchor-diagnostics.json`, `measurements/mobile-390x844-capture-trace.json`.

Both captures were live `HOME` WebGL2 pages with one canvas, no context loss, and zero failure/static fallbacks before and after capture. Chair diagnostics measured the root at about 204.5×286.6 px on desktop and 70.3×92.3 px on mobile; the base measured about 181.6×208.9 px and 60.8×62.9 px respectively. Measured chair first-hit ratios were desk `0.0714` desktop / `0.0357` mobile, monitor `0.0556` both, and right speaker `0` both; the targeted 10% occlusion ceiling passed.

The full default composition E2E command `pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts` completed 16/16 PASS (8 Chrome, 8 Edge), exit 0, in 4.4 minutes. It retained the assertions and default timeouts. It covers desktop, mobile, compact 320×600, and landscape 844×390, including the panel batch/same-ray checks and compact drawer controls. Logs/results are in `visual-e2e.log`, `visual-e2e.exit.txt`, and `visual-e2e/`.

The screenshots and 16-case run were captured after the attempt-48 transform was applied. The later source edit before the final build changed only comments/indentation; transform values and behavior did not change. Automated bounds/occlusion evidence is not a substitute for parent/auditor recognition review; this maker report does not self-accept the chair.

## Validation

All commands ran in `C:\p13-iso\app` on Node v24.19.0, with default test settings unless the command specifies the evidence build flag.

- PASS — `pnpm typecheck`, exit 0; `typecheck.log`, `typecheck.exit.txt`.
- PASS — `pnpm lint`, exit 0; `lint.log`, `lint.exit.txt`.
- PASS — `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 pnpm build`, exit 0 on the final source bytes; `final-build.log`, `final-build.exit.txt`.
- FAIL — `pnpm test:unit`, exit 1; `unit.log`, `unit.exit.txt`. 23/25 files and 319/321 tests passed. Two failures remain unmodified:
  - `tests/unit/boundaries.test.ts`: the integrated-dependency-boundaries test timed out at the unchanged 5000ms default.
  - `tests/unit/reference-composition.test.ts:123`: the frozen placement expectation expected `0.5` but the packet-authorized `+0.05` chair-root shift produces `0.35` from the fixture's `0.3` starting X. No assertion was changed because PRE-G7-13D authorizes only the two existing chair transforms/scales.
- NOT RUN in attempt 48 — full integration suite and recovery/fullscreen pointer-interception lane. Their prior results remain recorded in `../attempt-33/REPORT.md`: the full integration run timed out in `canonical-fixture.test.ts` at 60s; recovery/fullscreen had the renderer failure overlay intercepting the Projects link. No timeouts, fallback policy, or renderer behavior were changed here.
- NOT RUN — physical-device checks, deployment, and G7 acceptance.

## Attempts, scope, and commit

Attempts 34–47, including failed captures and their reports, remain preserved. Attempt 48 is the only candidate promoted for parent review; no earlier attempt was overwritten. The evidence inventory is `evidence-file-hashes.json`, generated from staged Git blob bytes and excluding itself.

The scoped candidate contains the three implementation/mirror paths listed above and PRE-G7-13 evidence under `attempt-34/` through `attempt-48/`. Parent-owned reconciliation-packet files and the restored PRE-G7-11 log are excluded. Commit and push result will be recorded in the handoff after the scoped commit completes.
