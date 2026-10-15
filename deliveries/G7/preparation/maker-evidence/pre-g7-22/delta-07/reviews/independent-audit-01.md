# Independent audit 01 — PRE-G7-22 source and evidence

Reviewer: separate local read-only reviewer (not the parent acceptance authority)

Reviewed exact commits:

- Source: `7b63604979db4426d334b16f049bd1be3b84f16e`
- Manifest binding: `97fa25769eb46c12347bbc0cb37bc98ec79667cb`
- Evidence: `aed64ba62335bb60cf435a11feb40a0501f1a193`

## Findings

- Candidate identity, pushed branch, narrow six-file source delta, and byte-identical source/mirror pairs: **PASS**.
- Evidence inventory: **PASS**; 641 listed entries matched the exact evidence commit's sizes, SHA-256 values, Git blob IDs, and modes.
- Manifest parity evidence pointer: **FAIL**; it referenced the historical `source/mirror-parity-audit.json` for source `63756c058de7fec92ba9699b327667207fe48488` instead of the candidate report.
- Parity test set: **FAIL**; it omitted `app/tests/integration/runtime/frozen-world-binding.test.ts`, although the mirror pair itself matched by direct hash.
- Recorded checks: **FAIL overall**. Evidence build, unit (327/327), lint, typecheck, and both builds passed. E2E failed 6/6; the initial desktop cyan-floor ratio was 0 against a 0.1 minimum, and later navigations were refused. Integration failed 285/286 in both runs against the then-stale `-0.36` expectation; the source was later corrected to `-0.91` without a passing rerun.
- Exact-run source provenance: **NOT ESTABLISHED**; receipts contain no Git HEAD/tree or dirty-state field and predate the final source commit timestamp.
- iPhone/iPad Safari, Android/TalkBack, Windows/NVDA, Safari/VoiceOver, 10-minute mobile soak, and interactive `chrome://gpu`: **NOT RUN**.

Recommendation: **do not accept**. Open blockers are the E2E failure, unverified integration correction, exact-run provenance gap, and missing physical-device evidence. The first two parity-manifest findings were corrected in binding commit `07204a66cebbcdef353e4b266ff9b430687075e9`; this archived report covers the earlier exact commits above. The corrected candidate still requires independent delta review and parent acceptance.

No files were edited and no tests or device checks were run by the reviewer.