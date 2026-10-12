# A1 correction source review

Reviewed directly in the isolated exact-base replay after applying candidate `76d679dcb98064152021830b98f16eb456b3ae19`; the replay `app/` tree equals candidate manifest tree `ba8f952edc34e94393c48b25779071daab9a9812`.

1. Frozen DTO compatibility: `src/server/media/manifest.ts` retains `approvalAudit: { eventId, createdAt }`; `src/server/content/preview.ts` uses the generic `scope`/`id` ReviewCheck shape, accepts site-scoped checks, and does not add `previewProjectId`. Fresh boundary probes accept the frozen structures and reject the replaced `id`/`action` audit shape and injected preview field.
2. Publication refresh: `src/features/admin/publish-review.tsx` reads `publicationResponse.activePublication` in both refresh paths, matching `/api/admin/publish`; the focused integration suite covers publish and rollback refresh.
3. Missing draft: review lookup returns `null` when a requested draft is absent; `/api/admin/preview` and the private preview page map that case to not-found handling. The focused integration suite passes the route behavior.
4. Stale save handoff: the stale-revision exception carries `currentDraft`; `/api/admin/projects` returns it on 409. Integration coverage checks the authorized conflict payload, with no draft/publication/audit writes; the browser workflow keeps the losing editor buffer.
5. Media URL boundary: `src/features/portfolio/case-study.tsx` renders a draft image only when its URL exactly equals the canonical private preview URL. Three fresh boundary probe groups reject URL variants outside that exact value.
6. Neutral authoring defaults: editor additions use empty headings, paragraphs, list entries and links, with unknown evidence left null. The E2E workflow verifies blank defaults, save, conflict preservation, publish and rollback.

Fresh local reruns: focused unit 5/5, focused integration 22/22, and separate boundary probes 3/3, all on the isolated replay with candidate source unchanged. These are local technical results; external review and production gates remain open.
