# Shared execution instructions

Every numbered prompt below is meant for one assigned role and one bounded task. Read this file with the selected prompt. The detailed prompts are a successor dispatch guide based on the October 10 audit; they do not retroactively accept FINISH-B1/C1 or override the historical FINISH-00 ruling.

## Establish the actual handoff

Open `C:/Users/yoray/Projects/Yor World/AGENTS.md`, `START_HERE.md`, `docs/planning/delegation-and-work-orders.md`, `docs/planning/account-operating-model.md`, `docs/planning/reconciliation-packets/2026-10-10-finish-02.md`, this pack's README, and the selected prompt. Read that prompt's named local source and evidence directly. Browser chat readers must receive actual file contents through the documented browser review workflow; path names alone are not access. Report **NO FILE ACCESS** or **MISSING INPUT** when applicable.

At the start, record packet/revision, assigned account, actual available model/tool identity where exposed, workspace/branch, base commit, app tree, contract revision, input hashes, exclusive delivery root, exact canonical changed-path allowlist, reviewer and required predecessor rulings. Check current files and status before assuming a missing delivery remains absent. Never infer a model invocation or external account connection from a document's role label.

The October 10 recheck was committed as `ff05a155b1d630bdf9d5ce852a1af56415c074ee`. At that point canonical `app/` still had tree `42ea29ec235225046a75959eb19eb386ac2f821d`, matching RC6 source acceptance. These anchor the findings; they are not hardcoded bases for every later packet. Parent must supply exact accepted successor identities when work advances. Detect changed inputs before editing or reusing proof, and reconcile rather than overwriting another worker's work.

An unfilled essential source/hash/ownership field means the affected implementation is not ready for dispatch. Resolve what can be read from the workspace without asking the user to repeat it. Route actual contract/path conflicts to Parent. Continue independent inspection, fixture preparation and other authorized work that does not depend on the unresolved decision. Do not silently expand scope or decide a dangerous cross-lane contract as a maker.

## Ownership and revision rules

- Gemini #1 owns platform/backend work; Gemini #2 owns art/assets; Gemini #3 owns runtime/integration. GPT #2 independently audits; GPT #1 coordinates and accepts. Use GPT-6.1 Sol for routine coordination/audit; Astra for dangerous cross-lane decisions and major gates. If the requested tier is unavailable, report that limit rather than labeling another model's result Astra.
- Run separate makers in parallel only on independent packets with disjoint roots and compatible dependencies. Never run all five accounts on one problem. Serialize tasks assigned to the same account.
- Makers write source, patches, assets and receipts only under their assigned delivery roots until an explicit integration packet allocates canonical paths. Parent and auditors do not absorb production fixes. An auditor may author diagnostic code under its audit root, but cannot change the tested candidate or maker proof to produce a pass.
- Preserve old deliveries, failed attempts, accepted rulings, contract records and release evidence. A correction receives a new named revision; do not overwrite a previous artifact with different bytes and the same evidence identity. New B1/C1 corrections belong under `deliveries/FINISH-B1-R2/` and `deliveries/FINISH-C1-R2/` unless Parent binds an explicit later revision.
- Source copied into an isolated candidate must have a manifest of base files plus exact overlay patches/assets. Record application order and conflicts. Accepted B1/C1 overlays may create C2's test base; that is not canonical application integration or a release.
- Keep temporary dependencies, caches, credentials and generated bulky scratch out of delivery/commit inventories. Enumerate any evidence exclusions. Do not perform broad cleanup on unrelated files. Windows filesystem operations use verified literal paths within the intended owned root.

## Implement observable outcomes

Use the existing product specification and accepted contracts. For every assigned requirement, identify the actual user action, visible/semantic result, failure behavior and needed evidence. Source presence, exported function names, registered interactions, button labels or a test count do not establish the experience.

Prefer meaningful tests of the user-visible behavior or system boundary that previously failed. Do not write assertions that merely repeat a constant or call an isolated callback and then claim the runtime integrated it. Negative tests should distinguish the expected safe failure from a catch-all error. A test that passes by reproducing a bug must be labeled **DEFECT REPRODUCED**, never a passing requirement.

Respect conventional navigation, useful HTML/no-JS/no-WebGL behavior, reduced motion, decorative pause, sound preference, cancellation priority, resource ownership and performance budgets. Preserve truthful unavailable states where an approved document or verified project input is missing. Do not invent biography, evaluation scores, certificates, likeness permission, asset rights or a resume PDF.

## Evidence contract

Each delivery returns actual files with:

1. `report.md`: scope, base/dependencies, changed paths, implementation summary, requirement results, known defects, missing inputs, limitations and next review step.
2. `source/` and `source.patch`, or actual editable/exported art assets, as appropriate. Patches must apply to the declared base. List new, modified and removed paths explicitly.
3. `input-hashes.json` and `output-hashes.json`: path, byte size, SHA-256 and hash policy. Raw bytes are preferred; if text normalization is used, declare it and retain reproducible verification. Exclude the output manifest itself explicitly to avoid a circular hash.
4. Actual command receipts: working directory, command, tool/dependency versions, UTC start/end, exit code, source/lock/build identity and raw output location. Redact secret values and private visitor data; preserve useful evidence without committing sensitive originals.
5. A requirement/finding closure table: ID, trigger, expected outcome, observed outcome, **PASS / FAIL / NOT RUN**, evidence path and remaining limitation. Record source inspection, mocked unit boundary, local browser, real provider, physical device and manual assistive testing separately.
6. Captures/traces/measurements where the requirement concerns visible motion, layout or timing. Name renderers, devices, viewports, network profiles, cache states and capture method. An EEVEE render is not a browser WebGL frame. A screenshot containing a hardcoded FPS label is not a performance sample.

Use existing pinned dependencies and scripts where possible. Record actual versions rather than copying a predecessor's report. If the task needs a dependency change, keep it within the Parent-bound scope and verify official primary documentation as needed. No implicit `npx` download is evidence of a reproducibly pinned tool. Tests appropriate to changed behavior come first; full cumulative suites belong to the integration/release packet. Do not repeatedly run unchanged broad suites without a new reason.

The historical 713 distinct tests were 312 unit + 286 integration + 109 E2E + 6 performance. The 17 accessibility cases were inside the 109 E2E. Future suites use actual discovered unique cases, skips and failures; do not freeze those counts or double-count accessibility.

## Review, Git and completion

Follow **Parent packet → maker → independent audit → maker correction → independent delta audit → Parent acceptance → next dependent packet**. A maker may say a candidate is delivered, not accepted. Auditor PASS is advice within inspected scope. Source acceptance does not mean integrated, deployed, G7 accepted or full-product complete.

After completed code changes, create a small descriptive commit and push only owned paths to the verified GitHub repository and assigned branch, following `AGENTS.md`. Inspect the staged diff. Preserve unrelated changes; do not force-push, bundle another worker's output, merge without assignment or invent a remote. Report auth/network/branch/remote failures immediately. Record actual commit and remote readback. Parent can coordinate the scoped commit when several documentation workers share one pack.

Deployment authorization `G7-OWNER-AUTH-20261006` persists. Actual credentials, provider configuration, approved documents and physical-device access may still be missing. Request specific missing inputs when necessary, without repeating deployment consent or posting secret values in chat. No paid purchase/upgrade is implied. Never convert NOT RUN to PASS because access is difficult.

End each task with the candidate identity, files returned, actual checks, unresolved issues, designated reviewer and next dependency. Keep shipped status separate from delivery status. Do not create an overall completion percentage from file counts, test totals or gates. Complete-project acceptance includes the six retained extensions and fresh evidence for the final cumulative release.
