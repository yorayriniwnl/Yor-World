# PRE-G7-10 — local maker routing addendum

Date: 2026-10-14 (Asia/Calcutta). This addendum changes the execution lane for [PRE-G7-10](2026-10-14-pre-g7-10-webgl-context-replay.md) only. It does not change that packet's source baseline, owned paths, required behavior, evidence, review boundary, or release criteria.

## Routing decision

The available tool inventory has no Gemini connector or dispatch path. Under the owner's continuing instruction to complete the project, Parent assigns a separate local Codex worker as the PRE-G7-10 maker. The worker must execute the packet as written and own only:

- `app/src/features/world/WorldRuntime.ts`
- `app/tests/unit/world-runtime-recovery.test.ts`
- `deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime/`

The maker must state the actual local Codex provenance. This is not represented as a Gemini #3 return. Root `app/next-env.d.ts` and all other shared worktree changes are outside scope and must remain untouched and unstaged.

## Independent review and acceptance

After the maker returns an exact commit and evidence, a different read-only local Codex reviewer will audit that exact delta and its test/browser evidence. No connected GPT Plus #2 dispatch path is available, so the review record must identify the reviewer truthfully and must not claim an external GPT Plus #2 account. Corrections, if required, return to the maker for a separately audited delta. Parent alone decides acceptance; neither maker nor auditor may accept its own work.

## Boundaries

All requirements and proof in PRE-G7-10 remain mandatory, including the clean development reproduction, connected-canvas `setup → cleanup → setup`, detached teardown, WebGL failure/loss fallback, full local suites, production build, and clean-profile browser recovery evidence. This addendum does not accept the existing `70ec5911` candidate, integrate a result into `yorayriniwnl.in/`, change a status ledger, or authorize deployment. A new source binding, fresh proof, independent delta review, and Parent acceptance remain required before any production use.
