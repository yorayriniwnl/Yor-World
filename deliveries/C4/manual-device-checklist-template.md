# YOR WORLD Manual Hardware & Assistive Device Verification Template

**Candidate Target:** `v1.0.0-rc2`  
**Purpose:** Standardized protocol and verification receipt template for non-automated physical device tests, screen reader audio sessions, and sustained thermal stress runs required before production acceptance.  
**Governance Invariant:** **Do not fabricate results.** Any test not executed on physical hardware must be honestly marked **NOT RUN**.

---

## 1. Physical Device & Environment Test Matrix

| ID | Test Category | Target Platform / Hardware | Automated / Emulated Status | Physical Hardware Status | Requirement IDs |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **MD-01** | Mobile iOS Safari | Apple iPhone 15 Pro (iOS 17+) | **EMULATED PASS** (Chromium 390×844) | **NOT RUN** | P05, P06, P08 |
| **MD-02** | Mobile Android Chrome | Google Pixel 8 (Android 14+) | **EMULATED PASS** (Chromium 390×844) | **NOT RUN** | P05, P06, P08 |
| **MD-03** | Desktop Screen Reader | NVDA 2024.1+ on Windows 11 | **EMULATED PASS** (Axe-core automated) | **NOT RUN** | P05 |
| **MD-04** | Apple Screen Reader | VoiceOver on iOS 17+ / macOS | **EMULATED PASS** (Axe-core automated) | **NOT RUN** | P05 |
| **MD-05** | Android Screen Reader | TalkBack 14+ on Android 14 | **EMULATED PASS** (Axe-core automated) | **NOT RUN** | P05 |
| **MD-06** | Mobile Thermal Run | Physical Mobile Sustained 10m | **EMULATED PASS** (60s active benchmark) | **NOT RUN** | P07 |

---

## 2. Protocol MD-01: Physical iPhone 15 Pro / Safari

### Device Metadata
- **Hardware Model:** `[e.g. iPhone 15 Pro A3101]`
- **OS Version:** `[e.g. iOS 17.5.1]`
- **Browser:** `[e.g. Mobile Safari 17.5]`
- **Tester Identity:** `[Name / Account]`
- **Date & Time:** `[YYYY-MM-DDTHH:mm:ssZ]`

### Execution Steps
1. Navigate directly to staging URL on physical Safari.
2. Verify initial loading indicator appears and settles within $\le 8.0\text{s}$.
3. Rotate device between portrait ($390\times 844$) and landscape ($844\times 390$). Confirm zero horizontal overflow and immediate canvas aspect ratio adjustment.
4. Tap interactive elements: monitor, lamp, painting, chair. Confirm touch targets respond without zoom delay.
5. Trigger Audio switch: verify explicit audio permission prompt and no audio plays before tap.

### Observed Results
- [ ] Direct load & settle time: `____ ms` (Threshold: $\le 8000\text{ms}$)
- [ ] Viewport rotation reflow: `[PASS / FAIL]`
- [ ] Touch responsiveness & hit zones: `[PASS / FAIL]`
- [ ] Audio opt-in compliance: `[PASS / FAIL]`
- **Overall Status:** `[PASS / FAIL / NOT RUN]`

---

## 3. Protocol MD-02: Physical Google Pixel 8 / Android Chrome

### Device Metadata
- **Hardware Model:** `[e.g. Google Pixel 8]`
- **OS Version:** `[e.g. Android 14, Build UP1A]`
- **Browser:** `[e.g. Chrome Mobile 126.0]`
- **Tester Identity:** `[Name / Account]`
- **Date & Time:** `[YYYY-MM-DDTHH:mm:ssZ]`

### Execution Steps
1. Navigate to staging URL in Chrome for Android.
2. Test touch tap, drag, and fast multi-touch interaction.
3. Simulate incoming phone call or backgrounding app for 15 seconds. Reopen browser and confirm WebGL context resumes cleanly without white screen.
4. Open project modal from studio monitor; verify back button returns to room.

### Observed Results
- [ ] Context resume after backgrounding: `[PASS / FAIL]`
- [ ] Hardware gesture / back navigation: `[PASS / FAIL]`
- [ ] Frame rate subjective pacing: `[PASS / FAIL]`
- **Overall Status:** `[PASS / FAIL / NOT RUN]`

---

## 4. Protocol MD-03: NVDA Audio Listening Session (Windows)

### Environment Metadata
- **Screen Reader:** `[NVDA version 2024.x]`
- **Browser:** `[Edge / Chrome on Windows 11]`
- **Speech Engine:** `[e.g. Windows OneCore / Eloquence]`
- **Tester Identity:** `[Name / Account]`

### Execution Steps
1. Start NVDA. Load `/` with keyboard only (`Ctrl+L`, type URL, `Enter`).
2. Tab once: verify "Skip to main content" link is announced immediately.
3. Press `Enter` on skip link: verify focus moves to main content landmark.
4. Press `H` to cycle headings: verify hierarchical order (`h1` -> `h2` -> `h3`).
5. Open `/projects`: verify all 4 published projects are announced with accessible names.

### Observed Results
- [ ] Skip link speech announcement: `[PASS / FAIL]`
- [ ] Heading hierarchy speech flow: `[PASS / FAIL]`
- [ ] Modal focus trapping announcement: `[PASS / FAIL]`
- **Overall Status:** `[PASS / FAIL / NOT RUN]`

---

## 5. Protocol MD-04: VoiceOver Audio Listening Session (Apple)

### Environment Metadata
- **Device / OS:** `[macOS Sonoma / iOS 17]`
- **Browser:** `[Safari 17+]`
- **Tester Identity:** `[Name / Account]`

### Execution Steps
1. Enable VoiceOver (`Cmd+F5` or triple-click side button on iOS).
2. Use rotor to navigate Landmarks, Headings, and Form controls.
3. Access contact form (`/contact`): verify form input error states are announced via `aria-describedby` or `aria-invalid`.

### Observed Results
- [ ] Rotor landmark recognition: `[PASS / FAIL]`
- [ ] Form input error speech: `[PASS / FAIL]`
- **Overall Status:** `[PASS / FAIL / NOT RUN]`

---

## 6. Protocol MD-05: TalkBack Audio Session (Android)

### Environment Metadata
- **Device / OS:** `[Android 14 on Pixel]`
- **Screen Reader:** `[Google TalkBack 14.x]`
- **Tester Identity:** `[Name / Account]`

### Execution Steps
1. Enable TalkBack. Swipe right to cycle through interactive elements.
2. Verify 3D room canvas provides accessible fallback description or controls.
3. Verify project case study reading order is linear and logical.

### Observed Results
- [ ] Linear reading order: `[PASS / FAIL]`
- [ ] Canvas accessible text announcement: `[PASS / FAIL]`
- **Overall Status:** `[PASS / FAIL / NOT RUN]`

---

## 7. Protocol MD-06: 10-Minute Physical Mobile Sustained / Thermal Run

### Environment Metadata
- **Device Model:** `[e.g. iPhone 15 Pro / Pixel 8]`
- **Battery Initial:** `[____ %]` | **Battery Final:** `[____ %]`
- **Ambient Temp:** `[____ °C]`
- **Tester Identity:** `[Name / Account]`

### Execution Steps
1. Launch 3D room on physical device on battery power (unplugged from charger).
2. Keep session active in `home-desktop` or `home-mobile` mode for 10 continuous minutes (600 seconds).
3. Every 2 minutes, perform a camera transition or interaction.
4. Observe whether device displays thermal warnings, drops below 30 FPS, or experiences WebGL context loss.

### Observed Results
- [ ] 02:00 mark: Frame pacing `____ FPS` | Battery `____ %`
- [ ] 04:00 mark: Frame pacing `____ FPS` | Battery `____ %`
- [ ] 06:00 mark: Frame pacing `____ FPS` | Battery `____ %`
- [ ] 08:00 mark: Frame pacing `____ FPS` | Battery `____ %`
- [ ] 10:00 mark: Frame pacing `____ FPS` | Battery `____ %`
- [ ] Thermal throttling detected: `[YES / NO]`
- [ ] Memory crash / context loss: `[YES / NO]`
- **Overall Status:** `[PASS / FAIL / NOT RUN]`

---

## 8. Verification Signoff Block

| Role | Name | Organization | Signature / Verdict | Date |
| :--- | :--- | :--- | :--- | :--- |
| **Physical Hardware Tester** | `[Unassigned]` | `[Hardware QA Lab]` | `NOT RUN (Gate G6 Staging)` | `[Pending]` |
| **Assistive Technology Specialist** | `[Unassigned]` | `[Accessibility QA]` | `NOT RUN (Gate G6 Staging)` | `[Pending]` |
| **Acceptance Authority** | Parent Codex | GPT Plus #1 | `[Gate Ruling Decision]` | `[Pending]` |
