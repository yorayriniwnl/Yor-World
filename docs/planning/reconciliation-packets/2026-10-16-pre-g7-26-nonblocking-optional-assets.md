# PRE-G7-26 — optional assets do not gate studio entry

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized bounded follow-up to PRE-G7-25's recorded performance failure
- **Branch parent:** `85fdb2e71fb6982bf773030172c9380a76389b21`
- **Canonical input source:** `8ff3c929030c77208d31b937dc800e6ebdd2e6a2`, app tree `385c7e967837e3a4e76e6c92c8dd19900ab99428`
- **Boundary:** Local source/evidence only. No service, domain, DNS, deployment, production operation, or acceptance.

## Evidence and contract

PRE-G7-25's corrected performance run passes the cold loads and 60-second active route, but the four-cycle studio resource test remains in `LOADING` at 92% after 15 seconds, showing 3/3 required and 1/3 optional assets. The captured stage is `Optional deskmat texture processed`. In `app/src/features/world/AssetLoader.ts`, the remaining optional wallpaper texture and optional interaction GLB are awaited serially before `loadSession` returns, so an optional request can indefinitely prevent scene initialization. Repository search confirms the deskmat and wallpaper texture results have no consumers. The interaction GLB contributes hidden hit proxies; `WorldInteractionBinding` already raycasts visible production meshes, and the loader's existing fallback keeps DOM controls available.

This violates the product loading contract in `docs/planning/validation-and-production.md` §3: do not wait for every optional prop before starting. Required room, avatar, and fixture behavior remains unchanged. The original PRE-G7-25 receipts and error context remain preserved under `deliveries/G7/preparation/maker-evidence/pre-g7-25/`.

## Owned paths

- `app/src/features/world/AssetLoader.ts`, `WorldRuntime.ts`, and `WorldInteractionBinding.ts`, only for separating optional work from required scene readiness and safely attaching late hit proxies
- directly related tests under `app/tests/unit/`
- matching files under `yorayriniwnl.in/`
- `deliveries/G7/preparation/maker-evidence/pre-g7-26/`
- this packet and the narrowly related delegation index entry

Keep `app/` canonical. Preserve PRE-G7-25 source and evidence unchanged. Bind the correction against source `8ff3c929` and record the branch parent, app tree, changed Git blobs, mirror parity, frozen asset hashes, receipts, and performance artifacts. Push the source commit before the separate evidence commit.

## Authorized correction

1. Required asset loading must continue to reject on the same required-model failures and continue to honor cancellation and retry policy. It must return once the current required room, resident, and fixture assets are ready; optional work cannot gate scene initialization, entrance, or `HOME`.
2. Do not fetch the two unused textures as part of world entry. Preserve the files and asset manifest. Do not change rendered materials, visible composition, geometry, lighting, quality policy, or triangle/call thresholds.
3. Load the optional interaction hit-proxy asset after required scene setup without awaiting it. Attach valid proxies to the active `WorldInteractionBinding` when they arrive. Existing production-mesh raycasts and DOM controls must work before, during, after optional failure, and when optional loading is cancelled.
4. On teardown, abort optional network work. If parsing completes after cancellation or the runtime becomes stale, release the optional GLTF's owned geometry/material/texture resources and do not attach it or mutate stale diagnostics.
5. Update progress to represent only work still performed. Never mark an optional texture as processed when it was not requested. Preserve required progress, user-visible stage semantics, the retry policy, and navigation availability.
6. Add focused tests for required readiness while optional loading is unresolved, optional late success and fallback, cancellation/stale completion cleanup, and proxy attachment. Do not change existing test filters, retry counts, timeouts, ceilings, browser configuration, or assertions to make the performance run pass.

## Required verification

Run focused loader/runtime tests, full unit tests, lint, typecheck, production build, and the existing performance suite with its original command and configuration. The four-cycle resource test must reach and exit `HOME` for all four cycles; preserve any failure and diagnose it rather than altering test settings. The active route and all renderer budgets must remain passing. Capture source-bound command receipts and the final frame/cycle reports. Physical-device, screen-reader, hosted-service, deployment, independent-review, and parent-acceptance claims remain **NOT RUN** unless performed under their own workflows.

## Review boundary

This follow-up does not accept PRE-G7-25, change an accepted baseline, or complete G7. Preserve every PRE-G7-25 source/evidence artifact. A read-only independent review and parent ruling remain required after the new source and evidence commits are pushed. Do not deploy.
