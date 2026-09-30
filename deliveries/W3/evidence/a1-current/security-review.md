# Dependency verification — 2026-09-30

Official npm responses, including exact package versions, dist integrity, engines, peers, latest tags and HTTP statuses, are saved in [registry-metadata.json](registry-metadata.json). The fresh pnpm resolution and frozen install passed with `strict-peer-dependencies=true`. All application direct dependencies are stable exact pins. No prerelease world stack was installed.

| Package | Selected | Reason |
| --- | --- | --- |
| next / eslint-config-next | 16.3.7 | Latest stable at observation; matching framework/config |
| react / react-dom | 19.3.0 | Latest stable; React DOM requires React ^19.3.0; Next permits React 19 |
| zod | 4.6.5 | Latest stable |
| @playwright/test | 1.63.0 | Latest stable; existing Chrome/Edge used |
| @axe-core/playwright | 4.13.0 | Latest stable; Playwright peer satisfied |
| @types/node | 24.19.0 | Matches actual Node major/version; latest registry major is 26 |
| @types/react / @types/react-dom | 19.3.0 | Match runtime major/minor |
| typescript | 6.0.3 | Stable supported by typescript-eslint's >=4.8.4 <6.1.0 peer; latest 7.0.2 is outside that range |
| eslint | 9.39.5 | Compatible with eslint-plugin-react 7.37.5, whose peer range stops at ^9.7; latest 10.11.0 is outside it |
| vitest | 5.0.2 | Latest stable; Node 24 supported |
| pnpm | 9.15.9 | Existing installed tool, pinned packageManager; no global upgrade |

The selected ESLint is **end of life**, as confirmed by its npm deprecation message and the [official support policy](https://eslint.org/version-support/). Its current React plugin [published peer range](https://registry.npmjs.org/eslint-plugin-react/latest) prevents a supported ESLint 10 upgrade with the present Next lint stack. This is a development-tool maintenance defect, not a claim that the whole set is fully maintained. The [typescript-eslint registry record](https://registry.npmjs.org/typescript-eslint/latest) explains the TypeScript 6 pin. No peer override or suppressed dependency check was used.

The [Next September security notice](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026) explicitly says 16.3.7 excludes the upcoming fixes. It announces nine vulnerabilities and targets 16.3.8 / 15.5.27. Both exact package endpoints returned HTTP 404 during this run, while `/next/latest` returned 16.3.7. **Those fixes could not be installed or tested. This proof is not security-cleared for release.** Recheck the published patch and its advisory scope at the next assigned correction/review gate.

The earlier [September 22 Next advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) lists 16.3.6 as patched for that specific issue; 16.3.7 is above that boundary. The [React maintainer advisory](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g) lists affected RSC packages on older 19.0/19.1/19.2 lines. These checks do not resolve the later announced Next vulnerabilities or audit vendored framework internals exhaustively.

Both `pnpm audit --json` and `pnpm audit --prod --json` exited 0 and reported zero known advisories. Their raw results are in [11-audit-all.log](11-audit-all.log) and [12-audit-production.log](12-audit-production.log). Registry audit results are time-limited and do not cover undisclosed or not-yet-indexed issues. No vulnerability suppression, automatic upgrade, purchase, global install or service change was performed.
