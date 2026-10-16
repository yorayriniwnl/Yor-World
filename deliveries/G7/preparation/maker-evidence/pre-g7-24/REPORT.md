# PRE-G7-24 renderer candidate

**Result: FAIL / unaccepted.** The candidate reaches the draw-call ceilings in every recorded browser/viewport capture, but the same-tier desktop and mobile images fail visual parity by a wide margin. Do not treat this source as accepted or deployable. The required follow-up is a separately bound correction.

## Source and evidence binding

- Candidate source commit: `017bead7813d5ea9875b8789621b93b8a8cd00ce`
- Candidate app tree: `b28bf52127947dce6ad9e032d1fd0ffd2577fb47`
- Frozen input source commit: `26e87c8cd41f2745d165a74446ae1366f17f7bc1`
- Frozen input app tree: `ab95dafb3276c91ee9097d4f99a313e79c7da7e3`
- The current `app/` checkout matches the candidate commit. Five changed canonical source/test blobs match their five domain mirror blobs. The production room GLB is unchanged at SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`.
- The full unit, lint, typecheck, and production-build checks ran immediately before the source commit; the bound app tree is byte-identical to the committed tree. Focused batching tests, the final E2E, and both final integration runs were executed after the source commit.
- The source mirror contains 116 application files and 10 scoped test files, with zero Git blob or normalized-content mismatches. See [`source-binding.json`](source/source-binding.json), [`mirror-parity-audit.json`](source/mirror-parity-audit.json), and the [domain source manifest](../../../../../yorayriniwnl.in/source-delivery-manifest.json).

## Renderer measurements

The frozen source and candidate were built with `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` and run through the unchanged composition E2E on Node 24.19.0 / pnpm 9.15.9. All eight candidate captures report 56 calls. Triangle counts are 28,736 at 1440×900, 28,592 at 390×844, and 28,760 at 320×600 and 844×390; all are below their ceilings.

| Viewport | Browser | Frozen tier / calls | Candidate tier / calls | Call ceiling | Candidate calls |
|---|---|---:|---:|---:|---|
| 1440×900 | Chrome | medium / 226 | medium / 56 | 120 | PASS |
| 1440×900 | Edge | high / 226 | medium / 56 | 120 | PASS; tiers differ |
| 390×844 | Chrome | medium / 212 | medium / 56 | 80 | PASS |
| 390×844 | Edge | medium / 212 | medium / 56 | 80 | PASS |
| 320×600 | Chrome | medium / 226 | medium / 56 | 80 | PASS |
| 320×600 | Edge | medium / 226 | medium / 56 | 80 | PASS |
| 844×390 | Chrome | high / 226 | high / 56 | 120 | PASS |
| 844×390 | Edge | high / 226 | high / 56 | 120 | PASS |

Edge 1440×900 is not a same-tier comparison. The required Chrome desktop and mobile pairs both use the same medium tier and browser renderer before and after:

| Same-tier pair | Calls before → after | Mean absolute channel difference | Pixels differing by >4 channel values |
|---|---:|---:|---:|
| Chrome 1440×900 | 226 → 56 | 24.174 | 90.9508% |
| Chrome 390×844 | 212 → 56 | 40.218 | 88.0183% |

The candidate loses much of the pink and cyan light spill on the wall and floor. The mobile backdrop changes from the baseline's pale pink/cyan gradient to a flat blue field. Geometry remains present, but the scene does not preserve its material and lighting appearance. See the [`side-by-side images`](visual-parity/) and [`pixel-parity.json`](visual-parity/pixel-parity.json). The captured baseline and candidate screenshots are under [`baseline-26e87/visual-run/`](baseline-26e87/visual-run/) and [`visual-run/`](visual-run/).

The exact-source composition E2E passed 6/6 Playwright assertions. Its per-viewport measurements are in the same evidence directory; the visual failure comes from the pixel comparison, not a failed navigation or missing capture.

## Check results

| Check | Result | Evidence |
|---|---|---|
| Focused batching tests on the committed source | PASS, 49 tests | [`focused-source-final`](commands/focused-source-final.receipt.json) |
| Full unit suite | PASS, 27 files / 332 tests | [`unit-full-01`](commands/unit-full-01.receipt.json) |
| Lint | PASS | [`lint-01`](commands/lint-01.receipt.json) |
| Typecheck | PASS | [`typecheck-03`](commands/typecheck-03.receipt.json) |
| Production build with evidence flag | PASS | [`build-01`](commands/build-01.receipt.json) |
| Consecutive integration run 1 | PASS, 27 files / 287 tests | [`integration-final-01`](commands/integration-final-01.receipt.json) |
| Consecutive integration run 2 | PASS, 27 files / 287 tests | [`integration-final-02`](commands/integration-final-02.receipt.json) |
| Exact-source composition E2E | PASS, 6/6 assertions; 8/8 call captures within ceilings | [`visual-e2e-final`](commands/visual-e2e-final.receipt.json) |
| Baseline composition E2E | PASS, 6/6 assertions; baseline calls exceed ceilings | [`baseline-e2e`](commands/baseline-e2e.receipt.json) |
| Performance suite | FAIL, 4/6 tests | [`performance-final`](commands/performance-final.receipt.json) |
| Same-tier image parity | FAIL | [`pixel-parity.json`](visual-parity/pixel-parity.json) |
| Physical devices, screen readers, service/provider checks, deployment, independent audit, parent acceptance | NOT RUN | Outside this local renderer packet; no acceptance is claimed |

The performance suite's two failing tests cannot reach their active-route checks: both call `selectOption("low")` while the existing Studio controls drawer is closed, so `quality-tier-select` remains hidden until the 180-second test timeout. The captured error contexts and full stdout/stderr are preserved. An earlier performance attempt has the same failure in [`performance-suite-01`](commands/performance-suite-01.receipt.json); neither run's timeout or filters were changed.

## Preserved attempts and next action

The first focused batching run failed on an animation clip endpoint; the corrected focused run passed. The first typecheck failed on two type casts; later typechecks passed. Their receipts remain in `commands/`. The first baseline install invocation passed an extra `--` before `install` and was rejected by pnpm; the corrected offline frozen-lockfile install passed in [`baseline-install-02`](commands/baseline-install-02.receipt.json). The baseline worktree was retried at a shorter path after Windows rejected an earlier long path. The first mirror-manifest audit exceeded Node's default Git output buffer; the final generator uses a larger buffer and reports PASS.

PRE-G7-24 is not accepted. The next packet should correct the material/light mismatch while preserving the measured call reduction and unchanged render ceilings. It should also repair the performance test's closed-drawer setup, then bind fresh evidence to a new source commit. No deployment or G7 acceptance follows from these local results.
