# Exact successor source ownership

Paths below are relative to `app/`. **E** means present in the bound canonical tree; **N** means deliberately new. Production makers write replacements/patches only inside their delivery roots. No permission to edit canonical `app/` is granted before an explicit I1 integration packet. Unlisted source paths require a new Parent amendment, not silent expansion. Directory wildcards authorize delivery evidence, never additional production source.

Platform A1/A2 allowlists, E/N state and per-path responsibilities are exhaustive in [02-platform-schema-recovery.md](02-platform-schema-recovery.md). The following tables are exhaustive for runtime and identify cross-packet sequential ownership. A1/B1-R2/C1-R2 may run concurrently; shared paths below only pass between sequentially accepted packets.

## FINISH-C1-R2: generation, readiness, pause and loading controls

Output root `deliveries/FINISH-C1-R2/`. Base is exact canonical app tree; original C1 replacements are inspected correction inputs, **not** accepted overlays.

| Canonical path | State | Allowed responsibility |
| --- | --- | --- |
| src/contracts/experience.ts | E | Add default-compatible paused preference only; retain other intents/versions |
| src/features/experience/preferences-store.ts | E | Validated document-memory persistence and existing storage compatibility |
| src/features/experience/controller.ts | E | Restore/persist pause, separate ambient from finite requested action updates |
| src/features/experience/return-snapshot.ts | E | Default-compatible paused serialization/restore; no navigation redesign |
| src/features/world/CharacterDirector.ts | E | Actual first idle activation; pause/finite action safe-return semantics |
| src/features/world/SceneIntegrator.ts | E | Required adoption/discarded-resource bookkeeping; retain current five-clip integration until C2 |
| src/features/world/AssetLoader.ts | E | Session identity, bounded retries, required readiness, optional adoption, factual bytes; disable old IA requests |
| src/features/world/asset-resources.ts | N | Deduplicated loader/runtime resource ownership and disposal ledger |
| src/features/world/WorldRuntime.ts | E | Readiness adoption, late texture consumer/quality wiring, generation fencing and pause propagation |
| src/features/world/LifecycleManager.ts | E | New progress shape, session fencing/watchdog lifecycle; no simulated progress |
| src/features/world/types.ts | E | Shared progress/session diagnostics types, no camera catalog redesign |
| src/features/world/WorldRoot.tsx | E | Loading/status/Retry 3D/Continue/watchdog and preferences subscription only |
| src/features/world/RuntimeMaterialQuality.ts | E | Late-map refresh/registration and generated-material disposal |
| src/features/world/LowQualityBatch.ts | E | Mutable-target exclusion or affected-batch invalidation for late material adoption |
| src/features/world/world.module.css | E | Indeterminate loading styling only; no HUD/mobile layout changes |
| tests/unit/character-director.test.ts | E | Meaningful startup/pause behavior regression checks |
| tests/unit/asset-loader.test.ts | E | Real loader boundary/cleanup/retry/progress regressions |
| tests/unit/preferences-resilience.test.ts | E | Pause and denied-storage compatibility |
| tests/unit/contracts.test.ts | E | Historical preference inputs and additive output compatibility |
| tests/unit/project-transition.test.ts | E | Paused preference fixture compatibility and unaffected routing |
| tests/fixtures/engineering-section-4.ts | E | Add paused only where typed Preferences outputs require it; keep legacy input fixture |
| tests/unit/lifecycle-manager.test.ts | E | Factual progress/watchdog lifecycle compatibility |
| tests/unit/runtime-material-quality.test.ts | E | Late maps/ownership/current quality |
| tests/unit/low-quality-batch.test.ts | E | Late material/batch regression |
| tests/unit/world/completion-character-startup.test.ts | N | First real action and safe pose verification |
| tests/unit/world/completion-decorative-pause.test.ts | N | Ambient/finite-action pause separation |
| tests/unit/world/completion-essential-loader.test.ts | N | Held optional decode, failure, races, byte/retry cleanup |
| tests/integration/world/completion-runtime-lifecycle.test.ts | N | Session/adoption/pause integrated boundary |
| tests/e2e/world/completion-loading-pause.spec.ts | N | Browser watchdog, cancellation, rendered startup, retry/re-entry |

C1 does not own RoomControls mobile layout, catalog motions, entrance timeline, art bytes, content contracts, dependencies or migrations. Existing original C1's seven delivered files now have explicit roles in this successor; this does not retroactively authorize their historical scope.

## FINISH-C2: accepted isolated art/runtime overlay and catalog completion

Output root `deliveries/FINISH-C2/`. Input candidate must be assembled from accepted B1-R2 + C1-R2 with an actual Parent-bound assembly manifest. Source allowlist:

| Canonical path | State | Allowed responsibility |
| --- | --- | --- |
| src/features/world/EntranceCoordinator.ts | E | One common entrance timeline and visible door hinge ownership |
| src/features/world/CameraDirector.ts | E | Exact named reveal/greeting presets and focus retargets from accepted node centers; preserve sole camera ownership and measured clearances |
| src/features/world/WorldInteractionBinding.ts | E | Exact R2 node/proxy/detail registration and visible catalog reactions |
| src/features/world/SceneIntegrator.ts | E | Eight paired clips, conforming successor exports and unique actor counts |
| src/features/world/WorldRuntime.ts | E | Bind catalog/motif/clock directors and optional detail consumers |
| src/features/world/CharacterDirector.ts | E | Eight clips, glance/posture/interrupt safe returns with one owner |
| src/features/world/AssetLoader.ts | E | Accepted successor URL/optional-group mapping only; preserve C1 resource contract |
| src/features/world/RuntimeMaterialQuality.ts | E | Late optional detail registration using current tier |
| src/features/world/LowQualityBatch.ts | E | Animated/mutable catalog targets excluded or correctly updated |
| src/features/world/PropMotionDirector.ts | N | Bounded deterministic local props/motif layers; no parallel character/camera owner |
| src/features/world/RoomClock.ts | N | Asia/Kolkata accurate readable clock texture, time/format/visibility seams |
| src/features/experience/controller.ts | E | Dispatch approved catalog local actions through existing arbitration |
| src/features/experience/interaction-registry.ts | E | Exact 25 entries/readiness and truthful unavailable outcomes |
| src/features/experience/intent-arbitration.ts | E | Existing priority/cooldown handling for new catalog local intents |
| src/features/character/greeting-controller.ts | E | True attention_glance, duplicate/coalesced greeting and canceled timer cleanup |
| src/features/room/painting-controller.ts | E | Catalog limits/explicit finite reaction while paused |
| src/features/room/environment-controller.ts | E | Base lamp/blinds preferences vs temporary motifs; finite action update |
| src/features/room/room-controls.tsx | E | Correct shared action dispatch and complete DOM equivalents only; C3 owns later layout |
| src/features/world/WorldRoot.tsx | E | Wire accurate readable clock/explicit outcomes only; preserve C1 loading, no mobile redesign |
| src/contracts/experience.ts | E | Add typed ACTIVATE_OBJECT intent with frozen catalog IDs; no new controller/preference system |
| tests/unit/interaction-registry.test.ts | E | Catalog entry/availability regressions |
| tests/unit/interaction-controller.test.ts | E | Catalog dispatch/single owner/route outcomes |
| tests/unit/intent-arbitration.test.ts | E | Cancellation and finite action/cooldown policy |
| tests/unit/character-director.test.ts | E | Eight clips/glance/posture/interrupt integration |
| tests/unit/scene-integrator.test.ts | E | Paired clip inventory and conforming nodes |
| tests/unit/entrance-coordinator.test.ts | E | Door/common timeline/Skip cleanup |
| tests/unit/painting-interaction.test.ts | E | Pointer threshold/settle/paused explicit response |
| tests/integration/runtime/frozen-world-binding.test.ts | E | R2 exact bindings and unique base/detail ownership |
| tests/unit/world/completion-catalog-behaviors.test.ts | N | Catalog physical/time/material behaviors |
| tests/integration/world/completion-door-entrance.test.ts | N | Visible room door/mixers/session teardown |
| tests/e2e/world/completion-catalog-outcomes.spec.ts | N | All 25 actual outcomes and keyboard/reduced-motion equivalents |

`src/features/experience/experience.ts` and `src/features/room/interaction-registry.ts` are not allocated; they do not exist and would duplicate existing modules. C2's narrow DOM wiring is explicitly sequential before C3; a hidden delivery-root-only permission cannot authorize it.

## FINISH-C3: initial framing and mobile/accessible controls

Output root `deliveries/FINISH-C3/`; follows accepted C2 candidate. E: `src/features/world/WorldRoot.tsx`, `src/features/world/world.module.css`, `src/features/world/StudioLauncher.tsx`, `src/features/room/room-controls.tsx`, `src/features/room/room-controls.module.css`, `src/features/portfolio/accessibility-controls.tsx`, `src/features/portfolio/accessibility-controls.module.css`. These own initial/persisted UI state, visible launcher wording, safe-area layout, focus/reachable controls and collapsed Room Controls.

E: `src/features/world/CameraDirector.ts` and `src/features/world/WorldRuntime.ts` only for choosing correct initial home-mobile/home-desktop framing from actual stage aspect/capabilities before first presentation and resize continuity; choreography/resource contracts remain frozen. N: `tests/e2e/runtime/completion-mobile-hud.spec.ts`. E: `tests/integration/production-camera.test.ts` and `tests/e2e/accessibility.spec.ts` only for affected framing/control assertions. No art, platform, SQL or unrelated character/physics edits.

## Art and final integration

B1-R2 owns only `deliveries/FINISH-B1-R2/`: exact exported/editable artifacts are in [asset contract](03-asset-bindings.md). No production TypeScript/SQL paths. It preserves original B1. No art change may silently alter resident/fixture skeleton or F1 geometry to satisfy erroneous prose.

I1 assembly writes a new explicitly bound candidate under `deliveries/FINISH-I1/`, then canonical paths only under a later Parent integration packet. Permitted assembly is the **union of exact accepted** A1, A2, B1-R2, C1-R2, C2 and C3 output mappings. No broad `src/**` permission. Required narrowly owned integration seams:

- E `src/features/world/StudioLauncher.tsx` and `src/features/world/WorldRoot.tsx`: thread optional accepted `SiteContent`/publication revision from A2 home into monitor launcher/commands after C3, without changing loading/layout.
- E `src/app/(public)/page.tsx`: pass the same published snapshot site/revision into StudioLauncher. A2 authorizes the page; I1 owns this final seam.
- E `public/asset-manifest.json`: regenerate from exact accepted runtime asset bytes with correct tiers/size/SHA-256 and actual canonical URLs.
- N `public/models/room.glb`, `public/models/resident.glb`, `public/models/fixture.glb`: copy exact accepted exports, no re-export. E `public/models/group-b-props.glb` and `public/models/on-demand-projects.glb`, E `public/textures/deskmat-topography.png`, E `public/textures/monitor-wallpaper.png`: exact accepted successor mappings when delivered/accepted. Any additional texture file mapping must be enumerated in the B1 acceptance/assembly manifest before I1.
- N `tests/integration/completion-successor.test.ts`, N `tests/e2e/completion-successor.spec.ts`: combined site/monitor/catalog/loading/mobile/release binding proof.

I1 cannot resolve a contract conflict by silently editing a maker's accepted revision. It returns the conflict to Parent and the assigned maker; accepted overlays stay immutable. Packaging metadata/release paths and actual dependency base are bound in its dispatch packet after predecessors exist.

## Sequential ownership summary

`WorldRoot`: C1 loading/pause -> C2 clock/outcome wiring -> C3 layout -> I1 published-site prop seam. `world.module.css`: C1 indicator -> C3 layout. `controller`/`experience` contracts: C1 preference compatibility -> C2 catalog intents. `RuntimeMaterialQuality`/`LowQualityBatch`: C1 late-map ownership -> C2 late-detail/animated bindings. `room-controls`: C2 semantic dispatch -> C3 layout. Platform content contracts remain A2 only. No simultaneous owner shares these source paths.
