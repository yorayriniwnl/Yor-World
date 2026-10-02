# Canonical RC3 dependency merge

`app/package.json` and its genuinely generated `pnpm-lock.yaml` are the dependency authority. Node is `>=24.19.0 <25`; package manager is `pnpm@9.15.9`. Installation uses `pnpm install --frozen-lockfile` from `app/`. Final execution status, versions and lockfile binding belong to `commands-and-exit-codes.md`, `release-manifest.json` and `SHA256SUMS.txt`, once the parent captures them. No final frozen-install PASS is inferred from these declarations.

| Package | Exact canonical pin | Decision |
| --- | --- | --- |
| `next` | `16.3.8` | Same A6/C3 pin; retained. |
| `react`, `react-dom` | `19.3.0` | Same A6/C3 pins; retained. |
| `three` | `0.180.0` | Same A6/C3 pin; preserve C3 renderer/runtime contracts. |
| `zod` | `4.6.5` | Same A6/C3 pin; shared content/contact contracts. |
| `@supabase/ssr` | `0.12.7` | A6 server/client session capability merged. |
| `@supabase/supabase-js` | `2.117.2` | A6 verified owner/Auth/Storage capability merged. |
| `pg` | `8.16.3` | Explicit canonical production correction: durable PostgreSQL driver, one checked-out connection per transaction. Replaces automatic production PGlite/memory selection. |
| `server-only` | `0.0.1` | Explicit canonical boundary for public server publication reader. Vitest uses a test-only alias. |
| `@electric-sql/pglite` | `0.5.8` | A6 development/test dependency retained; isolated SQL/RLS/restore/browser fixtures, never automatic production fallback. |
| `@types/pg` | `8.15.5` | Types for the new production driver. |
| `@axe-core/playwright` | `4.13.0` | Same accepted automated accessibility pin. |
| `@playwright/test` | `1.63.0` | Same accepted browser pin; unified suite. |
| `@types/node` | `24.19.0` | Same accepted runtime types. |
| `@types/react`, `@types/react-dom` | `19.3.0` | Same accepted React types. |
| `@types/three` | `0.180.0` | Same accepted renderer types. |
| `eslint` | `9.39.5` | Same accepted lint pin. |
| `eslint-config-next` | `16.3.8` | Same accepted Next lint pin. |
| `gltf-validator` | `2.0.0-dev.3.10` | C3 release verification dependency retained; canonical assets only. |
| `typescript` | `6.0.3` | Same accepted typecheck pin. |
| `vitest` | `5.0.2` | Same accepted test pin; unit and integration file globs unified. |

The merge did not casually upgrade accepted Next/React/Three/Zod/Supabase/test pins. New `pg`, its types and `server-only` are bounded integration additions; their resolved transitive graph is recorded by the canonical lockfile. Historical lane lockfiles remain untouched. Source-specific fixture imports are rebased into `app/`; the deployable source does not import either historical delivery application.

See [platform-map.md](platform-map.md) for driver/claim verification and [conflict-resolution.md](conflict-resolution.md) for package/config decisions. Clean frozen installation, lint, typecheck, SQL tests and production build must all pass against the final sourceCommit before handoff.
