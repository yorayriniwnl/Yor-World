# PRE-G7-01 maker execution tools

These tools implement the assigned release-preparation lane. They do not supply independent review or gate acceptance. Accepted RC1–RC5 evidence, G6-R1 and the independent RC5 audit remain immutable. Parent commits/pushes source, supplies exact source identity and invokes production tools after successor adjudication and real deployment.

## Fresh successor candidate

After the RC6 source and final policy are committed:

```powershell
python deliveries/G7/preparation/tools/candidate-driver.py --policy scripts/release/rc6-policy.json --source <full-source-sha> --checkout C:\Users\yoray\Projects\Yor-World-RC6-<short-sha> --client-date 2026-10-06 --phase all
```

Phases are `prepare`, `checks`, `package`, `validate`, `inventory`, or `all`. The checkout must be new, detached and outside the primary repository. `node_modules` and `.next` must start absent. Primary policy must equal its committed version. `CI=true` selects one pinned Chromium project. Discovery records actual case identities/counts and checks the final policy inventory; expected counts have no stale defaults. Commands retain every attempt, exit, duration, source/tree, sanitized fixture mode and log hash. Failures stop execution without automatic reruns.

Production delta is checked against PRE-G7-01 coordination base `eb1ff201391334d6041b35c59eb350fcd012a79c`. Exact authorized paths include PRE-G7-01's WorldRoot, WorldRuntime, LifecycleManager, health route/helper and PRE-G7-02's world CSS, Next config, server layout, Proxy and `src/security/policy.ts`. PRE-G7-03 adds the narrow boundary test classification correction. Parent may pass repeated `--authorized-production-path <exact-path>` only for separately authorized additional amendments. Existing historical review files stay protected; new separately assigned review/ruling files may be appended.

Bundle assembly uses `build-release-bundle.mjs`, then `assemble-evidence.py`, then strict `validate-release.mjs`. The manifest binds exact source/tree, RC5 predecessor, schema/assets/publication/contact revisions, all required check logs/reports, discovery inventories, raw performance and bundle receipt. The output validation receipt is detached from its own input hash. Byte reproducibility is checked by strict source regeneration. Candidate governance comes directly from `policy.candidateGovernance` and does not accept the successor.

After Parent adds actual hosted evidence and reports, regenerate the new candidate's portable inventory:

```powershell
python deliveries/G7/preparation/tools/assemble-evidence.py --policy scripts/release/rc6-policy.json --source <full-source-sha> --inventory-only
```

Optional `.last-run.json` and Git-ignored generated artifacts are explicitly excluded in `inventory-omissions.json`. Mandatory manifest evidence cannot be omitted. This fixes the new inventory without rewriting RC5 checksums.

`observe-github.py --head <candidate-head> --source <source-sha> --output <new-receipt-path>` reads actual exact-head Actions jobs and all thirteen required successful quality steps, plus integrity checks. `fetch-github.py --run-id <quality-run-id> --head <candidate-head> --source <source-sha>` downloads the exact RC6 artifact into a separate run/attempt/timestamp snapshot and checks source/head, browser inventories, raw LOW frames and strict validation. Credentials stay in memory and are dropped across signed download redirects. Neither tool reruns jobs or accepts a candidate. Existing snapshots are never replaced.

## Actual G7 evidence

Initialize a blank ledger after a candidate manifest exists:

```powershell
python deliveries/G7/preparation/tools/g7-evidence.py --manifest deliveries/G7/rc6-candidate-r3/release-manifest.json --output deliveries/G7/evidence/g7-ledger.json
```

The ledger initializes all ten production requirements and MD-01…MD-06 as `NOT RUN`; heap/GPU leak absence is `UNKNOWN`. Initialization also works without `--manifest` or a live binding. A supplied manifest must contain valid exact source/tree/bundle identities, a hash-verified `releaseBundlePath` and `sourceBinding` matching those identities. The manifest hash uses LF normalization. This checks candidate binding integrity; it does not replace the release validator or candidate acceptance.

Root supplies a separate operational binding JSON containing `status: "AUTHORIZED"`, `ownerAuthorizationReference`, `acceptedSuccessorReference`, `releaseId`, `sourceCommit`, `sourceAppTree`, `releaseBundleSha256`, `manifestSha256` (LF), `targetOrigin`, `deploymentId` and `deployedAt`. It records actual authority/deployment identity without editing the accepted maker manifest or exposing secrets. References use `{ "path": "<repository-relative-file>", "sha256": "<actual-file-hash>", "hashMode": "raw" }` (or `lf`). Paths must resolve inside the repository and hashes must match. Duplicate JSON keys and nonfinite JSON numbers are rejected.

`ownerAuthorizationReference` points to the actual `deliveries/G7/preparation/owner-authorization.json` and validates its existing `authorizationId: "G7-OWNER-AUTH-20261006"`, `deploymentAuthorized: true`, `acceptanceClaim: false`, `g7Status: "AUTHORIZED / PREPARATION"`, instruction and date. The future `acceptedSuccessorReference` must point to a separate Parent decision with `acceptance: "ACCEPTED"`, `ruling: "RC6 SOURCE ACCEPTED"`, `rulingId: "RC6-R1"`, `authority: "Parent Codex"`, `acceptedAt` and the exact five candidate fields above, including `manifestSha256`. Its timestamp must precede deployment. The tool fabricates no accepted RC6 decision or deployment binding. The target is a canonical public HTTPS origin without path, credentials, query, fragment or default port.

Import actual receipts only after those inputs exist:

```powershell
python deliveries/G7/preparation/tools/g7-evidence.py --manifest <actual-manifest> --authorization <actual-operational-binding.json> --receipts <actual-receipts...> --output deliveries/G7/evidence/g7-ledger-new.json
```

Each executed receipt repeats **all eight** binding identity fields exactly and supplies `executedAt` and `completedAt`. Timestamps use ISO 8601 with timezone, are no later than current UTC time, and satisfy deployment <= receipt execution <= each observation/session start <= completion <= receipt completion. Receipts from an earlier or different deployment are rejected. Existing outputs are preserved; select a new path for a new run.

`requirements` contains numeric `id` 1–10, the existing exact `name`, `status` (`PASS`, `FAIL`, `NOT RUN`) and `observations`. Each observation names an exact existing `criterion` from `g7-evidence.py:CRITERIA`; executed observations require `status`, actual `method`, `measured`, `expected`, `startedAt`, `completedAt` and a nonempty hash-verified `artifactHashes` array. A parent requirement artifact cannot substitute for each criterion's evidence. A requirement claiming `PASS` must supply its entire exact criterion inventory, every criterion `PASS`, with receipt category `LIVE PRODUCTION`. Duplicate/unknown identities or criteria, conflicting category claims and repeated executed criteria across receipts are rejected. For partial inventory use requirement `NOT RUN`; observations merge into the complete inventory and absent criteria remain `NOT RUN`. `HTTP ONLY` and `LIVE BROWSER AUTOMATED` can supply observations but cannot promote even a complete observed inventory to complete requirement `PASS`. Local SQL, synthetic, viewport and axe categories cannot establish live or manual proof. Explicit `auditFixture`, `synthetic` and `localFixture` execution flags are rejected.

`physicalAndAssistiveSessions` uses exact IDs/names from `MANUAL`, category `ACTUAL PHYSICAL OR ASSISTIVE SESSION` at receipt and session (session may inherit it), and the same method/measurement/expectation/timestamp/artifact fields as observations. It also needs actual `deviceModel`, `os`, `browserOrAssistiveToolVersion`, `operator`, `viewportDprNetworkCache` and `rawMeasurements`. Identity claims must match the assigned session:

| Session | Required identity claims | Required `rawMeasurements` keys for PASS |
| --- | --- | --- |
| MD-01 | `physicalDevice: true`, `platform: iOS` or `iPadOS`, `browser: Safari` | `portrait`, `landscape`, `touchReflow`, `coldLoads` (five numeric durations in ms), `backgroundResume`, `contextLoss` |
| MD-02 | physical Android Chrome | `portrait`, `landscape`, `touchReflow`, `fallbackRecovery` |
| MD-03 | `platform: Windows`, `assistiveTool: NVDA`, actual `browser` | `listening`, `keyboard`, `focus`, `labels`, `errors`, `announcements` |
| MD-04 | Safari on macOS/iOS/iPadOS, `assistiveTool: VoiceOver`; physical device for mobile | `listening`, `rotor`, `gestures` |
| MD-05 | physical Android, `assistiveTool: TalkBack`, actual `browser` | `gestures`, `speech`, `focus`, `errorRecovery` |
| MD-06 | physical Android/iOS/iPadOS, actual `browser`; >=600 seconds | `batteryStartPercent`, `batteryEndPercent` (0–100), `temperatureStartC`, `temperatureEndC` (numeric), `chargerConnected` (boolean), `network`, `qualityTier` (`high`/`medium`/`low`/`static`), `framePacing`, `crashes` (nonnegative integer), `recoveryObservations` |

MD-06 `framePacing` is exactly five objects with `elapsedSeconds` of 120, 240, 360, 480 and 600 respectively, each supplying nonempty numeric nonnegative raw `frameTimesMs`. A prematurely stopped actual failed session can be recorded `FAIL` with executed identity/fields, artifacts and available nonempty raw measurements; it cannot receive `PASS`. Any failed requirement or manual session makes the overall ledger `FAIL`.

**Validation limit:** this validates structure, identity consistency, timestamps and artifact bytes, not the truth of operator claims, actual execution or authenticity of asserted authority. A misleading operator can submit structurally consistent false claims. Raw evidence needs independent review and Parent adjudication. Every ledger preserves `validationScope: "STRUCTURE, IDENTITY AND ARTIFACT HASHES ONLY"`, `independentReview: "NOT RUN"`, `heapGpuLeakAbsence: "UNKNOWN"` and `acceptanceClaim: false`, even when every supplied structural requirement passes. Overall ledger `PASS` is never gate acceptance.

Run the isolated adversarial suite without services or browser sessions:

```powershell
python deliveries/G7/preparation/tools/test_g7_evidence.py
```

All suite files use temporary directories labelled as isolated fixtures and are removed afterwards. Successful structural ingestion of intentionally fictitious records tests validation only; it is not live, manual, authority or production evidence. The original independent probe and archived fixtures remain unchanged. Live-probe/browser-smoke raw schemas are observations, not complete ledger requirement receipts; an operator must map actual raw evidence to exact criteria before importing.

```powershell
node deliveries/G7/preparation/tools/g7-live-probes.mjs --authorization deliveries/G7/evidence/operational-binding.json --manifest deliveries/G7/rc6-candidate-r3/release-manifest.json --output deliveries/G7/evidence/http-cdn.json --assets app/public/asset-manifest.json --composition deliveries/G7/rc6-candidate-r3/release-composition.json
node deliveries/G7/preparation/tools/g7-browser-smoke.mjs --authorization deliveries/G7/evidence/operational-binding.json --manifest deliveries/G7/rc6-candidate-r3/release-manifest.json --output deliveries/G7/evidence/live-browser.json
```

These commands are for Root after actual deployment. The first records DNS/TLS/HTTPS redirect, public HTTP/health headers, asset bytes/hashes/cache/range and available encoded Content-Length observations. The second records available Chromium/Edge/Firefox/WebKit versions, public direct/refresh/history routes, real entry/skip controls and no-JS/WebGL-disabled HTML fallback, plus raw screenshots/traces. Missing browsers remain NOT RUN. Neither tool submits contacts, configures services, changes DNS/resources, executes rollback, or claims a complete G7 requirement. Context-loss/complete avatar/interaction behavior, native DB/MFA/RLS/Storage/mail/jobs, physical/screen-reader/thermal sessions, monitoring/restore and rehearsed RTO/RPO require separate actual receipts.

`--help` and syntax checks perform no browser/network actions. Every live receipt requires a new output path so prior evidence is preserved. Complete maker evidence still needs separate independent review and Parent adjudication.
