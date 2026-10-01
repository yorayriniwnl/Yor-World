# Dependency and security verification — 2026-10-01 (W3-A1-r2)

Official npm responses, including exact package versions, dist integrity, engines, peers, latest tags, and HTTP statuses, are saved in [registry-metadata.json](registry-metadata.json). The fresh pnpm resolution and frozen install passed with `strict-peer-dependencies=true`. All application direct dependencies are stable exact pins. No prerelease world stack was installed.

| Package | Selected | Reason |
| --- | --- | --- |
| next / eslint-config-next | 16.3.8 | Pinned security patch release; official registry HTTP 200; matching framework and config |
| react / react-dom | 19.3.0 | Latest stable; React DOM requires React ^19.3.0; Next permits React 19 |
| zod | 4.6.5 | Latest stable; strict schema validation for contracts |
| @playwright/test | 1.63.0 | Latest stable; existing Chrome/Edge channels used |
| @axe-core/playwright | 4.13.0 | Latest stable; Playwright peer satisfied |
| @types/node | 24.19.0 | Matches actual Node major/version; latest registry major is 26 |
| @types/react / @types/react-dom | 19.3.0 | Match runtime major/minor |
| typescript | 6.0.3 | Stable supported by typescript-eslint >=4.8.4 <6.1.0 peer; latest 7.0.2 is outside that range |
| eslint | 9.39.5 | Compatible with eslint-plugin-react 7.37.5, whose peer range stops at ^9.7; latest 10.11.0 is outside it |
| vitest | 5.0.2 | Latest stable; Node 24 supported |
| pnpm | 9.15.9 | Existing installed tool, pinned packageManager; no global upgrade |

## Security Patch Analysis & Advisory Disposition

1. **Next.js 16.3.8 Patch Availability**:
   - The [Next September security notice](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026) and [v16.3.8 release notes](https://github.com/vercel/next.js/releases/tag/v16.3.8) confirm that Next 16.3.8 incorporates seven scheduled security fixes.
   - Unlike the September 30 observation where endpoints returned HTTP 404, both `next@16.3.8` and `eslint-config-next@16.3.8` are now fully published and return HTTP 200 on `https://registry.npmjs.org`.
   - The release notes separate seven scheduled fixes from two pending upstream issues that remain deferred.

2. **Advisory Applicability to YOR WORLD Shell**:
   - The shell in `W3-A1-r2` is an isolated semantic foundation without backend credentials or public write APIs.
   - Remote image optimization is not enabled (no remote image allowlist).
   - Cache Components / Draft Mode are not used.
   - Pages Router is not used (App Router only).
   - No root catch-all page (`[...slug]`) or dynamic metadata image routes exist in A1.
   - The development MCP disclosure ([GHSA-39w2-rjm5-chcv](https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv)) affects `next dev`; production proofs and E2E suites exclusively run `next start` on loopback `127.0.0.1`.
   - The two deferred upstream issues remain unresolved upstream; availability of 16.3.8 does not constitute blanket clearance for all theoretical vectors.

3. **Tooling Maintenance (ESLint 9 EOL - Finding F5)**:
   - ESLint 9.39.5 remains selected. Its end-of-life status is confirmed by npm deprecation notices and the [official ESLint support policy](https://eslint.org/version-support/).
   - `eslint-plugin-react` 7.37.5 publishes a peer dependency restricting ESLint to `^9.7`. Upgrading to ESLint 10 would violate strict peer dependencies or require `--force`/overrides, which is rejected.
   - In accordance with parent reconciliation ruling, this is maintained as a disclosed non-blocking P3 development-tooling maintenance risk, to be addressed downstream when ecosystem peers support ESLint 10.

4. **Security Audit Results**:
   - Both `pnpm audit --json` and `pnpm audit --prod --json` executed via `tools/proof.py audit` returned exit code 0 with zero known indexed advisories.
   - Raw logs: [10-audit-all.log](10-audit-all.log) and [11-audit-production.log](11-audit-production.log).
   - As documented, zero audit output does not guarantee absence of unindexed or zero-day issues.
