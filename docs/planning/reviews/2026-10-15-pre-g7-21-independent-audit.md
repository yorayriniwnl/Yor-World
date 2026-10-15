# PRE-G7-21 independent audit

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Reviewer:** Parent Codex, acting as a local Codex substitute for GPT Plus #2. The external GPT Plus account did not participate. This read-only reviewer is separate from the maker agent.
- **Mode:** Read-only artifact and Git verification. No source was edited and no quality gate was rerun. Inventory bytes, hashes, Git blobs, source identity, receipts, and logs were checked against the exact pushed commit.

## Result

**PASS** for the packet's exact-source local production-build evidence.

| Criterion | Result |
| --- | --- |
| Packet provenance | PASS — maker evidence identifies authorizing parent packet commit `a6fd3bf6c245aa7207a6373baf3236e2560c710c`. |
| Local and remote identity | PASS — branch `codex/pre-g7-21-current-source-build-evidence-20261015`; local and `origin` HEAD are `8d88a324a25d14a3a19a1957e680692f7043a008`; evidence tree `5b42bad382c6dc606615cf27a1970c2960fb93a4`; worktree clean. |
| Source binding | PASS — evidence commit's parent is source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`; source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`; parent app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`. The app tree also matches the source commit. |
| Evidence scope | PASS — all 27 changed paths are confined to `deliveries/G7/preparation/maker-evidence/pre-g7-21/`. |
| Production build | PASS — the receipt and captured output agree on the one exact `pnpm run build`, exit 0, 251.967 seconds, Node 24.19.0, pnpm 9.15.9, and Next.js 16.3.8. The output reports successful compilation and all seven static pages; stderr is empty. |
| Setup | PASS — packet-authorized `pnpm install --offline --frozen-lockfile` setup receipt reports exit 0 in 75.913 seconds. |
| Source unchanged | PASS — all four source-state captures bind the exact source commit/tree/app tree and report no tracked changes or app diff paths. Six protected source files' committed blobs match the source commit, including the historical manifest; the build did not change `app/next-env.d.ts`. |
| Strict inventory | PASS — independently checked 26 artifact entries for raw SHA-256, byte count, and committed Git blob; all match. The six external source-commit blob checks also match. Inventory raw SHA-256: `d4e4c4ab7c23d8af137626c5763cf4706937e8275a699e81b4308a20e7f1bfb1`; inventory Git blob: `416457c42e325d26d3f84937b44a41c7b5ca6324`. |
| Carry-forward and out-of-scope gates | PASS — PRE-G7-17 integration, PRE-G7-19 unit, and PRE-G7-20 lint/typecheck results are labeled as carry-forward context. Browser, physical-device, performance, provider, database, deployment, and live-production checks are not claimed by this packet. |

The evidence did not contain a substantive discrepancy. The maker was a **local Codex substitute for Gemini #3**, not the external Gemini account. The reviewer was a **local Codex substitute for GPT Plus #2**, not the external GPT Plus account.
