# PRE-G7-27 maker evidence

Status: **FAIL / incomplete; protocol nonconforming**

Both accepted-root and P25-donor production builds failed TypeScript with four errors; no Playwright invocation ran, so all 16 capture rows are **NOT RUN**. The first donor install attempt was rejected under Node 24.14.0; the later frozen install passed with pinned Node 24.19.0 and pnpm 9.15.9. The donor build followed an observer correction after the accepted-root failure, crossing the packet's no-repair boundary.

The raw failures, source bindings, and partial build-output hashes are preserved in [attempt-01/REPORT.md](attempt-01/REPORT.md). Both temporary source worktrees were restored to their pinned commits. This was completed by a local Codex maker substitute, not Gemini #3. External GPT Plus #2 audit is **NOT RUN**; parent acceptance is **PENDING**. Physical-device checks and `chrome://gpu` are **NOT RUN**.
