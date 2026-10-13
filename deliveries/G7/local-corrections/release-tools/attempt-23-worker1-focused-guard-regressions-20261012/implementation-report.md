# Worker 1 focused release-guard regressions

Date: 2026-10-12

## Result

- **PASS, worktree-only:** latest focused release suite, 102/102 tests; raw log is `focused-release-tests-after-unused-check.log`, exit code `0`. This is not clean-checkout or CI evidence.
- **PASS:** candidate-driver append export now refuses nonempty source execution logs that do not end in LF. The regression covers first export and append after a previously valid log, plus a partial target, divergence, exact-copy behavior, safe append and an exclusive-create race.
- **PASS:** phase tests reject wrong source, wrong delivery root, missing primary receipt, divergent copies, wrong phase and non-PASS receipts. They accept only matching detached and primary receipts, then check the next phase prerequisite. Existing tests also prove a partial delivery root and interrupted phase cannot be resumed in place.
- **PASS:** acceptance-label regressions reject `NOT ACCEPTED / ACCEPTED`; explicit `G7 NOT ACCEPTED` passes for a pending G7 disposition, while the existing neutral `AUTHORIZED / PREPARATION` label remains valid. G7 claim parsing uses the negative-claim flag to distinguish a negative-only or neutral pending label from a mixed claim. Legitimate accepted and pending source labels continue to pass their valid fixtures.
- **PASS:** reserve-attempt receipt re-write is exclusive and preserves original bytes; existing tests cover raw-directory collisions, aliases, artifact exclusivity and safe parent creation.
- **PASS:** the synthetic orphan-GLB test starts with a valid inventory built from the active candidate policy and rejects only the added orphan.
- **OPEN GATE (expected):** live inventory still rejects the unadmitted asset `app/public/models/world-art-local-corrections-20261009-r1/fixture-production.ce05bcbd0033b685b1cdb91fa1591fd366653fc7fd6d7409c1a4efacb508c1fe.glb`, SHA-256 `ce05bcbd0033b685b1cdb91fa1591fd366653fc7fd6d7409c1a4efacb508c1fe`. The strict guard and candidate bindings remain unchanged. Raw probe is `live-asset-inventory.log`, exit code `1`.
- **NOT RUN:** R7, shared build, browser/provider/native checks, PostgreSQL provisioning, production writes.

The initial focused run is retained at `attempt-21-worker1-focused-guard-regressions-20261012/`. The exact-mismatch assertion run is retained at `attempt-22-worker1-focused-guard-regressions-20261012/`; it recorded a test-harness mistake (`assert.throws()` was treated as returning the exception). An intermediate G7 positive-label check used a partial fixture and failed on unrelated missing Git/docs/ruling inputs; that log is `g7-negative-label-tests.log`. The corrected cloned-repository fixture passed 31/31 in `g7-negative-label-tests-retry.log`. The latest full run is in this attempt directory.

## Evidence boundary and separate inventory regressions

The focused tests ran against the inspected dirty worktree. At test time, `app/public/asset-manifest.json` had raw SHA-256 `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`. The committed `HEAD` blob content has SHA-256 `2f846c6ddf5c0a1cb1f85b31c4dbf27a4400d8aca4f0f6009374d3f38e401027` (Git blob object ID `b22b75fad28d85c538ecef305a5284fad591ac1d`). Thus 102/102 is evidence for this inspected worktree only; it does not establish a clean-checkout or CI result. The manifest is art-owned and was not changed by this worker; candidate policy and asset bindings were also left unchanged.

Earlier, separately recorded broad runs in `../attempt-20-worker1-current-release-regression-20261012/` exercised the same dirty-manifest inventory gate:

- Full release regression: **119/121 PASS, 2 FAIL**, exit 1. Both failures are the live versioned-asset inventory checks. Raw output: `../attempt-20-worker1-current-release-regression-20261012/full-release-regression.log`.
- App contracts/cache regression: **57/59 PASS, 2 FAIL**, exit 1. The inventory sees 21 public GLBs versus 15 frozen cache paths and 12 R1 GLBs versus six manifest URLs. Raw output: `../attempt-20-worker1-current-release-regression-20261012/app-cache-contract.log`.

These broader failures remain open and are distinct from the focused 102/102 worktree-only run. The strict live inventory guard remains in place.

## Commands and raw outcomes

Focused command:

```powershell
node --test scripts/release/tests/policy-output.test.mjs scripts/release/tests/reserve-attempt.test.mjs scripts/release/tests/current-status.test.mjs scripts/release/tests/status-check.test.mjs scripts/release/tests/asset-manifest-validation.test.mjs
```

Latest outcome after the unused-variable cleanup: `tests 102`, `pass 102`, `fail 0`, `exit 0`. Full stdout is `focused-release-tests-after-unused-check.log`; raw exit is `focused-release-tests-after-unused-check.exit-code.txt`. The targeted status-label command passed `31/31`, recorded in `g7-negative-label-tests-retry.log`.

Live inventory probe:

```powershell
node --input-type=module -e "import('./scripts/release/release-lib.mjs').then(({assetFiles}) => { try { assetFiles(); console.log('PASS live asset inventory'); } catch (error) { console.error(error.message); process.exitCode = 1; } })"
```

Outcome: expected `exit 1`, with the exact out-of-freeze path and digest above. Full raw output is `live-asset-inventory.log`; raw exit is `live-asset-inventory.exit-code.txt`.

Scoped syntax checks **PASS**: `node --check` for all six changed `.mjs` checker/test paths and Python AST parse of `candidate-driver.py`; see `syntax-check-after-unused-check.log` (exit `0`). Scoped ESLint **PASS**, exit `0`, using the installed app ESLint config on the six `.mjs` paths; it emitted the config warning that React version detection found no installed `react` package and assumed the latest version. Raw output is `scoped-eslint-after-unused-check.log`. `git diff --check` on the owned tracked source/test paths returned `0`. No files are staged. Parent retains Git and owns commits/pushes.

## Exact changed source paths and SHA-256

| Path | SHA-256 |
|---|---|
| `deliveries/G7/preparation/tools/candidate-driver.py` | `b61efb21e08f3d5de57c1c264aeb03dd1061f7d9793744731d9bcaee8aa12955` |
| `scripts/release/check-current-status.mjs` | `b4c5ede3d430a200e8859391a094cbf9dbf21d0a953bbd01ac23c52a62c8969e` |
| `scripts/release/tests/policy-output.test.mjs` | `0bc120d35f235341ef2899a0f2b33fa520eecf5c4f2d62c03ee36404c036c43c` |
| `scripts/release/tests/current-status.test.mjs` | `ee30caf62555ce4f151213983fe0387bf6b29b3bd07ca95e5b84221826c12769` |
| `scripts/release/tests/status-check.test.mjs` | `7e7225b1c52213fcee5604af88c309dd700330f45d10a0b62e184725ef1d5ea8` |
| `scripts/release/tests/reserve-attempt.test.mjs` | `d47dec246ba8e3567d61bbcdd39908a10cb6d164554e655c354301336e7701768` |
| `scripts/release/tests/asset-manifest-validation.test.mjs` | `d7e5f5f6fd522dc44eef1bfb971a6d699d2c5c49f35aa4fe93c8bfd7a9900b19` |

Earlier 99-test log SHA-256: `d547486e20cdc9988c4cfb540bf9f705867de053252bd4240c8836fd55cdb8fd`. Prior 102-test log SHA-256: `1489177f7a3092fb7d6f1d1f9a46275bf3fb4a04f14c397b0489da6730d9b5b7`. Latest 102-test log SHA-256: `f4d75237775f6f7b77ed65e5a5a6a89191002954c2b9ee666ebdb84642c35c36`. Targeted 31-test G7/current-label log SHA-256: `7f019f54484d5a243db5f32200697db85dc9e026a032ab5a2e19c4eab2e42ca8`. Syntax log SHA-256: `5d0266ef280110594ee453a3280eb5d0e9d31d2c43e83f35a2e02fa5568eadff`. Scoped ESLint log SHA-256: `394fc5dac606ede8950cc61d162898af7a567c45979949882422fec754e03f16`.

