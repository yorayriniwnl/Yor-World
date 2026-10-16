# PRE-G7-26 maker evidence

**Disposition: FAIL / unaccepted.** The single authorized diagnostic invocation timed out before it produced complete item-level attribution. One Edge desktop capture was persisted and is retained as partial evidence. The P25 donor was not traced, no renderer optimization was attempted, and no acceptance claim is made.

**Maker identity:** local Codex substitute, not Gemini #3.

## Source and scope

The task branch started at setup commit `02d6903a17f2c68522b31559de7a04ee801ba14c`. Source restoration is committed and pushed as `bae139b7f5135d57d1c8b31b9be0a46bb613817e`. Its `app/` subtree (`ba0b709192367e1d12a796618f97801a8fcd5a70`) and `yorayriniwnl.in/` subtree (`34f7ac0731984e50cbb06cf02039911ba65f59a9`) exactly match accepted source `500d10fa5901be48d4ff877e608d65ba0e271bb9`. There is no renderer candidate in the final source commit. The source/mirror commit file list and measurement-overlay hashes are in [source-binding.json](attempt-01/source-binding.json).

The PRE-G7-23 and PRE-G7-24 packet files named by older materials were absent from this branch's tree and reachable history. Their other-local-ref copies were not used. Inputs used here are the committed P26 packet and ruling, accepted source 500d, the P25 packet/report and P25 candidate as a donor only. The ruling's instruction to preserve accepted 500d's upper-shelf ivy was followed; no authored scene content was changed.

## Attribution invocation

The single invocation was `pnpm exec playwright test tests/e2e/p26-render-attribution.spec.ts --config p26-attribution.config.ts` in `C:\p26-maker-20261016\app`, with Node 24.19.0, pnpm 9.15.9, and `@playwright/test` 1.63.0. It was a temporary query-gated measurement overlay, not the packet's composition E2E. The 30-second Playwright test timeout was left unchanged.

Chrome failed with a 30-second test timeout; after the timeout the page/context was closed while the test evaluated the browser identity. It persisted no screenshot or attribution JSON. Edge wrote the first viewport, 1440x900 HIGH, then hit the same 30-second test timeout on `page.setViewportSize` for the next viewport. The invocation exited 1. No retry was made. The retained terminal excerpt is transcribed from the tool-returned merged stream; native stdout and stderr were not separately persisted. Both Playwright error contexts and last-run metadata are under [attempt-01/attribution](attempt-01/attribution/).

The partial Edge desktop attribution binds accepted source 500d/app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. It records **412 main-pass + 11 shadow-pass = 423 inclusive calls**, against the desktop ceiling of 120 (**+303 FAIL**), with zero multi-draw invocations. The full item rows are in `attempt-01/attribution/accepted-root-500/edge/desktop-1440x900-edge-attribution.json` (1,488,599 bytes, SHA-256 `0c8bf43b963df0fcd29a73d3506f9a323e17e808a15e13c42fc015b354e42aa6`); the screenshot is 363,487 bytes, SHA-256 `a42ae4d429b08921fd807a1f4333beb22dd8e540a0126e72fb8feeac9d3e7cad`. The trace has 423 submission rows and 217 object/pass pairs. The browser emitted one HTTP 404 console error; the requested URL is not available in the retained output. The browser identified as Edge 155 in its user agent; the WebGL renderer string was `WebKit WebGL`.

Coverage is partial: accepted-root Edge desktop only (1 of 8 required browser/viewport captures). Accepted-root Chrome and the other seven captures, plus all eight P25 donor captures, are **NOT RUN / unavailable**. This failed attribution does not support a complete item-level comparison or a safe optimization choice.

## Frozen ceilings and historical donor gap

P26's partial accepted-root desktop sample is 423 calls versus the 120 ceiling. The P25 donor's existing, non-P26 report records 129 inclusive calls in all eight browser/viewport rows. Those historical donor rows miss the unchanged ceilings as follows; they are not fresh P26 measurements:

| Historical P25 donor viewport | Tier | Calls | Ceiling | Gap |
|---|---:|---:|---:|---:|
| Chrome and Edge 1440x900 | HIGH | 129 | 120 | +9 FAIL |
| Chrome and Edge 390x844 | MEDIUM | 129 | 80 | +49 FAIL |
| Chrome and Edge 320x600 | MEDIUM | 129 | 80 | +49 FAIL |
| Chrome and Edge 844x390 | HIGH | 129 | 120 | +9 FAIL |

The source of that historical table is [P25 attempt-03 REPORT.md](../pre-g7-25/attempt-03/REPORT.md), bound there to P25 source `28fb4187445206bcc62e2ef0ae2678e44ac6604b`. P26 did not re-run those captures. P26 triangles, full-frame parity, named anchors, interactions, shadows, fallback behavior, and inclusive calls for the other viewports are **NOT RUN**.

## Result matrix

| Gate | Result | Evidence |
|---|---|---|
| Restore tracked app and mirror to accepted 500d | PASS | Source commit `bae139b7f5135d57d1c8b31b9be0a46bb613817e`; exact app/mirror tree hashes above |
| Accepted-root item attribution | FAIL / partial | One Edge desktop capture; `attempt-01/attribution/run-result.json` |
| P25 donor item attribution | NOT RUN | Single diagnostic invocation ended before donor capture |
| Renderer-only optimization | NOT RUN | Stopped after the failed single attribution invocation; no candidate source change |
| Focused batching/runtime tests; full unit suite; lint; typecheck; production and evidence-enabled builds | NOT RUN | Parent stop instruction; no test/build reruns |
| Composition E2E; configured performance suite; two consecutive integration runs | NOT RUN | Parent stop instruction; no test reruns |
| Same-tier eight-view capture and full-frame pixel parity | NOT RUN | No complete P26 candidate capture |
| Physical-device, screen-reader, mobile-soak, and `chrome://gpu` checks | NOT RUN | No hardware/device evidence collected |
| External GPT Plus #2 audit | NOT RUN | No external audit report |
| Parent acceptance | PENDING | Maker does not accept its own work |

## Follow-up proposal

Use a separate Track B authorization to first capture stable item-level traces for all eight accepted-root and P25 donor profiles, with the accepted source and donor source bound independently. Only after that inventory identifies safe opaque, static items, evaluate an asset-authoring path that consolidates geometry by identical shader/material compatibility while retaining material slots, transparent ordering, transforms, shadow-caster behavior, and a source-object-to-raycast mapping. Keep dynamic and semantically distinct objects on their existing paths. The historical P25 gap requires at least 49 fewer submissions on mobile/compact and 9 fewer on desktop/landscape; this report does not establish that enough compatible items exist. Validate the no-multi-draw fallback, pixels, interactions, and inclusive main-plus-shadow calls under that new packet. No GLB, threshold, quality-tier, content, or rendering-policy change is authorized by this P26 result.

The P26 evidence-only commit is separate from source commit `bae139b7f5135d57d1c8b31b9be0a46bb613817e`; its hash and push result are recorded in the maker handoff. P26 remains **FAIL / unaccepted** pending the required independent review and parent decision.

