# Full-project completion audit — 2026-10-09

**The prior 75–80% full-project and 85–90% V1 estimates are withdrawn.** They were judgments based mainly on gate summaries. Inspection of the actual specification, canonical source, rendered experience and fresh execution finds substantive unfinished V1 workflows and interactions, in addition to unrun production verification and all six queued extension groups. There is no calibrated effort denominator supporting a replacement project percentage.

The application has substantial working code and reproducible local checks. RC6-R1 source acceptance and earlier accepted baselines retain their original scope and identity. This audit does not revoke those records, make production fixes, or accept G7. It shows why source acceptance cannot establish completion of the entire promised product.

## Identity and method

- Assigned packet: [COMPLETE-AUDIT-20261009](../reconciliation-packets/2026-10-09-completion-audit.md).
- Coordination HEAD at audit start: `f6a8df58095807b09004c2f0ab8a2382c3971e80`; actual local and remote main matched.
- Canonical source root: `app/`; actual app tree `42ea29ec235225046a75959eb19eb386ac2f821d`, matching RC6-R1 accepted source `8e5b954e147a87e36a6869d9940c40f3d4c123f0`.
- Parent ran fresh local checks against existing exact-pinned dependencies and a new production build. Three separate local GPT-6.1 Sol auditors inspected platform/content, world/runtime, and production/evidence. No dispatch to external account holders is claimed. Parent reviewed the findings and two auditors independently checked the new diagnostic interpretations.
- Evidence root: [deliveries/audits/2026-10-09-completion](../../../deliveries/audits/2026-10-09-completion/). Raw receipts, results, source/input hashes, actual screenshots and diagnostic programs are preserved. Final reconciliation and inventory bind them to the inspected source/build.
- No fresh dependency installation, clean detached checkout, hosted CI rerun, deployment, actual service connection, physical device or screen-reader session was performed by this audit. The previous release archive and retained hosted proof were independently inspected, rather than relabeled fresh execution.

## Fresh execution results

| Check | Actual result | Scope |
| --- | --- | --- |
| Lint | PASS, exit 0 | Canonical application |
| Typecheck | PASS, exit 0 | Canonical application |
| Unit tests | 312/312 PASS, zero pending/failing | Node/Vitest |
| Integration tests | 286/286 PASS, zero pending/failing | Embedded SQL and mocked adapters where declared; not live Supabase/native concurrency |
| New production build | PASS, exit 0 | Build `nq_n6upw1-keyBgwftJIB` |
| Full browser suite | 109/109 PASS, zero skipped/flaky/unexpected | Chromium; synthetic loopback database/auth fixture |
| Accessibility cases | 17/17 included in those 109 | Automated/keyboard scope; do not add them as 17 extra distinct E2E behaviors |
| Performance suite | 6/6 PASS | Local HTML cold loads, 60-second LOW route and enter/exit observation |
| Khronos GLB validation | 9/9 PASS; zero errors/warnings | Validity does not prove visual fidelity or interaction playback |
| Release composition | PASS | Actual compiled routes/modules/assets |
| Existing budget checker | PASS | Its implemented localhost/device scope, not all specification profiles |
| Retained release/evidence binding | 40/40 hashes PASS | Independently re-read archive, manifest, declared receipts and prior audit/adviser/CI references |

Actual LOW route: 60,003.9 ms, 9,898 rendered frames, 60 acknowledged actions, median 6.1 ms and p95 6.2 ms on the recorded NVIDIA RTX 2060 renderer. Public-page pre-world JS is at most 186,641 gzip bytes; selected essential world assets are about 2.02 MB. These are useful local measurements. The cold-load cases time HTML DOMContentLoaded without entry or the specified network shaping; they do not prove five cold world entries on physical mobile hardware, LCP/CLS/INP field goals or a ten-minute thermal session.

There are 713 distinct passing test cases across unit, integration, full E2E and performance source suites. That count is a test count, not 713 completed product requirements. Historical CI separately ran accessibility again; this does not create 17 new unique behaviors. Fresh command receipts are under `parent/*-receipt.json`; unit/integration/Playwright JSON and raw measurements are retained alongside them.

## Confirmed completion gaps

Severity below concerns the promised product and launch readiness. HIGH does not imply an exploitable security defect. No new P0 security defect was established in this bounded audit.

| ID / severity | Finding | Concrete evidence and implication |
| --- | --- | --- |
| CA-01 HIGH | Case-study body blocks cannot be edited in the CMS UI | [project-editor.tsx:328](../../../app/src/features/admin/project-editor.tsx#L328) displays truncated read-only block summaries; only section headings are editable. New sections contain fixed placeholder text. Owners cannot author substantive case studies through the supplied editor. |
| CA-02 HIGH | Authenticated draft preview is missing | [admin publish page:16](../../../app/src/app/admin/publish/page.tsx#L16) reads the active public snapshot. [publish-review.tsx:181](../../../app/src/features/admin/publish-review.tsx#L181) shows hardcoded checked claims. Mutation-time validation exists, but the displayed review does not preview the drafts being published. |
| CA-03 HIGH | Biography/settings/résumé CMS versioning is absent | `site_revisions` exists in SQL/backup inventory but has no canonical editor/service/public reader. Publication carries projects and asset revision only; public identity/about/résumé are authored in source. This does not fulfill engineering §10 site-editing/rollback scope. |
| CA-04 MEDIUM | Approved résumé download is missing | [résumé route:26](../../../app/src/app/(public)/resume/page.tsx#L26) renders HTML/external profile links; no approved downloadable document/route is present. Print CSS is useful but does not supply the engineering §7 required artifact. |
| CA-05 HIGH | Entrance has no visible door opening or automatic resident greeting | [EntranceCoordinator.ts:134](../../../app/src/features/world/EntranceCoordinator.ts#L134) settles the character and interpolates the camera; it settles again at completion. Door clip exists in a hidden, unplayed IA scene. Fresh unskipped desktop/mobile frame captures contain only `coding_idle`, corroborating absent acknowledgment in that runtime scope. P03 requires door opening and acknowledgment. |
| CA-06 HIGH | Decorative pause does not stop character playback | [WorldRuntime.ts:534](../../../app/src/features/world/WorldRuntime.ts#L534) stores an unused flag; the render loop continues character advance. Fresh corrected diagnostic: control `aria-checked=true`, +79 frames, coding time 0.4165→1.7331 s and experience `paused=false`. This reproduces playback-state failure; it is not an actual bone-deformation measurement. |
| CA-07 HIGH | Initial coding animation action is not activated | Canonical CharacterDirector starts `currentClip=coding_idle`, then skips `.play()` because that same clip is already named. Actual class methods, loaded by TypeScript transpilation, plus real Three AnimationMixers show the idle action unscheduled and no synthetic transform change after one second. It activates after a real greeting clip transition. Both independent diagnostic reviewers corroborated this narrowly; actual production GLB skin deformation was not separately sampled. |
| CA-08 HIGH | Several promised local physical reactions are substitutes | Plant maps to `SET_PAUSED false`; chair to full `GREET`; books to navigation. Clock only stores 12/24 preference while geometry depicts 17:49. These are not the promised leaf nudge, small posture adjustment, book nudge or real timezone clock. |
| CA-09 MEDIUM | Project physical motifs and three runtime avatar clips are incomplete | Project controller supplies camera/navigation without visible network/energy/lens/waveform motifs. Resident/fixture GLBs contain 8/8 clips, but runtime clip table integrates 5/8; glance is approximated by canceling a full greeting. IA has nine clips but its subtree is hidden and no visible IA animation mixer is constructed. |
| CA-10 MEDIUM | Essential entry waits for optional media; progress/retry behavior differs from spec | Fault injection holds one optional texture: after 16.2 s required models are 3/3, yet state is LOADING at hardcoded 88%; releasing optional media allows HOME. Continue with Portfolio remains available. Loader defaults to three retries/four attempts, while validation permits two automatic retries; displayed percentages are fixed stage weights rather than measured bytes. No claim that the entire portfolio is trapped is made. |
| CA-11 HIGH | Room presentation and reference fidelity need further work | Fresh captures show stacked HUD blocks obscuring much of the scene. A separate native Chromium entry probe, before any HUD interaction, measures eight buttons below the mobile stage boundary, including Exit Studio and camera controls. The actual scene substitutes rectangular light panels for hex anchors, cabinet speakers for round units, and substantially different floor/light detail. Native RTX 2060 raw images corroborate structural/light mismatch beyond low-tier SwiftShader blur. Personal aesthetic approval remains separate. |
| CA-12 MEDIUM | Public claim verification cannot all be reproduced from retained receipts | Evidence register marks enrollment/certificate/model results verified, but inspected A2 inventory lacks the underlying pinned external/evaluation/certificate receipts. This is incomplete reproducibility, not a finding of fabricated biography or historically false metrics. An accepted missing Helios diagram remains an honest placeholder, rather than finished evidence media. |
| CA-13 HIGH | Production/service/recovery and manual acceptance remain unexecuted | No bound production origin/deployment; all mandatory G7 rows and physical/assistive sessions remain NOT RUN. Production release remains unaccepted. |

Detailed source scope, requirement references and confidence limits are in the independent [platform report](../../../deliveries/audits/2026-10-09-completion/platform/report.md), [world report](../../../deliveries/audits/2026-10-09-completion/world/report.md), and [production report](../../../deliveries/audits/2026-10-09-completion/production/report.md). Source-only absences are distinguished from newly reproduced diagnostic failures. The existing tests are useful but some only assert buttons, checkboxes, registry membership or diagnostics, leaving visible outcomes untested.

Actual native entry screenshots before HUD/diagnostics interaction: [desktop](../../../deliveries/audits/2026-10-09-completion/parent/native-desktop-entry.png), [mobile](../../../deliveries/audits/2026-10-09-completion/parent/native-mobile-entry.png). The corresponding geometry receipt is `parent/native-entry-result.json`: desktop stage 574.78×640 px with no bottom-clipped buttons; mobile stage 350×520 px with eight bottom-clipped controls. Later focus/diagnostics/high-selection captures sometimes narrowed/scrolled the stage; those observed states are retained but are not generalized to every normal entry. Raw PNGs captured synchronously after a real rendered-frame event contain only the WebGL frame; canvas-locator screenshots include overlapping DOM and are labeled accordingly.

## Requirement coverage rather than an invented effort percentage

Denominator: the fourteen product requirements P01–P14. These observations evaluate the stated evidence and current implementation; they are not a new acceptance ruling. A requirement that is locally demonstrated may still need fresh production evidence under G7.

| Requirement | Current observation |
| --- | --- |
| P01 Immediate identity/navigation | Local route/HTML/keyboard evidence PASS; approved downloadable résumé remains separate missing scope |
| P02 Two entry choices | Local browser evidence PASS |
| P03 Door/entry/acknowledgment | FAIL complete behavior: camera/Skip works, door/automatic greeting incomplete |
| P04 Character look-back | PARTIAL: full greeting works, initial idle/integrated glance/pointer attention incomplete |
| P05 Painting | Local spring/drag/controller evidence present; full catalog visual/RM/touch acceptance not established by this audit |
| P06 Published routes/world entry points | Local route/refresh/navigation evidence PASS for four public projects; CandidateX deliberately unavailable |
| P07 Coherent conflicting state | Substantial deterministic/browser evidence; missing catalog behaviors limit whole-room coverage |
| P08 Useful non-WebGL content | Local HTML/no-JS/navigation evidence PASS |
| P09 Authored mobile | PARTIAL; viewport framing exists, UI clipping observed; physical iOS/Android NOT RUN |
| P10 Draft/preview/publish/rollback | FAIL complete owner workflow: substantive block editor, draft preview and site-content versioning absent |
| P11 Durable contact/honest failure | Local synthetic durable receipt/failure paths PASS; live PostgreSQL/mail/provider races NOT RUN |
| P12 Controlled motion/audio/loading/thermal | PARTIAL / demonstrated pause/loading defects; physical/network/thermal scope NOT RUN |
| P13 Truth/provenance | PARTIAL: source/asset bindings present, public historical verification receipts incomplete, structural visual deviations |
| P14 Reproduction/observation/recovery | Local build/retained archive/CI evidence present; live full-service restore/rollback/monitoring NOT RUN |

These rows deliberately are not converted into an equal-weight overall percentage. A route, an authored animation, an owner workflow and a production restore rehearsal have different remaining effort. The old planning hour ranges are uncalibrated and the extension backlog has no accepted estimates; dividing gates, files or tests cannot repair that denominator.

## Production and complete-project remainder

Objective production evidence coverage is **0/10 mandatory G7 requirements**, **0/56 underlying ledger observations**, and **0/6 physical/assistive sessions** proven. All are NOT RUN rather than failed production tests. Fresh names-only local inspection finds none of ten relevant service environment names in Process/User/Machine, no checked local Vercel binding/hosted env file and no Vercel/Supabase/psql/device CLIs. This does not inspect remote account logins or freshly rediscover connectors, and absence of a CLI alone does not establish absence of an account.

Concrete pending operational work includes live DNS/TLS/CDN/config/security, actual Supabase MFA/RLS/Storage and native PostgreSQL races, email/deduplication/jobs, monitoring/privacy, immutable hosted fallback and measured recovery. Job endpoint is POST-only; a real authenticated POST scheduler must be configured. The existing fifteen-table app backup excludes private table sixteen, Auth/MFA/session state and Storage bytes/configuration; full-service restore remains distinct. Local WebKit launch failure is retained history, not a fresh website/Safari failure. Applied branch protection retains owner-admin bypass and no independently configured GitHub approving writer.

Complete-project scope also retains **all six queued extension groups**: mug pickup/drinking, wearable headphones, interactive drawers, additional weather/daylight scenes, alternative moods/greetings and expanded 5–8 easter eggs. No accepted implementation for these groups was established. The product specification explicitly requires their separate acceptance after V1.

## Corrective work routing

1. Platform maker: complete structured block/site-content editing and actual authenticated draft preview; supply approved résumé document and reproducible content receipts.
2. Runtime maker: repair idle-action activation and pause; integrate door/arrival/remaining catalog effects; implement factual loading/readiness and retry contracts. Preserve one-owner/cancellation invariants and add outcome-level verification.
3. Art maker: deliver reference-faithful lights/speakers/props/materials and reviewed native desktop/mobile composition; coordinate named rig/clip/prop actions with runtime maker.
4. Integration maker: make room controls reachable and compact on all supported sizes; validate completed workflows/visible outcomes, not registry counts alone.
5. Production owners/auditor: execute actual service/device/restore/rollback proof, then obtain separate Parent G7 adjudication. Existing deployment authorization persists; access/evidence is the unmet dependency.
6. After a compliant V1: issue bounded work orders and effort estimates for all six full-product extensions.

These are correction recommendations, not dispatched maker work or newly accepted scope. Auditors made no production fixes. Existing app, migrations, assets, release tools/workflows, accepted rulings and previous receipts remain unchanged. Unrelated pre-existing RC4 receipt and preparation cache are excluded from this audit's Git scope.
