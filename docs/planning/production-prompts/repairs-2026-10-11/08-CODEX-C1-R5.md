# FINISH-C1-R5 — local runtime correction handoff

**Worker identity:** local Codex implementation worker for the runtime-maker lane. Do not claim external Gemini execution.

Read `AGENTS.md`, `START_HERE.md`, FINISH-04/05/06/08, the accepted FINISH-00-R2 design ruling and manifest, the runtime lifecycle contract, the complete C1-R3 delivery/report/output hashes, the six FINISH-06 R4 findings, and the R4 partial source/tests bound by FINISH-08. Report any unreadable input. Treat R4 as unaccepted, untested diagnostic reference only.

Verify `deliveries/FINISH-C1-R5/` is absent immediately before creation. Own only that fresh root. Preserve R3, the entire occupied R4 folder, audits and canonical `app/`. Build a clean candidate against the immutable base `f62a43c5e71c00dcb89e28275ea81d842167db80` / app tree `42ea29ec235225046a75959eb19eb386ac2f821d`, then apply the R3 predecessor patch with SHA-256 `e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d`. Do not mutate any source outside the exact C1 six-path allowlist in FINISH-06.

Carry forward and prove all original FINISH-06 requirements:

1. Only explicit `Content-Encoding: identity`, validated positive length and matching EOF bytes may support a determinate essential aggregate; compressed, unknown, chunked, contradictory or mismatched responses stay indeterminate.
2. Clear failed-attempt byte/trust state before announcing its retry.
3. Preserve the GLB source texture's flip convention, UV channel, wrap modes and transform with isolated target state.
4. Make optional-map registration atomic; a failure restores visible material and every quality registry and releases all failed derivatives without changing unrelated shared-material users.
5. Give greeting timers to their `WorldRuntime`; replacement cancels the old timer, stale callbacks cannot complete a newer action and disposal clears timers synchronously.
6. Rerun applicable retained suites, lint, typecheck, production build and source-bound browser paths on the exact sequential R3+R5 candidate.

Also close the exact R4 intake gaps:

- A stream is not numerically trusted before EOF verification. Add a case with an otherwise valid first required file and a malformed final required file; the aggregate remains indeterminate until valid matching EOF.
- Inject optional texture assignment failure while a second mesh shares the original material. Assert the unrelated mesh/material is unchanged, the visible material and registries roll back, each temporary derivative is disposed once, and the original base texture is not disposed. Use a valid spy/count; the R4 assertion called `toHaveBeenCalled()` on an unmocked function.
- Add behavioral tests that instantiate `WorldRuntime` and control timers: replace greeting, manually invoke a stale callback, verify the newer transition remains active, then dispose and prove synchronous cleanup. The unchanged R4 project-transition test does not cover this.

Use test-first reproduction, then implement minimal fixes. The exact allowlist is:

- `app/src/features/world/AssetLoader.ts`
- `app/src/features/world/RuntimeMaterialQuality.ts`
- `app/src/features/world/WorldRuntime.ts`
- `app/tests/unit/world/completion-essential-loader.test.ts`
- `app/tests/unit/runtime-material-quality.test.ts`
- `app/tests/unit/project-transition.test.ts`

Return `source.patch`, exact `source/` replacements, changed-path list, input/output hashes, requirement matrix, sequential R3-then-R5 apply/check and byte-equality receipts, tool versions/commands/exits/raw logs, build identity and browser captures/receipts, plus truthful `report.md`. Stop on any scope/root collision. Do not edit canonical source, prior roots or audit files, commit/push, integrate, claim audit clearance or accept your own work. Parent will publish a scoped commit after stable return; stop for independent audit.
