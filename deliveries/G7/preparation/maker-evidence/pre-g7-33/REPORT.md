# PRE-G7-33 startup stall diagnosis

**Result: diagnostic captured; startup-stall cause UNRESOLVED.** The frozen PRE-G7-31 build reached `HOME` during the single authorized browser capture, but the browser recorded two main-thread long tasks of 11.784 seconds and 9.099 seconds. The first overlaps the optional interaction-asset request in time, but its attribution data does not identify a function and its start precedes that request's recorded response end. The capture therefore does not prove that optional GLB parsing caused the stall.

PRE-G7-31 remains unaccepted and undeployed. This packet changed no product source, tests, model assets, dependencies, performance limits, or browser settings. It did not authorize acceptance, merge, or deployment. The external GPT Plus #2 audit and human visual review remain pending.

## Source and toolchain binding

| Item | Value |
|---|---|
| Packet | `docs/planning/reconciliation-packets/2026-10-16-pre-g7-33-startup-stall-diagnosis.md` |
| Packet branch | `codex/pre-g7-33-startup-readiness-20261016` |
| Packet parent | `b26368cab80270e686e69b0ba29e80b87d7bde63` |
| Frozen PRE-G7-31 source | `bd01478617b4166866f3f44196c56fc5add94acd` |
| Canonical `app/` tree | `3975e40c59a04b8696efa2ca3605eb37a0617165` |
| Source-commit `yorayriniwnl.in/` tree | `8c34adf791c678a4e9e8bfe90f92426026994e68` |
| Node / pnpm | `v24.19.0` / `9.15.9` |
| Playwright / browser | `1.63.0` / headless Chrome `155.0.8059.84` |
| Build evidence flag | `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1`, only for the build |

The final preflight confirms the exact source commit and app tree, 130 canonical/domain source and test pairs with zero Git-blob mismatches, clean product paths, and no pre-existing `app/node_modules`. The first preflight-helper attempt used a mistyped source commit identifier; it failed before installation, build, or browser capture. The failed attempt and its classification are preserved as `preflight-attempt-01.json` and `preflight-attempt-01.stderr.txt`. The corrected preflight passed.

## Checks

| Check | Result | Command / exit | Evidence and reason |
|---|---|---|---|
| Frozen-source and mirror preflight | PASS | `node deliveries/G7/preparation/maker-evidence/pre-g7-33/preflight.mjs` / 0 | `preflight.json`; exact commit/tree confirmed, 130 source/test mirror pairs, zero mismatches. |
| Initial offline install attempt | FAIL, preserved | `pnpm install --offline --frozen-lockfile` / 1 | `commands/install.attempt-01.*`; D: store lacked `next-16.3.8.tgz`, no packages were downloaded. The runner's binary stdout/stderr files were overwritten by attempt 02; the decoded excerpts and preservation note are retained, and the original raw bytes are unavailable. |
| Offline install using existing P32 cache | PASS | `npm_config_store_dir=C:\Users\ayush\AppData\Local\pnpm\store\v3 pnpm install --offline --frozen-lockfile` / 0 | `commands/install.receipt.json`, `commands/install.stdout.bin`, `commands/install.stderr.bin`; 29.795 seconds, 0 downloaded packages. |
| Frozen production build | PASS | `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 pnpm run build` / 0 | `commands/build.receipt.json` and captured output; 114.694 seconds. |
| One browser startup diagnostic | PASS, capture complete | `node deliveries/G7/preparation/maker-evidence/pre-g7-33/capture-startup-diagnostic.mjs` / 0 | `commands/diagnostic.receipt.json`, `diagnostic-run/startup-diagnostic.json`, `diagnostic-run/startup-trace.zip`, and `diagnostic-run/startup-final.png`; one headless Chrome capture on `/?studio=1`, 40-second observation. No retry. |
| Unit, lint, typecheck, integration, composition, and full performance suites | NOT RUN | Not authorized by this diagnosis-only packet; the full performance suite was explicitly prohibited. | No suite results are claimed. PRE-G7-32's preserved performance failure remains the trigger for this diagnosis. |

The initial install failure is a cache-path issue, not a source or dependency-resolution failure. Attempt 02 used the already-populated P32 C: pnpm store while remaining offline and preserving the frozen lockfile. The original attempt 01 binary output was not recoverable because the command runner reused those paths; the evidence marks that limitation explicitly.

## Browser timeline and diagnosis

The capture started before navigation and observed the route for 40 seconds. Navigation returned HTTP 200 in 282 ms. Required model requests for `production-room-full.glb`, `resident-production.glb`, and `fixture-production.glb` returned HTTP 200. The route transitioned to `HOME` at 14,105.3 ms after the browser time origin and rendered 693 frames during observation.

| Observation | Time after browser time origin |
|---|---:|
| `LOADING` first observed | 1,223.2 ms |
| UI reports required chair fixture, 70%, 0/3 required | 1,599.9 ms |
| Optional `/models/interaction-assets.glb` request starts | 2,062.2 ms |
| First severe long task starts | 2,077.7 ms |
| Optional asset response end, per Resource Timing | 2,137.7 ms |
| First severe long task ends | 13,861.7 ms |
| Lifecycle changes to `ENTRANCE` | 13,875.4 ms |
| Lifecycle changes to `HOME` | 14,105.3 ms |
| Second severe long task | 19,901.1–29,000.1 ms |

The first severe long task lasted 11,784 ms. Its reported attribution was `unknown`/`self`; the largest animation-frame gap was 12,140 ms. The second severe task lasted 9,099 ms after the route had entered `HOME`, with a 9,092.2 ms animation-frame gap. Neither task includes a usable JavaScript stack. Page errors were empty.

The optional GLB was 262,868 bytes on disk; its Resource Timing entry reports a 75.5 ms request duration and 51,724 bytes transferred. Its recorded network completion is quick, and the first long task starts 60 ms before the resource's response end. These measurements do not localize either long task to optional parsing. Browser response callbacks were delivered after the blocked interval, while Resource Timing retained the shorter transfer duration. One generic console 404 was observed, but the request was not identified; the captured app model responses were all HTTP 200 and no failed request was reported.

Historical comparison remains mixed: PRE-G7-28's fresh diagnostic reached `HOME` while the optional GLB response took 14.161 seconds; PRE-G7-30 reached `HOME` 12.675 seconds after its first observed `LOADING` and did not reproduce the stall; PRE-G7-32's one full performance run failed its existing 15-second HOME assertion with the chair-fixture required-loading stage visible. None identifies the blocking JavaScript function. PRE-G7-33 again reaches `HOME`, but only after a 12.882-second interval from first `LOADING` observation, while recording the two long tasks.

**Diagnosis: UNRESOLVED.** A main-thread stall is confirmed. The timing does not establish whether it comes from required GLTF processing, scene integration/render setup, optional asset work, or another browser task. A follow-up must first add source-bound CPU attribution to a separate packet, then authorize only the correction supported by that evidence. Do not alter the frozen model or its manifest based on this capture alone.

## Evidence and gate status

`diagnostic-run/` contains the one captured timeline, Playwright trace, final screenshot, and server output. `diagnostic/` preserves the two PRE-G7-32 failure frames copied for diagnosis. `commands/` retains build, install, and diagnostic receipts and output. `evidence-inventory.json` lists each packet evidence file other than itself by repository-relative path, byte length, raw SHA-256, and Git blob ID; it also binds this packet and its delegation index entry. The inventory is checked against the committed Git tree after commit.

| Gate | Status |
|---|---|
| PRE-G7-33 diagnosis | Complete; cause UNRESOLVED |
| PRE-G7-31 candidate acceptance | Pending; candidate remains unaccepted |
| External GPT Plus #2 audit | NOT RUN |
| Human visual review against the main reference | NOT RUN |
| Merge, deployment, domain operation, and G7 completion | NOT RUN / not authorized by this packet |

