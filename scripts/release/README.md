# RC5 canonical release tooling

Canonical deployment root is `app/`. Current policy is `rc5-policy.json`; it freezes accepted asset hashes, routes, identities, mandatory evidence, browser test counts, and bundle exclusions. RC1-RC4 dossiers and `rc4-policy.json` remain historical. Current tooling refuses to write historical delivery roots. Reproducing an older candidate requires a separate checkout of its original source and tooling.

Run from the repository root after frozen installation and a production build in `app/`:

```text
node scripts/release/validate-gltf-assets.mjs --output deliveries/G6/rc5-candidate/asset-validation.json
node scripts/release/check-release-composition.mjs
node scripts/release/check-performance-budgets.mjs --benchmark-dir deliveries/G6/rc5-candidate/evidence/performance
```

Performance reports must be fresh `app/tests/performance` outputs for the current `.next/BUILD_ID`, with `canonicalApplicationRoot: "app"`, `buildId`, five positive raw cold-load samples for each desktop/mobile/narrow profile, and at least 60 seconds of active production WebGL rendering. The active route selects LOW using the real production quality control before measurement. Both budget and manifest validation require `requestedUserPreference: "low"`, only LOW tier counts, complete rendered-frame samples, 60 acknowledged actions, `failureReason: null`, and final canvas/visibility/lifecycle/renderer diagnostics. Median remains <=33.3 ms and p95 <=45 ms. AUTO's supported STATIC fallback remains covered separately by deterministic quality-policy tests.

`public-payloads.json` contains `routes: [{route, status, html}]` for `/`, `/about`, `/contact`, `/resume`, `/projects`, captured from actual production HTTP responses before hydration. The checker measures each response and its referenced build/public resources. No historical timing fallback exists. Localhost/software-browser timing is lab evidence; physical devices, production networks, and field metrics remain unverified.

Composition reads actual Next production route/server manifests, checks all 22 public/admin/API routes, follows runtime TypeScript imports, rejects private environment variables/server modules in browser graphs, requires the integrated runtime and R2 receive/outbox chain, checks claim/quota/message/outbox ordering, and resolves actual GLB URLs. Its hashed module/asset inventory supplements behavioral contact/auth tests.

Commit application, release tooling, and workflows first; this becomes `sourceCommit`. Run fresh checks against that exact source. Build the archive from Git blobs:

```text
node scripts/release/build-rc5-bundle.mjs --source-commit <40-character-commit>
```

The bundle contains canonical tracked app reproduction/deployment files and current policy. Git blob bytes avoid checkout line-ending differences; USTAR order, modes, timestamps, UID/GID, and gzip settings are deterministic. Dependencies, generated builds, caches, secrets, live env files, and browser scratch are excluded. Dirty or untracked application/tooling/workflow source is rejected. `sourceCommit` must be an ancestor of HEAD. Later commits may add evidence/documentation, but changes to app, release tooling, or either workflow require a new source commit and fresh bundle.

Create `deliveries/G6/rc5-candidate/source-binding.json` and `release-manifest.json` after checks and bundle generation. Both must bind the exact release ID, source commit, `sourceAppTree` from `git rev-parse <sourceCommit>:app`, application root, asset/publication/schema/contact revisions, bundle path, and bundle SHA-256. The manifest also binds:

```json
{
  "canonicalApplicationRoot": "app",
  "sourceAppTree": "<exact application Git tree>",
  "bundleMetadata": { "fileCount": 123, "bytes": 456 },
  "sourceBinding": {
    "path": "deliveries/G6/rc5-candidate/source-binding.json",
    "sha256": "<actual SHA-256>",
    "hashMode": "lf"
  },
  "composition": {
    "path": "deliveries/G6/rc5-candidate/release-composition.json",
    "sha256": "<actual SHA-256>",
    "hashMode": "lf"
  }
}
```

Each of the thirteen policy `requiredChecks` has `status: "pass"`, `verificationCategory: "AUTOMATED PASS"`, `blocking: true`, exact `sourceCommit`, and an evidence path inside the RC5 root. Every ordinary check requires `evidenceSha256`; `evidenceHashMode: "lf"` hashes bytes after CRLF-to-LF conversion, otherwise raw bytes. Composition check binds the same report/hash as `composition`. Every policy `requiredEvidencePaths` item must also appear in `evidenceHashes`: source/bundle receipts, asset validation, versions, complete browser reports, and raw performance reports. Supplemental evidence stays within the RC5 root. Browser JSON must show 97 E2E, 17 accessibility, and six performance checks per project, each passing once, with zero skips, retries, flakes, runner errors, or unexpected outcomes.

`release-manifest-validation` names `deliveries/G6/rc5-candidate/release-manifest-validation.receipt.json` without an input hash. The detached receipt hashes the final manifest. Generate it after manifest assembly:

```text
node scripts/release/validate-release.mjs --strict
```

Validation regenerates the archive in memory and compares exact bytes, verifies source/tree/worktree and all mandatory evidence hashes, checks build-bound performance/composition, and requires candidate status, self-approval false, G6 ACTIVE / REWORK, and G7 LOCKED. Local and CI build IDs may differ; committed performance reports must match the committed composition build ID, and route/source/asset composition must match CI's fresh build. The receipt is automated maker evidence, not independent audit or acceptance.

CI runs all thirteen required steps against `app/`, with fresh isolated `.rc5-ci/` outputs and exact browser counts, then validates the committed RC5 candidate. A source-only push lacks the final manifest and cannot pass the release gate; the subsequent evidence commit must preserve the bound app/tooling/workflow source. The final exact-candidate run must show both workflows successful with every required step executed.
