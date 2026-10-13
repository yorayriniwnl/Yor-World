# Fresh v1.0.0-rc6 commands and exit codes

Implementation sourceCommit: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`. Canonical root: `app/`. Runs use a fresh detached checkout with CI=true and the pinned full Chromium channel. Dependencies and build output started absent; the host pnpm download store may be reused.

| Check | Exact command | Exit | Duration (s) | Evidence |
| --- | --- | ---: | ---: | --- |
| lint (attempt 1) | `false` | 99 | 1 | [evidence/missing.log](evidence/missing.log) |

Discovery and actual execution counts are bound in `evidence/browser-counts.json`; unit/integration counts are recorded in execution records and logs. Build ID, actual browser version/path and tool versions are in `evidence/versions.json`. Raw frame samples, renderer identity, explicit LOW preference, observed tiers and failure diagnostics are in `evidence/performance/active-route-frame-pacing.json`.

Fixture configuration is used only for E2E/accessibility. Build and performance commands have no synthetic fixture configuration. File-backed embedded PostgreSQL evidence does not prove hosted PostgreSQL sessions, real Supabase MFA/Storage or mail delivery. Physical devices, screen readers, hosted restore/rollback and production operations remain NOT RUN. Heap/GPU leak absence remains UNKNOWN unless separately measured. Maker evidence does not supply independent delta review, successor acceptance or G7 acceptance.

