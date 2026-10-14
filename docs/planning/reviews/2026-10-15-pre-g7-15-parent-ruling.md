# PRE-G7-15 parent ruling: bounded WebGL startup fallback acceptance

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Scope:** [PRE-G7-15 work order](../reconciliation-packets/2026-10-15-pre-g7-15-webgl-startup-fallback.md)
- **Accepted input:** PRE-G7-14 source `8056fece5cd0b8113b81313b6d6a22099163bb27`, app tree `fb4881289d618612b580ef2c576103f1d3e2112c`, final evidence head `c4eeda6be483952e56dae7972633c1d9e82becb2`
- **Source commit:** `8becac4ea3e9decc91ca2807e2004a0aa0407105`
- **Resulting app tree:** `26d4885d4c76233168baaea52c5a33aca1ede594`
- **Final evidence head:** `965abdaeff38282e2702e1ea97b4929acbef6889`
- **Parent packet commit:** `315bedb791e9500b898ebe4d1e024f0f477f9d67`
- **Source/evidence branch:** `codex/pre-g7-15-webgl-startup-fallback-20261015`
- **Audit return:** [read-only audit and delta record](../../../deliveries/G7/preparation/pre-g7-15-parent-acceptance/independent-audit.md)

## Ruling

**PRE-G7-15 ACCEPTED as a bounded local WebGL startup-failure classification and accessible-fallback correction.** This accepts only the exact source change and its source-bound evidence. It is not a claim that WebGL can be created on the user's PC, does not resolve the reported extension-added hydration attributes, and is not a production release or G7 acceptance. The immutable G6-R1 baseline and RC6-R1 acceptance remain unchanged.

`WorldRuntime` now distinguishes renderer construction/first-context failure from context loss after initialization. The accessible startup fallback gives actionable hardware-acceleration guidance and keeps portfolio links and retry available. The expected Three.js diagnostic is captured only during synchronous renderer construction when it exactly matches the known one-argument context-creation message; other console errors continue through the existing path. Technical details remain in a warning. Genuine scene/runtime errors and post-start context-loss handling retain their existing severity and behavior. No `suppressHydrationWarning` or unrelated renderer, GPU, camera, retry, or timeout policy was introduced.

## Evidence adjudication

- Focused runtime recovery unit tests passed **14/14** and the full unit suite passed **327/327**. Lint, typecheck, and production build passed. The focused renderer-recovery browser suite passed **20/20** across Chrome and Edge, including denied WebGL startup, accessible fallback/retry actions, post-start recovery, and no expected startup console/page errors.
- The final-source default integration suite failed **twice at 285/286**, with the existing canonical-fixture test reaching its unchanged 60,000 ms timeout. These failures are retained and remain unresolved; they are not adjudicated as passing. A pre-final-source run passed 286/286 but does not supersede the final-source results.
- Mirror parity passed for **116 source and 10 test entries**. The declared domain override and all **17 protected hashes** remain unchanged. All **247** tracked application files in the production/test snapshot match the source commit. The compressed source patch reproduces the exact binary diff.
- Independent review initially identified three inventory entries whose historical worktree hashes reflected CRLF/mixed bytes without recording the Git-blob basis, and a report reference to an unarchived attempt-02 receipt. The maker added raw-worktree plus committed-blob identities and LF-normalization results, recovered the receipt byte-for-byte, and explicitly marked its stale-source 14/14 result invalid and excluded. The final **47-entry** inventory validates; all **11** JSON evidence files parse strictly. The exact final remote head matches `965abdaeff38282e2702e1ea97b4929acbef6889`, the worktree is clean, and `git show --check` passes.
- The audit was performed by a read-only local Codex reviewer, **not GPT Plus #2**. No external GPT Plus #2 review was performed or claimed. Any later gate that requires that designated external audit remains open.
- The user's exact Chrome GPU/WebGL state is **NOT PROVIDED**. Physical iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, VoiceOver/Safari, and the 10-minute mobile soak are **NOT RUN**. Automated browser tests do not establish physical-device capability.

## Remaining boundaries

G7 remains **NOT ACCEPTED**. The default integration timeout, physical/manual device matrix, user's actual Chrome GPU status, service/provider readiness evidence, and all live-release checks remain open. No provider configuration, production origin, sender verification, DNS, deployment, monitoring, or rollback change was performed. The active instruction remains local-only. Further work requires a separate bounded parent packet; this ruling does not silently authorize production or accept PRE-G7-12 retroactively.
