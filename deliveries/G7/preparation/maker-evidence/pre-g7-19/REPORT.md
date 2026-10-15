# PRE-G7-19 maker report

Maker identity: **local Codex substitute for Gemini #3**, not the Gemini #3 account. This is implementation and test evidence only. The maker has not audited or accepted this result; parent review remains separate.

## Disposition

The sole exact default unit-gate invocation **PASSED: 327/327 tests in 26/26 files**, exit code 0. It ran `pnpm run test:unit` with no filters or arguments, using Node 24.19.0 and pnpm 9.15.9. The runner measured 15.629 seconds elapsed; Vitest reported 13.19 seconds. The exact command, runtime receipt, and unmodified stdout/stderr are preserved in `final-attempt/`.

The one instrumented diagnostic did not execute as a focused test. Although the recorded command included a file filter, pnpm forwarded a literal `--` into Vitest's script arguments, and the captured invocation ran all 26 unit files. That diagnostic all-suite run passed 327/327, but it is classified only as supplemental. Its instrumentation worker also reported Node 24.14.0, so the timing is not considered pinned-runtime evidence. No second diagnostic or focused run was made.

The diagnostic measured a 773 ms boundary-test body: source discovery/read 259.740 ms, TypeScript parsing 338.303 ms, AST traversal 159.294 ms, import resolution 15.130 ms, and inclusive module validation 509.838 ms. The phase measurements overlap because module validation includes nested phases. They do not reproduce PRE-G7-18's reported 68.215-second body and do not establish a direct bottleneck in the test implementation. No source correction was justified or made.

## Candidate identity and scope

The isolated branch is `codex/pre-g7-19-boundary-runtime-attribution-20261015`, at the exact PRE-G7-17 source base `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`. The source tree is `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`; the app tree is `0804688e4cdd55960e71a19efc8384d4a2f0d071`. No source delta or source commit exists. The temporary instrumentation was restored before the final default run.

The app test and domain mirror have the same Git blob, `c2353be846e7c34d2e0d7305f6240245db7f9078`, and match their byte-exact PRE-G7-17 snapshots. The 117 discovered source paths match the prior path-set evidence: sorted-path SHA-256 `41a41d3c89d684a322f5e81ae46ac472f06673f03e61f98d7f0ffa8e65a547e3`, traversal SHA-256 `d02064134564b5d071c611aa09d9457d87499b3ecaa41bbf3ecc5bfcc6975294`, with no added or missing paths. Test declaration and assertion fingerprints are unchanged.

The root `yorayriniwnl.in/source-delivery-manifest.json` remains byte-identical to the historical PRE-G7-13 manifest: 64,995 bytes, raw SHA-256 `2af6525d70510f4d3074dd95d48d762365f1b038bbac25db010f6da4f6155f06`, Git blob `a4a117eacc9ccecf5584a67c11be034723c143a8`. It is retained as historical provenance and is not claimed to be bound to this candidate.

The only candidate changes are the evidence files under `deliveries/G7/preparation/maker-evidence/pre-g7-19/`. No runtime code, test assertion, test configuration, integration path, content, contract, or asset changed.

## Other checks

- Lint, typecheck, and production build: **NOT RUN**; the final candidate contains no persistent source or test-code change.
- Integration rerun: **NOT RUN**. PRE-G7-17's two consecutive default 286/286 passes carry forward because this candidate leaves the source and app trees unchanged; no new integration result is claimed.
- Physical-device and accessibility sessions: **NOT RUN**. The user's browser GPU state remains **NOT PROVIDED**.
- Provider setup, deployment, DNS/domain work, and production configuration: **NOT RUN**.

The exact command history, validation command, file inventory, and attempt receipts are in `COMMANDS.md` and `evidence-inventory.json`. After the initial evidence commit, the first validator version incorrectly treated the evidence commit itself as source identity; the follow-up validator binds the candidate to the packet base and confirms the committed delta stays within this evidence directory. The full staged whitespace check reports existing whitespace in verbatim input snapshots and raw logs; those artifacts were preserved without normalization. The authored report, command record, and validator pass a scoped whitespace check. The external reviewer and parent acceptance remain separate; this report makes no acceptance claim.
