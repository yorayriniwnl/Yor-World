# Validation, production, and release specification

Date: 2026-09-30. All budgets and estimates below are proposed targets, not measured results.

Parent: [Product design](../superpowers/specs/2026-09-30-yor-world-design.md). Assignment authority: [Delegation and work orders](delegation-and-work-orders.md).

The parent Codex chat is the architect, coordinator, and auditor. Delegated workers produce assets, application code, tests, and integration. The user reports two GPT Plus, three Gemini AI Pro, and fifteen Claude free browser accounts; their tool access, limits, and usable throughput have not been verified. GPT/Gemini are assigned local production work; Claude accounts review supplied files and evidence in browser chats. Account count is not a worker-capacity measurement.

## 1. Measurement protocol

Record commit, asset-manifest revision, publication revision, browser/OS version, hardware, viewport, DPR, quality tier, network profile, and cold/warm cache state with every performance result.

Proposed baselines:

- Desktop: 1440 × 900 CSS px; DPR capped at 1.5; 10 Mbps down, 2 Mbps up, 80 ms latency; integrated-GPU laptop plus a discrete-GPU Windows machine.
- Mobile: 390 × 844 CSS px; DPR initially capped at 1.25; 4 Mbps down, 1 Mbps up, 150 ms latency; at least one physical iPhone/Safari and one mid-range Android/Chrome.
- Narrow layout: 320 CSS px; landscape phone; 200% zoom; 400% text/reflow inspection where applicable.
- Browser suite: current stable Chrome, Edge, Firefox, Safari, plus the previous supported Safari/iOS release at implementation time.

Actual test-device ownership is unknown. Emulation does not count as physical-device validation. If physical coverage is unavailable, state the unverified platform explicitly and do not claim full mobile validation.

Run five cold loads per network/device profile. For frame pacing, run a 60-second interaction route and a 10-minute sustained mobile session. Report raw measurements and median/p95; do not replace them with a subjective score.

## 2. Performance budgets

| Metric | Proposed desktop ceiling/target | Proposed mobile ceiling/target |
| --- | --- | --- |
| Public-page JS, compressed, before world entry | 250 KiB | 250 KiB |
| Critical initial transfer, including poster/fonts | 650 KiB | 650 KiB |
| Additional 3D JS + decoders, compressed | 550 KiB | 550 KiB |
| Essential entry/world assets | 6 MiB | 3 MiB |
| Full optional V1 world assets, excluding source files | 14 MiB | 7 MiB |
| Sound loaded only after opt-in | 1 MiB | 1 MiB |
| Asset readiness after entry request on the specified network | 9 s target | 12 s target |
| Entrance after readiness | 8 s maximum | 8 s maximum; shorter presentation allowed |
| Delay before a room project action navigates | 1.4 s maximum | 1.4 s maximum |
| Visible triangles in home composition | 300k ceiling | 140k ceiling |
| Draw calls per rendered frame, including configured effects/shadows | 120 ceiling | 80 ceiling |
| Asset-derived GPU residency estimate | 160 MiB ceiling | 80 MiB ceiling |
| Frame pacing during supported active scene | Median ≤18.2 ms; p95 ≤25 ms | Median ≤33.3 ms; p95 ≤45 ms |
| UI response to accepted input | Visible acknowledgment within 100 ms | Within 100 ms |

These ceilings must be tested together. Passing triangle count alone does not prove acceptable performance. The residency number is an estimate derived from decoded texture/buffer formats, not a portable direct measurement of total GPU allocation.

The initial HTML portfolio targets LCP ≤2.5 s and CLS ≤0.1 in the specified lab profiles. Field goals are p75 LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1, segmented by desktop/mobile. Field goals require sufficient actual traffic and cannot be claimed from a local test. See [Google's Web Vitals guidance](https://web.dev/articles/vitals).

Download time is separate from the cinematic. A 6 MiB world at 10 Mbps already requires about 5 seconds of ideal transfer time. The portfolio remains useful while the user chooses whether to wait.

## 3. Quality tiers and loading

| Tier | Initial behavior |
| --- | --- |
| High | Desktop composition; capped DPR 1.5; limited shadows and optional modest bloom |
| Medium | Reduced LOD/effects; capped DPR 1.25; simplified shadows |
| Low | Capped DPR 1.0; no expensive post-processing; static/background simplifications; essential interactions retained |
| Static | Poster + full HTML content; no canvas |

Use capability checks as hints; do not infer actual performance solely from device name or memory. Measure frame pacing after warmup. Downgrade after three consecutive slow two-second windows; upgrade only after 20 seconds of stable headroom and while at HOME. Preserve a user's explicit quality selection unless recovery requires a clear fallback.

Order of reductions: DPR -> post-processing -> shadow quality -> optional ambient effects -> lower LOD -> static presentation. Never disable access to projects to preserve an effect.

Load group A (door/room/essential avatar), then group B (secondary props), then per-project effects on demand. Do not wait for every optional prop before starting. After 15 seconds without required asset progress, offer explicit Retry and Continue with portfolio. Failed requests have at most two automatic retries with bounded backoff; cancellation stops them.

## 4. Accessibility acceptance

Target WCAG 2.2 AA for the public website, with manual evaluation in addition to automated checks. See [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

- Logical headings, landmarks, labels, error associations, and keyboard order.
- Visible focus on every meaningful control; focus is not obscured by canvas/UI overlays.
- Body text contrast at least 4.5:1; qualifying large text and UI boundaries meet applicable 3:1 requirements.
- Design target of 44 × 44 CSS px for primary touch controls; dense exceptions receive an explicit review.
- Reduced-motion presentation is complete, not merely a slower version of camera travel.
- Pause decorative animation; sound remains opt-in and independently mutable.
- Screen readers can find every published project, résumé, about detail, and contact action without interacting with geometry.
- No flash-based camera effect; no required drag-only, hover-only, or timed interaction.
- Native scrolling and browser zoom remain functional.
- Test keyboard-only, NVDA with a supported desktop browser, and VoiceOver on iOS.

Automated axe results do not certify conformance. Record manual limitations and fixes.

## 5. Requirement-to-deliverable matrix

| Requirements | Owning tasks | Required proof |
| --- | --- | --- |
| P01/P02 immediate access | A1, C3 | Cold-load DOM and keyboard journey |
| P03 entrance | B1, B5, C3 | Recorded full sequence + skip at each phase |
| P04 look-back | B4, C1 | Approved avatar clips + repeated/cancelled interaction tests |
| P05 painting | B3, C1 | Mouse drag, touch tap, pointercancel, RM |
| P06 routes/projects | A2, C2 | All published links, direct load, refresh, Back |
| P07 coherent state | B5, C1, C2 | Adversarial event sequences and cleanup assertions |
| P08 no-WebGL | A1, C3 | World-disabled complete portfolio |
| P09 mobile | C3 | Physical iOS/Android evidence |
| P10 administration | A3, A4 | MFA/role denial matrix + publish/rollback |
| P11 contact | A5 | Persistence, deduplication, abuse, worker/email failure |
| P12 performance | B2, B5, C3 | Budget report with device/network evidence |
| P13 truth/provenance | A2, A4, B2 | Content and asset receipts |
| P14 operations | A6, C4 | Clean install/build, restore, rollback, release manifest |

Task IDs are defined in the three implementation plans linked from the root README.

## 6. Test layers

| Layer | What matters |
| --- | --- |
| Contract/unit | Input schemas; project visibility; preferences restore; transition cancellation; cooldowns; quotas |
| Database/integration | Grants/RLS; owner revocation; concurrency; publish atomicity; durable receipts and job leases |
| Browser/E2E | Real navigation, keyboard, overlays, full entrance, canceled loads, forms, resize/history |
| Asset validation | Valid glTF, required clip/pivot names, dimensions, budgets, hashes, approved provenance |
| Visual review | Gray geometry pass and side-by-side main-reference/camera comparison; light balance, avatar joints/contact, silhouette, monitor clarity |
| Performance | Cold readiness, sustained frame pacing, renderer cleanup, cache behavior, thermal degradation |
| Accessibility | Automated checks plus keyboard and screen-reader sessions |
| Operations | Secret separation, external service failures, database restore, asset rollback |

Review-focused edge cases: rapid project switching during greeting; browser Back during loading; stale or denied local storage; long project titles and missing media; renderer loss while a dialog is open; duplicate contact during email outage; an owner revoked while their token remains valid.

Do not add screenshot assertions for arbitrary aesthetic preferences before the visual baseline is approved. Do not write tests that simply copy implementation constants without checking user-visible behavior.

## 7. Production gates and dependency order

| Gate | Result | Exit evidence |
| --- | --- | --- |
| G0 — assignment baseline | Confirmed full vision and local main image recorded; one spec revision and proof assumptions identified in every packet | Assignment record; no renewed approval of the already authorized vision |
| G1 — hardest proof | W1 room/doorway blockout + W2 seated avatar/export + W3 HTML foundation, followed by delegated combined proof | Actual files, independent reviews, browser recording, and export evidence |
| G2 — platform | At least one verified complete case study plus functioning routes | Direct/accessible flow; verified content |
| G3 — world core | Finished visual sample, essential assets, resident, entrance | Main-reference comparison and art approval; budget measurements |
| G4 — integrated experience | V1 object interactions and project routes | Full catalog checks, interruption/history tests |
| G5 — managed content | Admin, publication, contact, jobs, and backups | Auth/policy, outage, rollback/restore evidence |
| G6 — release candidate | Mobile, accessibility, performance, content, operations | Signed-off evidence record and remaining limitations |
| G7 — production | Approved deployment/domain and observed service | Live smoke test; verified rollback |

W1, W2, and W3 have separate output roots and consume the frozen proof assumptions in the delegation hub. W2 uses its own dimension-matched desk/chair fixture, so it does not wait for W1. W3 neither imports world assets nor requires a live backend. Independent outputs are not automatically compatible: a named integration worker must prove them together before G1 closes. The parent audits the evidence and returns defects to the responsible maker.

The main-image baseline is the bright white workstation, blue chair, pink/violet lighting, and cyan fill documented in the art specification. A technically valid export does not pass the visual gate if it reverts to the old dark-wood room direction.

Critical dependency: accepted W1/W2/W3 -> delegated combined G1 proof -> B2/B3/B4 -> B5 -> C1/C2 -> C3/C4. Platform A1/A2 must be available to C2; A3/A4/A5/A6 must be complete before G5/G6. W1/W2 cover early B1/B2/B4 feasibility, not the finished environment or all avatar clips. Final assets cannot bypass export proof; early previews do not remove required V1 features.

## 8. Effort model

The table retains the prior, uncalibrated user-plus-Codex estimate as a record of work size. It is not a forecast for the delegated resource model. No ready-made production room or avatar is verified. The hours include making, review, and correction; dividing them by the number of accounts would invent throughput.

| Workstream | Estimated focused hours |
| --- | --- |
| Definition, asset audit, and difficult proofs | 40–60 |
| Environment and prop production | 70–110 |
| Avatar, rig, and core animation | 60–110 |
| Platform, CMS, backend, and administration | 80–120 |
| World runtime, cinematics, and interactions | 100–160 |
| Content evidence and case studies | 30–50 |
| Performance, accessibility, QA, and release | 50–80 |
| Base total | 430–690 |
| Total with 20% uncertainty allowance | 516–828 |

No calendar-speed or simultaneous-session assumption follows from the subscription counts. Record each packet's actual maker time, local execution time, review/rework time, tool availability, and rate-limit interruptions. Re-estimate after G1 and the first finished avatar/browser sample from accepted outputs. User handoff effort, device access, content verification, asset rights, and revision cycles remain real dependencies.

G2 and G3 can produce clearly labeled previews. They are milestones toward the full flagship V1, not replacements for it. There is no verified delivery date.

## 9. Costs and resource boundaries

Current authorized new spending: none. The reported subscriptions are existing resources, not verified API credit, installed automation, native Blender access, terminal access, or guaranteed export capability. The installed Blender/development tools are possible local execution resources. A browser chat may provide a script while still being unable to run it; that delivery remains unexecuted until a capable worker or the user runs it and returns evidence.

Use accounts within their applicable access and usage limits. The fifteen Claude browser accounts form a pool for narrow independent reviews; this plan neither assumes fifteen concurrent sessions nor proposes switching accounts to bypass limits. The delegation hub records functional aliases without credentials. Purchases and specialists remain separately flagged below.

| Potential expense | Trigger | Treatment |
| --- | --- | --- |
| Hosting tier | Required preview/runtime/traffic capability | Check existing account and current quote before provisioning |
| Database/auth/storage | Durable production backend, backup, egress needs | Review account limits, region, and restore capability |
| Email/sender domain | Contact notification delivery | Confirm domain ownership and provider limits |
| Source-asset backup | .blend/textures exceed current backed-up capacity | Inspect existing storage before purchasing |
| Domain | Chosen public identity | No domain purchase assumed |
| Base character rig | Existing-resource rig cannot meet G1/G3 | Optional targeted quote |
| Animation specialist | Two focused revision cycles fail visual gate | Optional scoped quote for named clips |
| Licensed textures/audio | Existing lawful material insufficient | Asset-by-asset approval |
| Test device access | Physical Safari/Android coverage unavailable | Borrow/test-lab option before buying hardware |

Operating-cost model: hosting + database compute + storage + uncached egress + email + monitoring. For scale intuition only, 10,000 full 6 MiB world entries represent about 58.6 GiB of asset transfer before cache effects; CDN egress can still be billable even when origin requests are cached. This is workload arithmetic, not a provider quote.

No total cash budget is invented while account tiers, traffic, and spending ceiling are unknown.

## 10. Ownership

| Responsibility | User | Parent architect/auditor | Delegated production worker |
| --- | --- | --- | --- |
| Identity and evidence | Supplies/verifies facts; reviews likeness | Rejects unsupported claims; maintains acceptance criteria | Builds content records from supplied receipts |
| Art and animation | Reviews visual identity and character | Sets reference priorities; audits comparisons and failure cases | Models, rigs, animates, exports, and corrects files |
| Application/backend | Provides product feedback/account ownership | Owns architecture, contracts, task boundaries, and review | Implements, tests, and returns scoped files/patches |
| Integration | Enables the chosen local handoff | Assigns integrator; checks compatibility and regressions | Applies accepted work, resolves assigned conflicts, runs combined proof |
| Accounts and purchases | Owns access, secrets, and spending decisions | Records capability gaps and concrete options | Uses verified access; reports failures without exposing credentials |
| Release | Decides public content/domain release | Audits exact candidate and live evidence | Builds candidate, rehearses restore, deploys when authorized, runs smoke checks |

A maker cannot approve its own deliverable. A separately assigned reviewer checks it, and the parent accepts, returns, or records a concrete blocked condition. Where reviewers cannot run native tools, inspection is explicitly distinguished from reproduced validation. The parent does not take over production work when a lane is blocked; it narrows or reassigns the packet.

Neither automation nor a plan guarantees specialist-level character art. Quality is judged from actual reviewed output.

## 11. Risk register

| Risk | Early signal | Response |
| --- | --- | --- |
| Avatar quality dominates schedule | Turn/hand contact still poor at G1 | Simplify facial detail; preserve behavior; flag targeted help |
| Attractive render fails browser quality | First sample materially differs or misses budget | Revise lighting/material/export before producing whole room |
| Door shot reveals weak spatial design | Collision, awkward travel, missing reverse geometry | Correct blockout and camera path before final modeling |
| Interaction scope grows without bound | New props need new rig/state work every week | Keep V1 catalog fixed; estimate additions separately |
| Mobile thermal/performance failure | 10-minute session degrades or loses context | Lower tier/effects and test; retain static portfolio |
| State collisions | Rapid clicks create stale navigation or frozen character | Single ownership, abortable work, event-sequence regression |
| Content lacks receipts | Claims cannot be sourced | Mark internal evidence unknown; omit unsupported public claim |
| Backend/service outage | Publishing, contact, or refresh fails | Published snapshot + durable outbox + honest error states |
| Unknown asset rights/source | Only reference PNG/MP4 available | Build new or obtain verifiable source/license |
| Supply/version drift | Docs show alpha or peers disagree | Stable package verification and frozen lockfile |
| Costs exceed assumed resources | Quote or egress above owner ceiling | Present alternatives before any paid action |
| Automation capability gap | Tool cannot produce required artistic result | Report concrete limitation and a scoped alternative |
| Subscription mistaken for execution capacity | A chat returns instructions without files or run evidence | Record capabilities; obtain runnable files; assign actual execution explicitly |
| Parallel contract drift | Different axes, clip names, schemas, or root edits | Freeze shared assumptions; single path owner; review changes before integration |
| Review workload exceeds making capacity | Outputs wait unreviewed or makers self-approve | Reduce active assignments; keep independent acceptance; recalibrate from evidence |

## 12. Definition of done for full V1

- All P01–P14 requirements have evidence; required behaviors remain present.
- Every publicly listed project has a substantive verified case study. Any of the five candidate projects omitted is an explicit scope decision, not a broken link or placeholder.
- No essential scene asset lacks a source/provenance record.
- Avatar, room, doorway, monitor, and lighting are visually approved at supported camera positions, with an explicit main-reference comparison and recorded deviations.
- Keyboard, reduced motion, muted sound, static mode, and direct URLs all work.
- Target devices meet declared budgets or have an explicit supported fallback and documented limitation.
- Auth, role revocation, data policies, publishing rollback, contact receipt, and job retry are verified.
- Database and asset restore have been rehearsed.
- Clean install/build and required CI checks pass against the exact release commit and asset revision.
- Production deployment has a fresh smoke test; local success is not presented as live verification.
- Known limitations and version/source manifests accompany the release.
- Every integrated work order has a maker, independent review, accepted revision, actual-file handoff, and reproducible evidence; chat confidence is not a test result.

## 13. Maintenance after launch

Weekly: inspect failures and undelivered contact; verify scheduled jobs. Monthly: dependency/security review, restore sampling, storage/egress costs, and broken public links. After any art release: repeat camera comparison and device budgets. After any auth/data change: repeat the authorization matrix.

These are proposed operating responsibilities, not scheduled automations. No reminder or monitoring job has been created by this planning task.
