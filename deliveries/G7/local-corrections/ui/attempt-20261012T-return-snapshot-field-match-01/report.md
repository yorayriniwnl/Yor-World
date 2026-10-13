# Return snapshot exact-match regression

Date: 2026-10-12

## Finding and delta

The current `sameReturnSnapshot()` already compares every `ReturnSnapshotSchema` field, including `world.blindsOpen` and `world.detailFound`. I did not change the comparator source in this delta.

Added two equal-timestamp regression cases to `app/tests/unit/return-storage-and-audio.test.ts`. Each writes a newer snapshot differing only in `world.blindsOpen` or `world.detailFound`, then verifies that clearing the captured older snapshot returns false and leaves the newer snapshot intact.

## Changed paths

- `app/tests/unit/return-storage-and-audio.test.ts`

## Checks

- `pnpm test:unit -- tests/unit/return-storage-and-audio.test.ts`: PASS, 1 file / 11 tests.
  Raw output: `evidence/unit-test.log` (exit 0).
- `pnpm typecheck`: PASS.
  Raw output: `evidence/typecheck.log` (exit 0).
- Browser, E2E, and build checks: NOT RUN, per coordination.

## SHA-256

- Current comparator source `app/src/features/experience/return-snapshot.ts`: `6E09EB040C14C3F79A88BB24BF1060BF4A33565345B9417FE973F0A194E714FE`
- Regression test `app/tests/unit/return-storage-and-audio.test.ts`: `C071F7FD7220EC18341DF1DF5F467C3847B4637B5EAF47EB40A40E96E92D7288`
- `evidence/unit-test.log`: `78BC21387D59694C219619582AEC3207CD5956A1ACF63FF8327255496884FEED`
- `evidence/typecheck.log`: `64F2AEE9144CED80B84D0AB039FDF4EA530AC72ECBE820B0D2412DFFFC6F9C4F`
