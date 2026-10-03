# Canonical RC3 verification matrix

Both lanes' tests remain represented in `app/`: C3 unit/public/world/performance tests, rebased A6 platform integration/E2E/content tests and contact R2 amendment tests. New tests exercise canonical imports and actual HTTP routes rather than merely cite historical PASS logs. Final clean-checkout execution binds the manifest sourceCommit: 261 unit/155 integration/97 unified browser/17 dedicated accessibility/6 performance tests PASS, with zero failed/flaky/skipped browser cases. Component preliminary results remain historical maker diagnostics, distinct from the final hashed proof.

| Area | Canonical coverage | Execution boundary |
| --- | --- | --- |
| Public routes/content | `tests/e2e/public-shell.spec.ts`, `room-project-navigation.spec.ts`, `legacy-platform/project-routes.spec.ts`, `tests/unit/content-visibility.test.ts` | Direct load, refresh/history, four verified projects, CandidateX/unknown404, validated claims, safe links, no-JS/world optionality. |
| World/core controller | `tests/unit/{interaction-controller,intent-arbitration,project-transition,lifecycle-manager,scene-integrator,character-director,camera-director,asset-loader}.test.ts`, runtime E2E | Preserved C1/C2/C3 ownership, cancellation, clips, route arbitration, cleanup and actual frozen asset loading. |
| Physical production interactions | `tests/integration/runtime/frozen-world-binding.test.ts`, `tests/e2e/physical-interactions.spec.ts` | Actual shipped GLBs, F1 single desk/resident/chair, 25 IA proxies, visible production raycast, mismatched ghost-proxy rejection, pointer teardown. No modified art is written. |
| Adaptive/fallback/preferences | Quality/preferences/painting unit tests, `renderer-recovery.spec.ts`, `browser-behavior.spec.ts` | Quality tiers, explicit preference, reduced motion, audio off/denial, storage resilience, renderer/context loss, static portfolio and mobile viewport behavior. |
| Contact/R2 | `tests/integration/platform/{contact,contact-idempotency-r2,canonical-platform}.test.ts`, `tests/e2e/platform/contact-form.spec.ts`, cross-lane E2E | Validation/honeypot, same receipt replay, changed payload409, parallel duplicate, winning-transaction quotas, outbox, DB503, rollback without orphan rows, canonical API imports. Accepted form suite retained once; duplicate legacy copy removed. |
| Auth/admin | `owner-auth.test.ts`, `session-claims.test.ts`, `database-authorization.test.ts`, `tests/e2e/platform/admin-auth.spec.ts` | Anonymous/non-owner/AAL1 denial, verified owner AAL2 success, revoked owner denial, private pages/API, origin/session claims. Supabase methods are mocked where credentials are absent. |
| Publication/media | `publication.test.ts`, `media-access.test.ts`, `canonical-platform.test.ts`, platform admin publish E2E | Durable private draft, approved media only, stale409/invalid422, transactional publication/history/audit and rollback, current-snapshot signed media selection. Hosted blob storage is not exercised. |
| Publication RPC bypass | `canonical-platform.test.ts` with actual SQL roles | Operational DCL denies `publish_new_revision` to anon/authenticated despite SECURITY DEFINER; service-role/server publication preserved. Hosted grants verification remains separate. |
| Production transaction ownership | `postgres-transactions.test.ts` | Driver mock verifies one checked-out client owns BEGIN/writes/COMMIT or ROLLBACK/release; not a hosted multi-connection concurrency run. |
| Ops | GitHub/telemetry/jobs/operations tests, canonical fifteen-table restore test | Last-good metadata, allowlisted aggregate fields, configured job secret, outbox retry/lease, actual accepted-schema local restore and legacy snapshot compatibility. Live provider/monitoring/rollback not exercised. |
| Accessibility | `tests/e2e/accessibility.spec.ts` and keyboard/reflow journeys | Automated axe and DOM navigation; does not claim NVDA/VoiceOver/TalkBack or full manual WCAG certification. |
| Performance | `tests/performance/world.spec.ts`, canonical budget script | Five cold contexts per desktop/mobile/narrow profile, current-build production HTTP HTML/resources, complete raw 60s pacing samples, cleanup cycles, actual frozen asset estimates. Local browser lab only; actual renderer and acknowledged actions are recorded. |
| Release composition/integrity | Release composition/bundle/manifest scripts | Required22 compiled routes, actual production import graph, browser credential boundary, R2 modules/SQL ordering, nine frozen assets, exact sourceCommit/archive/evidence hashes. |

Required cross-lane examples:

| User-required integration scenario | Executing canonical test |
| --- | --- |
| World -> Contact -> actual form submission | `full-stack-integration.spec.ts`: world monitor contact command reaches real API; verifies production asset requests and 202 receipt. |
| Renderer fails -> Contact remains functional | Same suite: simulated renderer failure, public navigation, real form/API receipt. |
| Direct Contact without world works | Same suite: no canvas, actual form receipt, parallel key replay and changed payload409. |
| Public project works with unavailable backend | Same suite: separate production Next process points at a genuinely unavailable connection; project load/refresh200 and CandidateX404. |
| Public world cannot grant admin access | Same suite: room terminal rejects `/admin`, protected APIs401, editor redirects to login. |
| Publication changes approved HTML/world navigation | Same suite: authorized synthetic draft/publish; refresh sees new title/revision and world launcher; restores prior draft/publication afterward. |
| Actual contact API resolves R2 implementation | Composition import/ordering check plus canonical actual-route duplicate/conflict/transaction tests. |
| Reduced motion preserves Contact/admin DOM | Same E2E suite: keyboard focus/contact receipt and protected login controls under reduced motion. |
| World navigation cannot bypass auth | Terminal allowlist test plus anonymous API/page denial from an entered world. |
| Static fallback cannot expose private drafts | Same suite: only four approved project links, no private/draft canaries, protected media401. |

Final workflow must execute frozen install, lint, typecheck, unit, integration, Khronos validation, build, full E2E, accessibility, performance browser suite, composition, budget and manifest validation. Required browser JSON reports must contain zero failed/flaky/skipped tests. Test fixtures use a new temporary PGlite directory and synthetic credentials only; they do not connect to hosted production services.

The R2 100-task amendment test uses a single embedded database connection. The earlier historical multi-process harness is preserved as historical evidence and is not relabeled a fresh canonical hosted concurrency test. Actual hosted PostgreSQL/Supabase independent sessions, real TOTP provisioning, mail sending, private blob policy, physical devices/screen readers/thermal endurance, production CDN and rollback RTO/RPO are NOT RUN and require authorized G7 work.
