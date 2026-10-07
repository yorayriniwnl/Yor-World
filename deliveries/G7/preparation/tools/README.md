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
python deliveries/G7/preparation/tools/g7-evidence.py --manifest deliveries/G7/rc6-candidate-r2/release-manifest.json --output deliveries/G7/evidence/g7-ledger.json
```

The ledger initializes all ten production requirements and MD-01…MD-06 as `NOT RUN`; heap/GPU leak absence is `UNKNOWN`. Later `--receipts <actual-receipts...>` imports supplied source/deployment-bound proof and verifies referenced raw artifact hashes. Physical/assistive `PASS` requires actual device/operator/tool/session timestamps and evidence category `ACTUAL PHYSICAL OR ASSISTIVE SESSION`. Automated HTTP, PGlite, viewport, axe and liveness responses do not promote complete live/manual criteria to PASS.

Root supplies a separate operational binding JSON containing `status: "AUTHORIZED"`, `ownerAuthorizationReference`, `acceptedSuccessorReference`, `releaseId`, `sourceCommit`, `sourceAppTree`, `manifestSha256` (LF), `targetOrigin`, `deploymentId` and `deployedAt`. It records actual authority/deployment identity without editing the accepted maker manifest or exposing secrets.

```powershell
node deliveries/G7/preparation/tools/g7-live-probes.mjs --authorization deliveries/G7/evidence/operational-binding.json --manifest deliveries/G7/rc6-candidate-r2/release-manifest.json --output deliveries/G7/evidence/http-cdn.json --assets app/public/asset-manifest.json --composition deliveries/G7/rc6-candidate-r2/release-composition.json
node deliveries/G7/preparation/tools/g7-browser-smoke.mjs --authorization deliveries/G7/evidence/operational-binding.json --manifest deliveries/G7/rc6-candidate-r2/release-manifest.json --output deliveries/G7/evidence/live-browser.json
```

These commands are for Root after actual deployment. The first records DNS/TLS/HTTPS redirect, public HTTP/health headers, asset bytes/hashes/cache/range and available encoded Content-Length observations. The second records available Chromium/Edge/Firefox/WebKit versions, public direct/refresh/history routes, real entry/skip controls and no-JS/WebGL-disabled HTML fallback, plus raw screenshots/traces. Missing browsers remain NOT RUN. Neither tool submits contacts, configures services, changes DNS/resources, executes rollback, or claims a complete G7 requirement. Context-loss/complete avatar/interaction behavior, native DB/MFA/RLS/Storage/mail/jobs, physical/screen-reader/thermal sessions, monitoring/restore and rehearsed RTO/RPO require separate actual receipts.

`--help` and syntax checks perform no browser/network actions. Every live receipt requires a new output path so prior evidence is preserved. Complete maker evidence still needs separate independent review and Parent adjudication.
