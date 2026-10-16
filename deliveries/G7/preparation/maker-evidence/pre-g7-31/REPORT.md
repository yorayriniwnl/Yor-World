# PRE-G7-31 report — mobile home framing

**Status: source candidate, unaccepted.** The change is pushed on `codex/pre-g7-31-mobile-home-framing-20261016`. It does not accept PRE-G7-28, close the reference-fidelity gate, or deploy the domain folder.

## Source binding

| Item | Value |
|---|---|
| PRE-G7-31 packet commit | `074ccbcb7fa5d8c5f89eb98aab9315cebb9100fb` |
| PRE-G7-30 starting evidence commit | `848463d6d5c44e2575ada644baedb327176dc356` |
| PRE-G7-28 source candidate | `d86d3d68c34fcdff6319c7945c7d74e87ce81946` |
| PRE-G7-31 source commit | `bd01478617b4166866f3f44196c56fc5add94acd` |
| Canonical `app/` tree | `3975e40c59a04b8696efa2ca3605eb37a0617165` |
| `yorayriniwnl.in/` tree | `8c34adf791c678a4e9e8bfe90f92426026994e68` |
| Accepted PRE-G7-22 input | `500d10fa5901be48d4ff877e608d65ba0e271bb9` |

The source commit changes only `CameraDirector.ts` and the existing camera preset assertion in the canonical app and domain mirror. The mobile camera position and FOV, desktop and other presets, assets, routes, controls, and thresholds are unchanged. The mobile target Y changed from `0.96` to `0.55`.

## Projection analysis

The projection input is preserved at `projection-input/baseline-mobile-390x844-chrome-projected-anchor-snapshot.json`, copied from PRE-G7-25's `attempt-02/composition-e2e` evidence. Its original Git blob is `e56309b7d13239a65ea12e8d427586c287c94bd2`, raw SHA-256 is `d5c644887e18b33e6113a047dcc2c88206196d1d68a660e36e92a58409462321`, and the original screenshot is preserved at `projection-input/baseline-mobile-390x844-chrome.png` (original Git blob `9b59d3246cf7015c3d287742e8eacac6d95a971e`, SHA-256 `f8c529f80cb80b5ea264917f06bd1ac4e154f123ff335d269ae904a824252968`). The input snapshot has no embedded source commit. Relevant camera and scene source blobs are recorded in `projection-analysis.json`; this is inherited diagnostic input, not fresh PRE-G7-31 browser evidence.

Command: `node deliveries/G7/preparation/maker-evidence/pre-g7-31/calculate-mobile-projection.mjs`.

Result: `GEOMETRIC PROJECTION PASS` for all 21 required named anchors. The minimum projected AABB edge margin is 12.915 px (`plants`, left edge). Projected monitor width is 163.934 px; the seven-panel cluster is 148.746 px; shelf camera is 58.703 px; controller is 47.736 px. Both speakers exceed the existing 16 px width and height minimums. All current mobile size thresholds pass in this geometric projection.

This calculation uses the existing 390×844 world-space AABBs and perspective-camera formula. It does not measure rendered pixels, occlusion, HUD overlap, materials, human recognition, or actual visual quality. It cannot accept the camera change.

## Domain mirror

The source/mirror audit is recorded in `source-mirror-parity-audit.json`. At source commit `bd01478617b4166866f3f44196c56fc5add94acd`, all 116 source-file pairs and 14 test-file pairs have matching normalized contents and matching Git blobs. The 130 raw-byte differences are line-ending differences. The sole domain override remains `src/config/public-base-url.ts` with canonical URL `https://yorayriniwnl.in`.

Command: `node deliveries/G7/preparation/maker-evidence/pre-g7-31/update-source-delivery-manifest.mjs`.

Result: `PASS`; normalized parity failures `0`; Git blob parity failures `0`; domain override preserved. The command refreshed `yorayriniwnl.in/source-delivery-manifest.json` and its README identity. The manifest's mirror audit covers correspondence only, not site behavior or acceptance.

`evidence-inventory.json` records the committed PRE-G7-31 evidence artifacts and the two domain-metadata files, with byte sizes, raw SHA-256 hashes, and committed Git blob IDs. The inventory excludes its own file to avoid a self-referential hash.

## Checks and limits

| Check | Result | Evidence | Reason |
|---|---|---|---|
| PRE-G7-31 owned-path scope | PASS | Source commit `bd01478617b4166866f3f44196c56fc5add94acd` | Exactly the four packet-authorized source/test files changed. |
| App/domain normalized source and test parity | PASS | `source-mirror-parity-audit.json` | All 130 mapped files were compared; normalized content and committed Git blobs match. |
| `git diff --check` | PASS | Source commit `bd01478617b4166866f3f44196c56fc5add94acd` | No whitespace errors in the scoped source change. |
| Existing mobile anchor AABB projection | PASS | `projection-analysis.json` | Geometric projection only; not a browser check. |
| Camera unit test | NOT RUN | — | PRE-G7-31 did not authorize test invocations. Its existing expected target was updated. |
| Composition E2E / fresh mobile screenshot | NOT RUN | — | PRE-G7-31 did not authorize browser invocations. |
| Unit suite, integration suite, lint, typecheck, build | NOT RUN | — | PRE-G7-31 did not authorize test or build invocations. |
| Performance suite | NOT RUN | — | PRE-G7-31 does not repeat PRE-G7-30's completed diagnostic run. |
| Independent GPT Plus #2 audit | NOT RUN | — | No returned external audit is present in this workspace. |
| Human visual review beside main reference | NOT RUN | — | No fresh PRE-G7-31 screenshot exists. |
| Domain deployment / live verification | NOT RUN | — | This packet is local-source-only; no deployment is authorized. |

## Remaining gate

PRE-G7-31 remains unaccepted. A later packet must authorize fresh browser evidence and any required regressions. A maker-independent reviewer must inspect that exact source and mirror, and a read-only human reviewer must compare the fresh 390×844 capture with `references/images/main-reference.png`. Parent acceptance remains pending. No claim is made that the public domain changed.
