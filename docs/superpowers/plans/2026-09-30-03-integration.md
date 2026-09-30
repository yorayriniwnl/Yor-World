# YOR WORLD Integration and Release Implementation Plan

> **For assigned production workers:** Execute only the task and owned paths in your work order. Use the applicable execution skill where available; a browser chat is not assumed to have those skills or native tools. The parent Codex chat coordinates and audits. This document does not dispatch a worker by itself.

**Goal:** Join the platform and world into a coherent, accessible, measurable product and prepare a verifiable release.

**Architecture:** An experience controller translates inputs into abortable camera, character, lighting, UI, and navigation work. Public routes and content remain independent of the renderer.

**Tech Stack:** TypeScript, XState stable v5, React Three Fiber, Next.js router, Vitest, Playwright, axe, selected telemetry adapters.

**Spec:** [Product design](../specs/2026-09-30-yor-world-design.md), [Interaction catalog](../../planning/interaction-catalog.md), [Engineering](../../planning/engineering-and-content.md), and [Validation](../../planning/validation-and-production.md). Assignments and first packets: [Delegation hub](../../planning/delegation-and-work-orders.md).

## Global Constraints

- All product constraints C01–C17 apply.
- Public project, about, résumé, and contact information works without WebGL.
- Audio defaults off; explicit sound opt-in is required.
- Reduced motion disables camera travel and pointer parallax.
- Entrance choreography is at most 8 seconds after required assets are ready.
- Project presentation transitions delay navigation by at most 1.4 seconds.
- Exactly one camera controller and one full-body character action owner.
- Direct navigation, Skip, Escape, and failure handling cancel obsolete animation work.
- Frame-rate and loading numbers are targets until measured on the documented device/network protocol.
- After each completed code change in a verified Git repository, make a small scoped commit and push to its verified GitHub remote; report failures immediately. The present workspace is not Git and has no known remote. Do not invent a repository or claim a push for returned chat text.
- The main-image art direction is the bright white workstation, blue chair, pink/violet lighting, and cyan fill. Integration preserves the accepted art specification.
- The parent reviews architecture and evidence; assigned workers perform production and integration. An output needs review by someone other than its maker.
- Purchases, commissions, provider upgrades, and production-domain publication are separate owner decisions.

## Review Focus

- Rapid conflicting input never causes a stale transition to navigate later — C1/C2.
- Touch, keyboard, and reduced-motion users receive the same content outcomes — C1/C3.
- Browser Back, direct URLs, and content pages cannot require a live renderer — C2.
- A quality downgrade, hidden tab, or lost renderer cannot trap a dialog or lose navigation — C3.
- A release with different source/runtime/content revisions cannot be called verified — C4.

## Dependencies

C1 consumes A1's contracts and B3/B4/B5's directors. C2 consumes A2's public routes and Publication. C3 uses the completed interaction catalog. C4 requires all A/B/C work and approved external configuration. W1/W2/W3 in the delegation hub supply initial feasibility evidence only. A delegated integrator must combine their accepted revisions in a private development harness and prove coordinates, clip names, asset loading, and the renderer-independent shell before G1 closes.

The proposed integration lane is GPT-2, subject to actual tool access; aliases identify functions, not verified people or concurrent capacity. C1–C4 are issued separately with current inputs, owned paths, and a maker-independent reviewer. Only the assigned integrator updates shared root configuration, lockfiles, contracts, and release manifests after their owning task is handed over. Contract changes return to the parent for impact review and a revised task boundary.

If the room succeeds but a candidate project lacks verified content, keep that destination unavailable with an honest label and continue the independent work. Publication of the full V1 requires an explicit scope decision for any omitted candidate.

## Task C1: Interaction controller and physical room behavior

**Files:** Create src/features/experience/controller.ts, src/features/experience/interaction-registry.ts, src/features/experience/intent-arbitration.ts, src/features/room/objects/painting.tsx, src/features/room/objects/environment-controls.tsx, src/features/character/greeting.ts, src/features/room/room-controls.tsx, tests/unit/interaction-controller.test.ts, tests/e2e/physical-interactions.spec.ts.

**Interfaces:** Consume ExperienceIntent, Preferences, WorldSnapshot, CameraDirector, CharacterDirector, WorldLighting, and Publication. Produce createExperienceController(dependencies: ExperienceDependencies): ExperienceController with send(intent: ExperienceIntent): void, subscribe(listener: (snapshot: ExperienceSnapshot) => void): () => void, getSnapshot(): ExperienceSnapshot, stop(): void. ExperienceDependencies contains the injected adapters specified in engineering section 5. ExperienceSnapshot has phase ("loading" | "intro" | "explore" | "focus" | "panel" | "static"), activeProject: ProjectId | null, world: WorldSnapshot, preferences: Preferences, currentTransitionId: number, suspended: boolean, and paused: boolean.

InteractionRegistry maps stable catalog IDs to typed handlers and labeled DOM equivalents. Decorative actions use local controllers and cannot independently navigate.

- [ ] Write event-sequence tests: greet -> project -> Escape; Enter -> Skip -> stale completion; lamp off -> project focus -> cancel; repeated painting pointercancel; repeated greeting within 7 seconds. Assert no stale route change, one active camera owner, and preserved base preferences.
- [ ] Include "escape cancels a project without changing room preferences". With lamp off and blinds closed, begin focus, send Escape, and then resolve the old transition. Assert:

~~~typescript
expect(controller.getSnapshot().world.lampOn).toBe(false);
expect(controller.getSnapshot().world.blindsOpen).toBe(false);
expect(controller.getSnapshot().phase).toBe("explore");
expect(navigation.openProject).not.toHaveBeenCalled();
~~~

- [ ] Implement explicit priority/cancellation and the complete V1 local catalog. New intent replaces obsolete work; incompatible decoration is dropped rather than queued.
- [ ] Implement painting drag with 8 CSS px click suppression, 6-degree bound, 1.2-second settle, and capture release on every exit. Implement look-back with core avatar clips and a restrained repeat glance.
- [ ] Implement accessible Room controls, local lamp/blinds/clock preferences, speaker opt-in, and approved personal detail. Do not silently substitute an unrelated mascot or remove required interactions.
- [ ] Run pnpm test:unit tests/unit/interaction-controller.test.ts and pnpm test:e2e tests/e2e/physical-interactions.spec.ts. Review the physical feel on mouse and touch.
- [ ] Commit "feat: add coherent studio interactions", and push.

## Task C2: Monitor launcher, project transitions, and history

**Files:** Create src/features/monitor/ambient-display.tsx, src/features/monitor/launcher.tsx, src/features/monitor/commands.ts, src/features/experience/navigation-adapter.ts, src/features/experience/project-transition.ts, src/features/experience/return-snapshot.ts, tests/unit/project-transition.test.ts, tests/e2e/room-project-navigation.spec.ts.

**Interfaces:** Consume A1's PublicRoute. Produce NavigationAdapter.openProject(projectId: ProjectId): void and openRoute(path: PublicRoute): void. Produce startProjectTransition(projectId: ProjectId, signal: AbortSignal): Promise<void>. The experience controller alone decides whether completion should navigate; direct DOM navigation cancels immediately.

- [ ] Write tests asserting one-tap project entry, direct links without world imports, unknown project rejection, a 1.4-second maximum room transition delay, browser Back during transition, and no navigation from an aborted promise.
- [ ] Implement ambient -> focus -> HTML launcher states. Test transformed screen alignment and text clarity; use the specified framed-panel fallback if the browser fails those checks.
- [ ] Implement the five distinct project motifs within their time budget. Use project data from Publication and keep the direct accessible link available.
- [ ] Implement only the allowlisted terminal commands. Test strings resembling shell/code instructions are treated as unsupported text, never executed.
- [ ] Run pnpm test:unit tests/unit/project-transition.test.ts and pnpm test:e2e tests/e2e/room-project-navigation.spec.ts. Verify refresh, new-tab project URLs, Return to studio, and restored preferences.
- [ ] Commit "feat: connect studio objects to portfolio routes", and push.

## Task C3: Mobile, adaptive quality, accessibility, and failure recovery

**Files:** Create src/features/room/quality-policy.ts, src/features/room/static-fallback.tsx, src/features/experience/reduced-motion.ts, src/features/experience/audio.ts, src/features/portfolio/accessibility-controls.tsx, tests/unit/quality-policy.test.ts, tests/e2e/accessibility.spec.ts, tests/e2e/renderer-recovery.spec.ts, tests/performance/world.spec.ts, playwright.performance.config.ts. Add package script test:performance = playwright test --config playwright.performance.config.ts.

**Interfaces:** Produce chooseInitialTier(capabilities): QualityTier, updateTier(samples, currentTier, userPreference): QualityTier, AudioController.setEnabled(enabled: boolean): Promise<boolean>, and AudioController.dispose(): void. The audio result reports actual enabled state if the browser denies activation.

- [ ] Write tests for noisy frame timings, downgrade/upgrading windows, denied local storage, reduced-motion changes at runtime, audio rejection, renderer loss with an open dialog, and canceled retries.
- [ ] Implement authored mobile framing, accessible DOM project rail, same single-tap semantics, static fallback, paused animation, actual sound-state controls, and tier changes at safe points.
- [ ] Run keyboard and screen-reader tasks; fix focus, labels, contrast, reflow, and touch targets. Automated checks supplement manual testing.
- [ ] Run pnpm test:unit tests/unit/quality-policy.test.ts; pnpm test:e2e tests/e2e/accessibility.spec.ts tests/e2e/renderer-recovery.spec.ts; pnpm test:performance. Use the exact device/network protocol from the validation spec.
- [ ] Record five cold loads per profile, a 60-second interaction run, a 10-minute physical mobile session, and enter/exit resource stability. Unavailable physical hardware remains an explicit verification gap.
- [ ] Commit "feat: support mobile and resilient studio presentation", and push.

## Task C4: Release evidence, CI, restore, and publication

**Files:** Create .github/workflows/ci.yml, scripts/release/validate-release.mjs, docs/operations/release-checklist.md, docs/operations/restore-record.md, docs/releases/<release-id>.md. Update the current asset/publication manifests only through reviewed release work.

**Interfaces:** Produce ReleaseManifest { commit: string; assetRevision: string; publicationRevision: number; schemaRevision: string; checks: Array<{ name: string; status: "pass" | "fail" | "unverified"; evidencePath: string }> }. Release validation rejects missing required checks or mismatched revisions.

- [ ] Write release-manifest checks for mismatched assets/content, missing approval/provenance, and an unverified required platform. Verify failures before implementing the acceptance logic.
- [ ] Add CI with frozen install, lint, typecheck, unit, integration/policy, asset validation, build, E2E/accessibility, and relevant budget checks. Do not add production secrets to untrusted pull-request execution.
- [ ] Rehearse database/content restore and asset rollback in staging. Verify the recovered public route, admin denial behavior, and contact receipt after recovery.
- [ ] Perform an end-to-end release review against P01–P14 and the V1 definition of done. Record actual limitations and approved scope exceptions; do not promote a preview by renaming it.
- [ ] Commit "chore: add verified release workflow", and push. Prepare an immutable staging candidate with exact release evidence.
- [ ] Obtain the owner's production-domain/publication decision against that concrete candidate. Verify account costs and domain configuration before any paid or public change.
- [ ] After authorized deployment, test live home, direct case study, static mode, intro/skip, contact receipt and delivery, admin denial, cache headers, and rollback availability. Record the actual production URL and revisions.

## Handoff

The user has authorized the full vision and a division of production work. The parent remains architect, coordinator, and auditor. Two GPT Plus, three Gemini AI Pro, and fifteen Claude free browser accounts are reported resources; native execution, API access, account limits, and throughput remain unverified. The [delegation hub](../../planning/delegation-and-work-orders.md) contains the account lanes, first three copy-paste packets, ownership rules, and status board.

No external task has been dispatched or account connection created. Workers with verified workspace access start at [START_HERE.md](../../../START_HERE.md) and read the packet's local inputs directly. Claude browser reviewers use [versioned review packets](../../planning/browser-review-workflow.md); a local worker archives their returned findings and executes requested runtime checks. Do not repeat the scope approval or represent an unsent packet as active. A worker that can only generate scripts returns actual files and reproduction commands marked NOT RUN; a capable local worker or the user executes them. Parent review does not convert that artifact into a tested result.

The integrator receives accepted delivery folders/patches, exact input revisions, source/provenance records, test logs, and unresolved defects. It applies only assigned files, runs combined checks, returns the resulting files and evidence, and performs scoped commit/push only after the real repository and remote are verified. Repository identity is required before that Git step; it does not prevent isolated proof deliveries. Purchases, commissions, and production publication remain separate decisions against concrete results.
