# PRE-G7-17 parent ruling: integration passed; unit gate unresolved

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Scope:** [PRE-G7-17 packet](../reconciliation-packets/2026-10-15-pre-g7-17-unit-and-final-suite-gate.md)
- **Parent packet commit:** `8c21c26ac5f0b9e264c4778350899a6148e0193c`
- **Decision:** PRE-G7-17 source is **NOT ACCEPTED**. The two-pass integration subgate passed, but the required exact default full-unit gate did not. The current source-delivery manifest also does not bind this candidate.

## Exact candidate and evidence

- Source branch: `codex/pre-g7-17-unit-boundary-verification-20261015`
- Source base: `f71d1df028f80637abb3e427040f0e0f5085179c` (app tree `a19c817a7ebfa8962f0b898364ca01e8770e302a`)
- Source commit: `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`
- Full source tree: `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`
- App tree: `0804688e4cdd55960e71a19efc8384d4a2f0d071`
- Evidence head: `9c75661bc12d309b0d1fb00d3305179c6f6c3728`
- Evidence tree: `3dd349f82160bb8c60f767bf3bf2f9223d8d0b35`
- Evidence inventory SHA-256: `1eb54d6c0bd107210c4d293534b734021c5c7d1442e0b7209f50f7f8a6ecb2df`
- Source patch SHA-256: `0c8f639657bcc7e03eecf38c2ed72dd5ca1d29bd58862d47523e61d026b6943c`
- Maker report and raw receipts: `deliveries/G7/preparation/maker-evidence/pre-g7-17/` on the evidence head above.

The exact source and evidence refs were read back from GitHub. The source and evidence commits are separate; the evidence worktree is clean. PRE-G7-15 remains the accepted source baseline.

## Gate findings

| Requirement | Result |
| --- | --- |
| Source scope and mirrors | PASS — four authorized test/config paths only; both changed source/delivery pairs match. |
| Coverage preservation | PASS — all 117 discovered source paths, 13 test declaration lines and 30 assertion lines match the accepted base. The cache uses exact `(filePath, text)` keys; no paths, tests or assertions were removed. |
| Unit diagnosis | PASS — process samples independently show up to 11 Vitest workers before the authorized `fileParallelism: false` change. |
| Default full-unit gate | **FAIL/INCOMPLETE** — the final exact `pnpm run test:unit` invocation exited 1 on the unchanged boundary test at 8.783 seconds. Its wrapper ended before a complete aggregate summary was recorded; no final total is inferred. The required 327/327 pass was not established. |
| Supplemental unit evidence | Not a gate result — the focused boundary test passed its selected case. A command with misrouted focus arguments ran 327/327, but was not the exact default command and does not replace the failed final default run. |
| Default integration gate | PASS — two consecutive `pnpm run test:integration` runs passed 286/286, exit 0, on the exact final source, with no filters or timeout overrides. |
| Lint and typecheck | PASS — `eslint . --max-warnings=0` and `tsc --noEmit`, exit 0. |
| Protected files and evidence integrity | PASS — all 17 protected hashes unchanged; 83/83 declared evidence inventory entries verified on their stated bases; 11 evidence JSON files parse; the source patch reproduces the exact source diff. |
| Current source-bound delivery manifest | **FAIL** — the preserved manifest identifies PRE-G7-13 source `8bc0db9b1572e3603000cbc657a3d04a3dabf0d7`, app tree `7e5ca476b9b9b5544942a3f1229f540dd99b9d8e`, and superseded attempt-50. Its bytes are verified, but it does not bind PRE-G7-17. |
| Build and physical-device checks | NOT RUN — build was not required for the test-only delta. No iPhone/iPad, Android device, NVDA installation, or Safari/VoiceOver environment was available on this host. |

The manifest remains unchanged. The packet's owned-path rule authorizes updating it when delivered source paths change; this delta retained the same paths. Its stale provenance is recorded as a gap, not silently treated as current. A future correction needs an explicit parent packet.

The independent review was a read-only local Codex substitute, **not external GPT Plus #2**. It identified no source coverage defect. It confirms that the unit acceptance gate and manifest binding remain unresolved. The maker did not self-accept, and the parent decision does not waive either requirement.

## Local browser and device evidence

The supplied hydration mismatch names `data-darkreader-proxy-injected`, `data-new-gr-c-s-check-loaded`, and `data-gr-ext-installed`, attributes injected by browser extensions. These particular differences point to extension mutation of `<html>` and `<body>`, not a changing server-rendered application value; no `suppressHydrationWarning` change was made.

An isolated local Chrome 155.0.8059.40 profile on the Intel Iris Xe host reported `WebGL: Hardware accelerated` in `chrome://gpu`. That page had no separate WebGL2 row; a direct context probe created WebGL2 and returned `WebGL 2.0 (OpenGL ES 3.0 Chromium)`. This verifies the isolated host profile only. It does not verify the user's Chrome profile or the app's `WorldRuntime` initialization, so the user's GPU state remains **NOT PROVIDED**. The local preview at `http://127.0.0.1:3002/` responded with HTTP 200; this is not physical-device validation.

| Physical check | Result |
| --- | --- |
| iPhone/iPad Safari | NOT RUN — no Apple mobile device available. |
| Android Chrome with TalkBack | NOT RUN — no Android device or ADB available. |
| Windows NVDA | NOT RUN — NVDA is not installed on this host. |
| Safari with VoiceOver | NOT RUN — Safari/VoiceOver was not available on this Windows host. |
| Ten-minute mobile soak | NOT RUN — no physical mobile device available. |

## Disposition and next boundary

Do not promote PRE-G7-17 or replace the locally hosted PRE-G7-15 preview. The two integration passes close only that subgate. No more full-unit or integration runs are authorized by PRE-G7-17; the required default unit result remains unresolved. A new bounded parent packet is required before further suite work and to define the current source-manifest correction. G7 remains **NOT ACCEPTED**, and the instruction remains local-only. No provider configuration, DNS, deployment, or production claim was made.
