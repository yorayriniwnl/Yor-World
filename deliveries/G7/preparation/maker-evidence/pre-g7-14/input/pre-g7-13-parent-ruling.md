# PRE-G7-13 parent ruling: bounded visual-composition acceptance

- **Date:** 2026-10-14 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Scope:** [PRE-G7-13 work order](../reconciliation-packets/2026-10-14-pre-g7-13-anchor-articulation.md)
- **Source commit:** `a3459c158af880319269196f85c0c922ee86c5d6`
- **App tree:** `23c7dac82746d7db84632e228efe3224736b9266`
- **Final evidence head:** `498d6e1329ce651a816cd17935af5fa25bf01ba2`
- **Source/evidence branch:** `codex/pre-g7-13-anchor-articulation-20261014`
- **Audit return:** [read-only local audit](../../../deliveries/G7/preparation/pre-g7-13-parent-acceptance/independent-audit.md)

## Ruling

**PRE-G7-13-R1 ACCEPTED as a bounded local visual-composition correction.** This accepts only the source-bound room composition and the required evidence package. It is not a production release, does not replace RC6-R1 or the immutable G6-R1 baseline, and does not accept PRE-G7-12 retroactively.

The source corrects the workstation composition within the packet: the audio console is supported by the actual desk surface and adjacent to the microphone; each named camera foot is supported by the upper shelf; code-native controller, compact audio console and headset/stand details are present; and the cyan fill calibration is visible. The named anchors remain in the accepted GLB; its bytes are unchanged at 861,364 bytes with SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`.

## Evidence adjudication

- Parent visual review of the raw attempt-60 desktop 1440x900 and mobile 390x844 captures confirms the floating console and hanging camera defects are resolved; the required workstation groups remain recognizable. Compact 320x600 and landscape 844x390 captures are also archived.
- Console/table contact delta is approximately `1.5e-10 m`; its footprint remains on `desk_top`, with 0 m horizontal gap to the existing microphone. All three camera feet contact `shelf_rear_upper` at 0 m vertical delta and retain the specified 5 mm support margin.
- Responsive composition and drawer tests passed 3/3; focused production-lighting integration passed 4/4; world recovery/fullscreen passed 13/13; clean-profile browser shell smoke passed 8/8; CandidateX guard passed 1/1 with the route returning 404. Lint, typecheck, unit tests (324), production build, and mirror parity passed as reported in the source-bound evidence.
- The checksum audit first identified and then verified correction of the amendment provenance typo and all 246 Git-blob hashes. The final delta audit reports zero unaccounted hash differences. The maker report remains candid about the initial failed composition attempts.
- The default full integration suite remains **FAIL, 285/286** on the exact-float assertion in `tests/integration/production-camera.test.ts:174` (`0.30000000000000004` versus `0.3`). This ruling preserves that result as a failure; it does not claim the overall test gate passed. The assertion requires separate disposition before a broader release/source gate.
- Physical iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, VoiceOver/Safari, and the 10-minute mobile soak are **NOT RUN**. Browser viewport emulation is not physical-device evidence.

The audit was performed by a read-only local Codex agent. No external GPT Plus #2 audit was performed or claimed. This is a documented local-review substitution; any later gate that requires the designated external account review remains unsatisfied until that review is actually obtained.

## Remaining boundaries and next work

The screenshot's hydration attributes are injected by Dark Reader/Grammarly; no application markup change is indicated. The user's browser still showed a WebGL context-creation/loss fallback, while the packet deliberately left renderer creation, fallback, and retry policy untouched. This acceptance does not claim that the user's Chrome rendered the 3D world; its clean-profile production browser evidence is limited to the environment recorded by the maker.

No provider configuration, database/auth setup, production origin, verified sender domain, DNS, deployment, monitoring, rollback, or G7 exit criterion was changed or accepted. The current instruction is local-only. G7 remains **AUTHORIZED / PREPARATION; NOT ACCEPTED**. Subsequent work must use a new bounded parent packet based on this accepted source identity and retain all stated limits.