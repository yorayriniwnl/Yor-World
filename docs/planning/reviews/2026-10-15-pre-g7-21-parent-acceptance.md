# PRE-G7-21 parent acceptance

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Decision:** **ACCEPTED for the exact local production-build scope below.**
- **Authority:** Parent Codex, Architect and Acceptance Authority.

## Accepted candidate and evidence

This acceptance covers source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`, and app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`.

The evidence-only branch is `codex/pre-g7-21-current-source-build-evidence-20261015`, commit `8d88a324a25d14a3a19a1957e680692f7043a008`, tree `5b42bad382c6dc606615cf27a1970c2960fb93a4`. Local and GitHub branch heads match and the worktree is clean. Only the PRE-G7-21 evidence directory changed. The 26-entry strict inventory and six external source-blob checks passed; its raw SHA-256 is `d4e4c4ab7c23d8af137626c5763cf4706937e8275a699e81b4308a20e7f1bfb1`.

The authorized exact command ran once from the canonical `app/` root under Node 24.19.0 and pnpm 9.15.9:

- `pnpm run build`: **PASS**, exit 0, 251.967 seconds. The captured Next.js 16.3.8 output reports successful compilation and seven static pages; stderr is empty.

The packet-authorized offline frozen dependency setup passed with exit 0 in 75.913 seconds. Four before/after captures bind the unchanged source and app trees. Protected source blobs agree with the exact source commit, and no tracked app diff is recorded.

The read-only review is recorded in the [PRE-G7-21 independent audit](2026-10-15-pre-g7-21-independent-audit.md). The maker was a **local Codex substitute for Gemini #3** and the reviewer a **local Codex substitute for GPT Plus #2**; neither external account participated. The maker did not audit or accept its own work.

PRE-G7-17's two integration passes, PRE-G7-19's 327/327 unit result, and PRE-G7-20's lint/typecheck passes remain separate carry-forward evidence; they were not rerun here.

## Remaining limits

This accepts only the current-source local production-build gate. Physical-device and assistive-technology checks, the user's Chrome GPU state, browser/performance checks, provider setup, domain/sender verification, deployment, rollback, live checks, and production readiness remain unaccepted or **NOT RUN**. No deployment or production configuration occurred. G7 remains unaccepted; work remains local-only.
