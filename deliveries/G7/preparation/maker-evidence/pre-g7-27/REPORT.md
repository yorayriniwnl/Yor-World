# PRE-G7-27 maker evidence

Status: **FAIL / incomplete; protocol nonconforming**

The accepted-root and donor production builds both failed TypeScript. The donor build followed an observer correction after the accepted-root failure, crossing the packet's no-repair boundary. Both failures are preserved; no Playwright invocation ran, and all 16 rows are **NOT RUN**.

The raw failures, source bindings, and partial build-output hashes are preserved in [attempt-01/REPORT.md](attempt-01/REPORT.md). Both source worktrees were restored to their pinned commits. Separate read-only audit and parent acceptance remain pending.
