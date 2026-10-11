# Publication media fixture correction — 2026-10-11

## Change

The canonical publication integration test seeded an approved database row and a byte stream matching its stored hash and length, but its provider stand-in omitted the response observer callback that supplies the actual download's `content-type`. `verifyStoredMedia` correctly rejects a response when that header is absent, so publication failed closed and surfaced the fixture UUID as unapproved/missing.

Updated only `app/tests/integration/platform/canonical-platform.test.ts`. Its provider stand-in now reports `image/png` through the observer, serves the fixture bytes only for the exact `fixture-private/drafts/approved.png` identity, returns a synthetic 404 for a mismatched bucket/key, and asserts that publication requested the expected object. Product validation and fail-closed behavior were not changed.

## Verification

- Base identity: branch `fix/local-studio-check`, HEAD `a599a159bef3935a278a18e2d42877438d664c78`.
- Runtime: Node `v24.19.0`, pnpm `9.15.9`, Vitest `5.0.2`, ESLint `9.39.5`.
- From `app/`: `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/canonical-platform.test.ts` — **1 file passed, 9/9 tests passed**, exit 0.
- From `app/`: `pnpm exec eslint tests/integration/platform/canonical-platform.test.ts --max-warnings=0` — exit 0.
- `git diff --check -- app/tests/integration/platform/canonical-platform.test.ts` — exit 0.
- Test file SHA-256: `eb76c8704f2f8f1c615e8fd78cc9dfb34922cc55ef18237305c8f0a03d46b44d`.
- Unchanged product SHA-256 values: `app/src/server/media/integrity.ts` `764ca6f365bc2e7d3a27aa5c12862f93e7d2023f4ff78e7dc58ef649225fd446`; `app/src/server/media/manifest.ts` `6bd2ffee5580c3d0facaf1bf0ed68ecf1e259fc3064588b159e68a3f6d0ecaa4`; `app/src/server/content/publish.ts` `60d183ef48469dc4879d4609efeee5783a1ec3cada863b6e63ea4da84462b909`.
- Raw test and lint output, commands, exit codes, and hashes are in this attempt directory. The syntax-error run in attempt 12 is preserved with its original logs and note.

## Limits

The parent’s broader integration run remains historical evidence at `deliveries/G7/local-corrections/coordination/attempt-20261011T-parent-freeze-04/integration.log` (SHA-256 `05bef709b8a713723977de80cd51e7cf384935a89fc64cdf8e0059b442a58af0`). It had 4 failures among 353 tests: this media fixture failure and 3 `production-camera.test.ts` exact floating-point comparisons. This focused correction addresses the media fixture only; the camera failures are outside this task and the broader suite was not rerun. No product code was changed. This test uses embedded PGlite and a synthetic storage provider, not native PostgreSQL or hosted Supabase evidence.

No commit or push was made.
