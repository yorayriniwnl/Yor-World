# R7 writer corrections - implementation evidence

This implementation closes the three locally reproduced writer defects from `attempt-20261012-r7-writer-isolation-01`. It is maker work and self-test evidence only; it is not the assigned GPT Plus #2 delta audit or Parent acceptance.

Source base: branch `fix/local-studio-check`, parent HEAD `e75109a680454576601419e31d571463ad9167f1`, dirty maker worktree. The nine release-tool implementation/config/test inputs are captured byte-for-byte under `source-snapshot/` and bound by `source-hashes.json`.

## Changes

- Bundle building now verifies that both archive and receipt destinations are unoccupied before bundle computation. Path and archive/receipt identity collisions are still checked first, and final writes remain exclusive. Occupied archive and receipt regressions prove the writer rejects before creating either output.
- Attempt reservation now creates each missing parent beneath the already validated prefix. Regression cases cover first missing indices 0, 1 and 2, including the R7 layout where `deliveries/G7` already exists.
- Package assembly writes immutable `package-commands-and-exit-codes.md`, `package-inventory-omissions.json` and `package-SHA256SUMS.txt`. The post-validation inventory writes the canonical command table, omissions file and checksum list once, and includes the preserved package snapshot. Staged `source-binding.json` is now correctly treated as present during its own package manifest preflight.

## Verification

- Full release suite: **121/121 passed**, exit 0. Raw output: `release-tests.log`.
- Assembler syntax: `python -B -m py_compile deliveries/G7/preparation/tools/assemble-evidence.py`, exit 0; receipt: `python-compile.txt`.
- Whitespace check: `git diff --check` over the scoped release-tool paths, exit 0; receipt: `diff-check.txt`.
- Targeted sequential package/final-inventory test proves package files are byte-identical after final inventory, all package artifacts appear in the final checksum, and a repeated final pass fails without changing outputs.

No candidate driver, actual RC6 R7 package, app browser/build, hosted-provider/deployment probe or G7 release run was performed. The candidate still requires independent GPT Plus #2 delta review and separate Parent acceptance before a real R7 execution.
