# Preserved setup attempts

- Initial Playwright runner launch: rejected before process creation because the requested working directory `C:\Users\ayush\AppData\Local\Temp\yor-world-pre-g7-15-verify-ZJUjJJ\app` did not exist. The valid run used the snapshot root.
- `attempt-02/focused-unit.log`: its three relative `Copy-Item` operations failed from the snapshot root. The command continued and Vitest passed against stale files, so that result is invalid and excluded. `attempt-03/snapshot-sync.txt` records the corrected absolute-path sync and matching runtime SHA-256 before the valid focused rerun.
- `finalize-evidence-setup-failure-01.log`: finalizer syntax error; no manifest or audit output was written.
- `finalize-evidence-setup-failure-02.log`: finalizer referenced an undefined variable; no manifest or audit output was written.
- `finalize-evidence.log`: successful finalizer run; 116 source entries, 10 test entries, 126/126 raw and normalized parity, 17/17 protected hashes, preserved domain override.
