# RC3 release tooling handoff

Canonical application root: `app/`. Maker work remains a candidate; G6 ACTIVE / REWORK, G7 LOCKED. This handoff records source implementation and early tooling verification, not independent audit or release acceptance. Parent owns final sourceCommit, evidence, archive, manifest, commit and push sequencing.

| File | Resulting behavior |
| --- | --- |
| `scripts/release/rc3-policy.json` | RC3 identity, immutable accepted asset hash inventory, required nine production models, 22 accepted public/admin/API routes, runtime/auth/contact modules, thirteen required checks, exact inclusion/exclusion policy. |
| `scripts/release/release-lib.mjs` | Canonical root/path containment, LF hash rules, Git ancestor/source/worktree verification, accepted asset membership and deterministic archive engine. |
| `scripts/release/build-rc3-bundle.mjs` | Builds app reproduction/deployment files plus release policy from sourceCommit Git blobs. Emits deterministic USTAR/gzip archive and file/hash receipt. |
| `scripts/release/check-release-composition.mjs` | Checks actual Next production route/server artifacts, follows runtime TS imports, rejects client imports of private environment/server modules, proves R2 contact import chain and SQL ordering, checks canonical asset URLs and hashes reachable modules/assets. |
| `scripts/release/validate-gltf-assets.mjs` | Resolves pinned Khronos validator from app dependencies, validates every canonical public GLB and verifies freeze hash/size membership. Never rewrites C4 evidence. |
| `scripts/release/check-performance-budgets.mjs` | Consumes fresh build-bound `public-payloads.json` HTTP response HTML for dynamic public routes and measures referenced JS/critical resources. Measures actual imported frozen world assets and hash-bound geometry/GPU estimates. Requires fresh current-build cold/60-second raw pacing data. No historical timing fallback or invented static HTML sizes. |
| `scripts/release/validate-release.mjs` | Regenerates exact archive bytes; verifies sourceCommit ancestry, unchanged implementation tree, final archive metadata/hash, required fresh evidence hashes, actual composition and archive membership, candidate governance and G7 LOCKED. |
| `scripts/release/verify-playwright-results.mjs` | Rejects missing/empty browser suites and any failed, flaky or skipped required tests. |
| `scripts/release/verify-g7-release.mjs` | Defaults to canonical RC3 manifest. Refuses live probes unless manifest explicitly declares AUTHORIZED/ACTIVE G7 and accepted G6; does not run during this packet. Future read-only HTTP observations remain PARTIAL/NOT RUN and always leave G7 incomplete. |
| `scripts/release/README.md` | Exact reproduction commands, manifest format, one-way detached validation-receipt rule and measurement limitations. |
| `.github/workflows/ci.yml` | Canonical frozen install/lint/types/unit/integration/assets/build/full E2E/accessibility/performance/composition/budgets/manifest checks. Forty-minute allowance, pinned Node/pnpm, isolated fresh evidence artifacts, browser fixture env scoped to E2E/a11y, no required condition/continue-on-error. |

Final artifact paths are `deliveries/G6/full-stack-integration/release-manifest.json`, `release-composition.json`, `yor-world-v1.0.0-rc3.bundle.tar.gz`, `bundle-receipt.json`, and `release-manifest-validation.receipt.json`. The last receipt hashes the final manifest; the manifest names that receipt without hashing it. Ordinary required-check evidence hashes are mandatory. This avoids a manifest/receipt/archive hash cycle. Later evidence-only commits may bind the ancestor sourceCommit; app, release tooling and CI must remain identical to that source commit.

Final CI recording also has one-way dependencies: observe a candidate push, commit `ci-results.json` describing that observed push, then observe both workflows again on the exact evidence-only containing commit. The committed record cannot embed its containing commit's own SHA or predict that commit's CI result. Final handoff SHA/run IDs and provider artifacts establish the final exact-HEAD result; CI archive names and manifest validation `verifiedHead` already bind that SHA. Text evidence hashes should declare `lf` mode, while binary archive/asset hashes use raw bytes.

Executed early checks:

| Exact command/check | Result | Evidence/limit |
| --- | --- | --- |
| `node --check` on release-lib, build-rc3-bundle, check-release-composition, validate-gltf-assets, check-performance-budgets, validate-release, verify-playwright-results, verify-g7-release | PASS, exit 0 | Source syntax only. |
| Node assertions for bundle inclusion/exclusion, repository path rejection, and CRLF-to-LF hashing | PASS, exit 0 | Checked canonical source/models/migrations/lock/env-example inclusion, old delivery/build/dependency/env/scratch exclusion and path traversal rejection. |
| `node scripts/release/validate-gltf-assets.mjs --output deliveries/G6/full-stack-integration/tooling-checks/gltf-validation.receipt.json` | PASS, exit 0 | Early canonical asset check: 16/16 GLBs, Khronos v2.0.0-dev.3.10, zero errors/warnings. Root may remove redundant proof files; rerun final evidence after final asset composition. |
| `node scripts/release/build-rc3-bundle.mjs --source-commit 0000000000000000000000000000000000000000` | Expected rejection, exit 1 | Invalid placeholder source identity rejected before output creation. |
| `node scripts/release/check-release-composition.mjs --output deliveries/G6/full-stack-integration/tooling-checks/release-composition.json` | NOT RUN against final build | Invoked early and exited 1 because canonical production manifests did not yet exist. No PASS report was written. |
| `node scripts/release/check-performance-budgets.mjs --benchmark-dir deliveries/C3/evidence --output deliveries/G6/full-stack-integration/tooling-checks/budget.receipt.json` | NOT RUN against final build/performance evidence | Invoked early and exited 1 because canonical BUILD_ID did not yet exist. This does not establish legacy-benchmark rejection independently; final checker requires canonical build-bound raw evidence. |
| `node scripts/release/verify-g7-release.mjs --help` | PASS, exit 0 | Help only; no network/live G7 execution. |
| Final deterministic bundle/manifest validation | NOT RUN | Parent must first freeze app/tooling sourceCommit, execute fresh checks and assemble detached manifest. |
| GitHub workflow on pushed final HEAD | NOT RUN | Parent owns commit/push/run observation. |

Measured budgets are local lab regressions. Cold DOMContentLoaded is not throttled production readiness or field Web Vitals. Frame pacing identifies the actual browser renderer and completed production renders; physical iOS/Android, sustained thermal sessions, and production network requirements remain unverified. Frozen GPU numbers are asset-derived estimates. Composition source/SQL checks do not replace real R2 concurrency/contact/auth tests.

Future G7 script does not verify owner identity from a manifest label; actual owner authorization must be recorded by the parent under the G7 protocol before execution. HTTP status/header observations do not prove full entrance/fallback/contact/security/CDN/monitoring/rollback criteria. No deployment or live contact probes were performed. No historical accepted source/evidence or RC1/RC2 artifact was changed by this tooling packet.
