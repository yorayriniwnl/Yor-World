# POST-G1-WAVE-01/FREEZE-1

This is a freeze of existing accepted contracts and scoped ownership. It does not introduce a new runtime schema. [baseline-manifest.json](baseline-manifest.json) identifies exact bytes and the existing specification/interface sources. The current user assignment takes precedence over older lane labels and broad task templates.

## Existing shared types — read-only

Use the exact accepted G1 ZIP `source/src/contracts/{content,experience,assets}.ts` members. They match accepted W3-r2 contract semantics. Do not copy a similarly named later revision or widen a Zod schema to make a harness pass.

| Contract | Frozen meaning |
| --- | --- |
| `ProjectId` | `candidatex`, `helios`, `zenith`, `ai-vs-real`, `talks`. Catalog candidates do not imply verified/public projects. |
| `Publication`, `PublishedProject`, `ContentSection`, `EvidenceRef` | Existing field names/types; structured text/image/list/code blocks only; no raw HTML/MDX. `revision` is a positive integer, distinct from Git/output-revision strings. `assetManifestRevision` binds a named asset set, not a filename guessed at runtime. |
| `EvidenceStatus` | `verified`, `unknown`, `not-measured`, `not-applicable`; no invented `approved`, `draft` or `not-deployed` enum value. Drafts/approvals live in a separate evidence ledger and publication selection, not extra fields silently added to shared records. |
| `PublicRoute` | Existing static route/anchor enum. `/projects/[slug]` remains the specified dynamic route; generate a URL from a validated published slug rather than widening `NAVIGATE.path`. Future room project intent uses existing `OPEN_PROJECT`/`ProjectId`. |
| `CameraId`, `ExperienceIntent` | Existing enums/discriminants and field types. G1's private `reverse-doorway` diagnostics preset is not a new shared CameraId. No maker adds public intents. |
| `CharacterAction` | `coding_idle`, `mouse_idle`, `notice_visitor`, `turn_to_visitor`, `greeting_nod`, `return_to_work`, `attention_glance`, `breathing_idle`. Only five have accepted proof clips. The differently named future clips in the acceptance narrative do not replace the actual accepted schema. |
| `WorldSnapshot`, `Preferences` | Version 1 fields exactly as accepted. Persist safe value objects, not a running timeline/state-machine snapshot. Sound default false; entry alone is not sound consent. Validate reads; denied/corrupt storage falls back to memory. |
| `AssetManifest` | `revision`, `schemaVersion:1`, existing `groups` fields; lowercase 64-digit SHA-256, byte count, geometry/material/GPU estimates, clips, provenance and approval. Existing URL validator requires HTTPS. Do not weaken it to accept local HTTP/relative fixture URLs. |

Publication selection must add semantic evidence/approval/uniqueness checks **outside** the immutable structural schemas. Schema-valid does not mean approved or truthful. No draft/test fixture enters a public snapshot. Use the frozen logical accepted asset-set label `G1-R1` for this wave's baseline publication binding; its exact constituent GLB hashes are in the baseline manifest. A new B3 candidate does not silently update that binding.

Local preview transports may map clearly marked test-only HTTPS fixture URLs to hash-pinned local bytes. Keep mappings outside shared schemas and public manifests; do not claim fixture URLs are deployed or candidate assets are approved. This wave provisions no CDN. Approved production transport/manifest publication belongs to later B2/integration work.

## Existing producer/consumer interfaces

These signatures already appear in the platform/world plans and engineering lifecycle specification. No maker changes their parameters/return types. Private implementation helpers are lane-local and must not become a competing shared API.

| Producer | Existing interface | Consumer / boundary |
| --- | --- | --- |
| A2 | `readPublication(): Promise<Publication>`; `findPublishedProject(publication: Publication, slug: string): PublishedProject \| null` | Semantic routes now; future integration adapter later. Server content is never imported into Three rendering modules. |
| B3-P1 | `WorldLighting.setBase(snapshot: WorldSnapshot): void`; `setFocus(projectId: ProjectId \| null): void` | B5 calls the accepted implementation only after art/sample acceptance and integration assignment. Focus restores persistent base state and does not overwrite preferences. |
| B5-P1 | `CameraDirector.transitionTo(cameraId: CameraId, signal: AbortSignal): Promise<void>`; `playEntrance(signal): Promise<void>`; `settleHome(mobile: boolean): void`; `dispose(): void` | Camera director owns camera motion only; coordinator owns the common entrance timeline. |
| Existing B4 boundary, adapted privately in B5 | `CharacterDirector.play(action: CharacterAction, signal: AbortSignal): Promise<void>`; `settleToWork(): void`; `dispose(): void` | Wrap accepted five-clip proof behavior without re-authoring the rig or claiming eight clips delivered. Loops resolve after starting; finite clips resolve when complete; abort/dispose stops their effects. |
| Existing loader boundary, exercised in B5 | `WorldLoader.prepare(tier, signal)`; idempotent `dispose()`; `loadAssetGroup(groupId, tier, signal)` returning owned scene/clip handle with idempotent disposal | Ready means required groups decoded, not merely downloaded. No unrelated B2 optimization/CDN implementation is implied. |
| Router / navigation adapter | Existing route/history ownership and `ExperienceIntent` | Only the Next router changes history; camera/character/lighting completion cannot navigate. Cancel presentation on navigation intent, before awaiting route response. |

Only the current transition/session ID may complete work. Skip/Escape/navigation/hide/failure outrank decorative activity. Navigation is never delayed by animation; proof settlement target remains <=50 ms. G1 public entry component placement/import seam remains intact until named integration: A2 does not import 3D code or edit the launcher, and B5 does not rewrite portfolio routes to gain lifecycle control. Use the existing launcher seam and lane-local navigation adapter/harness. Any required shared layout change is returned as a parent integration proposal, not an out-of-scope edit.

## Coordinate, asset and camera conventions

- **F1 remains unchanged:** meters; runtime Y-up; rear wall Z=-1.8; room 4.2 x 3.6 x 2.8 m. Desk 2.6 x 0.8 m, top height 0.75 m, center X/Z=(0,-1.15). Chair/resident root=(0.30,0,-0.36). Blender Z-up converts once at export: `(x,y,z) -> (x,z,-y)`.
- Mount accepted room/avatar/fixture scenes at identity. Do not add the embedded chair/resident offset again, rotate an already converted export, normalize its scale ad hoc, or compensate with a second root transform.
- Canonical IDs: room-shell, desk, door, chair, monitor, resident. Preserve anchors door-hinge, chair-root, monitor-surface, painting-pivot. Preserve resident/resident-body association, chair-root/chair-base pairing, skeleton hierarchy and five accepted clip names/durations (6.0, 0.6, 1.2, 0.9, 1.3 s respectively); authoring 30 FPS, browser playback time-based.
- Accepted G1 integration removes W1 resident/static-chair proxies and the W1 chair locator, retains W2 chair-root/chair-base, discards W2 fixture-static. Exactly one desk, one resident and one articulated chair remain. B3's new environment sample export contains no avatar or replacement chair; accepted W2 supplies them for comparison. Preserve environment anchors and room/desk/contact/door-clearance geometry outside the bounded sample; do not duplicate inherited W1 geometry when previewing replacement assets.
- Runtime perspective FOV is explicitly **vertical degrees**, position/look-at in runtime meters, aspect from the actual canvas. A Blender horizontal FOV must be converted using the recorded aspect. Metadata labels are not geometric proof. Cameras must be outside collision geometry and tested using actual browser pixels.
- Accepted proof cameras are evidence, not an instruction to retain an occluded production view. B5 owns candidate production presets within the existing CameraId vocabulary and frozen room geometry. B3 may author a private comparison camera matching its Blender/browser view; it cannot ship a second production camera owner or rewrite B5 presets. Both report positions, targets, FOV convention/aspect and any proposal affecting a shared anchor.
- Main visual authority remains `references/images/main-reference.png`: white/ivory workstation; blue-and-white chair; pink/lilac hex lights; cyan fill; warm monitor/task light; visible plants/gaming props. Unknown reference rights remain unknown. A reference image is not a runtime texture or licensed production model.
- New sample runtime files use content-hashed filenames. Source, export and evidence revisions are separate. Do not overwrite accepted binaries or reuse an accepted digest/revision label for new bytes. Record texture color spaces, transforms, light units/exposure and ownership; do not duplicate exported and runtime lights.

## Exclusive production destination map

All paths below are **application-relative overlay destinations**, not permission to edit repository root production files. No application exists at repository root today; a future integration maker will assemble the application at a separately assigned root. Repository writes stay within the packet's revision root.

| Owner | Allowed `overlay/` destinations |
| --- | --- |
| A2 / Gemini #1 | `src/app/(public)/projects/**`; `src/app/(public)/about/**`; `src/app/(public)/resume/**`; `src/features/portfolio/**`; `src/server/content/publication-reader.ts`; `src/server/content/publication-validation.ts`; `src/server/content/approved-snapshots/**`; `src/server/content/approved-media/**`; `src/app/sitemap.ts`; `public/content/**`; `docs/content/**`; `tests/unit/a2-*`; `tests/e2e/a2-*` |
| B3-P1 / Gemini #2 | `src/features/room/lighting.ts`; `src/features/room/anchors.ts`; `src/features/room/room-scene.tsx` (sample scope only); `assets-source/environment/sample/**`; `assets-runtime/samples/workstation/**`; `docs/art/b3-p1/**`; `tests/unit/b3-p1-*` |
| B5-P1 / Gemini #3 | `src/features/world/**` (accepted G1 implementation/entry seam); `src/features/experience/**`; `src/features/room/world-root.tsx`; `src/features/room/asset-loader.ts`; `docs/runtime/b5-p1/**`; `tests/unit/b5-p1-*`; `tests/integration/b5-p1-*`; `tests/e2e/b5-p1-*` |
| Parent / later named integrator only | `src/contracts/**`; package/lockfile; framework/TypeScript/lint/test/build configuration; `src/app/layout.tsx`; `src/app/(public)/page.tsx`; `src/app/not-found.tsx`; `src/styles/**`; application-wide asset/publication/release manifests; accepted `public/models/**` and `public/assets/3d/**`; CI/root documentation |

**Allowed shared-file writes by makers: none.** Shared read access is allowed to the exact baseline/spec/reference files. Contact/admin/auth/API routes are not assigned to any maker in this wave. Existing contact informational page remains baseline content; A2 does not add a form or submit behavior.

Each lane may create private source/evidence/harness material inside its repository revision root. A preview harness may assemble a scratch app with test-only configuration outside the overlay, recorded separately and never promoted. B5 may refactor accepted world implementation within its allowlist, but cannot claim ownership of all `src/features/room/**` or `src/features/character/**`. No lane owns an overlapping production file.

## Change control

Routine implementation choices within an owned path and unchanged interfaces need no repeated parent permission. If work needs a shared-file/schema/coordinate/clip-ID/signature/dependency change, record `contract-change-request.md` inside the maker's own root: current hash, precise proposed diff, affected consumers, compatibility/migration impact and regression evidence. Continue independent work against FREEZE-1; do not apply the cross-lane change speculatively.

The parent adjudicates the concrete proposal. A contract change affecting multiple lanes requires the user's **GPT-6 Astra xHigh** escalation; a new freeze/accepted baseline must be recorded and every affected lane rebased/retested before integration. If that model/account is unavailable, report that limitation and keep only the dependent change pending. Do not relabel another model as Astra. G3/G4/G6 acceptance and security-critical architecture disputes follow the same specified escalation triggers.

Known newer returns (W1-r3/W3-r3/material-light sample/current G1 patches) remain separately reviewable. Makers may use reported failures as regression cases and implement bounded corrections in their owned overlay. Adopting an unaccepted asset revision or changing shared input contracts requires explicit baseline promotion, not a silent cherry-pick of a newer ZIP.
