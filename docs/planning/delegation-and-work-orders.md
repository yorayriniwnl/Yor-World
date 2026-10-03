# YOR WORLD delegation and work orders

Date: 2026-09-30; living status reconciled 2026-10-02 (POST-G3-WAVE-CLOSURE). W1-F1-r2, W2-F1-r2, and W3-A1-r2 were ACCEPTED in PARENT-RECON-02. **G1 ACCEPTED (`G1-R1`)** in [PARENT-RECON-03](reviews/2026-10-01-reconciliation-03.md). Workstation sample B3-P1 was ACCEPTED (`B3-P1-R1`) in [PARENT-RECON-04](reviews/2026-10-01-reconciliation-04.md). Post-G3 interaction wave **CLOSED**: A4-R1, IA-R1 (B3-P3), and C1-R1 all ACCEPTED with zero blocking defects; gates G3, G4, G5 all ACCEPTED. B3-P3 canonical root: `deliveries/interaction-assets/` (provenance-preserving; see [Wave Closure](reviews/2026-10-02-post-g3-wave-closure.md)). Gates **G1-G5 ACCEPTED**. Gate **G6 ACTIVE / REWORK** (RC3 candidate; RC1/RC2 preserved as history). Gate **G7 LOCKED** pending owner authorization.

The user authorized the full vision and delegated production. The parent Codex chat owns architecture, task assignment, audits, and acceptance. Workers make and integrate the product. This hub operates the existing plans; it does not replace them with another design exercise.

## Current bounded integration packet

The human supplied the RC3 full-stack integration packet on 2026-10-03. **CANONICAL APPLICATION ROOT: `app/`.** Integrate immutable A6, C3, accepted Track B freeze, and contact R2 into this root; preserve old proof roots and RC1/RC2 evidence. Maker outputs are under [deliveries/G6/full-stack-integration](../../deliveries/G6/full-stack-integration/report.md). CI and future authorized G7 deployments use `app/` exclusively. G1-G5 ACCEPTED; RC3 candidate; G6 ACTIVE / REWORK; G7 LOCKED. Next: Gemini #1 platform corrections, bound candidate refresh, platform return, GPT Plus #2 independent full-stack audit, then GPT Plus #1 G6 adjudication. Maker does not accept this packet.

## Current RC3 correction and verification handoff

The integration maker stopped at completed candidate `261c483646f68692a3fe8e184d48d25b8264a6d7`: fresh local checks and both exact-candidate workflows PASS; evidence committed. This candidate contains implementation source `6129ad7a870f9f391455eb8a0582733a5ccccd11`. Later coordination commits do not replace the review target or change its production trees.

Next assigned packet: [G6-RC3-PLATFORM-CORRECT-01](reconciliation-packets/2026-10-03-rc3-platform-corrections.md), **Gemini #1 platform/backend maker**, READY FOR MAKER / execution NOT RUN. [Supplemental local Codex verification](../../deliveries/G6/rc3-supplemental-codex-verification/report.md) reproduced seven unfixed defects, including two P1 defects; six passing cases mean defects reproduced. Production source and prior maker evidence remain unchanged. The local reviewers do not implement the fixes or replace a formal account return.

The original [G6-RC3-PLATFORM-VERIFY-01](reconciliation-packets/2026-10-03-rc3-review-handoff/platform-verification.md) and [G6-RC3-FULLSTACK-AUDIT-01](reconciliation-packets/2026-10-03-rc3-review-handoff/independent-full-stack-audit.md) are HELD / NOT DISPATCHED: blocking defects, no actual Gemini platform return, and a corrected candidate will require new revision-bound inputs and fresh integrated proof. Parent assigns candidate refresh after the maker correction return; GPT Plus #2 independent full-stack/delta audit and GPT Plus #1 adjudication follow. See the [original handoff and exact input ledger](reconciliation-packets/2026-10-03-rc3-review-handoff/README.md).

No callable Gemini CLI or connector is available in this Codex session; no external account was dispatched. Historical A6-only `deliveries/G6/gemini-1-platform/` evidence does not verify canonical RC3. Frozen door/lamp visual conditions remain review inputs, not waived defects. G1-G5 ACCEPTED; RC3 candidate; G6 ACTIVE / REWORK; G7 LOCKED. Only the named maker correction paths are assigned by the new packet; no deployment is authorized.

## One specification and a small shared baseline

The [product spec](../superpowers/specs/2026-09-30-yor-world-design.md) is the single scope authority. Its [art](art-and-experience.md), [interaction](interaction-catalog.md), [engineering](engineering-and-content.md), and [validation](validation-and-production.md) documents supply contracts and acceptance criteria. Record the supplied spec revision and file hashes in each handoff. No worker independently redesigns the product or deletes a requirement. Unresolved assumptions stay identified; the already authorized vision needs no repeated approval.

The complete work is grouped into three [production prompt tracks](production-prompts/README.md): platform/content (A), world/art (B), and integration/release (C). The track prompts point back to these plans and do not replace the exact bounded packet, owned paths, input revisions, reviewer, and evidence named for each task.

Start at [START_HERE.md](../../START_HERE.md). The main reference is [references/images/main-reference.png](../../references/images/main-reference.png): bright white workstation, blue chair, pink/violet lighting with cyan fill. The [reference index](../../references/README.md) and [manifest](../../references/manifest.json) hold supplementary inputs and provenance. Unknown rights remain unknown; a reference is not an editable licensed asset.

Proof baseline F1: room 4.2 × 3.6 × 2.8 m; runtime meters/Y-up, rear wall Z=-1.8; Blender Z-up converted once at export. Desk footprint 2.6 × 0.8 m, height 0.75 m, center X/Z=(0,-1.15); chair/resident root=(0.30,0,-0.36). Use current engineering names and art clip names. These are temporary feasibility dimensions, not measurements recovered from the image. Changes require a short proposal and coordinated F2 update.

## Account lanes — default operating model & inventory

The user reports 2 GPT Plus, 3 Gemini AI Pro, and 15 Claude free browser accounts. Detailed governance policy: [account-operating-model.md](account-operating-model.md).

> [!CAUTION]
> **NEVER RUN ALL FIVE ACCOUNTS ON THE SAME PROBLEM.**

### Default Account Assignments
| Alias | Default responsibility | Scope & Output Domain |
| --- | --- | --- |
| **Gemini #1** | **Platform / backend maker** | Track A (`deliveries/A*/`). Next.js app, semantic HTML, backend endpoints, database schema, RLS, admin auth, CMS publishing. |
| **Gemini #2** | **World / art maker** | Track B (`deliveries/B*/`). Blender models, GLB exports, 3D meshes, textures, materials, lighting, rigs, avatar clips, interactive props. |
| **Gemini #3** | **Runtime / integration maker** | Track C (`deliveries/C*/`). Three.js runtime integration, SceneIntegrator, CharacterDirector, EntranceCoordinator, ExperienceController, camera arbitration, canvas lifecycle. |
| **GPT Plus #2** | **Independent auditor** | Maker-independent verification, code/asset audit, defect logging, delta audits. **The auditor never writes production fixes.** |
| **GPT Plus #1** | **Architect + acceptance authority** | Lead architect, coordinator, packet issuance, frozen baselines, gate evaluation, and final acceptance sign-off. |
| Claude C01–C15 | Specialized browser reviews | Reserve pool for targeted browser reviews (contracts, a11y, auth/RLS, outbox, legal/provenance) per [browser review workflow](browser-review-workflow.md). |

### Gate G7 Production Release Verification Assignments
*Prerequisite: Only after human owner explicitly authorizes deployment.*  
*Core Mandate: G7 is not complete merely because a deployment command succeeded.*  
*Full specification: [Gate G7 Production Release Protocol](releases/2026-10-02-g7-production-release-protocol.md).*

| Alias | G7 Release Responsibility | Specific Scope & Verification Deliverables |
| --- | --- | --- |
| **Gemini #3** | **Deployment candidate / smoke verification** | Packaging, release manifest validation, pre-flight candidate integrity, initial live smoke HTTP probes on live domain. |
| **Gemini #1** | **Backend/service production verification** | Live Supabase/database connectivity, RLS enforcement on 15 tables, AAL2 MFA protection, contact submission & durable outbox, rate limiting (HTTP 429), production config/secrets isolation, security headers. |
| **Gemini #2** | **Asset/CDN production verification** | Production CDN asset distribution, manifest SHA-256 integrity against live URLs, immutable cache headers, compression, adherence to transfer budgets ($\le 6\text{ MB}$ entry). |
| **GPT #2** | **Live smoke + rollback-path audit** | Adversarial live smoke test battery on public domain (routes, 3D world entry $\le 8\text{s}$, skip $\le 50\text{ms}$, fallbacks, no-JS/zero-WebGL), and independent audit/rehearsal of the zero-downtime rollback path ($RTO \le 5\text{m}$, $RPO = 0$). |
| **GPT #1** | **Final acceptance** | Final gate evaluation, multi-lane evidence dossier reconciliation across all 10 required items, issuance of formal G7 Acceptance Ruling. |

**Mandatory G7 Exit Requirements (All 10 Required):**
1. **live domain**: DNS resolution, valid TLS/SSL, HTTPS redirect, canonical headers.
2. **fresh smoke**: Executed live against production domain post-deployment; stale/staging logs rejected.
3. **public routes**: Direct load, refresh, deep links for `/`, `/about`, `/contact`, `/resume`, 4 verified projects; 404 for CandidateX.
4. **world entry**: On-demand 3D room, loading spinner, $\le 8.0\text{s}$ entrance, $\le 50\text{ms}$ instant skip, settled `HOME`, avatar acknowledgment.
5. **fallback**: Complete HTML portfolio without WebGL, JS-disabled usability, context-loss recovery, responsive mobile viewports.
6. **contact behavior**: Sanitized form submission, honeypot spam protection, HTTP 429 rate limit, atomic DB persistence, outbox delivery, zero PII leak.
7. **production configuration**: Zero dev/staging secrets leaked, production env vars, strict CSP/security headers, Supabase production RLS.
8. **asset loading**: CDN delivery, immutable cache headers, 100% SHA-256 match against manifest, transfer budget compliance.
9. **monitoring**: `/api/health` 200, error logging active, uptime probe operational, zero visitor PII retained in telemetry.
10. **rollback readiness**: Rehearsed instant rollback mechanism, backward-compatible DB schema, $RTO \le 5\text{m}$, $RPO = 0$.



### Execution Pipeline Flow
```
PARENT PACKET
→ GEMINI IMPLEMENTATION
→ GPT #2 AUDIT
→ GEMINI CORRECTION
→ GPT #2 DELTA AUDIT
→ GPT #1 ACCEPTANCE
→ NEXT PACKET
```

### Model Policy
- Use **GPT-6.1 Sol** for ordinary coordination and auditing.
- Use **Astra** only for dangerous cross-lane decisions and major gates.

### Core Governance Invariants
- **Do not let the auditor become the fixer.** (Auditor finds defects; assigned maker fixes them).
- **Do not let the maker approve itself.** (Maker produces implementation & evidence; cannot sign off or accept its own work).
- **Do not let later work silently alter an accepted revision.** (Accepted baselines are immutable; changes require explicit parent packets).

## Ownership, review, and local handoff

1. The parent issues one bounded packet with local input paths, output root, acceptance evidence, and independent reviewer. Workers read only relevant sections, not every previous chat.
2. Production workers declare actual capabilities, then return real source files or a patch plus a short `report.md`: input revisions, changed paths, commands/results, screenshots or recordings, limits, and open defects. Return a zip when supported. If attachments are unavailable, return complete file contents with filenames; prose instructions alone are insufficient.
3. Browser-generated scripts are **NOT RUN** until a capable local worker or the user executes them. Capture actual tool versions, exit codes, logs, and output hashes. Never invent `.blend`/`.glb` files or screenshots, and never call source inspection reproduced validation.
4. Deliver under `deliveries/<packet>/`; workers do not edit each other's roots or shared production files. The parent reviews source/evidence and obtains maker-independent review. A maker cannot accept its own task. Return concrete defects to that maker.
5. After acceptance, assign integration to GPT-2 or another verified local-capable worker. Only that assignment maps accepted outputs into final paths, resolves conflicts, updates shared contracts/configuration/manifests, and runs combined checks. The parent audits; it does not absorb production labor.

Browser reviewers return a structured review in chat or an actually generated downloadable file; the coordinator/local worker archives it under the assigned reviews/claude-NN/ path with packet/revision identity. They do not claim to have written that local folder or executed the maker’s tests.

The platform worker owns initial contract/config proposals inside W3. Other workers consume F1 and request contract changes; they do not create competing production schemas. After integration, every packet names exact owned paths and a base revision. Changes outside those paths require reassignment.

For completed code: inspect unrelated changes, commit only the completed scope, push to the verified GitHub remote, and report commit/push failures immediately. The authoritative repository is `https://github.com/yorayriniwnl/Yor-World.git`, branch `main`; local and live remote matched `fe1a40f797ce3ec839939c09a1857b797c197269` at reconciliation start. Recheck before work. Preserve historical no-Git statements in old reports; do not initialize or invent another repository.

Workspace-connected workers read the saved files directly; no repeat attachments are needed. Claude browser reviewers follow the regular browser-review packet workflow: missing packet items are MISSING INPUT, and available items can still be reviewed. A missing C: drive is expected in those chats, not a reason to abandon review. No external account connection or external-provider dispatch has occurred. Signed-in access alone does not prove local execution.

Execution clarification for the local proof run: W2 and W3 may resolve exact-pinned verification dependencies in their own temporary directories outside this workspace. No global installs or workspace dependency installs are authorized by these packets. Copy generated lockfiles, source, and evidence into the owned delivery root; record scratch locations and reproduction commands. Existing Blender, Python, Node, pnpm, and browser binaries may be used. This permits actual local proof without changing the production dependency environment.

## Dependencies and status board

W1/W2/W3 are independent: W1 owns room geometry; W2 uses its own F1 furniture fixture; W3 needs neither world exports nor backend services. Their accepted outputs fed the combined G1 proof. Following G1 acceptance, B3-P1 workstation sample acceptance, and B5-P1 lifecycle delivery, production proceeds along parallel tracks:

| Packet | Maker / independent reviewer | Depends on | Current state / exit |
| --- | --- | --- | --- |
| W1 reference/blockout | Gemini-1 / Gemini-3, Claude-13 + parent | Image + F1 | ACCEPTED: W1-F1-r2 verified (nested transforms, geometry clearances, cameras, Khronos 0/0) |
| W2 avatar/export | GPT-2/Codex / Gemini-3, Claude-01/13 + parent | F1 fixture + clip names | ACCEPTED: W2-F1-r2 verified (clips, rig, Khronos 0/0; adapter invariants pinned) |
| W3 semantic platform | GPT-1/Codex / independent Codex audit; Claude-01/02/05 + parent | Engineering contracts | ACCEPTED: W3-A1-r2 verified (Next 16.3.8, preloads counted, AST guards, 60/60 unit, 18/18 E2E) |
| G1 integration | Integration Maker / parent audit | Accepted W1/W2/W3 revisions | ACCEPTED: G1-R1 verified (67/67 unit, 42/42 E2E, Next 16.3.8 build, coordinate bindings) |
| B3-P1 workstation sample | Gemini-2 / Gemini-3, Claude-13 + parent | G1 proof + F1 anchors | ACCEPTED: B3-P1-R1 verified (743KB GLB, 0/0 Khronos, state restoration Δ=0.00000000) |
| A2 verified content | GPT-1 / Claude-04 + parent | W3 accepted baseline | DELIVERED: 4 verified projects published, CandidateX unverified 404, 84 unit / 62 E2E PASS |
| A3 owner auth & RLS | Gemini-1 / Claude-07 + parent | A2 delivery | DELIVERED: admin_users + AAL2 TOTP MFA + 15 tables RLS, 84 unit / 29 int / 68 E2E PASS |
| B5-P1 runtime lifecycle | GPT-2 / Claude-10 + parent | G1 accepted baseline | DELIVERED: 5 single owners, 8-state FSM, 90 unit / 66 E2E PASS, GPU cleanup verified |
| **A4 CMS & publishing** | **Gemini #1** / Claude-08 + parent | Accepted A2 + A3 | ACCEPTED: A4-R1 verified (drafts, approved media, revisions, rollback, 84 unit / 61 int / 78 E2E, [Ruling](reviews/2026-10-02-a4-acceptance.md)) |
| **A5 durable contact** | **Gemini #1** / GPT #2, Parent | Accepted A4 | ACCEPTED: A5-R1 verified (persistence, outbox, retry, quotas, 84 unit / 74 int / 84 E2E, [Ruling](reviews/2026-10-02-a5-contact-acceptance.md)) |
| **A6 metadata & ops** | **Gemini #1** / GPT #2, Parent | Accepted A5 | ACCEPTED: A6-R1 verified (GitHub cache, telemetry, backup/restore, job runner, 84 unit / 92 int / 84 E2E, [Ruling](reviews/2026-10-02-a6-operations-acceptance.md)) |
| **B2/B3-P2 prod environment** | **Gemini #2** / GPT #2, Parent | B3-P1 sample + G1 | ACCEPTED: B2/B3-P2-R1 verified (runtime groups, Khronos 0/0, parity captures, [Ruling](reviews/2026-10-02-production-environment-acceptance.md)) |
| **B3-P3 interactive props** | **Gemini #2** / GPT #2, Parent | B3-P1 sample + G1 + Frozen Catalog | ACCEPTED: IA-R1 verified (25/25 entities, Khronos 0/0, delta=0.00000000, [Ruling](reviews/2026-10-02-interaction-assets-acceptance.md)); canonical root: `deliveries/interaction-assets/` ([Wave Closure](reviews/2026-10-02-post-g3-wave-closure.md)) |
| **C1 experience & interactions** | **Gemini #3** / Claude-03, Claude-11 + parent | G1 + B5 + IA-R1 | ACCEPTED: C1-R1 verified (ExperienceController, 6-tier arbitration, 122 unit / 12 E2E, [Ruling](reviews/2026-10-02-c1-interaction-acceptance.md)) |
| **G3 World Core** | Evaluator / Parent | B3-P1 + W1 + W2 + B5 | **ACCEPTED:** 13/13 exit requirements met ([Gate Review](reviews/2026-10-02-g3-gate-evaluation.md)) |
| **G4 Integrated Experience** | Evaluator / Parent | C1 + IA-R1 + B2-R1 | **ACCEPTED:** 10/10 exit requirements met ([Gate Review](reviews/2026-10-02-g4-gate-evaluation.md)) |
| **G5 Managed Content & Ops** | Evaluator / Parent | A3 + A4 + A5 + A6 | **ACCEPTED:** 10/10 exit requirements met ([Gate Review](reviews/2026-10-02-g5-gate-evaluation.md)) |
| **G6 Release Candidate** | Evaluator / Parent | G4 + G5 | **G6 ACTIVE / REWORK:** Candidate v1.0.0-rc3 full-stack verification (RC3 candidate; RC1/RC2 preserved as history) |
| **G7 Production Release** | **Gemini #3, #1, #2; GPT #2, #1** | Owner Authorization + G1–G6 | **G7 LOCKED:** Only after owner authorizes deployment. Requires 10 live criteria ([Protocol](releases/2026-10-02-g7-production-release-protocol.md)). |

**FROZEN CONTRACTS FOR NEW PACKETS:**
- **Freeze G3 revision:** World core milestone, $\le 300\text{k}$ tris / $\le 120$ draw calls / $\le 160\text{MB}$ VRAM, main reference + B3-P1 visual baseline.
- **Freeze asset manifest:** Schema v1, quality tiers high/medium/low/static, manifest URL validation.
- **Freeze interaction catalog revision:** V1 matrix of 23 registered entities. Every interaction from C1 must consume a known catalog entry. No maker may invent new user-visible interactions.
- **Freeze ExperienceIntent:** 16 discriminated variants in `src/contracts/experience.ts`.
- **Freeze CharacterAction:** 8 named clips (`coding_idle`, `mouse_idle`, `notice_visitor`, `turn_to_visitor`, `greeting_nod`, `return_to_work`, `attention_glance`, `breathing_idle`).
- **Freeze CameraId:** 13 camera presets (`hallway`, `entry`, `reveal`, `greeting`, `home-desktop`, `home-mobile`, `monitor`, `pc`, `energy`, `scanner`, `microphone`, `about`, `contact`).
- **Freeze Project IDs:** 5 IDs (`candidatex`, `helios`, `zenith`, `ai-vs-real`, `talks`).
- **Freeze Asset IDs:** `room-shell`, `desk`, `door`, `chair`, `monitor`, `resident`; anchors `door-hinge`, `chair-root`, `monitor-surface`, `painting-pivot`; interactive props `wall-painting`, `helios-pc`, `zenith-model`, `ai-real-camera`, `talks-microphone`, `desk-lamp`, `window-blinds`, `desk-clock`, `speakers`, `plant-leaves`, `keyboard`, `mouse`, `about-personal-object`, `certificate-frame`, `contact-phone`, `research-books`, `skills-board`, `hidden-yor-mark`.

Detailed packets are specified in [Bounded Packets A4, B3-P3, C1](reconciliation-packets/2026-10-01-bounded-packets-a4-b3p3-c1.md).

### Earlier local run record — 2026-09-30

Historical attempts below do not establish a currently running worker or accepted proof.

- Parent read the pasted handoff, START_HERE, worker rules, work-order hub, and main reference. No Git repository or remote exists.
- The latest user-supplied [prior-session handoff](handoffs/2026-09-30-prior-session.txt) is now saved locally, byte-for-byte, so a future worker does not need the chat attachment. It is historical context, not an override of current instructions or the product specification.
- Parent restored the missing [reference index](../../references/README.md), fixed manifest totals and duplicate grouping, and verified all 12 local copies against both recorded SHA-256 values and available originals. [Audit evidence](reviews/2026-09-30-reference-audit.json).
- Local `w1_room`, `w2_avatar`, and `w3_platform` received the existing bounded packets and exclusive `deliveries/W1/`, `deliveries/W2/`, and `deliveries/W3/` ownership. All use product specification revision 2 and F1; each delivery records exact input hashes.
- Local tools confirmed: Blender 5.2.2 LTS, Node 24.19.0, pnpm 9.15.9, Python 3.12.10, and installed Chromium/Chrome/Edge. Each maker must still demonstrate its own executed checks.
- Next action: inspect actual returned files, obtain maker-independent review, request concrete corrections, and assign combined G1 integration only after its inputs pass their proof gates. Proof acceptance is not final art, likeness, or V1 acceptance.

## First packet W1 — send to Gemini-1

Workspace-connected worker: read local `references/images/main-reference.png` and these files/subsets: `docs/superpowers/specs/2026-09-30-yor-world-design.md` §§1,3,4,10; `docs/planning/art-and-experience.md` §§1–5,9; `docs/planning/interaction-catalog.md` catalog; `docs/planning/validation-and-production.md` §§1,2,5,7. Use this packet:

~~~text
You are YOR WORLD's room/blockout maker, W1. With filesystem access, open C:/Users/yoray/Projects/Yor World/START_HERE.md and the local inputs named for W1. Otherwise report NO FILE ACCESS and unread inputs; never claim to have read inaccessible files. Produce a bounded feasibility delivery, not a new whole-project plan. The main image controls the visual direction: bright white workstation, blue chair, pink/violet lighting, cyan fill. Preserve the product spec's scope; this task proves the room only. Do not substitute the old dark-wood palette.

Use F1: 4.2m width × 3.6m depth × 2.8m height; meters/Y-up runtime; rear Z=-1.8; Blender Z-up converted once. Desk footprint 2.6×0.8m, height 0.75m, X/Z center=(0,-1.15); chair/resident root=(0.30,0,-0.36). These are provisional, not image measurements. Use asset IDs room-shell, desk, door, chair, monitor, resident; anchors door-hinge, chair-root, monitor-surface, painting-pivot. Do not wait for an avatar; use a scale proxy.

Own only deliveries/W1/. Return asset-register.json with observed reference features versus assumptions and unknown rights; build-blockout.py; editable blockout.blend and room-blockout.glb if you can actually create/export them; camera evidence for entry, home, mobile, monitor, and reverse doorway; report.md. Include gray geometry and a simple colored reference-camera view beside the main image, with deviations recorded. Reserve all required interaction objects, hit zones, and readable camera sightlines. Check door/path collision and space for a seated turn. Prioritize silhouette, scale, and clearance; no final art production yet.

Declare whether you can run Blender and inspect outputs. If yes, execute repeatably and return versions, commands, logs, output hashes, dimensions, and real images. If not, provide complete runnable files plus exact local commands and mark exports, rendering, and clearance validation NOT RUN. Do not fabricate binary files or evidence. Record deviations as proposals; do not alter F1 silently. No root edits, purchases, installs, repository creation, or deployment. report.md must list expected files as returned/missing with reasons, and checks as name | PASS/FAIL/NOT RUN | evidence path | reason. End with defects and next local execution step. Return source attachments/zip where possible, otherwise full labeled file contents. Gemini-3 reviews; the parent decides acceptance.
~~~

## First packet W2 — send to GPT-2

Workspace-connected worker: read local `references/images/main-reference.png` and these files/subsets: `docs/superpowers/specs/2026-09-30-yor-world-design.md` §§1,3,4,10; `docs/planning/art-and-experience.md` §§3,5,6,9; `docs/planning/engineering-and-content.md` §§4,5; `docs/planning/validation-and-production.md` §§1,2,5,7. Use this packet:

~~~text
You are YOR WORLD's avatar/export feasibility maker, W2. With filesystem access, open C:/Users/yoray/Projects/Yor World/START_HERE.md and the local inputs named for W2. Otherwise report NO FILE ACCESS and unread inputs; never claim to have read inaccessible files. Return runnable files and evidence, not another product plan. Prove a generic seated human can stop typing, turn with the blue chair, acknowledge a visitor, and return. The main image's white desk and blue chair guide the fixture; it does not establish the user's likeness. No final likeness or final character quality is claimed.

Work independently of the room maker using F1: runtime meters/Y-up, rear direction -Z; Blender Z-up converted once. Desk footprint 2.6×0.8m, height 0.75m, X/Z center=(0,-1.15); chair/resident root=(0.30,0,-0.36). Build your own coarse desk/chair fixture. Use resident and chair-root names. Author at 30 FPS with common rest pose; clips coding_idle, notice_visitor, turn_to_visitor, greeting_nod, return_to_work. The remaining named V1 clips stay future B4 work; do not mark B4 complete.

Own only deliveries/W2/. Return build-avatar-proof.py, avatar-proof.blend, avatar-proof.glb where actually generated, an isolated playback harness if executable, provenance/asset metadata, and report.md. Prove hand clearance before turning, coordinated chair/body/head, feet and seat contact, return to keys, scale/axes, and named exported clips. Test repeated turn/return and interruption to a safe coding pose; record root drift and clipping. Keep fixture geometry separate from the avatar export.

Declare native Blender, terminal, validator, and browser capabilities. Where available run export, glTF validation, and actual browser playback; provide exact commands/versions, logs, hashes, export size, and fixed-camera video/images. A Blender render alone does not prove browser playback. If tools are unavailable, return complete scripts/harness files and exact local reproduction commands marked NOT RUN. Never fabricate binary exports, logs, or validation. No shared/root edits, installs, purchases, account provisioning, Git initialization, or deployment. report.md must list expected files as returned/missing with reasons, and checks as name | PASS/FAIL/NOT RUN | evidence path | reason. Return attachments/zip or full labeled file contents, defects, and next execution step. C01 reviews contracts and Gemini-3 reviews motion; the parent accepts or returns corrections.
~~~

## First packet W3 — send to GPT-1

Workspace-connected worker: read these local files/subsets: `docs/superpowers/specs/2026-09-30-yor-world-design.md` §§1,3,4,10; `docs/planning/engineering-and-content.md` §§1–5; `docs/superpowers/plans/2026-09-30-01-platform.md` setup and A1; `docs/planning/validation-and-production.md` §§1,2,4,5,7. Use this packet:

~~~text
You are YOR WORLD's semantic platform maker, W3. With filesystem access, open C:/Users/yoray/Projects/Yor World/START_HERE.md and the local inputs named for W3. Otherwise report NO FILE ACCESS and unread inputs; never claim to have read inaccessible files. Implement the bounded A1 foundation in an isolated delivery using the engineering contracts exactly. Do not write another whole-project plan. The final product includes a bright white workstation with blue chair, pink/violet lighting and cyan fill, but this proof has no 3D dependency.

Own only deliveries/W3/. Return a complete source tree/patch with package.json, exact dependency pins and lockfile only if genuinely generated, configuration, semantic public shell/navigation, shared contract schemas, and meaningful browser tests. Propose a compatible stable dependency set from verified official sources; label unverified compatibility. Do not install anything in the user's workspace. Keep fixtures test-only and public project data empty until verified. Use honest draft identity/content labels. Projects, About, Contact, and Résumé must have real reachable informational/empty-state routes; do not invent biography, résumé files, project outcomes, or contact success. Enter studio states it is not yet available.

Prove direct page load/refresh, keyboard navigation and skip link, JavaScript-disabled useful content, world requests blocked, no world code fetched before entry, and no backend requirement. Run lint/type checks, targeted browser tests, and a production build/serve only if your environment can; provide actual commands, versions, exit codes, logs, screenshots, payload observations, and limitations in report.md. Audio remains off; reduced motion is respected.

If you cannot execute, return complete runnable files and exact local reproduction commands, with all unrun checks and missing lockfile marked NOT RUN. Do not claim a browser chat has built or tested the app. No services, secrets, paid actions, root/shared edits, repository initialization, or deployment. report.md must list expected files as returned/missing with reasons, and checks as name | PASS/FAIL/NOT RUN | evidence path | reason. Return attachments/zip where supported, otherwise full labeled file contents. C02 reviews the source and evidence; parent acceptance precedes a separate worker's integration. End with open defects and next execution step.
~~~
