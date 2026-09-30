# Bounded correction and review-return packets — PARENT-W123-20261001

Authority: [2026-10-01 parent reconciliation](../reviews/2026-10-01-w1-w2-w3-gate-00d9d93.md). Live base verified: `00d9d93f0cf70150cd64681dcabee425936da64c`. These packets authorize only the corrections named below. **G1 remains LOCKED.** Existing candidates, their evidence, and historical reviews are immutable inputs; use new output roots. Do not start A2, later B/A/C functionality, or G1.

## W1-CORR-02 — W1 room/blockout maker

**Owner:** the W1 room/blockout maker lane (previously reported Gemini-1). Record the actual provider/model/tools used; a lane name is not a provider identity.

**Base revision/hash:** candidate `W1-F1-r2` at `ee57da8ee6d0013f523b6eeb88aec0bd023e6135`, unchanged at live base above. Canonical archive `deliveries/W1/revisions/W1-F1-r2/w1-f1-r2-proof.zip`, SHA-256 `0c3ad92843b43756c0cb4fc3dda8252438969cf94c8cd8918b4545d73ec0ddf1`. Generator SHA-256 `c61474e2c46aafcab494116089f8b7b8ef1a5feb9dc3d6f4ed5a2a40693ca090`; native blend `8f813f8b2df518dc3410e062c791e66bbf646910b3ca038e040c27ddf01db08b`; GLB `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f`. Read the original W1 packet, F1, W1-CORR-01, and the new ruling directly.

**Owned files/paths:** new `deliveries/W1/revisions/W1-F1-r3/` only. Within it: copied generator/shared clearance helper, editable blend, GLB, asset register, required renders/comparison, tests/tools, evidence, report, archive, byte policy and manifest. Preserve r1/r2 and other makers' roots. Builds use existing native tools and external scratch where needed.

**Exact defect IDs:** W1-02 (clearance detector and false-positive proof), W1-03 (home obstruction and unsupported mobile control-space claim). W1-04/REV-01 requires a truthful new maker inventory to support independent review; maker must not write its own reviewer approval.

**Required behavior:**

1. Use one checker implementation in delivery generation and negative tests. Derive obstacle positions/bounds from the actual evaluated scene. Test the relevant door leaf/handle sweep, entry/camera envelope, and chair/resident seated turn against actual obstacles. Document sampling interval, envelope, tolerance and limitations; a conservative sampled blockout check is sufficient. Do not demand a new production physics system.
2. Treat overlap as failure rather than converting it to a positive clearance with `abs`. Check both sides of a camera corridor. Remove literal unmeasured PASS/clearance values. A fault runner must fail its process if its expected outcomes are not met.
3. Preserve the corrected nested transforms and the measured 35 mm vertical armrest clearance. Do not present that one measurement as proof of all turning/body clearance.
4. Place the desktop home camera so walls do not obscure the required reference grouping. Retain readable chair, hex lights, console/microphone and right PC/pegboard grouping; show the coarse shelf/plant anchors appropriate to blockout scope. Demonstrate the mobile control region with an annotated rectangle or equivalent proof overlay and visible anchor checklist. If the percentage changes, report the actual value. No production touch controls are required.
5. Regenerate the affected native/export/render/register records. Distinguish native scene statistics from exported statistics (r2 has 50 native materials versus 49 exported). Establish an explicit canonical byte policy and stable archive/manifest; publish correct counts and hashes after finalizing all files. Hash the manifest/archive outside their recursive member list.

**Prohibited unrelated changes:** no final art/texturing/likeness pass, room redesign, F1 dimensions/clip contract changes, W2 asset edits, production camera director, shared schema changes, runtime entry/navigation, backend, dependencies in the workspace/global environment, or G1 integration. No manual repainting of evidence to hide obstructions; renders must come from the returned candidate. Do not overwrite prior failed evidence.

**Tests/evidence required:**

- Execute baseline and invalid geometry using the actual shared checker. Reproduce the archived [R03 cases and exact mutations](../reviews/2026-10-01-w1-w2-w3-gate-00d9d93/retest-w1-checker.py): tabletop through closed leaf; forward chair-root case that distinguishes signed/absolute math; negative right-side entry clearance. Also test a real chair/body-turn obstruction, not only a detached locator. Every invalid condition fails; a restored valid scene passes. Record nonzero test-process behavior for an unexpected PASS.
- Reopen the saved final blend; compare required transforms and native/export node coordinates with the GLB. Validate the exact exported GLB with Khronos and retain tool version, command, output and return code. Zero schema warnings/errors alone does not prove geometry clearances.
- Return color and gray entry, home, mobile, monitor and reverse doorway views, including closed/open leaf evidence and reference comparison. Record transforms, FOV convention and aspect ratio. The reviewer must view the actual images rather than merely check their dimensions.
- Archive source/native/export/image/log hashes and all regeneration commands. Run negative tests only on isolated or in-memory copies and prove the final artifact remains clean. No self-approval.

**Independent reviewer:** a maker-independent local reference/camera/export reviewer (Gemini-3 lane), plus the asset/provenance reviewer (Claude-13 lane, actual provider declared), followed by parent acceptance. Use REV-RECON-03. Parent or another non-maker must execute the shared negative checker cases and inspect the final renders.

**Completion condition:** returned W1-F1-r3 satisfies W1-02/W1-03 on its exact canonical bytes, review returns bind the same hashes with credible execution/inspection scope, and the parent issues W1 ACCEPT. A maker's PASS or a ZIP upload does not complete the gate.

## W3-CORR-02 — W3 semantic-platform maker

**Owner:** the W3 platform maker lane (originally GPT-1; r2 reports Google Gemini). Declare the actual execution identity.

**Base revision/hash:** `W3-A1-r2` at `20950576f8b9a149fe521ac4ac44056ff263aba9`, unchanged at live base above. Source Git tree `97b967c485896e4277fcbcfa501aff0ee02229fa`; archive SHA-256 `1fec5b26253bfbf03a5e7ab4f9e278156dae71bb0824f796a86506bc6a460fa2`; output manifest `b203f7891a0998fbdbd7b5e2651b90eb731b9bb1ea8a2916d9232d478e07e799`; boundary test SHA-256 `41dd9ba54be22c0a9f599f96e6b20874fd93fd6e49169f422925668a7b7ef2fc`. Package `8cb1995f42b71550f688d983948ede67f68851fef1af3cbafe212ebaa00acf70`; lock `1d310d95e3f46bbdf6c3bcc6afe883e3419b4303d1cd2b89ac0d84ffae16a98e`.

**Owned files/paths:** new `deliveries/W3/revisions/W3-A1-r3/` only. Copy the r2 candidate, preserve its corrections, and restrict substantive source changes to boundary discovery/validation and its meaningful test coverage (a small shared test/tool helper is allowed). Update copied proof/package helpers only as needed to target the new root, evidence/report/README/manifests/archives and scoped byte policy. The public shell and contracts should remain unchanged unless a named boundary defect requires a strictly local correction, which must be explained.

**Exact defect IDs:** W3-04 / I1-F3 / C02-03. W3-02 / REV-01 requires a new final inventory for independent review; it does not authorize maker-written reviewer approval.

**Required behavior:**

1. Discover both quoted and no-substitution-template module arguments in dynamic imports/requires. Define a fail-closed rule or verified resolution for nonliteral forms that cannot be statically determined in guarded production/contracts code. Apply the same coverage consistently to all guarded module forms.
2. Resolve supported aliases/relative paths before validating their allowed boundaries; do not make a textual path-prefix check a substitute for checking a resolved target. Preserve framework/server isolation for shared contracts. Keep this bounded to the existing project import conventions.
3. Exercise the actual scanner used on source files. The backtick fixture case must fail just like the quoted case; preserve legitimate imports as positive controls. Do not pass by adding a check for the reviewer's sentinel text/name.
4. Preserve matched exact dependencies/lockfile, strict TS, truthful empty content, native routes/no-JS behavior, sound/motion defaults, backend/world isolation, corrected preload accounting, helper failure propagation and byte preservation. Keep the dated unresolved security/tooling limitations; do not claim complete security clearance from a zero registry audit.

**Prohibited unrelated changes:** no A2 state machine/entry flow, 3D/runtime/world imports, backend/accounts/admin/contact-success behavior, invented public data, project cards, production AssetManifest schema relaxation, later A/B/C functionality or G1 integration. No unrelated dependency modernization or visual redesign. No workspace/global installs. Do not copy test-only injected imports into the final public source.

**Tests/evidence required:**

- Reproduce [R03 quoted control and backtick false pass](../reviews/2026-10-01-w1-w2-w3-gate-00d9d93/retest-w3-boundary.py) on the new guard; both must exit nonzero for the forbidden import and a clean candidate must pass. Retain raw output proving the detector, not module-resolution failure, caused rejection.
- Negative cases cover static, side-effect, export-from, dynamic quoted/template, require, import-type, aliases, normalized relative escapes, and unresolved/nonliteral imports according to the documented policy. Include an allowed import control and ensure contract imports cannot escape into app/framework/server dependencies through permitted relative syntax.
- Fresh external frozen install, lint, strict typecheck, meaningful unit suite, production build and the existing Chrome/Edge production E2E suite. Preserve no-JS, keyboard/focus/skip, reflow/axe, reduced-motion, blocked backend/world, pre-entry requests and payload checks. Record actual counts; no minimum fabricated test count. No dev-server substitution for `next build`/`next start`.
- Preserve/retest the oversized preload and audit/list failure matrix, bind final source and lockfile to build/browser/payload records, and verify the final archive/checkout/Git byte policy. Report payloads for the new build rather than copying old values. Preserve failed attempts with clear chronology.

**Independent reviewer:** maker-independent implementation reviewer (Codex or equivalently capable local reviewer) must repeat the actual negative-case closure and production changed-surface checks; contract, W3 and accessibility lanes (C01/C02/C05) return final exact-hash addenda under REV-RECON-03. The parent remains the acceptance authority.

**Completion condition:** W3-04 has independently reproduced positive/negative closure, final evidence is hash-bound and reviews are scoped honestly, and the parent issues W3 ACCEPT on the final source. No A2/G1 is activated by completing this packet.

## REV-RECON-03 — independent review-return corrections

**Owners:** the independent reviewers of the affected reports, with parent/local archival support. This is an evidence correction packet; neither maker may author its own independent review. It does not require another whole-project audit.

**Base revision/hash:** reports as archived at `00d9d93f0cf70150cd64681dcabee425936da64c`; individual report revisions/checkout and Git-blob hashes are in [bindings.json](../reviews/2026-10-01-w1-w2-w3-gate-00d9d93/bindings.json). The final review target must additionally pin the returned W1-F1-r3 or W3-A1-r3 source commit, manifest and archive hash. An r2 review cannot be relabeled as r3 without validating what changed.

**Owned paths (new files only):**

- Reference/camera reviewer: `reviews/gemini-3/W1-F1-r3-review.md` and `reviews/gemini-3/evidence/W1-F1-r3/`.
- Asset/provenance reviewer: `reviews/claude-13/W1-F1-r3.md`.
- Contract reviewer: `reviews/claude-01/W3-A1-r3.md`.
- Implementation reviewer: `reviews/claude-02/W3-A1-r3.md` and, if local execution is used, `reviews/claude-02/evidence/W3-A1-r3/` (declare actual provider).
- Accessibility reviewer: `reviews/claude-05/W3-A1-r3.md`.
- Each original reviewer may append a separately named `2026-10-01-reconciliation-addendum.md` under its own review root to correct earlier inventory/coverage statements. Do not overwrite the original returns.

**Exact defect IDs:** REV-01, carrying W1-04 and W3-02. Review W1-02/W1-03 and W3-04 closures within the assigned domain. W2 acceptance is not reopened solely to fix unrelated W1/W3 review-table hashes.

**Required behavior:** calculate inventory hashes from actually supplied/read bytes, state canonical archive vs Git newline policy, identify actual provider/model/access, and list missing material. A browser review must say which images/text/logs it received; reading those logs is SOURCE INSPECTION of MAKER EVIDENCE, not REVIEWER EXECUTED. Independent local checks must retain executable source/command/output and the exact candidate identity. Distinguish 50 native W1 materials from 49 in the old GLB, old W3 payload numbers from a new build, and intermediate lint failure from final passing source.

**Prohibited unrelated changes:** no delivery source/asset edits, copied maker approval, invented hashes, claims of inaccessible local files or unexecuted tools, new product plans, later-feature requirements, external messages/publication, or G1 work. Preserve the earlier reports even where their recommendations were wrong.

**Tests/evidence required:** zero unexplained inventory mismatches; independently reproduce or explicitly limit each claimed closure. The local reviewer must inspect the final W1 home/mobile images and execute the real shared collision checker on negative cases; implementation reviewer must reproduce the quoted/template fixture rejection on the final W3 source and verify production evidence. Contract/accessibility addenda may use a documented byte-identical-source bridge for unchanged areas, plus the final dependency/build context, without repeating the whole audit. Any reviewer execution gap must remain UNVERIFIED.

**Independent reviewer of this packet:** parent Codex checks identities, hashes, raw outcomes and specification-based dispositions after returns; only the parent accepts the packet revisions.

**Completion condition:** new bounded returns bind the final candidates, correct unsupported earlier claims, retain genuine limitations, and provide enough independent closure for a new parent gate decision. If they do not, the gate remains locked; elapsed time or a favorable recommendation does not constitute acceptance.
