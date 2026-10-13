# Performance spec lint follow-up — 2026-10-11

Scope: address the zero-warning lint failure in `app/tests/performance/world.spec.ts` reported by the parent freeze lint at `deliveries/G7/local-corrections/coordination/attempt-20261011T-parent-freeze-02/lint.log`.

Changed `expect(frame.renderCalls)` to include `${tier} quality tier exceeded its draw-call ceiling` as the assertion message. The existing draw-call ceiling and every sample assertion remain intact; the previously unused tier now provides actionable failure context.

Changed product path and SHA-256:

- `app/tests/performance/world.spec.ts` — `35E893E81562D5AB7FA7A3AF1B4EA1F3093E31C1510EF77AD3CA9FA4646DB83B`

Validation:

| Check | Result | Evidence |
|---|---|---|
| `pnpm exec eslint tests/performance/world.spec.ts --max-warnings=0` (run from `app/`) | PASS, exit 0 | `eslint.log` |
| Parent combined `pnpm lint` | NOT RUN by this worker; parent owns rerun | Original failure: `../coordination/attempt-20261011T-parent-freeze-02/lint.log` |
| Inclusive-render Playwright performance cases against a coordinated fresh build | NOT RUN | No case result is claimed. `playwright-inclusive-draw.log` preserves startup diagnostics from an isolated invocation that was interrupted after the parent identified the existing `.next` build as unprovenanced. Parent will run the valid check against a fresh coordinated build. |

No build was run. Port 3198 was free before the diagnostic invocation and no listener remained afterward. The existing `.next/BUILD_ID` was present, but its relationship to current source is unknown; it is not used as performance evidence. The invocation log reports test discovery only and contains no completed test result.

No commit was created, per parent instruction.
