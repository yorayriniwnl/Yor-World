# Independent audit return: PRE-G7-10

Auditor: read-only `audit_domain_site` reviewer

## Audited identities

- Implementation: `95729282af3d84b4e3158158546643935e737b7a`
- Evidence closeout: `9040dbecb9bd71804e95f91cd9bebea9b7507fee`
- Result app tree: `e53f3ea9c6c80f471832e46d548206105699c32b`
- Accepted baseline app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`

## Final result

**PASS for the narrow runtime implementation and corrected evidence.** The review was independent and read-only. It was not Parent acceptance.

- Source identity and scope pass. Only `WorldRuntime.ts` and `world-runtime-recovery.test.ts` changed in the app tree. The archived source patch matches the Git diff.
- Replay-safe cleanup passes source review. Renderer resources are disposed while the same connected canvas retains its context through React Strict Mode effect replay. Detached cleanup preserves forced context loss.
- Focused recovery coverage passes, 13/13. It covers connected-canvas replay, detached cleanup, genuine context-loss fallback/recovery, replacement runtime recovery, and renderer creation failure. GPU behavior in these tests is mocked.
- Accepted baseline reproduction passes as archived evidence. It records the `precision` creation failure and React `doubleInvokeEffectsInDEV` / `reconnectPassiveEffects` stack.
- Production browser context-loss and recovery passes as archived evidence on Intel Iris Xe through ANGLE/D3D11. A trusted loss event reached fallback; retry used a replacement canvas and rendered 206 frames.
- Actual WebGL unavailability passes for fallback behavior using Chromium `--disable-webgl`. Retry remains in fallback while WebGL stays disabled; successful rendering was shown in a separate fresh enabled context, as disclosed.
- Lint, typecheck, integration, and production build logs support the maker's reported pass results. Integration passed 286/286.
- All 43 entries in `SHA256SUMS.txt` match the exact committed Git blobs. No duplicate or unlisted evidence entries were found.

## Disclosed limits

- The default unit command `pnpm test:unit` failed twice because a boundary test exceeded its 5-second timeout. The complete unit suite passed 316/316 only with a 15-second timeout override. The default command remains a failure and is not relabeled as passing.
- Independent test/build/browser execution, mobile or physical-device coverage, deployment, and G7 acceptance were not run by the auditor.
- Original-resolution fallback screenshots show nearly white action labels on a pale panel. `WorldFallback.tsx` and `world.module.css` are unchanged from the accepted baseline and outside the runtime packet. The screenshot evidence proves runtime state and retry behavior, not visual accessibility or contrast. A separate parent-owned accessibility task is required.
- Additional coverage for detachment between disposal and the queued microtask would strengthen the regression suite; the auditor found no observed source failure requiring a scope change.
