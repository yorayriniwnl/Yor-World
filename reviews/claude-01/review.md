# CLAUDE-01 — Contracts and Interfaces Review

**Reviewer Identity:** Independent Reviewer (Claude-01 Lane; executed via Gemini 3.8 Flash (High), High Effort/Depth)  
**Date:** 2026-10-01  
**Candidate Revisions:** W2-F1-r2 (`eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511`) + W3-A1 (`858c425cf2a48407245c9e65e4f08bf5b7908c36` / Git base `fe1a40f797ce3ec839939c09a1857b797c197269`)  
**Baseline:** Revision 2 / F1 (`docs/planning/engineering-and-content.md` Section 4/5)

---

## 1. Received and Inspected Inventory

| Item / Path | Source / Hash | Description | Status |
| --- | --- | --- | --- |
| `docs/planning/engineering-and-content.md` | `be9f439e6f70544e0dbc0b90249b3b5621bdeb3c8331f25ef7ff5372026967c1` | Shared contracts (§4) and state/lifecycle (§5) | INSPECTED |
| `deliveries/W3/source/src/contracts/assets.ts` | `432289c8a14ec13e2f5f19069d2f2d9e604f5e70868eb2a6884fc5e94ea4fa98` | Zod schema for AssetManifest | INSPECTED |
| `deliveries/W3/source/src/contracts/content.ts` | `1e23ea1901a5dc70377cf02cb85942472d82c0b050cfd911b3337f763f03b22e` | ProjectId, EvidenceRef, PublishedProject, Publication schemas | INSPECTED |
| `deliveries/W3/source/src/contracts/experience.ts` | `e2a4401bb2e8ff1129b0a7019f8605051a37c945119420078b5327299a4c8f35` | QualityTier, PublicRoute, CharacterAction, CameraId, Preferences, ExperienceIntent | INSPECTED |
| `deliveries/W3/source/tests/unit/contracts.test.ts` | `cd6a8d672722b512c01d9f8b4eb152771b695781a70014b2d183f0cf748d5d4b` | Unit test suite verifying schema boundaries | INSPECTED |
| `deliveries/W2/asset-metadata.json` | `83c0e22cb579b166649b76532801c58f322a6189eaf79cf914b4dd13573ad888` | W2 clip timings, bones, hierarchy, placement | INSPECTED |
| `deliveries/W2/integration-handoff.md` | `f1b7f4e0888a9de84b459c19c45b21760307a7479ec7f1c59760f481300854bd` | Maker integration contract, hierarchy and placement rules | INSPECTED |
| `deliveries/W2/evidence/r2/export-hierarchy.txt` | `295700ae6db11b66169b2843bb7dea7d291314cd911f0db98238b4e4f2df9210` | Exact glTF node indices, translations, rotations, bones | INSPECTED |
| `deliveries/W2/playback/proof.js` | `4ec7eaa64fdb78b5af4b91c711a069389afec21285e7d12a41fa0eaad9ab2208` | Diagnostic proof sampler implementation | INSPECTED |
| `deliveries/W1/asset-register.json` | `b537c357732a392823a07b71f92e008d387f3ca6992d9bc99c42502f06b9dc31` | W1 node names, camera names, removable proxies | INSPECTED |

### Missing Inventory
- Integrated runtime implementation (`deliveries/G1/` is LOCKED pending reconciliation).
- Production `CharacterDirector` and `CameraDirector` implementations (scheduled for B4/B5/G1).

---

## 2. Evidence Ledger

| Item / Contract | Evidence Class | Result | Evidence Citation | Notes / Limitations |
| --- | --- | --- | --- | --- |
| Shared Value Types & Enums | SOURCE | PASS | `engineering-and-content.md:115–186`, `contracts/*.ts` | All 14 shared types match baseline specification exactly |
| Default Preferences State | SOURCE | PASS | `experience.ts:29–31`, `contracts.test.ts:123–126` | Defaults soundEnabled=false, introCompleted=false, quality="auto", clock24h=true; frozen |
| Enum Validation & Strictness | SOURCE | PASS | `contracts.test.ts:35–61` | Zod `strictObject` rejects extraneous injected properties |
| Character Action Enum Alignment | SOURCE | PASS (Schema) / NOTE (Handoff) | `experience.ts:8–12`, `asset-metadata.json:23–29` | Schema allows 8 actions; W2 provides 5 feasibility clips (remaining 3 are B4) |
| Animation Loop vs Finite Contract | SOURCE | PASS (W3) / DEVIATION (W2) | `engineering-and-content.md:196–198`, `proof.js:100–180` | Spec requires looping to resolve on start, finite on end. W2 proof uses diagnostic sampler |
| Cancellation & Abort Contract | SOURCE | CAUTION | `integration-handoff.md:48`, `proof.js:180–220` | W2 diagnostic sampler has 2.667s reverse-path cancel. G1 navigation MUST use instant settlement |
| Placement & Double Transform Risk | SOURCE | WARNING / HAZARD | `export-hierarchy.txt:2,21,33`, `integration-handoff.md:5,228` | W2 exports `resident`, `chair-root`, `chair-base` at `(0.3, 0, -0.36)`. Scene must load at identity |
| Skinned Mesh Root Sibling | SOURCE | WARNING / HAZARD | `export-hierarchy.txt:19`, `integration-handoff.md:10` | `resident-body` skin root is at `(0,0,0)`. Cannot wrap armature without mesh |
| W1 Node Name Collision Risk | SOURCE | WARNING / HAZARD | `asset-register.json:89`, `export-hierarchy.txt:2` | Both W1 proxy and W2 armature root are named `resident` |
| W1 Chair Removal vs W2 Base | SOURCE | PASS (Contract) | `asset-register.json:108–122`, `integration-handoff.md:11–13` | W1 `chair` subtree must be deleted; W2 supplies `chair-root` + `chair-base` |
| W2 Fixture Discard Contract | SOURCE | PASS (Contract) | `integration-handoff.md:13,209` | W2 `fixture-static` must be discarded in G1 to avoid duplicate desk/keys |
| Camera ID Drift | SOURCE | FAIL (W1 Drift) | `asset-register.json:124–207`, `experience.ts:13–17` | W1 uses `home`, `mobile`, `reverse_doorway`, `reference_match` instead of contract IDs |
| Asset Manifest URL Scheme | SOURCE | RESTRICTIVE | `assets.ts:10`, `contracts.test.ts:68–72` | Enforces `https://` protocol; rejects relative `/assets` and `http://localhost` |

---

## 3. Findings

### C01-01 (P1 — High): Camera ID Drift between W1 Asset Register and Shared Contracts
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W1/asset-register.json:124–207` vs `deliveries/W3/source/src/contracts/experience.ts:13–17`
- **Expected:** W1 camera definitions map directly to canonical `CameraId` enum values (`"hallway"`, `"entry"`, `"reveal"`, `"greeting"`, `"home-desktop"`, `"home-mobile"`, `"monitor"`, `"pc"`, `"energy"`, `"scanner"`, `"microphone"`, `"about"`, `"contact"`).
- **Observed:** W1 registers cameras named `"entry"`, `"home"`, `"mobile"`, `"monitor"`, `"reverse_doorway"`, and `"reference_match"`. `"home"` differs from `"home-desktop"`, `"mobile"` differs from `"home-mobile"`, while `"reverse_doorway"` and `"reference_match"` are absent from `CameraIdSchema`.
- **Impact:** An experience controller or camera director expecting canonical `CameraId` strings will fail schema validation if fed W1 camera names directly.
- **Correction Criterion:** W1-CORR-01 must update camera identifiers to canonical contract names (e.g. `home-desktop`, `home-mobile`) and designate diagnostic/reference cameras under non-conflicting metadata keys.

### C01-02 (P1 — High): Critical Double Transform Risk on W2 Asset Placement
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W2/evidence/r2/export-hierarchy.txt:2,21,33`, `deliveries/W2/integration-handoff.md:5,228`
- **Expected:** Runtime adapters must know whether exported assets are at scene origin `(0,0,0)` requiring F1 container offsets, or pre-transformed.
- **Observed:** In `avatar-proof.glb`, `resident` translation is `[0.30, 0, -0.36]`. In `fixture-proof.glb`, both `chair-root` and `chair-base` translations are `[0.30, 0, -0.36]`. However, `resident-body` (the skinned mesh sibling) is at `[0,0,0]`.
- **Impact:** If an integrator wraps `avatar-proof.glb` or `fixture-proof.glb` in an F1 position container `(0.30, 0, -0.36)`, the translation will be applied twice (`(0.60, 0, -0.72)`). Furthermore, if `resident` is translated without moving `resident-body`, skinning inverse bind matrices will decouple.
- **Correction Criterion:** G1 integration contract must mandate loading both scenes strictly at identity `(0,0,0)` without container-level F1 offsets, and preserve `resident` and `resident-body` as co-equal siblings.

### C01-03 (P1 — High): Node Name Collision between W1 Proxy and W2 Armature Root
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W1/asset-register.json:89` vs `deliveries/W2/evidence/r2/export-hierarchy.txt:2`
- **Expected:** Scene graph node names across merged assets must be unique or cleanly namespaced.
- **Observed:** W1 exports a seated proxy root named `resident`. W2 exports its armature root also named `resident`.
- **Impact:** If W1 is imported into G1 without first removing the W1 `resident` proxy, two conflicting objects named `resident` will exist in the scene graph. A search by name could target the static proxy rather than the animated avatar, or duplicate geometry will render.
- **Correction Criterion:** The G1 integration harness must enforce explicit pre-mount removal of W1's `resident` node and all child nodes in `removableProxyNodeNames`.

### C01-04 (P2 — Medium): W2 Cancellation Sequence Conflict with Immediate Navigation Contracts
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W2/playback/proof.js:180–220`, `deliveries/W2/integration-handoff.md:48`
- **Expected:** Under engineering contract §5, user route navigation or Skip/Escape intents must take immediate effect without delay.
- **Observed:** W2's proof playback implements a diagnostic reverse-cancellation path that takes up to 2.667 seconds to reverse through nod, turn, and notice before returning to rest.
- **Impact:** If a naive integrator binds route transition promises to W2's diagnostic cancellation sequence, route changes will lag by nearly 3 seconds.
- **Correction Criterion:** G1 runtime must enforce immediate settlement (instant pose reset to `coding_idle`) on `SKIP`, `ESCAPE`, and `NAVIGATE` intents, strictly isolating the 2.667s reverse-path playback to optional developer proof inspection.

### C01-05 (P2 — Medium): AssetManifest HTTPS URL Schema Constraint Blocks Local Development
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W3/source/src/contracts/assets.ts:10`, `tests/unit/contracts.test.ts:68–72`
- **Expected:** Asset manifest schema should support local static asset paths (e.g. `/assets/...` or `http://localhost:...`) during local development and testing, while enforcing HTTPS in production.
- **Observed:** `url: z.url({ protocol: /^https$/ })` unconditionally rejects any URL that does not start with `https://`.
- **Impact:** Local offline testing with relative asset URLs or local HTTP dev servers will fail schema validation.
- **Correction Criterion:** For production schemas retain HTTPS, but provide a development schema variant or allow relative pathname strings for bundled static assets.

---

## 4. Local Retest Requests

1. **Transform Doubling Test:** Write a test in the G1 integration harness that loads `avatar-proof.glb` and `fixture-proof.glb` at identity, reads the world-space bounding box of the chair seat and avatar pelvis, and asserts that their world X/Z positions equal `(0.30, -0.36) ± 0.02m` rather than `(0.60, -0.72)`.
2. **Node Disambiguation Test:** In an automated test, load W1 `room-blockout.glb`, execute the removal of `removableProxyNodeNames` and `removableChairNodeNames`, mount W2 `avatar-proof.glb`, and assert that exactly one node named `resident` exists in the merged scene.
3. **Instant Settlement Timing Test:** In Playwright/Vitest, issue a `SKIP` intent during an active `turn_to_visitor` playback and assert that the character state settles to `coding_idle` within ≤ 50ms, proving the 2.667s reverse sequence is bypassed.

---

## 5. Recommendation

**Recommendation:** **REWORK FOR G1 ADAPTER / CONTRACT ALIGNMENT**  
- The W3 contract definitions (`engineering-and-content.md` §4) are strictly designed, perfectly typed, and well-tested.
- However, integration with W1 and W2 exposes critical hazards: camera ID drift (C01-01), double-transform risk (C01-02), node collision on `resident` (C01-03), and cancellation latency risk (C01-04). These hazards must be formally documented as mandatory G1 integration adapter invariants.
