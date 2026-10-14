# PRE-G7-11 - Fullscreen studio and domain-folder integration

Date: 2026-10-14 (Asia/Calcutta). This is a successor work order after Parent acceptance PRE-G7-10-R1.

## Accepted input and purpose

Use the accepted runtime source from commit `95729282af3d84b4e3158158546643935e737b7a`, app tree `e53f3ea9c6c80f471832e46d548206105699c32b`. Parent acceptance is `docs/planning/reviews/2026-10-14-pre-g7-10-runtime-acceptance.md`; its app-only source archive and binding are under `deliveries/G7/preparation/pre-g7-10-parent-acceptance/`.

The current studio entry can collapse into its narrow landing-page CTA wrapper. Integrate a full-viewport studio entry into the accepted app, keep the world controllable on short and mobile viewports, repair the inherited fallback contrast defect, and bring the local `yorayriniwnl.in/` source delivery folder into exact documented alignment with canonical `app/` source. This work does not deploy the site.

## Visual and product authority

The user-designated [main reference](../../../references/images/main-reference.png), [reference index](../../../references/README.md), and [product specification, section 7](../../superpowers/specs/2026-09-30-yor-world-design.md) govern the visible world. Preserve the white/ivory desk, blue-and-white chair, pink/lilac hex lights, cyan fill, plant and shelf grouping, monitor, speakers, console/microphone, PC, controller pegboard, and headset stand. Existing 3D room assets remain the source of the studio scene. Branding and navigation may frame the experience without replacing those anchors.

The fullscreen mechanics in PR #5 (`feature/fullscreen-cinematic-entry`, reviewed head `2a84162c8b5626ae3b150a9602ac4906bed39d05`) may inform the native-dialog approach only. Do not merge that branch wholesale. Do not import its brown illustrated hero, broad runtime/DPR/shadow policy, contact/indexing changes, dependency/configuration changes, or unrelated governance and test edits.

## Maker ownership

The maker owns only these application and delivery paths:

- `app/src/app/(public)/page.tsx`
- `app/src/features/world/StudioLauncher.tsx`
- `app/src/features/world/WorldRoot.tsx`
- `app/src/features/world/world.module.css`
- `app/tests/e2e/world-fullscreen.spec.ts` (new focused browser coverage)
- `app/tests/unit/world-runtime-recovery.test.ts` only if the new lifecycle requires a targeted regression; do not rewrite PRE-G7-10 tests
- The corresponding source files in `yorayriniwnl.in/src/` that are part of the local domain delivery mirror
- In particular, mirror `app/src/app/(public)/page.tsx` to `yorayriniwnl.in/src/app/(public)/page.tsx`
- `yorayriniwnl.in/README.md` and `yorayriniwnl.in/source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-11/`

Before changing the domain folder, inventory its current files and ignored paths. Preserve `.accepted-source-stage`, the intentionally excluded prototype files under `index.html`, `styles.css`, `favicon.svg`, `robots.txt`, `/about/`, `/contact/`, `/projects/`, and `/resume/`, local environment files, dependencies, `.next`, and test output. Do not copy build artifacts or secrets into the delivery folder. The folder is a local source delivery; it is not evidence of a live deployment.

Do not edit canonical room geometry, `app/public/` artwork/assets, approved publication data, project identity guards, dependency manifests, lockfiles, Next configuration, production policy, or unrelated routes. CandidateX must remain excluded from public content and return 404 in the local production build.

## Required behavior

1. **True fullscreen entry:** Entering the studio opens a native modal before the renderer measures its canvas. The dialog and stage use the available viewport (`100dvh` with a safe fallback); the canvas does not inherit the narrow CTA wrapper dimensions. Projects, About, Contact, Résumé, and Exit remain available as semantic controls in the studio.
2. **Keyboard and focus:** Entering the modal places focus inside it. Escape/Exit returns to the page and restores focus to the re-mounted entry control. Focus remains visible and keyboard navigation reaches every action. No focus target may disappear without an explicit return target.
3. **Responsive controls:** HUD, accessibility settings, dialogs, and bottom navigation remain reachable at desktop, mobile, 320x600, and short landscape (844x390) sizes. Reflow or allow intentional scrolling when necessary; screenshots and browser assertions must measure the stage/canvas and every control, not just the outer dialog.
4. **Fallback contrast:** Fix the inherited fallback action-label contrast in a scoped, consistent style. Preserve fallback heading, reason, Retry, Continue, Browse Projects, and Read About behavior. Add a source-bound contrast/accessibility check and browser capture.
5. **Reference fidelity:** Preserve existing room assets and visible anchors. Do not substitute a concept illustration for the live 3D room or add speculative scenery. Show source-bound desktop and mobile captures of the actual world beside the main reference.
6. **Domain folder binding:** The local domain delivery source must use the accepted app implementation for the corresponding files. `source-delivery-manifest.json` must identify the app source commit/tree, mirrored paths and their hashes, and excluded/generated paths. The README must accurately say local/not deployed and report the accepted source identity. Do not claim the public domain changed.
7. **Content and fallback integrity:** Preserve no-JS portfolio links, reduced-motion behavior, project route semantics, the accepted publication boundary, and accessible fallback behavior. CandidateX remains a 404.

## Evidence and validation

Use Node `24.19.0` and pnpm `9.15.9`. Return a report, exact diff, `SHA256SUMS.txt`, and raw output. Record exact parent base, maker source/evidence commits, app tree, local-folder source identity, file counts/hashes, versions, command exit codes, browser/GPU, viewport sizes, focus targets, stage/canvas/control measurements, and limitations.

Run focused fullscreen browser tests, focused world recovery tests, lint, typecheck, unit and integration suites, production build, route guard checks, and clean-profile production browser smoke. Include screenshots for desktop, mobile, and short landscape, keyboard entry/exit/focus restoration, the fallback contrast state, and the main-reference comparison. If the unchanged default 5-second unit timeout fails again, retain that failure and the full-suite result with a 15-second override; do not change the global test policy in this packet.

Do not use mocked GPU tests as physical GPU proof. Do not deploy, change DNS/provider settings, submit or merge a PR, or claim G7 acceptance.

## Review and acceptance boundary

After the maker commits and pushes, the independent local auditor performs a read-only review of the exact source commit, local-folder mirror manifest, screenshots, raw logs, test results, and checksums. The maker corrects any findings and the auditor reviews the exact delta. Parent alone accepts the source and local delivery binding. A passing packet still does not satisfy deployment, live provider/service, mobile physical-device, manual, monitoring, rollback, or G7 acceptance requirements.
