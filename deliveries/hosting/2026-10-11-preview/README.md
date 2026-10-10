# Hosted YOR World preview

Live URL: https://yor-world.deadlygamerayush5.chatgpt.site

Sites version 1 is deployed successfully with owner-only access. Sign in with the owning ChatGPT account. This is a static preview of the accepted RC6 public pages and client 3D studio. Database-backed CMS, administration, contact submissions and background jobs are not deployed. The contact page explicitly says sending is unavailable and retains the direct email link.

The canonical `app/` and accepted revisions remain unchanged. This hosting adapter does not accept the completion candidates or the G7 production gate.

## Source and deployment binding

- Accepted RC6 source: `8e5b954e147a87e36a6869d9940c40f3d4c123f0`.
- Accepted app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Exact pushed Sites preview source: `fa6e922f91e076be80620bf907b6c107817ff6d2`.
- Project: `appgprj_6acaa28a4d6c8191819d713b6e1baadb`.
- Saved version: `appgprj_6acaa28a4d6c8191819d713b6e1baadb~appgver_5529d3f9d92c81918ce82ffac362d11e`.
- Deployment: `appgdep_6acaa5e7f9808191a4fcac15ae4bce99`.

The isolated `source/` checkout is maintained in the Sites source repository; it is excluded from the parent repository. It includes the original server implementation under `server-source/`, outside the exported route tree. The deployment archive contains only static output and hosting metadata, with 101 files. The local compressed archive hash and the provider's stored uncompressed tar hash are recorded separately.

## Evidence

- [Source binding](evidence/preview-source-binding.json): all 241 accepted Git inputs and each adapted or relocated file.
- [Independent source review](evidence/independent-source-review.md): PASS for the static-preview source only.
- [Build result](evidence/build.json) and [build log](evidence/build.log): PASS, fresh Next static export with four project detail pages.
- [Local browser smoke](evidence/browser-smoke.json): PASS, navigation, published pages, excluded routes, truthful contact notice, 3D rendered frames and mobile layout. Chromium used a software renderer; this is not physical-device performance evidence.
- [Archive receipt](evidence/archive.json), [saved version](evidence/version.json), [deployment](evidence/deployment.json) and [access readback](evidence/access-policy.json).
- [Live checks](evidence/live-check.json): final result for hosted pages, model hashes, anonymous access gate and browser navigation. Service access is distinct from running the owner's interactive sign-in flow.

The first dependency-junction command failed and was replaced by a native PowerShell junction. Static export required an explicit static robots route. Packaging initially failed because GNU tar treated the Windows drive letter as a remote host; `TAR_OPTIONS=--force-local` fixed packaging through the same Sites source workflow. No accepted app files were changed. Downloaded Git Bash tooling came from the official Git for Windows release archive, with its published SHA-256 verified; see [tooling receipt](evidence/tooling.json).

## Work remaining

1. **Gemini #1:** return FINISH-A1/r3 corrections, then complete editable site content, private CMS preview/review and revision-bound publication, plus the approved résumé PDF. The production database, authentication, mail delivery and jobs must be connected and verified.
2. **Gemini #2:** return FINISH-B1-R3 reference-faithful assets, measured geometry and usable motion bindings, with reference captures, clearance and performance evidence.
3. **Gemini #3:** return FINISH-C1-R3 loading, cancellation and decorative-pause corrections; complete entrance/door choreography, all 25 core interactions and mobile/accessibility controls.
4. Complete the six extension areas: mug/drink, wearable headphones, drawers, weather/daylight, moods/greetings, and five to eight total Easter eggs.
5. Independently audit the returned implementations, send defects back to their makers, accept corrected revisions and integrate them under the assigned integration packet.
6. Complete full production/G7 deployment and security/cache checks, physical-mobile and assistive-technology sessions, rollback and full recovery evidence. Owner-only static hosting does not complete those gates.

The three current correction prompts are in [corrections-2026-10-10](../../../docs/planning/production-prompts/corrections-2026-10-10/). No fresh R3 return was present at the hosting review.
