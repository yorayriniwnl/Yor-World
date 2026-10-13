# Public route return snapshot correction

Status: implementation and focused source checks complete; awaiting parent browser review. This report is evidence for the scoped Worker 3 correction, not acceptance or a G7 claim.

## Finding and correction

The launcher saved room, camera, and preference state before project navigation, but the visible accessible route links (`/projects`, `/about`, `/resume`, `/contact`) navigated directly without saving. The runtime's controller-driven public routes also reached `router.push` without a shared snapshot callback. Returning to the studio through browser Back could therefore lose the room state.

Accessible links now save state for unmodified same-tab clicks. Modified clicks and links targeting another browsing context do not save. Controller-driven public navigation uses the same callback. A case-study path retains its matching project ID; other public routes store `null`.

Added an E2E regression for studio state → accessible About link → browser Back → restored room state. Parent requested that browser/E2E execution remain centralized, so this spec is intentionally unrun here.

## Exact paths

- `app/src/features/portfolio/accessibility-controls.tsx`
- `app/src/features/world/WorldRoot.tsx`
- `app/tests/e2e/local-studio-usability.spec.ts`

## Checks

Commands run from `app/`:

- `pnpm exec vitest run --config vitest.config.ts tests/unit/return-storage-and-audio.test.ts tests/unit/project-transition.test.ts` — PASS, 2 files / 30 tests.
- `pnpm exec tsc --noEmit` — PASS, exit 0, no diagnostics.

Command run from the worktree root:

- `git diff --check -- app/src/features/portfolio/accessibility-controls.tsx app/src/features/world/WorldRoot.tsx app/tests/e2e/local-studio-usability.spec.ts` — PASS, exit 0; Git printed CRLF normalization notices for the latter two existing CRLF files.

E2E/browser, shared build, and visual review — NOT RUN by this worker, per parent coordination.

Raw logs and exit files are in this directory: `unit.log`, `unit.exit-code.txt`, `unit.command.txt`, `typecheck.log`, `typecheck.exit-code.txt`, `typecheck.command.txt`, `diff-check.log`, and `diff-check.exit-code.txt`.

## Hashes

SHA-256 of current full working-copy files (these include earlier Worker 3 work in the same dirty files):

- `app/src/features/portfolio/accessibility-controls.tsx` — `7e8e216765806406eadfa8126669356f7d47c085be64ce0f7edaffc6458ec977` (4034 bytes)
- `app/src/features/world/WorldRoot.tsx` — `a63cfccb0f1880eb081d774214b1860d82a33a0a6a29d05f5ea651431e2a5583` (34077 bytes)
- `app/tests/e2e/local-studio-usability.spec.ts` — `0cf8328db7b7d08ef355dba827e8c05e56e31b0394226560c5bb0c15ef443a80` (21429 bytes)

Evidence hashes:

- `unit.log` — `d67ebc927057de3984c821ca3fa95d24fd546a9afd3327630e21e4bd5536dcde` (230 bytes)
- `typecheck.log` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty; command exited 0)
- `diff-check.log` — `0fc85e0adf7df41b9f3a1ed0483b8196828263279587144ec055060e7ad74631` (271 bytes)

## Remaining review

Parent browser evidence should execute the new regression and the combined navigation/return suite. This worker did not verify route behavior in a browser, responsive presentation, integrated art, or combined acceptance.
