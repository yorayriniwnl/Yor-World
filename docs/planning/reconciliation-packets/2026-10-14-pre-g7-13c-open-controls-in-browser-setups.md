# PRE-G7-13C — Open the controls drawer in existing browser setup helpers

- **Date:** 2026-10-14 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Applies to:** PRE-G7-13 only; all other packet constraints remain unchanged

## Reason

The PRE-G7-13 browser run confirmed that the quality selector and Skip control remain inside the intentionally collapsed `Studio controls` drawer. Two existing browser setup helpers try to use those controls without first opening the drawer, so their failures occur before the recovery or viewport assertions under test.

## Narrow scope amendment

The maker may update only these existing Playwright setup helpers and their corresponding files under `yorayriniwnl.in/tests/e2e/`:

- `app/tests/e2e/renderer-recovery.spec.ts`: before selecting `quality-tier-select`, activate the existing `studio-controls-toggle` control.
- `app/tests/e2e/world-fullscreen.spec.ts`: before clicking `skip-motion-btn`, activate the existing `studio-controls-toggle` control.

This amendment permits no assertion weakening, timeout changes, retry changes, fallback/renderer policy changes, application code changes, or other test modifications. Preserve all original recovery, interaction, focus, viewport, and fullscreen assertions. Keep the prior failed run intact and rerun the affected focused suites with the default settings. A failure in the separate fallback pointer-interception test remains an explicit result and may not be hidden by this helper update.

## Evidence and review

Record the exact commands, exit statuses, and resulting screenshots/logs. Mirror both test files byte-for-byte and update their manifest hashes. This amendment does not accept the source candidate, PRE-G7-13, G7, physical-device behavior, or deployment.
