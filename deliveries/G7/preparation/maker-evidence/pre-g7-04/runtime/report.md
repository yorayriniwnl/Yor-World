# PRE-G7-04 runtime maker handoff

Status: READY FOR INDEPENDENT REVIEW. This maker does not accept its own work.
Base: 6e0934e4f7bf390c918132e12fe88e67767933d9. Corrects the unaccepted RC6 successor only.
Input and final working-tree file hashes: file-hashes.json.

Owned changed files:
- app/src/features/world/WorldRuntime.ts
- app/tests/unit/world-runtime-recovery.test.ts

Initialization, visibility resume, and frame continuation now share one scheduling method. It requires an integrated scene, an eligible visible lifecycle, no pause, and no pending frame. Resume during pending loading clears the visibility pause without starting rendering. Initialization schedules its first render on the next RAF rather than rendering synchronously. A callback verifies its pending handle before taking ownership, preventing a canceled callback from taking over a later resume. Hidden completion retains its pause until visibility resumes. Existing lifecycle/session, disposal, quality-tier, connected-canvas, and frame-sampling guards remain in place.

Seven added cases exercise delayed initialization, repeated hide/show and resumes, stale canceled delivery, initially hidden and later hidden completion, disposal and portfolio retirement during loading, failed loading, and replacement retry. Unit tests keep actual scene integration, directors, and lifecycle; GPU and loader timing are adapters.

| Check | Result | Evidence | Command / reason |
| --- | --- | --- | --- |
| Runtime recovery unit tests | PASS, 9/9, exit 0 | unit.log | From app: pnpm exec vitest run --config vitest.config.ts tests/unit/world-runtime-recovery.test.ts |
| Changed-file ESLint | PASS, exit 0 | eslint.log (no diagnostics) | From app: pnpm exec eslint src/features/world/WorldRuntime.ts tests/unit/world-runtime-recovery.test.ts --max-warnings=0 |
| Targeted TypeScript | PASS, exit 0 | typecheck.log (no diagnostics), tsconfig.json | From app: pnpm exec tsc --noEmit --project ../scratch/pre-g7-04-runtime/tsconfig.json |
| Adapted independent probe, base visibility case | FAIL reproduced | loading-visibility-probe.json, probe.log | Two queued callbacks/two renders per tick/one callback retained immediately after disposal at base revision |
| Adapted independent probe, corrected working tree | PASS, both visibility cases, exit 0 | loading-visibility-probe.cjs, loading-visibility-probe.json, probe.log | From repo: node scratch/pre-g7-04-runtime/loading-visibility-probe.cjs; one render loop and zero queued callbacks immediately after disposal |
| Diff whitespace | PASS, exit 0 | diff-check.log (no diagnostics) | git diff --check -- app/src/features/world/WorldRuntime.ts app/tests/unit/world-runtime-recovery.test.ts |
| Full candidate suite/build/browser | NOT RUN | Parent owns frozen-source checks | Targeted checks only under assignment |
| Physical/GPU/production G7 | NOT RUN | No such evidence produced | Deterministic adapters do not establish real browser/GPU/service/device behavior |
| Independent review/acceptance | NOT RUN | Parent assigns separate reviewer | Maker cannot approve itself |

Actual tool versions: Node v24.19.0, pnpm 9.15.9, Vitest v5.0.2 (recorded in unit.log). No dependency install, external account dispatch, provider action, commit, or push performed by maker. Parent scopes commit/push and freezes source. Other workers' paths were present and left untouched.

Initial test execution found missing canvas.style in the new adapter fixture (5 failure cleanup errors, 4 cases passed); the fixture was corrected within the owned test file and the subsequent final execution passed all 9. No unresolved defect observed in targeted checks. Independent review and broader frozen-source validation remain required.
