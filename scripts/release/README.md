# RC3 canonical release tooling

Canonical deployment root is `app/`. RC1/RC2 files under `deliveries/C4/` are historical inputs and are never written by these scripts. Policy is `rc3-policy.json`; it freezes accepted asset hashes, routes, identities, and the bundle exclusion list.

Run all commands from the repository root after frozen installation and a production build in `app/`:

```text
node scripts/release/validate-gltf-assets.mjs
node scripts/release/check-release-composition.mjs
node scripts/release/check-performance-budgets.mjs --benchmark-dir deliveries/G6/full-stack-integration/evidence/performance
```

Performance reports must be fresh `app/tests/performance` outputs for the current `.next/BUILD_ID`, with `canonicalApplicationRoot: "app"`, `buildId`, five raw positive cold samples for each desktop/mobile/narrow profile, and at least 60 seconds of active route pacing with every raw frame included. `public-payloads.json` must contain `routes: [{route, status, html}]` for `/`, `/about`, `/contact`, `/resume`, `/projects`, captured from actual production HTTP responses before browser hydration. The checker measures each response and its referenced build/public resources; dynamic public pages do not need static prerendered HTML files. No historical timing fallback exists. Asset estimates are tied to exact frozen binary hashes. Localhost/software-browser timing is explicitly lab evidence; physical devices, production networks, and field metrics remain unverified.

Composition reads the actual Next production route and server artifact manifests. It checks all 22 public/admin/API routes from the accepted A6 inventory, follows runtime TypeScript imports from production route roots, rejects private environment variables/server modules in browser import graphs, requires C3 runtime modules and the R2 receive/outbox chain, checks claim/quota/message/outbox ordering, and resolves actual GLB URLs into the canonical public root. The report hashes reachable source modules and frozen assets; it does not replace behavioral contact/auth tests.

After implementation and checks are complete, commit application/tooling first. This becomes `sourceCommit`. Build the deterministic archive from that commit's Git blobs:

```text
node scripts/release/build-rc3-bundle.mjs --source-commit <40-character-commit>
```

Bundle contains canonical app tracked reproduction/deployment files and the release policy. Git blob bytes avoid checkout line-ending differences; USTAR order, modes, timestamps, UID/GID, and gzip settings are deterministic. Untracked source and dirty tracked implementation are rejected. Dependencies, builds, caches, live env files, secrets directories, and browser scratch are excluded. SourceCommit must be an ancestor of HEAD; later commits may add evidence/documentation, but cannot change app, release tooling, or CI without a new sourceCommit and fresh bundle.

The detached manifest at `deliveries/G6/full-stack-integration/release-manifest.json` uses existing ReleaseManifest fields plus:

```json
{
  "canonicalApplicationRoot": "app",
  "bundleMetadata": { "fileCount": 123, "bytes": 456 },
  "composition": {
    "path": "deliveries/G6/full-stack-integration/release-composition.json",
    "sha256": "<actual SHA-256>",
    "hashMode": "lf"
  }
}
```

Each of the thirteen policy `requiredChecks` must have `status: "pass"`, `verificationCategory: "AUTOMATED PASS"`, `blocking: true`, exact `sourceCommit`, and fresh `evidencePath` inside the RC3 delivery root. All ordinary checks require `evidenceSha256`; `evidenceHashMode: "lf"` means hash UTF-8 bytes after CRLF to LF conversion, otherwise hash raw bytes. Composition check names and hashes the composition report itself. Additional `evidenceHashes` require explicit `sha256` and optional `hashMode`.

`release-manifest-validation` names `deliveries/G6/full-stack-integration/release-manifest-validation.receipt.json` without `evidenceSha256`. The receipt hashes the final manifest and records bundle/source verification. This explicit one-way dependency avoids the impossible manifest -> receipt -> manifest hash cycle. Receipt is generated only after executing validation; it is automated maker evidence, not independent audit or acceptance.

```text
node scripts/release/validate-release.mjs --strict
```

Validation regenerates the archive in memory and compares its exact bytes, validates sourceCommit/HEAD/worktree, evidence hashes, current production composition, bundle membership, candidate governance and G7 LOCKED. A different Next build ID between local and CI is allowed; route/source/asset composition must still match. CI reruns all required checks against `app/`, then verifies the detached candidate. It never treats historical C4 logs as fresh proof.
