# PRE-G7-27 isolated renderer attribution

Status: **FAIL / incomplete; protocol nonconforming**

## Disposition

The accepted-root build compiled, then failed TypeScript. A separate first donor build also compiled, then failed TypeScript. The donor build used a corrected measurement observer after the accepted-root failure; that crossed PRE-G7-27's no-repair-after-build-failure boundary. Both failures are preserved, and no further build or capture was run.

No Playwright invocation was launched. No browser context or route navigation occurred, and zero of sixteen rows were captured. All rows are **NOT RUN**.

The exact failed source trees and their observer and harness blobs were recovered from Git trees named in the receipts. Raw stdout and stderr, command receipts, and file-by-file inventories of both partial `.next` outputs are archived under `commands/`.

Accepted preflight checks 01 and 02 were false positives from matching their own wrapper or package paths; corrected check 03 was clear. The first donor install attempt used Node 24.14.0 and was invalid. A direct pinned Node 24.19.0 install then passed. The donor build receipt records a clear preflight.

The accepted build tree used a per-context deviceScaleFactor: 1 setting. A harness edit removed it after that build began; the donor build used the revised no-override harness. No page context was created, but the two build trees did not use identical harness policies.

## Source and runtime binding

- Accepted root: commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`; base app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`; base mirror tree `34f7ac0731984e50cbb06cf02039911ba65f59a9`.
- Accepted-root failed build tree: root `dfcd7cace30937232957cd1bcfbfc31cd10a8efd`; app `0eba107c8ad66db30a8423a12f4e9b0233ebc1c4`. It used observer blob `39b102cb73bfc4be3d7276c1db1dcf7a74908358`, SHA-256 `39a04ba88257659a6c1838d26e668aee2642c1361515d395eff21f7f8a9ef127`, and harness blob `963ef9a623fc5aab10c855d8e43bddcb77aecbb2`, SHA-256 `f4b3ccb03e56c0d5f99e228d6582ece93c728ffafe059ba63cb8bca876cc9755`.
- P25 donor: commit `28fb4187445206bcc62e2ef0ae2678e44ac6604b`; base app tree `f68074b41b8d2eea228d7fa964d3db8358a9fea4`; base mirror tree `be03089ce9abae0f487bd829b4f24ddac9bb3dfd`.
- Donor failed build tree: root `8767ed4b122bd6e857106408773d39ebf13539d5`; app `f30ea7f3bff24388c2b868a172dee382f728ad49`. It used observer blob `410664947a011b549fffadfe04d1664037c4f554`, SHA-256 `8725a4249aea612681fd37bc6a1789f3034291a4dbd4dbfa0c09ac06c208333f`, and harness blob `04ddb1a6ade006f448807f4aedd50c28668c65f6`, SHA-256 `f25da2e197042f7033f6afa038fd46e8195d6dfbc4185970f6eb904ed8892209`.
- Both build receipts report Node `v24.19.0` and pnpm `9.15.9`. The Node executable SHA-256 is `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`.
- Both build receipts include `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` and the extra `NEXT_TELEMETRY_DISABLED=1`; the extra flag makes both builds nonconforming with PRE-G7-22 C1.
- The corrected observer is archived at `observer/P27RenderAttribution.ts`. It was used for the donor build, but never reached a browser capture. Its runtime accounting is unverified.

## Build results

The accepted-root dependency install passed. Its production build compiled in 44 seconds, then failed typecheck:

- `P27RenderAttribution.ts(75,20)`: `Material.id` is not present on the `Material` type.
- `P27RenderAttribution.ts(133,13)` and `(135,13)`: `targets` may be undefined.
- `p27-render-attribution.spec.ts(47,34)`: `retries` is not present on the `FullConfig` type.

The accepted-root build exited 1. Its partial `C:\p27-source-500\app\.next` output contains 515 files totaling 101,791,606 bytes. The canonical inventory digest is `addd57ef33e829167591582ebc3ff1b419947dca0e73c2f0ca367211bc891d4c`.

The donor dependency install passed with Node 24.19.0. Its production build compiled in 29.7 seconds, then failed with the same four TypeScript diagnostics and exited 1. Its partial `C:\p27-source-28fb\app\.next` output contains 515 files totaling 101,831,539 bytes. The canonical inventory digest is `7cdb8f39cb97027f40e0d5a240734afe2a75cf950cc654207a75a09ccbe3773c`.

Both output inventories list each relative path, byte count, and SHA-256. They are partial failed-build outputs, not runnable capture builds.

## Capture rows

All rows are **NOT RUN**. No browser was launched by PRE-G7-27, so browser runtime versions, renderer strings, screenshots, HOME readiness, tiers, submissions, triangles, WebGL calls, and object attribution are unavailable.

| Source | Browser | Viewport | Expected tier | Result |
|---|---|---:|---|---|
| Accepted root | Chrome | 1440x900 | HIGH | NOT RUN |
| Accepted root | Chrome | 390x844 | MEDIUM | NOT RUN |
| Accepted root | Chrome | 320x600 | MEDIUM | NOT RUN |
| Accepted root | Chrome | 844x390 | HIGH | NOT RUN |
| Accepted root | Edge | 1440x900 | HIGH | NOT RUN |
| Accepted root | Edge | 390x844 | MEDIUM | NOT RUN |
| Accepted root | Edge | 320x600 | MEDIUM | NOT RUN |
| Accepted root | Edge | 844x390 | HIGH | NOT RUN |
| P25 donor | Chrome | 1440x900 | HIGH | NOT RUN |
| P25 donor | Chrome | 390x844 | MEDIUM | NOT RUN |
| P25 donor | Chrome | 320x600 | MEDIUM | NOT RUN |
| P25 donor | Chrome | 844x390 | HIGH | NOT RUN |
| P25 donor | Edge | 1440x900 | HIGH | NOT RUN |
| P25 donor | Edge | 390x844 | MEDIUM | NOT RUN |
| P25 donor | Edge | 320x600 | MEDIUM | NOT RUN |
| P25 donor | Edge | 844x390 | HIGH | NOT RUN |

## Cleanup and review

Both temporary source worktrees were restored to their exact pinned commits and have clean working trees. Both failed `.next` outputs were preserved. No app or mirror source commit was made.

This maker result cannot accept itself. External GPT Plus #2 audit and parent acceptance remain pending. No optimization, pixel-parity, visual-equivalence, deployment, or G7 claim is made.
