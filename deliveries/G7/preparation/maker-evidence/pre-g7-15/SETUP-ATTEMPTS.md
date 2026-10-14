# Preserved setup attempts

- Initial Playwright runner launch: rejected before process creation because the requested working directory `C:\Users\ayush\AppData\Local\Temp\yor-world-pre-g7-15-verify-ZJUjJJ\app` did not exist. The valid run used the snapshot root.
- `attempt-02/focused-unit.log` was recovered from the physical snapshot and archived byte-for-byte with `attempt-02/receipt-provenance.json`. It records 14/14, but is invalid and excluded because the run followed three failed relative `Copy-Item` attempts and used stale source. The archived test log contains the npm warning and Vitest receipt; the preceding `Copy-Item` error text was not retained. `attempt-03/snapshot-sync.txt` records the corrected absolute-path sync and matching runtime SHA-256 before the valid focused rerun.
- `finalize-evidence-setup-failure-01.log`: finalizer syntax error; no manifest or audit output was written.
- `finalize-evidence-setup-failure-02.log`: finalizer referenced an undefined variable; no manifest or audit output was written.
- `finalize-evidence-setup-failure-03.log`: finalizer expected the source-only commit at `HEAD`; it failed before writing outputs. The corrected helper uses the pinned source commit explicitly.
- `finalize-evidence.log`: successful finalizer run; 116 source entries, 10 test entries, 126/126 raw and normalized parity, 17/17 protected hashes, preserved domain override.
