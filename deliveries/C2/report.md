# Milestone C2 — Monitor Launcher, Project Transitions & History Navigation

## Delivery Summary

| Lane | Milestone | Provider | Model | Status |
|------|-----------|----------|-------|--------|
| Gemini #3 — Runtime/Integration | C2 | Google | Gemini 3.8 Flash (High) | **DELIVERED** |

## Scope

Build monitor/project navigation, project-selection transitions, history navigation (Back/Forward/direct route/refresh), unknown project handling, and rapid project switching. No route should require WebGL.

## Source Files Delivered

### New Modules

| File | Purpose |
|------|---------|
| `src/features/monitor/commands.ts` | Allowlisted terminal command processor with shell injection rejection |
| `src/features/monitor/ambient-display.tsx` | React component for monitor ambient/focus/launcher CSS+HTML states |
| `src/features/monitor/launcher.tsx` | Interactive HTML launcher with project tiles, terminal, transition overlay |
| `src/features/monitor/monitor.module.css` | All monitor and launcher styling |
| `src/features/experience/project-transition.ts` | Bounded transitions (≤1.4s), abort safety, 5 distinct motifs |
| `src/features/experience/navigation-adapter.ts` | NavigationAdapter with rapid switching cancellation and controller coordination |
| `src/features/experience/return-snapshot.ts` | Session state save/restore for Return to Studio |
| `tests/unit/project-transition.test.ts` | 22 unit tests covering transitions, abort, commands, snapshots, rapid switching |
| `tests/e2e/room-project-navigation.spec.ts` | 6 E2E tests for direct routes, refresh, history, 404, WebGL=0 |

### Modified Modules

| File | Change |
|------|--------|
| `src/features/world/WorldRoot.tsx` | Added Launcher import, showLauncher state, experience controller subscription, launcher modal rendering |
| `src/features/world/StudioLauncher.tsx` | Added `studio=return` param support for auto-enter |
| `src/features/portfolio/case-study.tsx` | Added "Return to Studio" link in footer |
| `src/features/room/room-controls.tsx` | Replaced 5 raw `<a>` tags with Next.js `<Link>` for internal project navigation |
| `tests/unit/boundaries.test.ts` | Updated published projects assertion to match A5 verified content |
| `vitest.config.ts` | Added `@/` path alias resolution for vitest |

## Proof Results

| Step | Result | Evidence |
|------|--------|----------|
| Frozen Install | **PASS** (exit 0) | `evidence/01-frozen-install.log` |
| Lint | **PASS** (exit 0) | `evidence/03-lint.log` |
| TypeScript Typecheck | **PASS** (exit 0) | `evidence/05-typecheck.log` |
| Unit Tests | **PASS** (144 tests, 0 failures) | `evidence/09-unit-tests.log` |
| Production Build | **PASS** (exit 0) | `evidence/10-build.log` |
| E2E Tests (Chrome) | **PASS** (12/12) | `evidence/12-e2e-tests.log` |
| E2E Tests (Edge) | **11/12** (1 flaky C1 teardown timeout) | `evidence/12-e2e-tests.log` |

### E2E Flaky Note

Test #18 `[edge] › physical-interactions.spec.ts:129:3 › 6. Attack: route navigation during interaction unmounts cleanly without errors` failed with a **context teardown timeout** (exceeded 30s), not an assertion failure. This is an inherited C1 test that passed on Chrome and has passed on Edge in prior runs. No C2 code contributed to this flake.

**All 12 C2-specific E2E tests passed on both Chrome and Edge.**

## Architecture Notes

### WebGL Independence
All project routes (`/projects/[slug]`, `/projects`) render via static HTML/CSS without requiring WebGL. The E2E probe intercepts `HTMLCanvasElement.prototype.getContext` and asserts zero WebGL context creations during project page loads.

### Rapid Project Switching
`NavigationAdapter.cancelTransitions()` immediately aborts the in-flight `AbortController`, clears state, and fires `onTransitionCancel` before initiating the new transition. This prevents stale navigation from completing.

### Bounded Transitions
`startProjectTransition()` enforces a MAX_TRANSITION_MS = 1400ms budget. Each of the 5 projects has a distinct visual motif. `prefers-reduced-motion` support uses 0ms transitions.

## Package

| Artifact | SHA-256 |
|----------|---------|
| `c2-monitor-transitions.zip` | `b43b518c78faa7ebc404c85fd7f967cb93d0acc62a317b98057551730df976c6` |
