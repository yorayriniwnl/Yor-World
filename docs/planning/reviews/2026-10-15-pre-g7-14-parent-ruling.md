# PRE-G7-14 parent ruling: bounded production camera endpoint acceptance

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Scope:** [PRE-G7-14 work order](../reconciliation-packets/2026-10-14-pre-g7-14-production-camera-endpoint.md)
- **Accepted input:** PRE-G7-13 source `a3459c158af880319269196f85c0c922ee86c5d6`, app tree `23c7dac82746d7db84632e228efe3224736b9266`, final evidence head `498d6e1329ce651a816cd17935af5fa25bf01ba2`
- **Source commit:** `8056fece5cd0b8113b81313b6d6a22099163bb27`
- **Resulting app tree:** `fb4881289d618612b580ef2c576103f1d3e2112c`
- **Final evidence head:** `c4eeda6be483952e56dae7972633c1d9e82becb2`
- **Parent packet commit:** `66132297bdcf3f699f07f3e5d5e299ebe558ac2f`
- **Source/evidence branch:** `codex/pre-g7-14-maker-endpoints-20261014`
- **Audit return:** [read-only local audit](../../../deliveries/G7/preparation/pre-g7-14-parent-acceptance/independent-audit.md)

## Ruling

**PRE-G7-14 ACCEPTED as a bounded local production-camera endpoint correction.** This accepts the exact endpoint behavior and its source-bound evidence only. It does not replace RC6-R1 or the immutable G6-R1 baseline, and it is not a production release or G7 acceptance.

`EntranceCoordinator.entrancePositionAt` now returns the authored hallway and selected HOME camera vectors exactly at clamped progress 0 and 1. Progress clamping, mobile/desktop selection, and the intermediate doorway interpolation remain intact. The strict production-camera integration assertion remains unchanged.

## Evidence adjudication

- Focused unit tests passed **7/7**; focused production-camera integration passed **5/5**; full unit suite passed **326/326**. ESLint and typecheck passed. The production build passed in a hash-verified temporary source snapshot after the worktree build exposed Next/Turbopack's rejection of the external `node_modules` junction.
- The first default full integration run recorded **285/286**, timing out in the unrelated canonical-fixture test at its existing 60-second limit. The unmodified default command passed **286/286** in the temporary snapshot. The original failure and successful retry are both retained; no timeout or GPU policy was changed.
- The domain mirror audit passed for **116 source and 10 test entries**. Independent review confirmed the manifest Git-blob hashes, all **247** tracked application files in the build/test snapshot, and all **10** execution logs. The GLB and audited non-owned contract/asset/camera hashes remain unchanged.
- The first read-only review identified a stale visual-evidence pointer; the maker corrected it to the accepted PRE-G7-13 `attempt-60/composition/` record. The reviewer also validated `parentCommit` as the PRE-G7-14 authorization-packet commit, distinct from the source base. A subsequent review found an invalid literal `\n` suffix in the snapshot audit JSON; the maker replaced it with a real LF. The final committed JSON parses strictly, ends in `7d 0a`, and retains **247 files, zero mismatches, postVerification PASS**.
- The exact final remote head matches `c4eeda6be483952e56dae7972633c1d9e82becb2`; the final worktree is clean. The final delta changes only evidence files and the report; the source and app tree are unchanged from their already audited commits.
- The audit was performed by a read-only local Codex reviewer, **not GPT Plus #2**. No external GPT Plus #2 review was performed or claimed. This is a documented local-review substitution, so any later gate requiring the designated external audit remains unsatisfied until actually obtained.
- Physical iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, VoiceOver/Safari, and the 10-minute mobile soak are **NOT RUN**. Browser viewport emulation is not physical-device evidence.

## Remaining boundaries

The user's Chrome WebGL context-creation/loss behavior remains unverified and outside this packet. The hydration attributes shown in the screenshot are injected by Dark Reader/Grammarly; this acceptance makes no application-hydration fix claim. No provider configuration, database/auth setup, production origin, verified sender domain, DNS, deployment, monitoring, rollback, or G7 exit criterion was changed or accepted. The current instruction remains local-only. Any further runtime or release work needs a separate bounded parent packet based on this accepted source identity.
