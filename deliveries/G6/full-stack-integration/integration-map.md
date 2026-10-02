# Canonical RC3 full-stack integration map

**CANONICAL APPLICATION ROOT: `app/`.** Future CI and authorized G7 deployment use only this root. Historical `deliveries/A6/source/`, `deliveries/C3/source/`, C1/C2/Track B deliveries and RC1/RC2 evidence remain immutable proof inputs, not deployment roots.

The parent packet is [parent-packet.txt](parent-packet.txt); baseCommit/input hashes/specification revision2 are recorded in [input-provenance.json](input-provenance.json) and [input-file-comparison.json](input-file-comparison.json). Comparison found 28 differing overlaps, 31 identical overlaps, 49 C3-only and 58 A6-only files. [conflict-resolution.md](conflict-resolution.md) covers all28 overlaps; component makers' [platform-map.md](platform-map.md), [runtime-map.md](runtime-map.md) and [tooling-map.md](tooling-map.md) record source-specific decisions and actual execution limits.

C3 remains the public/runtime baseline: semantic portfolio before entry, optional/lazy world, C1 interactions/arbitration, C2 monitor/navigation/history, C3 adaptive quality/audio/reduced motion/context loss/mobile/static fallback and renderer ownership/disposal. Rich accepted A6 About/résumé and working Contact replace pre-verification placeholders without replacing C3 shell/styles. Four verified projects (`helios`, `zenith`, `ai-vs-real`, `talks`) remain public; CandidateX is withheld even from a plausible-looking backend payload.

A6 supplies owner authentication, verified AAL2 and revoked-owner denial, admin/drafts/media, publishing/revisions/rollback/audit, contact/outbox/quotas, GitHub cache, telemetry, internal jobs and operations. File-by-file inspection required canonical production wiring corrections beyond moving imports: configured durable PostgreSQL instead of ephemeral providers, one connection per transaction, actual protected page reads, current approved snapshot reads, configured private storage/mail, stable hash secrets, leased SQL workers and complete fifteen-table restore. These are explicit candidate deltas; historical accepted files remain unchanged and independent review is required.

Every A6-only input and canonical destination:

| A6 source-relative input | Canonical destination/decision |
| --- | --- |
| `src/app/admin/admin.module.css` | Same path under `app/`; accepted admin styles. |
| `src/app/admin/editor/page.tsx` | Same path; protected server editor. |
| `src/app/admin/layout.tsx` | Same path; owner/MFA-required shell and sign-out. |
| `src/app/admin/login/page.tsx` | Same path; public verified owner sign-in/TOTP UI. |
| `src/app/admin/page.tsx` | Same path; protected dashboard. |
| `src/app/admin/publish/page.tsx` | Same path; protected publication review. |
| `src/app/api/admin/audit/route.ts` | Same path; durable owner/AAL2 audit capability. |
| `src/app/api/admin/media/[id]/approve/route.ts` | Same path; protected durable media approval. |
| `src/app/api/admin/media/[id]/route.ts` | Same path; protected private details. |
| `src/app/api/admin/media/route.ts` | Same path; durable registration/listing and configured private storage. |
| `src/app/api/admin/projects/route.ts` | Same path; durable drafts and revision/content validation. |
| `src/app/api/admin/publish/route.ts` | Same path; protected atomic publish/current snapshot/history. |
| `src/app/api/admin/rollback/route.ts` | Same path; protected transactional rollback. |
| `src/app/api/admin/verify/route.ts` | Same path; accepted GET owner/session verification. |
| `src/app/api/contact/route.ts` | Same path; actual R2 import, honest202/409/429/503 and static-code-only logging. |
| `src/app/api/events/route.ts` | Same path; allowlisted aggregate telemetry. |
| `src/app/api/github/route.ts` | Same path; allowlisted metadata/cache. |
| `src/app/api/internal/jobs/[job]/route.ts` | Same path; configured secret and durable job context. |
| `src/features/admin/project-editor.tsx` | Same path; retained accepted editor experience. |
| `src/features/admin/publish-review.tsx` | Same path; retained accepted approval/revision UI. |
| `src/features/contact/contact-form.tsx` | Same path; accepted validation/honeypot/idempotency/retry/accessibility and plain receipt semantics. |
| `src/features/contact/contact.module.css` | Same path; accepted contact styles. |
| `src/server/auth/clients.ts` | Same path; public/service credential boundary. |
| `src/server/auth/require-owner.ts` | Same path; verified user/claims AAL2 and current active-owner authorization. |
| `src/server/auth/types.ts` | Same path; accepted auth failure/context contracts. |
| `src/server/contact/db.ts` | Same path; canonical durable provider and explicit test-only adapters. |
| `src/server/contact/email-adapter.ts` | Same path; configured Resend transport, test-only mock. |
| `src/server/contact/outbox.ts` | Same path; R2 atomic conditional key claim before quota/message/outbox. |
| `src/server/contact/quota.ts` | Same path; accepted winning-transaction quotas. |
| `src/server/contact/receive.ts` | Same path; R2 replay/conflict/receipt pipeline, optional mutex disabled by default. |
| `src/server/contact/schema.ts` | Same path; accepted schema with server-only stable hash configuration. |
| `src/server/content/publish.ts` | Same path; durable atomic approved snapshot/history/audit and rollback. |
| `src/server/content/revisions.ts` | Same path; actual schema UUID/foreign-key draft writes and stale revision checks. |
| `src/server/integrations/github.ts` | Same path; configured durable last-good metadata and accepted fallback. |
| `src/server/jobs/outbox-worker.ts` | Same path; SQL lease/reclaim, provider key/retry/dead-letter semantics. |
| `src/server/jobs/runner.ts` | Same path; timing-safe configured auth and durable jobs/cleanup. |
| `src/server/media/manifest.ts` | Same path; durable approved media checks and current-public-snapshot-only signed URL resolver. |
| `src/server/media/validate-upload.ts` | Same path; accepted validation, private bucket bytes and durable metadata. |
| `src/server/operations/backup-restore.ts` | Same path; consistent backup and fixed-column transactional fifteen-table restore; legacyv1 compatible. |
| `src/server/telemetry/events.ts` | Same path; aggregate allowlist and durable best-effort persistence without raw visitor input. |
| `supabase/config.toml` | Same path; accepted configuration. |
| `supabase/migrations/20261001000000_a3_owner_auth_rls.sql` | Same filename and bytes; no renumbering. |
| `supabase/migrations/20261001000001_a4_publication_media.sql` | Same filename and bytes; no renumbering. |
| `supabase/tests/authorization.test.sql` | Same path; accepted SQL authorization coverage. |
| `tests/e2e/admin-auth.spec.ts` | `app/tests/e2e/platform/admin-auth.spec.ts`, rebased into explicit isolated owner fixture. |
| `tests/e2e/admin-publish.spec.ts` | `app/tests/e2e/platform/admin-publish.spec.ts`, retained publication scenarios with real structured drafts. |
| `tests/e2e/contact-form.spec.ts` | Retained once at `app/tests/e2e/platform/contact-form.spec.ts`; an identical second legacy copy was removed to avoid duplicate execution. Canonical cross-lane suites add real world/form/API coverage. |
| `tests/e2e/project-routes.spec.ts` | Retained under `app/tests/e2e/legacy-platform/`. |
| `tests/integration/contact.test.ts` | `app/tests/integration/platform/contact.test.ts`. |
| `tests/integration/database-authorization.test.ts` | `app/tests/integration/platform/database-authorization.test.ts`. |
| `tests/integration/github-metadata.test.ts` | `app/tests/integration/platform/github-metadata.test.ts`. |
| `tests/integration/internal-jobs.test.ts` | `app/tests/integration/platform/internal-jobs.test.ts`. |
| `tests/integration/media-access.test.ts` | `app/tests/integration/platform/media-access.test.ts`. |
| `tests/integration/operations-restore.test.ts` | `app/tests/integration/platform/operations-restore.test.ts`. |
| `tests/integration/owner-auth.test.ts` | `app/tests/integration/platform/owner-auth.test.ts`. |
| `tests/integration/publication.test.ts` | `app/tests/integration/platform/publication.test.ts`. |
| `tests/integration/telemetry.test.ts` | `app/tests/integration/platform/telemetry.test.ts`. |
| `tests/unit/content-visibility.test.ts` | `app/tests/unit/content-visibility.test.ts`; accepted verified-claim/media/safe-link/404 scenarios preserved. |

New canonical adapters/tests are explicit: `src/server/database.ts`, test fixture, server publication reader/public base configuration, sign-in/sign-out, physical interaction binding, PostgreSQL session/transaction tests, actual-route contact/publication/restore/role-denial tests, approved signed-media tests and cross-lane HTTP/browser tests. The contact amendment test imports canonical receive/outbox, not historical source. Its embedded single-connection contention remains distinguished from hosted multi-session verification.

Accepted schema release revision remains `20261002000000_schema_v1`. `supabase/operations/harden-publication-grants.sql` is a required post-migration candidate security delta: revoke PUBLIC/anon/authenticated execution of `publish_new_revision(integer,jsonb,uuid)` and preserve privileged service-role execution. The exact original numbered migrations are immutable. Apply and independently audit this DCL before any authorized hosted release; no new schema is claimed accepted.

Nine frozen production binaries ship under `app/public/models/` with same-origin manifest URLs and exact accepted bytes:

| Frozen filename | Accepted maker source/revision | Runtime use |
| --- | --- | --- |
| `group-a-essential.glb` | B2/B3-P2-R1 | Frozen grouped architecture/essential inventory; packaged. |
| `group-b-props.glb` | B2/B3-P2-R1 | Frozen secondary prop inventory; packaged. |
| `on-demand-projects.glb` | B2/B3-P2-R1 | Frozen optional project group; packaged. |
| `production-room-full.glb` | B2/B3-P2-R1 | Current required visible production environment. |
| `mobile-room-lod.glb` | B2/B3-P2-R1 | Frozen low-tier inventory; byte-identical to full room at input, not falsely claimed decimated. |
| `resident-production.glb` | B4-R1 | Required production resident, accepted eight authored clips. |
| `fixture-production.glb` | B4-R1 | Required animated chair; fixture-static discarded by existing C3 integrator. |
| `interaction-assets.glb` | IA-R1 | Desktop accepted interaction metadata/hit proxies; duplicate visible IA art suppressed. |
| `interaction-assets-mobile.glb` | IA-R1 | Mobile accepted metadata/proxy size; duplicate visible IA art suppressed. |

Canonical public manifest includes the previously omitted accepted chair ID and preserves frozen IDs/geometry/hash membership. Redundant feasibility GLBs and sample models are absent from canonical production public files; historical copies remain. The current loader consumes full production environment/resident/chair and desktop/mobile IA. It does not claim group-A/B streaming or new LOD decimation; actual loading and budget scope are recorded as implemented.

IA and production coordinates disagree. Visible production nodes retain precedence; production meshes drive existing C1 intents, while invisible IA proxies only broaden a matching node within overlapping bounds. No geometry/asset ID/transform is rewritten. Pointer handlers and IA resources are disposed through the single existing runtime owner. This parent-authorized candidate mapping is reviewed independently, not an art acceptance claim.

RC3 archive is generated exclusively from canonical app Git blobs plus release policy. Final sourceCommit, bundle byte count/SHA, required evidence hashes and composition are authoritative in the detached `release-manifest.json`/bundle receipt; no unknown hash is inserted here. Fresh final verification runs in a detached clean checkout containing those identical code blobs; commands record its actual temporary `app/` working directory. Final local execution/CI is pending parent capture at this documentation handoff. G1-G5 ACCEPTED; RC3 candidate; G6 ACTIVE / REWORK; G7 LOCKED. Next: Gemini #1 platform verification -> GPT Plus #2 independent full-stack audit -> GPT Plus #1 G6 adjudication. No deployment/self-approval.
