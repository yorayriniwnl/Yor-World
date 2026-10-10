# R2 runtime loading, ownership and pause contract

This is an architectural specification, not production TypeScript. C1-R2 implements it against the exact canonical app base; C2 later switches to independently accepted B1-R2 exports. The [ownership table](04-path-ownership.md) authorizes every affected source consumer explicitly.

## Asset readiness and identity

C1 retains current required URLs `/models/production-room-full.glb`, `/models/resident-production.glb`, `/models/fixture-production.glb`. Required readiness means all three decoded, validated against current integration requirements, integrated, essential directors/bindings/materials installed and renderer usable. Optional work never blocks entrance. Startup schedules a real coding action before the first rendered world frame; frame/bone capture is required to prove movement.

C2 replaces required URL definitions with `/models/room.glb`, `/models/resident.glb`, `/models/fixture.glb`, each bound to accepted B1-R2 hashes. These are a sole base room, resident and chair fixture. Readiness also validates the R2 binding inventory. Existing source field `w1Gltf` may remain an internal alias for the room, but filename guessing or hidden adapters are forbidden.

The old `/models/interaction-assets.glb` and mobile variant are **not requested or mounted by successor C1/C2**. C1 can retain `LoadedAssets.interactionGltf` as a deprecated always-null field for compatibility. Visible current-room targets and DOM controls remain functional. C2 binds all new required prop bases to the essential room/fixture. Optional `group-b-props.glb` adds incremental detail only, never a second room, duplicate prop bases, resident or chair. Optional project effects are on demand, not entry prerequisites. Low tier does not fetch optional prop GLTF. See [exact bindings](03-asset-bindings.md).

Each WorldRuntime instance has a monotonically unique runtime generation and a lifecycle token. The pair defines a session identity; an integer reused by a new LifecycleManager cannot revive prior work. No global mutable retry limit is shared across concurrent loader sessions.

The documentation-level interface to implement is:

```typescript
type AssetSessionId = Readonly<{ generation: number; token: number }>;
type OptionalAssetResult =
  | { session: AssetSessionId; id: "deskmat" | "wallpaper";
      kind: "texture"; resource: THREE.Texture }
  | { session: AssetSessionId; id: "prop-details" | "project-effects";
      kind: "gltf"; resource: GLTF };
type Adoption = "adopted" | "rejected";
// Called synchronously only after complete decode and current-session fencing.
type OptionalConsumer = (result: OptionalAssetResult) => Adoption;
```

Loader owns each result until a synchronous consumer returns `adopted`; runtime owns it thereafter. Loader disposes on rejection, exception or stale/aborted completion. No callback receives partial results or null success. Optional failures produce sanitized diagnostics and retain base materials/behavior. Consumer installation occurs before optional work starts, so immediately resolving optional assets cannot race runtime initialization. It may buffer results in the loader's ledger until runtime integration acknowledges readiness.

## Resource lifecycle and consumers

A session resource ledger in `asset-resources.ts` tracks geometries, materials, textures/ImageBitmaps, scenes and transient object URLs by object identity. Source GLTF resources pruned out of the integrated tree remain owned and must be released. Shared texture/material references have one dispose operation, not one operation per referencing mesh.

1. Loader creates fetch/parse/decode resources and registers them. Required partial successes remain loader owned until the whole essential set is adopted. Required failure disposes every earlier success and cancels sibling work.
2. `finally` revokes object URLs after texture decode success or failure; rejection is not allowed to skip cleanup. AbortSignal can cancel fetch/readers/timers, but parsing/decoding completion must be fenced separately. If underlying decode cannot stop, its eventual result is disposed without callback/scene insertion.
3. Runtime registers late deskmat on `desk_mat`/`Desk_MatTopography` and wallpaper on `monitor_screen_center`/`Monitor_ScreenWallpaper`; for current C1 base validate these actual existing targets. Clone a target material when a shared material would otherwise affect unrelated meshes. Preserve original UVs, texture transform and base fallback. Color maps use sRGB. Missing target rejects/disposes the result and logs only asset ID/reason.
4. `RuntimeMaterialQuality` refreshes/registers new maps/materials with the current tier; originals and low-quality replacements must refer to the accepted map. `LowQualityBatch` must invalidate/rebuild only affected static batches if a map/late scene changes their materials, or conservatively exclude those mutable targets. Quality switching cannot restore a stale texture or reveal optional details prohibited by low tier.
5. C2 registers late detail roots through `WorldInteractionBinding.registerOptionalDetails`, checking their inventory against already bound visible base IDs. On-demand project-effects use the same fenced resource ledger and adoption handshake, attach only their exact Project_Effects_Root to existing motif consumers, and never delay routing beyond 1.4 seconds. Late detail must neither steal pointer precedence nor introduce a new controller. No direct add of an unregistered full scene. Quality/light configuration applies before it becomes visible.
6. Dispose ordering: mark stale/abort, remove consumer callbacks/listeners/timers, stop directors/interactions, restore/remove quality/batch derivatives, dispose the owned resource ledger once, clear scene, dispose renderer/context. Runtime owns adopted assets; quality/batch objects own only their generated derivatives. They must not independently dispose source textures. Async late completions still clean themselves after runtime teardown.

Retry, Exit, navigation, failure and context recreation invalidate the session pair. Skip during LOADING cancels downloads and presents the useful portfolio; it cannot pretend absent assets form HOME. Skip during ENTRANCE cancels presentation and optional downloads while retaining adopted essential assets, immediately settling a coherent HOME. Navigation/Exit discard all assets. In each case stale optional completion cannot change UI/scene.

## Factual progress, retries and watchdog

Use a discriminated progress shape; all consumers, including LifecycleManager and WorldRoot, must handle it instead of arithmetic on a -1 sentinel:

```typescript
type ByteProgress =
  | { kind: "indeterminate"; reason: string }
  | { kind: "determinate"; scope: "required-session";
      loaded: number; total: number }; // finite 0 <= loaded <= total, total > 0
type LoadingProgress = {
  session: AssetSessionId; stage: string; bytes: ByteProgress;
  requiredLoaded: number; requiredTotal: number;
  optionalLoaded: number; optionalTotal: number;
  attempt: 1 | 2 | 3; maxRetries: 2; failedAsset?: string;
};
```

Determinate scope is the frozen set of three required asset requests for this session/current attempts, excluding optional work, cinematic time and previous failed-attempt bytes. A numeric value is allowed only when **every** required response has a trustworthy finite positive identity/uncompressed representation length and numerator counts the same representation. Sequential requests may remain indeterminate until all needed headers/lengths are confirmed. Encoded/compressed transfer lengths cannot be divided into decoded `Response.body` counts; absent/unexposed encoding/length information, mismatched final sizes, chunked/unknown lengths and uncertain cache metadata invalidate the ratio. A trusted manifest may identify bytes but cannot make compressed transfer accounting interchangeable. At EOF compare counted bytes with expected identity length; mismatch invalidates determinate state rather than clamping a fabricated total. Concurrent totals sum each request exactly once. Retries replace the failed attempt's count; stage identifies retry and the UI announces the new attempt. Optional progress is a separate processed-count/status after readiness, never part of entry percent.

WorldRoot renders a progressbar with aria-valuenow only for valid determinate scope, calculates the ratio once from that shape, and omits aria-valuenow for indeterminate progress. Accessible status announces stage transitions without announcing every byte. No fallback simulated percentage remains in LifecycleManager.

Each failed request has at most **two automatic retries, three attempts total** with abortable waits of exactly **500ms then 1500ms**. Runtime does not accept an override above two; optional failures use the same ceiling or stop sooner. AbortError is never retried. Remove abort listeners on timer resolve/reject. Manual Retry is separate: up to the existing three explicit recreation attempts per mounted launcher, preserves preferences, and establishes a new generation. Continue/Exit remain available after exhaustion.

The watchdog triggers after **15,000ms without new required forward progress**, measured from entry/session start or last new required byte high-water/completed decode/integration stage. Repeated already-seen retry bytes, optional progress and arbitrary stage strings do not postpone it. On trigger cancel the obsolete loading session, dispose partial assets and offer **Retry 3D** / **Continue with Portfolio** without trapping focus. Remove the timer on readiness, teardown or generation change. Stalled parse/decode is covered even if network fetch completed. A healthy slow transfer may advance the watchdog; it still faces the frozen measured readiness budgets, which are separate outcomes.

User cancellation dispatch/token invalidation and coherent visible response must occur <=50ms in the measured browser path. Uncancelable decode cleanup can finish later; it has no authority to delay navigation, mutate UI or retain resources. A Node catch-all under 500ms does not establish this threshold. Entrance duration remains <=8 seconds **after essential readiness**, separate from downloads.

## Persistent pause and civil time

Extend existing `PreferencesSchema` with `paused: z.boolean().default(false)` and `defaultPreferences.paused = false`, retaining `version: 1` and existing storage key. Older valid v1 data without paused parses to false; no existing field is renamed. `SET_PAUSED` updates the existing PreferencesStore and ExperienceController snapshot. PreferencesStore retains a document-scoped validated memory copy when storage is denied so new runtime instances on that document restore the last choice; cross-reload persistence cannot be promised when the browser denies storage. Existing return-snapshot consumers serialize/parse the new default compatibly. One store/controller remains the authority; UI refs must subscribe to current preference rather than a never-updated initial value.

| State/action | Required behavior |
| --- | --- |
| Initial entry | Restore preference before director/frame activation; default sound off remains independent |
| HOME paused | Stop avatar idle/breathing/mouse loops, fan/ambient/shader variation and decorative clock ticks; maintain readable current time |
| Explicit greeting/plant/painting/project action | Run one bounded requested action and safe return, then resume frozen idle; never turn global pause off |
| Navigation/Skip/Escape | Remain immediate; camera cancellation/settling and routing do not wait for idle motion |
| Retry/failure/context recreation | Preserve pause and sound/clock/quality preferences; no unconditional false reset |
| Exit/re-entry, route return | Read saved/current document-memory preference before constructing runtime |
| Hidden tab | Suspend render/sampling/audio and decorative updates; no change to user's pause preference; on show reset dt and reconcile time before presentation |
| Reduced motion | Preserve complete actions with immediate/static acknowledgments; no camera travel/parallax; remains independent of pause/sound |
| Denied/corrupt storage | Safe validated memory/default behavior and useful controls; report persistence limit accurately |

Civil time is sampled from actual wall time using `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"`, honoring clock24h. Update readable DOM/clock text at minute boundaries while visible even when decorative motion is paused. No animated hand/tick/colon is necessary; hidden-tab return reconciles wall time before the next frame. Pause must never label a stale 17:49 texture as real time. C1 establishes timing/pause seams; C2 implements the actual clock surface/DOM presentation. A2 does not own preferences.

## Required maker evidence

Bind source replacements/patch, dependency lock and production build hashes to command receipts. Test held optional fetch/parse/decode through actual loader consumers, required failure after earlier success, callback throw/reject, immediate optional result before integration, compressed/unknown/mismatched lengths, parallel requests/retry counters, paused retry/re-entry/denied-storage and clock hidden-return. Real browser fault injection must exercise the 15-second watchdog, <=50ms cancellation, actual first rendered idle, navigation during pause, quality switches after late maps, and repeated enter/exit cleanup. Exact stage/mock/Node/browser/physical scope is reported separately; self-created callbacks and mock canvases cannot pass rendered requirements. Discover actual successor test counts; old counts are not targets.
