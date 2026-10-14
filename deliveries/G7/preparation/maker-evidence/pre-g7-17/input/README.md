# PRE-G7-17 input receipts

The authorizing packet and named PRE-G7-15/PRE-G7-16 diagnostic inputs below were read directly and archived byte-for-byte before PRE-G7-17 test runs. Archived-file byte counts and SHA-256 values were measured after copying.

| Archived file | Original source | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `pre-g7-17-authorizing-packet.md` | `C:/Users/ayush/COddexxxxxxxxxxxxxxxx-parent-pre-g7-13/docs/planning/reconciliation-packets/2026-10-15-pre-g7-17-unit-and-final-suite-gate.md` | 5728 | `b405e1b621e6caaf8056047e0f347345459b9841e76c671b88d7375c3692a51d` |
| `pre-g7-15-isolated-canonical-fixture.log` | `_worktrees/pre-g7-16/.../input/pre-g7-15-isolated-canonical-fixture.log` | 1506 | `d2c90cbfa53707c84e5ef47a90cc44f363619ccf064189bf629cb7ccde6aefc1` |
| `pre-g7-15-attempt-03-full-integration.log` | `_worktrees/pre-g7-16/.../input/pre-g7-15-attempt-03-full-integration.log` | 4204 | `2fc5695bf63357102b8699f38d38bdcc94f66447304d669f0a507b59bff45b2f` |
| `pre-g7-15-attempt-04-full-integration-retry.log` | `_worktrees/pre-g7-16/.../input/pre-g7-15-attempt-04-full-integration-retry.log` | 4204 | `3038e915f39bed101055d65ba1b613e5756004cc06db410aeac050d4ee2ec08a` |
| `REPORT.md` | `_worktrees/pre-g7-16/.../pre-g7-16/REPORT.md` | 6522 | `850e5ce9eb87f47968e9cfdaa7101e9f414a659001d8351e75010f4064bf66c2` |
| `attempt-03--unit-suite.log` | `_worktrees/pre-g7-16/.../attempt-03/unit-suite.log` | 4364 | `e762d7c5b979daa106e34c15fd1a8b8ecdf66bb642e63e4fc2aa41ba2490361a` |
| `attempt-03--focused-boundaries.log` | `_worktrees/pre-g7-16/.../attempt-03/focused-boundaries.log` | 1596 | `86f695558ceeaf0cc9a5a94e767c7c641dbff5e3d64dae5e6ed1b6eaeb3b7e07` |
| `attempt-03--default-integration.log` | `_worktrees/pre-g7-16/.../attempt-03/default-integration.log` | 2304 | `5e750e42a318e95a930089df70ca2f714ee4cf3422bdba9fae9e4c964b370e25` |
| `attempt-01--diagnostic-full-integration.log` | `_worktrees/pre-g7-16/.../attempt-01/diagnostic-full-integration.log` | 22462 | `4b5d5d698072cfeb81d05509ec4a8fd6d74e7f4f06f6cee64d333d263c5fd4cb` |
| `attempt-02--unintended-full-suite-with-focus-args.log` | `_worktrees/pre-g7-16/.../attempt-02/unintended-full-suite-with-focus-args.log` | 20170 | `c7ba75feb04938dd23891c55c932f6e6c14fd7761c5c001c8b0d793e1dc97025` |
| `attempt-03--pre-run-idle-and-snapshot-check.txt` | `_worktrees/pre-g7-16/.../attempt-03/pre-run-idle-and-snapshot-check.txt` | 1069 | `64f0fab4151780a88b2003b2cf9d575896351b0d59859f0b77b09b102a42066a` |
| `attempt-03--final-process-idle-check.txt` | `_worktrees/pre-g7-16/.../attempt-03/final-process-idle-check.txt` | 236 | `07b264109c56e21cd5bdf33332b3660d47c177d0d34b623e440e81fe5ae04210` |

PRE-G7-15 isolated fixture passed 1/1 in 51.36 s; its two default integration attempts each failed 285/286 when the canonical fixture exceeded the unchanged 60,000 ms timeout. PRE-G7-16 attempt-01 and attempt-02 are separate failed integration diagnostics. PRE-G7-16 attempt-03 default integration passed 286/286. Its full unit suite failed 326/327 when `tests/unit/boundaries.test.ts` exceeded the unchanged 5,000 ms timeout (body 9.154 s); the focused boundary test passed 18/18 in 15.36 s.

Frozen install receipt: `../setup/pinned-install.log`, SHA-256 `84697b94d42f34fcefe54f49bcb12104297f0c07284b6735846818243bd3b00d`; exact install command exited 0 after 2m47s using Node 24.19.0 and pnpm 9.15.9.
