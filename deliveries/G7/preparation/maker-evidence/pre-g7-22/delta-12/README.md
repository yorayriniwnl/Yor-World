# PRE-G7-22 Delta 12 Evidence

- Source commit: `500d10fa5901be48d4ff877e608d65ba0e271bb9`
- App tree: `ba0b709192367e1d12a796618f97801a8fcd5a70`

## Results

- Integration suite: **PASS**, twice consecutively; 286 tests in 27 files per run.
- Instrumented production build: **PASS** with `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1`.
- Browser composition and controls: **PASS**, 6/6 on Chrome and Edge. The run covers desktop, phone, compact 320-pixel width, and short landscape layouts.
- Source and `yorayriniwnl.in` mirror: **PASS**, 116 source files and 9 test files; zero normalized-content or Git-blob mismatches.
- Renderer-call budgets: **FAIL**. Desktop measured 412 calls against 120; emulated mobile measured 400 against 80. Triangle counts are within their recorded budgets: desktop 28,736/300,000 and mobile 28,592/140,000.

The browser run records viewport diagnostics on this machine; it does not establish physical-device performance or thermal behavior. The reference comparison screenshots and raw measurements are in `visual-run/`. The implementation improves the room composition and interaction, while the rendered room still has a substantial visual-detail gap from the supplied main reference.

Formal acceptance remains pending an independent exact-commit audit and parent acceptance. No deployment was performed.
