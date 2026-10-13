# Parent final E2E attempt 09

Result: **FAIL — 245 passed, 3 failed, 0 skipped, 0 flaky** across Chrome and Edge. The complete Playwright JSON is `browser-results.json`; `result-summary.txt` records the three failures and `e2e.exit-code.txt` records `1`.

Build: `TjOyL5PfGLVQ_mBPJvdOa`. Browser backend: isolated synthetic PGlite at the path recorded in `environment.json`; no hosted Supabase or production database was used. Prior `app/test-results` diagnostics were copied to `prior-test-results/` before this run. Current output and screenshots are under `playwright-output/`.

The six required studio viewport/layout cases passed on both browsers. Failures:

1. Saved quality/sound preference test — Chrome and Edge both show the HUD as Sound On after the explicit gesture, while diagnostics `soundEnabled` remains false (test line 191).
2. Actual monitor-mesh dialog/focus test — Chrome's browser session closed while `enterHome` was waiting for the HOME stage; the failure occurred before the mesh interaction. Isolated reproduction remains required.

The sound failures were returned to the runtime/UI maker for correction. The monitor test was also returned for isolated reproduction. This is local browser evidence only, not hosted provider, physical-device, assistive-technology, native-GPU, or external GPT Plus #2 review.

The PowerShell wrapper treated the Next.js `NO_COLOR`/`FORCE_COLOR` stderr warning as a native-command error before it wrote its exit-code file. Playwright itself completed and wrote the full JSON report; the failure status above comes from that report, not the wrapper warning.
