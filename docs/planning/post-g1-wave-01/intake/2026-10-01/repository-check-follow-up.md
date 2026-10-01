# Repository check follow-up, 2026-10-01

This is parent-owned repository/CI coordination. No maker source, runtime contract or historical proof is changed.

## Actual PR integrity failure

Draft [PR #3](https://github.com/yorayriniwnl/Yor-World/pull/3), source head `66e75311a55d7fe777ec4db88134eaf92c07a005`, failed [integrity job 110444126298](https://github.com/yorayriniwnl/Yor-World/actions/runs/36884468630/job/110444126298).

The reference-hash and live-status steps passed. The new-archive step failed before checking any archive: `git diff --name-only --diff-filter=A origin/main...HEAD` exited 128 with `no merge base`. Checkout had fetched only the synthetic PR merge commit; fetching only one base commit did not restore its ancestry. This is a repository check failure, not evidence that this documentation PR added an oversized archive.

Minimal correction: retain `actions/checkout@v5`, fetch full history with `fetch-depth: 0`, and remove the later depth-one fetch. The [official checkout documentation](https://github.com/actions/checkout#fetch-all-history-for-all-tags-and-branches) defines zero as all history. Archive thresholds, reference/status assertions, triggers and permissions stay unchanged. The actual next GitHub integrity run is the regression test; consult PR checks for the result and exact tested commit. The original intake manifest describes pre-follow-up local verification and is preserved.

## Local Git maintenance warning

The intake commit and branch push succeeded. Automatic geometric repack also reported `fatal: bad object refs/remotes/origin/main (1)` and a maintenance-task failure. Read-only inspection confirmed both `main` and `main (1)` files under `.git/refs/remotes/origin/`. The published branch/head and remote main were independently verified after the warning; the planning worktree was clean.

No refs, objects, reflogs or Git configuration were changed to repair this warning. A separate repository-health correction should inspect both ref contents/object reachability and preserve a verified backup before quarantining the invalid duplicate; it must not delete the valid `origin/main` or any proof history. This warning does not invalidate the verified remote packet commit. Subsequent scoped commits may suppress automatic maintenance for that command only to avoid repeating the unrelated failing task; this is not a permanent configuration change.
