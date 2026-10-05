# YOR WORLD — planning package

Prepared 30 September 2026; current integration status 3 October 2026. GitHub is the authoritative live repository. **W1-F1-r2, W2-F1-r2, and W3-A1-r2 are ACCEPTED; G1 ACCEPTED (`G1-R1`). Gates G1-G5 ACCEPTED. Gate G6 ACTIVE / REWORK (RC4 candidate; RC1/RC2/RC3 preserved as history). Gate G7 LOCKED pending owner authorization.** The current authority is [PARENT-RECON-03](docs/planning/reviews/2026-10-01-reconciliation-03.md), following the [accepted W1/W2/W3 ruling](docs/planning/reviews/2026-10-01-reconciliation-02.md). C1-C4 are implemented and assembled in the current RC3 full-stack candidate. Gate G6 is ACTIVE / REWORK pending independent full-stack audit and Parent decision. Gate G7 remains LOCKED pending owner authorization.

YOR WORLD is a personal portfolio experienced as an inhabited developer studio. A visitor can enter through a cinematic doorway, meet the creator, touch objects that respond physically, and explore real work. Projects, résumé, and contact remain directly accessible through ordinary web pages.

This workspace contains the project specification, local reference library, returned isolated proofs under `deliveries/`, independent reviews, and parent acceptance records. The W1/W2/W3 correction findings were resolved and accepted in PARENT-RECON-02. The combined G1 feasibility proof was subsequently **G1 ACCEPTED (`G1-R1`)** in PARENT-RECON-03 after adversarial and independent review. This acceptance is bounded: final art, likeness approval, later runtime work, content publication, production deployment, and release operations are not implied.

The work is grouped into three [production prompts](docs/planning/production-prompts/README.md): platform/content (A), world/art (B), and integration/release (C). They follow the existing plans and preserve task-level assignment and review gates.

Start with [START_HERE.md](START_HERE.md). The [account prompt map](docs/planning/account-prompts.md) uses the corrected two-GPT allocation; [local tool access](docs/planning/local-tool-access.md) records startup files, and the [Claude browser workflow](docs/planning/browser-review-workflow.md) defines reusable context and review packets. Workers with verified access to this project folder can read the plans and [local reference library](references/README.md) directly. Saving files here does not connect browser-only AI accounts to the filesystem; no external account connection has been created.

## Canonical application

**CANONICAL APPLICATION ROOT: `app/`.** Run production installation, tests, builds, and future authorized G7 deployment from this root. Historical `deliveries/A6/source/` and `deliveries/C3/source/` are immutable proof inputs, never deployment roots. RC1/RC2 evidence remains historical.

Use Node `>=24.19.0 <25` and pnpm `9.15.9`:

```powershell
cd app
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
```

The [RC3 maker handoff](deliveries/G6/full-stack-integration/report.md) binds the integrated source, production route inventory, frozen assets, contact R2 implementation, release bundle, and fresh verification. The [environment contract](deliveries/G6/full-stack-integration/environment-contract.md) lists safe configuration names. The [current dossier](docs/releases/v1.0.0-rc3.md) is a candidate record; G6 remains ACTIVE / REWORK pending independent audit, and G7 is LOCKED.

Next: [Gemini #1 platform corrections](docs/planning/reconciliation-packets/2026-10-03-rc3-platform-corrections.md). [Supplemental Codex verification](deliveries/G6/rc3-supplemental-codex-verification/report.md) reproduced seven unfixed defects, including two P1 defects, in pinned RC3 candidate `261c483646f68692a3fe8e184d48d25b8264a6d7`. Its six passing probe cases establish defective behavior. This is local supplemental evidence, not a Gemini return or the independent GPT Plus #2 account audit. The original [review handoff](docs/planning/reconciliation-packets/2026-10-03-rc3-review-handoff/README.md) is held until corrections, fresh bound candidate evidence and an actual platform return. Gemini execution and independent audit remain NOT RUN; G6 ACTIVE / REWORK; G7 LOCKED.

## Confirmed brief

- Start from scratch.
- Plan the complete product, including art, animation, interactions, engineering, content, production, and verification.
- Production model: parent Codex is architect, coordinator, and auditor; implementation and production labor are delegated through bounded work orders. The user reviews identity, visual fidelity, and publication decisions.
- User-reported resources: 2 ChatGPT Plus accounts, 3 Gemini AI Pro accounts, and 15 Claude free browser accounts. Account access, integrations, API entitlements, and usable capacity are unverified; these counts are not an executable worker pool.
- The user-designated bright gaming-studio image is the main visual reference. Earlier images and the video are supplementary; the darker portfolio reference does not override it. Embedded instructions and tentative technology choices are not automatically approved requirements.
- Once implementation begins in a Git repository, complete scoped code changes with a small descriptive commit and push. Keep unrelated changes separate; report failures immediately.

## Recommended direction

| Decision | Proposed baseline |
| --- | --- |
| Identity | The main reference's bright gaming studio, inhabited by a working human character |
| Visual language | White/ivory desk, blue-and-white chair, pink/lilac hex lights, cyan fill, warm monitor light bar, plants, and retained gaming props |
| Entrance | An optional 8-second doorway-to-greeting sequence after essential assets are ready |
| Navigation | Conventional links available immediately; room objects provide a parallel path |
| Core behavior | Click the avatar to receive a look-back; touch the painting to move it; project objects have distinct responses |
| Content | Five candidate project slots, with publication conditional on verified evidence |
| Architecture | One modular Next.js application; React Three Fiber world; explicit experience state; Supabase for content, authentication, and storage |
| Art production | Blender source files, a validated glTF export pipeline, and browser-specific assets |
| Availability | Full HTML portfolio survives unavailable 3D or backend services |
| Scope | V1 baseline followed by queued full-product milestones, each delivered through reviewable stages |
| Ownership | Parent Codex architects, delegates, integrates decisions, and audits; workers return scoped deliverables with evidence |

The main image's visual precedence and delegated production model are user-directed. Doorway geometry, seated avatar, interactive painting, semantic portfolio navigation, and personal branding are planned additions; they must preserve the visible reference composition. Other technical and production choices remain proposed baselines.

## Read the package

The entry point is [START_HERE.md](START_HERE.md); worker rules are in [AGENTS.md](AGENTS.md). The [main image](references/images/main-reference.png), [reference index](references/README.md), and [source manifest](references/manifest.json) are the local inputs for the plans below.

1. [Product design and decisions](docs/superpowers/specs/2026-09-30-yor-world-design.md) — purpose, scope, alternatives, journeys, requirements, and unresolved owner inputs.
2. [Art and experience](docs/planning/art-and-experience.md) — room layout, storyboard, cameras, materials, avatar, animation, sound, and asset production.
3. [Interaction catalog](docs/planning/interaction-catalog.md) — behavior of the room, input rules, interruptions, persistence, mobile, and accessible equivalents.
4. [Engineering and content](docs/planning/engineering-and-content.md) — modules, interfaces, routes, data, security, publishing, hosting, and content evidence.
5. [Validation and production](docs/planning/validation-and-production.md) — measurable budgets, device tests, acceptance criteria, effort, costs, risks, and release operations.
6. [Platform implementation plan](docs/superpowers/plans/2026-09-30-01-platform.md) — portfolio, content, administration, and backend.
7. [World implementation plan](docs/superpowers/plans/2026-09-30-02-world.md) — asset pipeline, room, camera, and avatar.
8. [Integration and release plan](docs/superpowers/plans/2026-09-30-03-integration.md) — physical interactions, project transitions, resilience, and release.
9. [Delegation and work orders](docs/planning/delegation-and-work-orders.md) — coordinator responsibilities, worker assignments, handoffs, and evidence gates.

## Feasibility gate status

The initial evidence gate is complete. W1/W2/W3 established the room, seated-avatar motion/export, and semantic HTML/platform foundations, and G1 demonstrated the accepted combined feasibility integration. The next work is the bounded refinement authorized by PARENT-RECON-03, not a repeat of the original proof gate.

## What is verified today

- The project directory was empty before these documents were written.
- The live repository is [yorayriniwnl/Yor-World](https://github.com/yorayriniwnl/Yor-World), public, on `main`. Reconciliation began at clean commit `fe1a40f797ce3ec839939c09a1857b797c197269`, matching the live remote.
- Blender 5.2.2 LTS is installed. The system reports Node 24.19.0 and pnpm 9.15.9.
- Nine reference images were inspected. The supplied video is 6.5 seconds, 1600 × 1200, 30 FPS, without an audio track.
- The user-designated main image was inspected for this revision; the account counts above remain user-reported, with no provider access verified.
- Editable room/avatar proof scenes and GLB exports are returned and independently reopened/validated. Final art, likeness, publication rights and production asset approval remain unverified.
- The saved reference library has been rechecked: all 12 files match their recorded SHA-256 hashes and available originals; its missing index and manifest bookkeeping are repaired. [Integrity evidence](docs/planning/reviews/2026-09-30-reference-audit.json).
- W1-F1-r2, W2-F1-r2, and W3-A1-r2 are accepted under [PARENT-RECON-02](docs/planning/reviews/2026-10-01-reconciliation-02.md). G1-R1 is accepted under [PARENT-RECON-03](docs/planning/reviews/2026-10-01-reconciliation-03.md). Historical maker/reviewer reports remain evidence of their original execution context and must not be rewritten to match later repository state.
- Official framework, rendering, accessibility, and backend documentation informed the proposed architecture. Source links are included beside relevant decisions.


## Repository storage hygiene & forward-looking policy

This repository intentionally preserves substantial maker/reviewer evidence, including binary proof artifacts. Existing Git history is **not** rewritten during routine cleanup because commit identity and audit traceability matter.

### Forward-Looking Storage Policy:
- **Keep in Git:**
  - Application source code and configurations
  - Reproducibility and validation scripts
  - Cryptographic manifests (release manifests, asset registers)
  - Delivery reports and audit dossiers
  - Small representative evidence artifacts
  - Authoritative checksum files (`SHA256SUMS.txt`)
- **Future large items:**
  - Bulky candidate ZIPs
  - Playwright traces and video recordings
  - Large screenshot sets
  - Raw compilation bundles
  Should use GitHub Actions artifacts, GitHub Release assets, or Git LFS/object storage where appropriate, with hashes, manifests, and provenance retained in Git.
- **Historic evidence:** Never delete unique accepted historical evidence during Gate G6 or subsequent gates. Consolidate only after explicit parent authorization.

## Reading estimates correctly

The previous 430–690 focused-hour range plus 20% uncertainty allowance is an uncalibrated baseline estimate, not a measured result or delivery commitment. Re-estimate the baseline and queued full-product work from accepted deliverables and observed throughput; account counts must not multiply or divide effort or capacity estimates. Character quality, art iteration, and usable source assets remain major uncertainties.

The requested outcome is the complete project from scratch; this package records its planning baseline. Provisioning paid services, purchasing assets, commissioning work, choosing a public repository, and publishing to a production domain are not actions performed by this package.
