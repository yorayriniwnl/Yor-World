# RC5 physical hardware and assistive technology protocol

Candidate: **v1.0.0-rc5**, canonical app root `app/`. G6 ACTIVE / REWORK; G7 LOCKED. This is a blank execution protocol. Actual model/OS/browser/tester/date/sourceCommit/asset revision/publication revision/network/DPR/cache state must accompany each returned receipt. Do not infer physical or screen-reader success from Chromium viewport emulation or axe.

| ID | Actual device/session required | Local automated evidence | Current manual status |
| --- | --- | --- | --- |
| MD-01 | Physical iPhone/iPad, supported Safari/iOS version recorded | Responsive Chromium tests are viewport emulation, not Safari hardware. | NOT RUN |
| MD-02 | Physical mid-range Android, supported Chrome version recorded | Responsive Chromium tests are viewport emulation, not thermal/driver verification. | NOT RUN |
| MD-03 | NVDA with supported Windows browser, actual audio session | Axe/keyboard checks are automated accessibility only. | NOT RUN |
| MD-04 | VoiceOver with Safari on actual macOS/iOS device | Axe does not emulate VoiceOver speech/rotor. | NOT RUN |
| MD-05 | TalkBack with actual Android browser/device | Axe does not emulate TalkBack gestures/speech. | NOT RUN |
| MD-06 | Ten continuous minutes of physical mobile world use | Complete raw 60s renderer-identified Chromium pacing is a local lab regression only. | NOT RUN |

Use an authorized local/staging build for hardware evaluation; production-domain sessions require explicit G7 authorization. Record the exact canonical manifest/source identity and attached artifact hashes. A claimed PASS must include real observations/recordings or logs from the named device/session. Unavailable device access remains NOT RUN.

MD-01 and MD-02 execution:

1. Load `/`, all public destinations and a direct project link on the physical device with cold cache; repeat five times under the declared desktop/mobile network profile. Confirm useful semantic HTML before world entry.
2. Request world entry, record asset readiness separately from cinematic duration, then exercise skip at every phase and verify settled HOME/acknowledgment. Preserve the specification's readiness/entrance/skip budgets instead of calling every DOM load an entrance result.
3. Rotate portrait/landscape, check320CSS-pixel reflow, zoom and project direct/refresh/Back/Forward navigation. Trigger real monitor, lamp, painting, phone and chair targets; verify DOM equivalents and no ghost IA hit regions.
4. Background/resume the app, then test renderer/context-loss recovery and static fallback. Projects/Contact must remain usable.
5. Keep audio off before opt-in; record actual enabled/muted/autoplay-denied behavior after interaction. Enable reduced motion and confirm complete public/contact/admin DOM usability.
6. Submit only an approved synthetic contact fixture to an authorized test backend; verify accessible validation/errors/receipt and no unapproved real messages. Production contact/backend behavior remains the separate authorized G7 protocol.

Record each result as PASS/FAIL/NOT RUN with measured readiness/cinematic/skip/action times, viewport/zoom, raw frame samples, screenshots/video, defect IDs and evidence hashes. Subjective smoothness cannot substitute for pacing measurements. Browser model/version must be actual, not an example copied from an older release.

MD-03 through MD-05 execution:

1. Navigate by keyboard or screen-reader gestures from `/`; verify skip link announcement/focus, landmarks, heading hierarchy and reading order.
2. Reach all four approved projects, About, Résumé and Contact without canvas. Confirm CandidateX is absent/unavailable.
3. Exercise Contact labels, error descriptions, focus/error recovery and receipt announcement. Enter/exit world and open/close monitor dialog; confirm focus order/trap/restoration and clear loading/error announcements.
4. Test reduced motion, static fallback and renderer loss while using assistive controls. Public content must remain accessible.
5. Check protected admin login/error controls without treating public navigation as authorization; actual MFA provisioning is separate hosted verification.

Return actual audio/listening observations and keyboard/gesture steps. Axe results may be attached as complementary automated evidence but cannot be labeled a screen-reader emulation PASS or complete WCAG certification.

MD-06 execution:

1. Record physical device, OS/browser, battery, ambient temperature, charger state, viewport/DPR/tier and network profile.
2. Run600seconds continuously in the actual world; exercise a project or environment interaction at least every two minutes.
3. Preserve all raw pacing windows and record median/p95, actual tier changes, battery/temperature, context loss/crash and time to recovery at2/4/6/8/10minutes.
4. Confirm quality adaptation preserves explicit preference/interaction/public access; test static continuation when the renderer cannot recover.

No ten-minute thermal PASS follows from a 60-second desktop Chromium report identifying its actual renderer. The [validation specification](../planning/validation-and-production.md) defines physical/network/frame budgets. The [G7 protocol](../planning/releases/2026-10-02-g7-production-release-protocol.md) governs production evidence and acceptance.

Receipt fields: candidate manifest/sourceCommit; artifact hashes; device/model/OS/browser; tester/date/time; viewport/DPR/tier/network/cache; exact steps and measurements; PASS/FAIL/NOT RUN per item; real artifact paths; unresolved defects; independent reviewer. Maker signature supplies evidence only. GPT Plus #1 adjudicates gates after independent review; G7 stays LOCKED until owner authorization.
