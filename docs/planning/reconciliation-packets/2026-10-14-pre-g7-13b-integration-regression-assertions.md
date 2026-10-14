# PRE-G7-13B — Align two integration assertions with bounded scene placement

- **Date:** 2026-10-14 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Applies to:** PRE-G7-13 only; all other packet constraints remain unchanged

## Reason

The required full integration run exposed two test assertions that do not represent the intended behavior precisely: `frozen-world-binding.test.ts` expects the resident and chair positions from before PRE-G7-13's authorized opening-scene composition, while `production-camera.test.ts` compares a lerped vector endpoint bit-for-bit with its authored target and fails on a one-ULP representation difference (`-0.44999999999999996` versus `-0.45`).

## Narrow scope amendment

The maker may update only these existing integration tests and their corresponding files under `yorayriniwnl.in/tests/integration/`:

- `app/tests/integration/runtime/frozen-world-binding.test.ts`: assert the PRE-G7-13 resident/chair world positions resulting from the bounded composition while retaining the frozen asset, node-count, hierarchy, animation, and interaction assertions.
- `app/tests/integration/production-camera.test.ts`: replace only the bit-exact comparison of `entrancePositionAt(1, isMobile)` to the completed camera position with a suitably tight floating-point tolerance. Keep the authored preset position assertion and all wall, doorframe, and trajectory-clearance assertions unchanged.

This amendment permits test expectation/assertion updates only. It authorizes no changes to `EntranceCoordinator.ts`, camera trajectory code, world runtime behavior, or any additional tests or production paths.

## Evidence and review

Run the two changed integration tests and the required full integration suite. Record exact commands, exit statuses, and any remaining failures. Mirror both updated test files byte-for-byte and refresh their manifest entries. This amendment does not accept the source candidate, PRE-G7-13, G7, physical-device behavior, or deployment.
