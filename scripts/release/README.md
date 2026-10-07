# Current RC6 canonical release tooling

Canonical application root is `app/`. Current policy is `rc6-policy.json`; it binds accepted assets, schema/publication/contact identities, required routes/runtime entrypoints, actual browser inventories and evidence/bundle rules. Accepted RC1–RC5 artifacts/policies/dossiers, the RC5 audit and G6-R1 remain immutable. Reproducing an older candidate requires its original source checkout/tooling.

Run after frozen installation and a production build:

```text
node scripts/release/validate-gltf-assets.mjs --output deliveries/G7/rc6-candidate-r3/asset-validation.json
node scripts/release/check-release-composition.mjs
node scripts/release/check-performance-budgets.mjs --benchmark-dir deliveries/G7/rc6-candidate-r3/evidence/performance
```

Composition checks all 23 public/admin/API routes, reachable source imports, contact R2 and nine frozen GLBs. The Node Proxy is verified through `.next/server/functions-config-manifest.json` and its compiled `.next/server/middleware.js`; the empty Edge middleware map is not substituted for Node runtime evidence. Browser graphs retain private-import/environment restrictions.

Fresh performance reports bind the production build ID. LOW is selected through the real control, with only LOW frame counts, complete raw production-render samples, 60 seconds and 60 acknowledged actions, positive calls/triangles, no renderer/visibility/canvas failure and unchanged 33.3/45 ms limits. AUTO→STATIC remains supported and independently unit-tested. Resource cycles record actual HOME rendering, SPA teardown, detached/context-lost stopped renderers and UNKNOWN heap/GPU leak absence, rather than an unsupported no-leak boolean.

Commit source/application/tooling/workflows before final execution. The generic builder reads exact Git blobs from that immutable source:

```text
node scripts/release/build-release-bundle.mjs --source-commit <full-source-SHA>
node scripts/release/validate-release.mjs --strict
```

`build-rc6-bundle.mjs` is a current compatibility entrypoint. Historical RC4/RC5 builders refuse the current policy. Archives use sorted USTAR entries, source modes, zero UID/GID/timestamps and platform-neutral deterministic gzip. Generated builds/dependencies/caches/secrets are excluded. Dirty/untracked protected source and changes after sourceCommit are rejected.

`deliveries/G7/preparation/tools/candidate-driver.py` and `assemble-evidence.py` implement fresh detached-checkout checks and binding. Final policy browser counts are derived from actual complete discovery and each executed case must pass once with zero skips/retries/flakes/errors. Current authoritative inventory is 109 Chromium E2E, 17 accessibility and six performance cases. Unit/integration totals are recorded from actual execution, not invented from an exit code.

The new `deliveries/G7/rc6-candidate-r3/` manifest binds sourceCommit/sourceAppTree, asset/publication/schema/contact revisions, exact deterministic archive path/hash/bytes/count, hashed source binding and composition, and all required evidence. Twelve input checks carry mandatory hashes; strict manifest validation is the detached thirteenth receipt, hashing its final input without a circular self-hash. Text uses explicit LF normalization; binary archive hashes are raw. New portable inventories omit ignored ephemeral `.last-run.json` files with an explicit omission receipt, preserving old RC5 inventory history.

RC6 maker governance is copied exactly from policy: candidate, selfApproved=false, accepted RC5/G6-R1 baseline with RC6 awaiting independent delta review, and G7 AUTHORIZED / PREPARATION under recorded owner authorization. That authorization does not accept amended source or G7. `check-current-status.mjs` checks current metadata against the immutable Parent ruling, owner receipt, policy/package version and living pages; it replaces stale maker-phase token checks.

Later evidence/status commits may preserve the protected source; any app/release-tooling/workflow amendment needs a new source binding and fresh evidence. Independent delta review and Parent successor adjudication precede production deployment of changed source. Operational deployment acceptance/authorization is a separate receipt; never rewrite accepted RC5 or claim that its maker-era candidate manifest is a live authorization.

Live HTTP/browser/TLS/CDN tools under `deliveries/G7/preparation/tools/` require actual authorization and accepted deployment/source bindings. They preserve partial observations rather than self-accepting G7. Real PostgreSQL/Supabase/MFA/RLS/mail/jobs, physical devices/screen readers/thermal behavior and live restore/rollback need actual evidence; local fixtures, replayed security attacks and emulators do not certify them.
