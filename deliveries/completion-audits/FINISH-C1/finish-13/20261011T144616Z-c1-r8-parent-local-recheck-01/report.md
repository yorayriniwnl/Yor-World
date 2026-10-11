# FINISH-C1-R8 Parent local recheck

Status: **REWORK for one stale requirement-matrix evidence path. No acceptance.**

This report records a Parent local check of exact C1-R8 commit `c398876583bc337c069414b79364e3fdea745879`, full tree `798de513703f3d7e76f8d82edb85257d32894681`, parent `bebfb2dede7d24d2859c34193cf6a9fda1cf7632`. The maker package's output-hash manifest matches all 22 listed file blobs; the package tree has 23 tracked files including the hash manifest. The local check found one requirement-matrix citation to a log file that is not in the delivery.

The exact-candidate regression suite passed all 9 tests in a detached worktree after reproducing the installed Three.js package bytes and pnpm link from the local checkout. The pinned R7 verifier exited 0 and reported 19/19 direct R6 Git blobs, 8/8 mapped blobs, 2/2 installed Three.js files, 32/32 R5 predecessor Git blobs, and 10/10 R7 output-manifest entries. The prior receipt mismatches remain disclosed and unchanged.

Finding C1-R8-01: the E-02-05 row in `deliveries/FINISH-C1-R8/requirement-matrix.json` cites `evidence/cli-negative-false-pass.log`, which is absent from the committed tree. The exact command, stdout, stderr, parsed FAIL result, exit code, and no-mutation receipt hashes are already in `evidence/cli-negative-false-pass.json`. This is a stale evidence pointer, not a reproduced verifier behavior defect. FINISH-30 assigns the one-file matrix-reference correction to R9.

The check does not close E-01, claim external GPT Plus #2 review, or accept C1-R8. This local recheck was performed in the same local Codex workflow that packaged R8, so it is not represented as an independent auditor's sign-off. Application/runtime/build/browser, native provider, physical-device, deployment, recovery, and G7 checks were not run.

See `findings.json`, `requirement-matrix.json`, and `evidence/` for exact bindings and commands. FINISH-30 is the follow-up packet.
