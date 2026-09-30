# YOR WORLD product design

Date: 2026-09-30  
Revision: 2  
Status: main-reference and delegation correction; implementation has not begun.

## 1. Intended outcome

Create a memorable personal portfolio in which the visitor enters a developer's studio, is acknowledged by the resident character, and discovers substantive engineering work through physical objects. Curiosity and efficient evaluation must both be supported.

The user requests the complete project from scratch, with parent Codex acting as architect, coordinator, and auditor and delegating implementation and production labor. Reported resources are 2 ChatGPT Plus accounts, 3 Gemini AI Pro accounts, and 15 Claude free browser accounts; access, integrations, API entitlements, and capacity are unverified. The supplied discussion establishes the ambition and examples, while the newly designated main image takes precedence over earlier visual proposals.

The primary audience is recruiters, hiring managers, collaborators, and other developers. This audience choice is an explicit planning assumption based on the portfolio brief. The public identity is provisionally Ayush Roy / YOR, as shown in the supplied material; titles and biography must be verified before publication.

Success means the visitor can identify the creator's actual capabilities, inspect supporting work, and make contact, while the room feels coherent and responsive.

## 2. Alternatives considered

| Approach | Strength | Limitation | Decision |
| --- | --- | --- | --- |
| Interactive 3D room over a complete semantic portfolio | Delivers the requested presence, physicality, and direct access | Requires substantial art/runtime integration | Recommended |
| Prerendered film or image with hotspots | Predictable image quality and a lighter runtime | Cannot fully deliver arbitrary character and object reactions | Fallback presentation, not the core product |
| Freely navigable first-person room | Broad exploration and game-like freedom | More room production, collision/input complexity, motion discomfort, and discoverability problems | Outside V1 |

For the backend, a modular application with managed database/auth/storage is the proposed baseline. A separate NestJS service is viable but adds another deployment and API boundary before an independent workload requires it. The architecture leaves server modules separable if a later need justifies extraction.

## 3. Product requirements

| ID | Requirement | Evidence at acceptance |
| --- | --- | --- |
| P01 | Name, role, Projects, About, Contact, and Résumé are available before world assets finish loading | Fresh-load browser recording; keyboard test |
| P02 | First-time visitors can choose Enter studio or View projects | Both paths work without waiting for the other |
| P03 | Door opens, camera enters, character acknowledges the visitor, and exploration begins | Complete sequence on target devices |
| P04 | Clicking the character produces a restrained look-back and return to work | Repeated-input and interruption tests; animation review |
| P05 | Painting responds physically to pointer/tap and settles | Mouse, touch, keyboard, and reduced-motion verification |
| P06 | Every published project has a real route and a working room entry point | Direct load, refresh, browser Back, and full portfolio comparison |
| P07 | Room state and animations remain coherent under rapid or conflicting input | Deterministic event-sequence tests |
| P08 | Meaningful content and actions are available without WebGL | WebGL-disabled and JavaScript-disabled content inspection |
| P09 | Mobile has an authored composition and single-tap semantics | Physical-device review in portrait and landscape |
| P10 | Admin can draft, preview, publish, and roll back verified content | Authorized and unauthorized integration tests |
| P11 | Contact produces a durable receipt or an honest failure | Delivery outage, duplicate-submit, and validation tests |
| P12 | Motion, audio, downloads, and thermal load are controlled | Budget report and sustained-device runs |
| P13 | Public claims and assets have evidence and provenance | Content/asset manifest review |
| P14 | A release can be reproduced, observed, backed up, and rolled back | Clean checkout, restore rehearsal, and release record |

## 4. V1 baseline and full-product scope

The full V1 contains:

- One enclosed studio plus the short entrance zone, with deliberately authored camera positions.
- One seated stylized character with greeting, typing, pointer awareness, and local reactions.
- Five proposed project destinations: CandidateX, Helios, Zenith, AI vs Real, and Yor Talks. A project may only become public after its identity, links, role, and evidence are checked.
- Conventional project, about, contact, and résumé pages.
- A monitor with an ambient display and usable project launcher.
- Meaningful physical interaction for the character, painting, monitor, PC, energy model, camera, microphone, books, phone, lamp, window/blinds, clock, and speakers.
- Small environmental reactions for plants, keys, and the chair.
- One restrained discoverable easter egg.
- Owner administration, content versioning, GitHub metadata caching, contact receipt/delivery, and privacy-minimal event measurement.
- Mobile, reduced-motion, reduced-quality, and non-3D presentations.

Full physics throughout the room, arbitrary furniture rearrangement, free walking, VR, multiplayer, a public user account system, simulated operating-system internals, generative character dialogue, real-time weather APIs, and external project applications embedded inside the monitor are outside V1.

Mug pickup/drinking, wearing headphones, several interactive drawers, additional weather/daylight scenes, alternative moods/greetings, and an expanded set of 5–8 easter eggs remain queued full-product milestones after the V1 baseline. They are not discarded or promised in V1, and baseline acceptance does not complete them. Each work order must identify its asset/rig dependencies, estimates, state tests, and performance checks; user likeness/voice sources are required only for work that uses them. These assets and sources are not yet verified.

## 5. Experience and navigation

### First visit

The first HTML response provides a composed poster, creator identity, conventional navigation, and the two primary actions. Heavy 3D assets are loaded on Enter studio. An optional small doorway preview may be prefetched only after the page is idle and a suitable connection is detected.

While downloading, display actual loading stages, with a byte-based percentage only when total bytes are known. Keep View projects and Cancel available. Never display a simulated percentage.

After the essential room and avatar are ready, play an 8-second entrance. Skip intro is always available. Download time and cinematic time are separate measurements.

On completion, show one short instruction: "Explore the room, or use Projects." Show the object label on hover/focus; the first interaction dismisses the instruction.

### Returning visit

Persist an intro-completed flag and the user's presentation preferences. The landing page still exposes Enter studio and View projects. Enter studio opens the home composition without the full intro; Replay entrance remains available. A return from a case study in the same tab restores the room snapshot and skips the entrance.

### Quick evaluation

Projects is one navigation action. CandidateX can be reached from the project list or a visible featured link. No cinematic, sound choice, room load, or terminal command is required.

### Case study transition

A room project interaction provides local acknowledgment immediately and a transition lasting at most 1.4 seconds before route navigation. If media/route preparation is slow or a reduced-motion preference applies, navigate directly.

The case study is an ordinary document with headings, figures, links, and readable text. Full-screen world rendering stops on substantive content routes. Returning restores chosen lamp/blinds/audio preferences, not half-finished animations.

### Failure

World failure leaves the HTML portfolio visible. Offer Retry 3D and Continue with portfolio. Unavailable GitHub data is labeled unavailable/stale. Contact failure does not display a sent confirmation. Missing project evidence cannot be replaced by fabricated results.

## 6. Interaction principles

- A hover can suggest; a click/tap commits. Hover never navigates or starts long character choreography.
- A local physical reaction normally leaves the camera still.
- Project activation has a distinct, short audiovisual response and a clear label.
- One controller owns camera movement. One character director owns the active full-body action.
- Escape, Skip, conventional navigation, sound mute, and accessibility controls remain usable during cinematics.
- Direct navigation cancels presentation work immediately. Browser history is never delayed by a decorative animation.
- Essential actions have DOM equivalents. Decorative reactions are available through a compact Room controls panel without putting dozens of tiny mesh targets in the tab order.
- Reduced motion disables parallax and travel, shortens physical responses, and removes strobing/flash effects.
- Default audio is off. The Enter studio gesture alone is not consent to enable sound.

See [Interaction catalog](../../planning/interaction-catalog.md) for object-specific contracts.

## 7. Visual decision

Follow the user-designated [main image](../../../references/images/main-reference.png): a white/ivory drawer-supported desk, blue-and-white chair, prominent pink/lilac hex lights, cyan ambient fill, warm monitor light bar, plant-lined shelves with a camera, central monitor and two round desktop speakers, left console/microphone, and right PC, controller pegboard, and headset stand. Its rounded stylized materials, object placement, gaming props, and light balance define the visual baseline. The [reference index](../../../references/README.md) locates supplementary inputs; the [manifest](../../../references/manifest.json) preserves source provenance.

Preserve those visible anchors. Personal branding and project entry points are additions, not permission to remove the console/controllers or replace the composition. Earlier images and the video may inform details absent from the main view; the dark portfolio reference no longer sets the palette or lighting. Exclude floating fantasy terrain, repeated robot mascots, and decorative UI panels from the room shell.

Doorway/reverse-wall geometry, seated avatar, interactive painting, window/blinds, and added project objects are authored extensions: the main image does not establish their shape or placement. Fit them through blockout and camera review without obscuring the visible anchors. Semantic portfolio navigation remains a parallel HTML layer. Require both a legible gray-material pass and a side-by-side reference view; a gray pass alone cannot establish color or composition fidelity.

Exact outfit, hair, face, signature artwork, and personal objects require the user's visual review during art production. The supplied illustrations are not proof of personal likeness or ownership.

## 8. Content integrity

Every project publishes its problem, the user's actual contribution, scope, architecture, decisions, limitations, evidence, and verified links. Quantitative claims include source, measurement date, and context. "Unknown," "not measured," and "not deployed" are valid internal evidence states; unsupported public claims are omitted.

Project labels in this plan are candidates taken from the supplied discussion. No repository, deployment, research publication, certification, or author attribution was audited for this planning task.

The studio's code and screen activity are labeled illustrative when necessary. Do not imply that a prerecorded animation is live work or that cached GitHub activity is real-time.

## 9. Architecture boundary

The product has three independently testable subprojects:

1. **Platform:** semantic portfolio, content services, authentication, admin, contact, and publishing.
2. **World:** source assets, export validation, render lifecycle, room, camera, and avatar.
3. **Integration:** input arbitration, physical reactions, navigation, monitor behavior, quality adaptation, and release validation.

The platform runs without the world. The world runs in a development harness using explicitly labeled fixtures. Integration joins them through typed project IDs and events.

Use one Next.js application with server modules, React Three Fiber for the world, XState for experience coordination, GSAP for finite camera timelines, and Blender for source assets. Supabase is the proposed managed backend. See [Engineering and content](../../planning/engineering-and-content.md) for alternatives, boundaries, and sources.

## 10. Global constraints

These identifiers are binding within this draft and are referenced by implementation tasks.

- C01: No invented biography, authorship, project metrics, deployment status, or asset rights.
- C02: Public project, about, résumé, and contact information works without WebGL.
- C03: Audio defaults off; explicit sound opt-in is required.
- C04: Reduced motion disables camera travel and pointer parallax.
- C05: Entrance choreography is at most 8 seconds after required assets are ready.
- C06: Project presentation transitions delay navigation by at most 1.4 seconds.
- C07: Exactly one camera controller and one full-body character action owner.
- C08: Direct navigation, Skip, Escape, and failure handling cancel obsolete animation work.
- C09: No public write access to content, contact records, admin roles, or private assets.
- C10: Admin writes require verified identity, current owner authorization, and MFA.
- C11: Only approved media and content revisions enter the public publication snapshot.
- C12: Frame-rate and loading numbers are targets until measured on the documented device/network protocol.
- C13: Finished code changes are scoped, committed, and pushed; failures are reported immediately.
- C14: Purchases, commissions, provider upgrades, and production-domain publication are separate owner decisions.
- C15: Source assets and runtime assets are independently versioned; asset replacements cannot silently change an existing release.
- C16: The user-designated main image governs visible room composition, palette, lighting, and gaming props; authored additions are identified and reviewed against it.
- C17: Parent Codex owns architecture, coordination, and audit; delegated workers return scoped deliverables and evidence. Subscription counts do not establish tool access or API capacity.

## 11. Owner inputs and timing

These inputs are not required to review this planning package.

| Input | Current status/default | Required before |
| --- | --- | --- |
| Team/resource model | Confirmed: parent Codex as architect/coordinator/auditor; labor delegated | Apply throughout production |
| Provider account resources | User reports 2 ChatGPT Plus, 3 Gemini AI Pro, 15 Claude free browser accounts; local GPT/Gemini access and browser handoffs unverified | Assigning provider-dependent work |
| Main visual reference | Confirmed: bright studio image named in section 7 | All visual work orders |
| Weekly available focused time | Unknown; schedules show scenarios | Calendar commitment |
| Public display name and precise professional title | Ayush Roy / software engineer is provisional | Public content approval |
| Avatar reference and likeness preference | Stylized, moderate detail; no verified portrait | Final character modeling |
| Project repositories, live URLs, role and evidence | Five candidate names; facts unknown | Publishing case studies |
| Research/certification proof | Unknown | Publishing those sections |
| Reusable .blend/.glb/rig/audio assets and rights | None verified | Asset reuse |
| GitHub repository owner/name/visibility | Unknown; folder is not Git | Remote creation and first push |
| Domain and provider accounts | Unknown | Staging/production provisioning |
| Spending ceiling | No purchase authorization; flag any cost | Any paid action |
| Contact address and résumé | Unknown | Contact and résumé go-live |

## 12. Completion and review

The planning package is reviewable when all required behaviors have a catalog entry, every subproject has implementation tasks, failures have specified responses, and performance/production assumptions are explicit.

A shipped V1 must meet the acceptance matrix in [Validation and production](../../planning/validation-and-production.md). A render, successful local build, or passing unit suite alone does not establish release readiness.

Complete-project delivery also requires the queued milestones in section 4 to meet their own work-order acceptance criteria; a V1 release does not retire that backlog.

The user requests the complete project from scratch. This revision records the planning baseline and does not claim implementation or publication. See [Delegation and work orders](../../planning/delegation-and-work-orders.md) for execution ownership and handoff requirements.
