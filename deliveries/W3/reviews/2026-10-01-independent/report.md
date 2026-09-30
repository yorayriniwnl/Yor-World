**W3 / A1 independent implementation audit — REWORK W3**

Reviewed on 2026-10-01 IST (execution timestamps are 2026-09-30 UTC). Reviewer: independent Codex session, not the W3 maker. Target: commit `fe1a40f797ce3ec839939c09a1857b797c197269`, all 32 files under `deliveries/W3/source`, the current W3 handoff, manifests, test sources, execution helpers, and relevant product/engineering/validation contracts. No implementation repairs, A2 work, or G1 integration were performed.

The semantic shell works in the reproduced environment. Four medium-severity corrections remain: refresh the Next security baseline, count preloaded JavaScript in payloads, make the fixture import guard detect dynamic imports, and propagate audit-command failures. ESLint's acknowledged end-of-life status and Git line-ending changes to hashed evidence are separate low-severity findings. These are sufficient grounds to return W3 for bounded rework; missing full-release device coverage is not being treated as an A1 implementation failure.

**Evidence labels**

| Label | Meaning in this audit |
| --- | --- |
| SOURCE INSPECTION | Direct reading and comparison of delivered source, contracts, configurations, and test logic. |
| MAKER EVIDENCE | Supplied files under `evidence/a1-current`, plus the maker report and archive. Their contents were inspected, not presumed to be reviewer execution. |
| REVIEWER EXECUTED | Commands, browser checks, hash verification, registry requests, and controlled fault injection actually run in this session. New evidence is under this review's `evidence/` directory. |
| UNVERIFIED | Coverage or claims not established by this audit. |

**REVIEWER EXECUTED — independent reproduction**

Source was copied to a fresh external directory: `C:\Users\yoray\AppData\Local\Temp\yor-w3-independent-35atl0bg\app`. A new private package store/cache was used. The child environment retained system runtime variables only, without backend credentials; Next telemetry was disabled. No workspace dependency installation was performed. [Execution manifest](evidence/execution.json) records exact argv, working directories, timestamps, exits, and initial source hashes. [Runner source](evidence/reviewer-runner.py.txt) records the independent command harness.

Node 24.19.0, pnpm 9.15.9, Python 3.12.10; Windows build 26200; Chrome 154.0.8037.58 and Edge 154.0.4258.37. The reviewer build ID is `cmgWNarGpCVaRHgBV4J_o`, distinct from the maker build. Build hashes and test totals are in [summary.json](evidence/summary.json).

| Check | Result | Reviewer evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile`, fresh private store/cache | PASS, exit 0 | [01-install.log](evidence/01-install.log) |
| `pnpm lint` | PASS, exit 0 | [02-lint.log](evidence/02-lint.log) |
| `pnpm typecheck` | PASS, exit 0 | [03-typecheck.log](evidence/03-typecheck.log) |
| `pnpm test:unit` | PASS, 55 tests, exit 0 | [04-test-unit.log](evidence/04-test-unit.log) |
| `pnpm build` | PASS, production App Router build | [05-build.log](evidence/05-build.log) |
| `pnpm test:e2e` | PASS, 18 tests, no retries, skips, or unexpected results | [06-test-e2e.log](evidence/06-test-e2e.log), [browser results](evidence/maker-suite/browser-results.json) |
| `pnpm list --depth 0 --json` | PASS, selected direct versions installed | [07-list.log](evidence/07-list.log) |
| `pnpm audit --json` and `pnpm audit --prod --json` | Both exit 0; zero indexed advisories returned. This is not security clearance. | [08-audit.log](evidence/08-audit.log), [09-audit-prod.log](evidence/09-audit-prod.log) |
| Additional independent browser probe | PASS for observed routes/focus/reflow; independently confirms payload defect F2 | [independent-browser.json](evidence/independent-browser.json), [probe source](evidence/independent-browser.mjs.txt) |
| Fixture-import fault injection | Guard incorrectly PASSes with a production-to-test dynamic import | [fault injection](evidence/fixture-boundary-fault-injection.json) |
| Audit-helper fault injection | Helper incorrectly exits 0 when both audit subprocesses exit 1 | [fault injection](evidence/audit-wrapper-fault-injection.json) |

Playwright served the newly built application using `next start` on loopback port 3159, with `reuseExistingServer: false`. It did not reuse a development server. The additional probe used a separately owned `next start` process on port 3158. Both servers were stopped. Temporary fault injections were restored; [source-integrity-final.json](evidence/source-integrity-final.json) confirms every delivered source file remains unchanged. Only scratch `next-env.d.ts` differs because Next regenerated it during the build.

**F1 — Medium / P2: the Next security correction is now available, but the delivery still uses the unfixed version**

- **File/symbol/evidence:** `source/package.json:19,31`, the Next importer/resolution in `source/pnpm-lock.yaml`, `evidence/a1-current/security-review.md:21`, and `report.md:71,107,111`. New evidence: [registry-recheck.json](evidence/registry-recheck.json).
- **Observed — SOURCE INSPECTION / MAKER EVIDENCE / REVIEWER EXECUTED:** Both `next` and `eslint-config-next` are pinned to 16.3.7. The maker accurately recorded unavailable patch endpoints at its earlier observation. During this audit, the official npm endpoints for Next 16.3.8 and 15.5.27 returned HTTP 200; `next/latest` and `eslint-config-next/latest` returned 16.3.8. The official September notice now describes seven fixes, with two additional issues deferred upstream, rather than the maker's earlier nine-fix description. The maker's “unavailable” next step is therefore stale.
- **Expected:** Recheck the security baseline at review, retain exact compatible pins and a genuinely regenerated lockfile, and distinguish available fixes from unresolved upstream issues.
- **Why it matters:** G1 would inherit a known outdated framework baseline even though its previously stated blocker has gone away. A zero-result npm audit does not supersede maintainer notices. This is a dependency/review defect, not a claim that the current static shell exposes every announced vulnerability.
- **Minimal correction:** In a bounded W3 correction, update the matching Next framework/lint configuration to the verified patch, regenerate the lockfile with peers enforced, rerun the checks, and issue a dated security addendum and fresh handoff hashes. Preserve the historical evidence rather than rewriting it as though it was collected later.
- **Exact retest:** In a fresh temporary copy run `pnpm install --frozen-lockfile`, `pnpm list --depth 0 --json`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`, `pnpm test:e2e`, `pnpm audit --json`, and `pnpm audit --prod --json`. Verify framework/config versions match the new exact pins and read the current maintainer advisories again.

The [official notice](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026) identifies 16.3.7 as excluding the scheduled fixes; the [16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8) and registry recheck establish patch availability. Advisory applicability was examined: this source has no remote image allowlist, Cache Components/Draft Mode, Pages Router, root catch-all page, or dynamic metadata image routes. The [development MCP disclosure](https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv) concerns `next dev`, which the package offers but this production reproduction did not run. Exploitability of the disclosed issues was not penetration-tested; no blanket “all fixes resolved” claim is warranted.

**F2 — Medium / P2: the payload budget omits JavaScript fetched through preload**

- **File/symbol/evidence:** `source/tests/e2e/payload.spec.ts:55`, `js`/`encodedJsBytes`; maker `evidence/a1-current/payload-summary.json` and report payload totals. New evidence: [payload-recalculation.json](evidence/payload-recalculation.json), [independent-browser.json](evidence/independent-browser.json).
- **Observed — SOURCE INSPECTION / MAKER EVIDENCE / REVIEWER EXECUTED:** The test counts only resource entries whose `initiatorType` is `script`. Next preloads `/_next/static/chunks/148u489fbqjmh.js`; its initiator is `link`, and its encoded body is 1,970 bytes. Every reproduced cold load reports 135,064 JS bytes while the observed complete JS total is 137,034 bytes (133.8 KiB). The maker's raw resources exhibit the same omission.
- **Expected:** Count all initial application JavaScript transfers, including script preloads/modulepreloads, regardless of which DOM mechanism initiated the fetch.
- **Why it matters:** The present build remains below 250 KiB, but the asserted budget and reported headroom are wrong. Larger preloaded chunks could create a false budget pass during integration.
- **Minimal correction:** Classify JS using observed response resource/MIME information joined to Resource Timing, covering preloads and avoiding duplicate counting. Recompute the summaries from complete resource records. Do not use `initiatorType === "script"` as the sole classifier.
- **Exact retest:** Run `pnpm test:e2e tests/e2e/payload.spec.ts` for Chrome and Edge, five cold loads per profile. The original build must count 137,034 bytes; a patched rebuild must reconcile its total to all observed JS responses. Add a test-only preloaded script whose encoded body exceeds the JS ceiling and prove the budget assertion fails. Remove that fixture from production input. The initial transfer total of 160,417 bytes already includes the omitted preload and does not require the same 1,970-byte adjustment.

**F3 — Medium / P2: the production fixture boundary test misses dynamic imports**

- **File/symbol/evidence:** `source/tests/unit/boundaries.test.ts:17–23`; the related shared-contract import scan at lines 27–31 has the same syntax limitation. New evidence: [fixture-boundary-fault-injection.json](evidence/fixture-boundary-fault-injection.json), [log](evidence/fixture-boundary-fault-injection.log).
- **Observed — SOURCE INSPECTION / REVIEWER EXECUTED:** The guard searches `from "..."` imports. In the external copy only, the reviewer added `await import("../../../tests/fixtures/reviewer-fixture")` to production `public-content.ts` and obtained `draftIdentity.name` from the fixture. The fixture logged that it executed. `pnpm test:unit tests/unit/boundaries.test.ts` still passed all three tests and exited 0. Both scratch files were restored/removed afterward. No fixture leak was found in the unmodified delivered source.
- **Expected:** A production module must not consume test fixtures through either static or dynamic imports. Contract modules must likewise reject framework/service imports regardless of syntax.
- **Why it matters:** The test's PASS is stronger than its protection. Dynamic loading is especially relevant to the future G1 world boundary, so retaining this regex as proof of fixture isolation is unsafe.
- **Minimal correction:** Inspect import declarations, exports, side-effect imports, and dynamic imports using TypeScript's parser/module resolution (already available), resolving aliases and relative paths before applying the production/test and contract/framework rules. Keep a narrow negative test that exercises this demonstrated bypass.
- **Exact retest:** Reapply the exact mutation archived in the evidence to a temporary copy. `pnpm test:unit tests/unit/boundaries.test.ts` must fail because of the test-fixture edge. Check equivalent static, side-effect, and aliased imports. Restore the clean source, then rerun unit tests, build, and browser checks; verify the sentinel is absent from emitted HTML/RSC and browser chunks.

**F4 — Medium / P2: the reproduction helper reports success when security audit commands fail**

- **File/symbol/evidence:** `tools/proof.py:97–101`, the `audit` and `list` action branches. New evidence: [audit-wrapper-fault-injection.json](evidence/audit-wrapper-fault-injection.json).
- **Observed — SOURCE INSPECTION / REVIEWER EXECUTED:** `run()` returns each subprocess exit status, but the `audit` branch ignores both returns. In a copy of the helper with a reviewer-controlled CLI that exits 1, both child audits recorded exit 1 and the outer `python tools/proof.py audit` process exited 0. The `list` branch similarly ignores failure. The real audit commands in this review did return 0; their logs were not fabricated or changed.
- **Expected:** A reproduction/check command must return nonzero when a required child check fails, including registry/network errors, while preserving every child's evidence.
- **Why it matters:** Shell automation can report a successful security check or continue to package evidence despite a failed audit. Reading the JSON manually is currently necessary to discover the failure.
- **Minimal correction:** Run both audits, retain both records, then propagate a nonzero aggregate result if either fails. Propagate `list` failure as well.
- **Exact retest:** Repeat the archived copied-helper experiment with audit child exits `(1,1)`, `(0,1)`, `(1,0)`, and `(0,0)`. Only `(0,0)` may yield helper exit 0. Repeat for a failing `list` command, then run the real frozen-install/check/audit reproduction sequence and inspect both top-level and child exits.

**F5 — Low / P3: the lint toolchain remains on an unsupported ESLint release**

- **File/symbol/evidence:** `source/package.json:30`, the ESLint/plugin resolutions in `source/pnpm-lock.yaml`, and `evidence/a1-current/security-review.md:19`. New evidence: [registry-recheck.json](evidence/registry-recheck.json).
- **Observed — SOURCE INSPECTION / MAKER EVIDENCE / REVIEWER EXECUTED:** ESLint 9.39.5 remains selected. The maker disclosed its EOL status. The current [ESLint support policy](https://eslint.org/version-support/) still identifies v9 as EOL since 2026-08-06; the registry still shows `eslint-plugin-react` 7.37.5 with a peer range excluding ESLint 10. Frozen installation/lint pass, so this is a maintenance limitation rather than a reproduced lint failure or demonstrated production vulnerability.
- **Expected:** The engineering dependency review should identify and resolve unsupported tooling, or explicitly retain it as a bounded maintenance risk instead of calling the complete dependency set maintained.
- **Why it matters:** The development toolchain will not receive normal upstream maintenance on that release line, and the limitation propagates into integration.
- **Minimal correction:** Have the maker propose a maintained compatible lint combination preserving the required Next/React/TypeScript/accessibility rules, or retain a clearly documented temporary maintenance disposition. Do not merely force ESLint 10 past incompatible peers or remove rules to manufacture a pass.
- **Exact retest:** With any proposed replacement, regenerate and freeze-install with `strict-peer-dependencies=true`; run `pnpm lint`, `pnpm typecheck`, build, and targeted negative lint samples to confirm the retained rules still reject violations. Recheck current support and peer metadata. This finding alone does not establish a public-shell security exploit.

**F6 — Low / P3: the handoff's byte hashes do not match all committed Git files**

- **File/symbol/evidence:** `output-manifest.json`, the W3 Git text-file policy, and 31 recorded files, including `source/tests/fixtures/engineering-section-4.ts`, `source/tests/unit/contract-types.test.ts`, and maker logs/JSON. New evidence: [git-blob-manifest-check.json](evidence/git-blob-manifest-check.json).
- **Observed — SOURCE INSPECTION / REVIEWER EXECUTED:** The local files and handoff zip match all 127 manifest records. However, hashing the committed contents using `git show HEAD:deliveries/W3/<path>` yields 31 mismatches. Every mismatch is explained by CRLF-to-LF conversion; the Git blobs are otherwise identical. There is no W3 attributes rule preserving the recorded bytes. Source execution behavior is unaffected, and the archive remains an intact exact-byte handoff.
- **Expected:** The stated Git reproduction path and manifest policy should agree on canonical evidence bytes, or clearly designate the immutable archive as the sole byte-verification target.
- **Why it matters:** A checkout/export using LF files cannot verify those 31 hashes, making benign newline changes indistinguishable from altered evidence to the current verifier. This was introduced at repository ingestion after the maker's original no-Git handoff; it is not evidence that the maker falsified a log.
- **Minimal correction:** For the new W3 handoff, choose and document canonical line endings before hashing and enforce them within the owned delivery, or preserve the original evidence bytes with scoped Git attributes. Regenerate a new manifest/archive from the corrected handoff while retaining the historical archive. Do not change global Git settings or silently replace historical measurements.
- **Exact retest:** Compare every new manifest entry against both archive bytes and `git show <new-commit>:deliveries/W3/<path>`. Then verify fresh checkouts with `core.autocrlf=false` and `core.autocrlf=true` follow the declared policy. If only the archive is authoritative, make that explicit and verify it independently from the text-normalized checkout.

**SOURCE INSPECTION — coverage and positive conclusions**

| Area | Audit conclusion |
| --- | --- |
| Package/lock agreement | All direct dependency/devDependency specifiers are exact stable pins. The pnpm packageManager pin matches the installed CLI. The Node engine range is a compatibility constraint, not a floating dependency pin. A fresh frozen install passed with peers enforced. No fabricated lockfile or package/lock mismatch was found. |
| Strict TypeScript | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`, and `noEmit` are enabled. Tests/configuration are included in typecheck. `skipLibCheck` skips dependency declarations; it does not disable application strictness. |
| Type/schema agreement | All engineering section 4 value types match the test-only baseline and Zod-inferred exports. The fixture's normalized type text also matches the actual engineering document. `expectTypeOf` assertions depend on the separately executed TypeScript check; a Vitest runtime PASS alone would not prove them. |
| Runtime validation | Framework-independent Zod strict objects reject unknown keys, unsupported enums/discriminants/versions, unsafe URL schemes, malformed hashes/counts, and executable block kinds. Nullable unknown evidence is retained. No public untrusted-data ingestion boundary is implemented in A1. |
| Schema scope | These are structural schemas, not publication authorization or provenance validation. They intentionally do not prove unique project IDs/slugs, approved media, verified authorship, or asset-host approval. The source/maker report disclose the later-layer responsibility; accepting a parsed manifest must not become permission to load arbitrary assets in G1. |
| Routes and Next boundaries | Five real App Router pages, ordinary metadata, a meaningful 404, server-rendered content, and native anchors through Next Link. No custom client module, renderer, backend SDK, API handler, or domain service was found. Type-only contract imports in navigation/content do not ship Zod/world code to the initial client. |
| Content truthfulness | Zero public projects; draft identity/title explicitly provisional; contact, résumé download, and studio availability honestly described. No invented project cards, test claims, biography, résumé file, form submission, or receipt found. Empty pages are permitted by the W3 packet. |
| Isolation and network | Source and generated output contain no world/fixture/backend implementation. The source's useful pages require no backend credentials. The blocked-network suite actually probes and verifies interception, then detects no application world/API request. This proves the empty A1 boundary, not a working lazy world loader. |
| Semantics and no-JavaScript | Landmarks, English document language, logical headings, named navigation, native disclosure and links. Every public route remains useful with JavaScript disabled. Next script preload requests can still occur with JS execution disabled; zero JavaScript transfer is not claimed. |
| Keyboard and focus | Skip link becomes visible first, Enter focuses `main`, and subsequent Tab reaches View projects. The independent probe observed Next's “Projects” route announcement; after content navigation, Tab reaches the destination content link. Persistent nav activation retains focus on the nav link and continues logically. Native disclosure keyboard operation works. No focus trap was found. |
| Motion and sound | No active animation/parallax/camera travel or audio runtime exists. Reduced-motion CSS is explicit; browser checks found no running animations/smooth scrolling. Sound preference defaults false; no WebGL/audio context/media play or canvas/media element was observed. |
| Browser/accessibility methodology | Tests use production build/start, actual installed Chrome/Edge, fresh no-JS contexts, keyboard actions, real navigation/refresh/Back, blocked requests, mobile viewports, and axe. All 18 passed independently. Axe and Chromium viewport emulation are not full accessibility/mobile acceptance. |
| Independent visual/reflow checks | Desktop screenshot and forced-colors narrow screenshot inspected. No horizontal overflow was observed at 320 CSS px, with open studio disclosure, or in the additional 200% root-font enlargement probe. The probe label `400pct-reflow` denotes a 320px viewport approximation, not actual browser zoom. |
| Payload protocol | Five cold loads for each desktop/mobile-emulated profile in both browsers; DPR/network/cache/hardware/build identity recorded. Total initial app-origin transfer is 160,417 bytes (156.7 KiB); corrected JS is 137,034 bytes (133.8 KiB). Median and nearest-rank p95 match these values in all four profile groups. Both ceilings still pass after correction. These are transfer observations, not LCP/INP/CLS or device frame-rate results. |

**MAKER EVIDENCE — integrity and stale assumptions**

The output manifest's 127 file records match both current disk and archive bytes, and the archive/manifest wrapper checksums match: [manifest-check.json](evidence/manifest-check.json). Committed Git bytes have the 31 line-ending differences documented in F6. The earlier interrupted zip/evidence are explicitly superseded and were not used to award current passes. The maker retained failed runs and correctly identifies the first unbuilt-server E2E attempt as setup failure, not a demonstrated behavioral red test.

Six of eleven recorded input hashes differ from today's workspace: START_HERE, AGENTS, account prompts, delegation hub, product spec, and validation document. Engineering contracts, platform plan, and the three reference inputs still match. This is recorded in [input-check.json](evidence/input-check.json). W3 does not include the historical bytes of those six inputs, so their exact textual deltas cannot be reconstructed from its handoff. This audit directly read the current contracts and independently checked schema agreement; it does not convert the maker's old input hashes into current ones. A corrected handoff needs a new input manifest and explicit applicability statement while retaining the old record.

The maker's “not a Git repository” observation predates this repository's initial commit. It must remain labeled historical; the audited source now has the commit identity above and the supplied GitHub remote. It is not evidence of a failed maker push. The dependency patch-availability claim is also time-bound and superseded by F1. Current registry data shows a newer Vitest patch too; being behind that patch alone was not treated as a defect without a demonstrated relevant fix/security issue.

The browser host injected a Kaspersky script request. The maker suite blocks every off-origin request and records the two known hostnames separately; unknown external hosts still fail. The independent unfiltered probe observed the same host, and no page runtime exceptions. Built application assets do not contain that hostname. This is a qualified application-payload observation, not proof that the host's unfiltered traffic is absent.

**UNVERIFIED and G1 handoff hazards**

Firefox/WebKit/Safari, prior iOS Safari, physical Android/iPhone, NVDA/VoiceOver, real browser zoom at 200%/400%, complete rendered contrast evaluation, field Web Vitals, sustained GPU/thermal behavior, and a working world are unverified. No Firefox/WebKit Playwright binary or Firefox/NVDA executable was found in the inspected standard locations; no browser/service installation was attempted. Automated axe still has manual-inspection cases. The delivered helper's portability beyond the demonstrated Windows/pnpm layout is also unverified.

No backend/auth/contact/publication integration was expected or run. The empty integration suite deliberately fails when invoked; it is not a hidden passing integration claim. No attack against an external deployment was performed.

For the future integrator, this proof must not be copied blindly: the boundary test hardcodes the four A1 production dependencies, the footer says “Sound off” statically, entry is an unavailable disclosure, public content is empty, and preview metadata is `noindex`. Those are valid A1 choices, not a ready G1 state/controller or publication service. Integration needs separate post-entry dependency/fetch, cancellation, preference/focus, and loader tests while retaining the pre-entry HTML boundary. Asset schema success must remain distinct from approved provenance/host/hash checks. These are handoff constraints, not authorization to start G1.

Only reviewer report/evidence files and attributes preserving this review's evidence bytes were added. Delivered source and maker evidence were preserved. Return F1–F4 for correction, carry F5's maintenance disposition explicitly, correct or clarify F6's packaging policy in the new handoff, and independently review the maker's new exact revision before acceptance.

REWORK W3
