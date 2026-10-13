# Runtime/UI follow-up: continuous framing and recovery corrections

Date: 2026-10-11 17:49 UTC  
Scope: camera FOV continuity, modal focus containment, saved preference wiring, explicit Static Retry, and related E2E assertions.  
Status: implementation and focused checks complete; browser acceptance remains with the parent/auditor.

## Changes

- `CameraDirector` now eases the horizontal target from 56° to 58° over aspect 0.55–0.75 and eases the vertical context cap from 100° to 44° over 0.75–4/3. This removes the 0.75 discontinuity while retaining the required six viewport cases and the existing camera-clearance checks.
- The camera unit test samples 7499×10000, 7500×10000, and 7501×10000. It requires the center to remain at 58° and the measured horizontal FOV range across all three samples to stay below 0.01°.
- `ModalDialog` explicitly wraps Shift+Tab from the first focusable control to the last and Tab from the last to the first. The room-controls E2E now asserts both transitions.
- `WorldRoot` creates one startup `PreferencesStore` and passes that same instance to `WorldRuntime` and its `ExperienceController`. The runtime recovery unit test verifies store identity and that startup mute preserves a saved `soundEnabled: true` preference. Startup still does not resume audio; the user gesture remains required.
- Static Retry writes the selected reset preference (`auto`) to the shared store before remounting the runtime, so initialization cannot reload the stale persisted `static` selection.
- E2E setup now opens Studio Options before selecting Static. Public-shell assertions target the current truthful pre-entry copy, the asset-failure assertion checks the displayed required-asset failure reason, and reduced-motion checks use the switch’s `aria-checked` state instead of capitalization-sensitive text.

The WorldRoot preference-store wiring was authorized by the parent specifically to keep saved-sound startup mute and the runtime snapshot on the same store. Its relevant diff is:

```ts
const preferencesStore = new PreferencesStore();
preferencesStoreRef.current = preferencesStore;
// ...
const runtime = new WorldRuntime({
  // ...
  preferencesStore,
});
```

Static Retry separately persists its reset before reconstruction:

```ts
preferencesStoreRef.current?.update({ quality: preference });
```

## Verification

| Check | Result |
|---|---|
| `pnpm exec vitest run tests/unit/camera-director.test.ts` | PASS, 9/9 tests, including the three boundary aspects and six required viewports |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-camera.test.ts` | PASS, 5/5 |
| `pnpm exec vitest run tests/unit/world-runtime-recovery.test.ts -t "keeps a saved sound preference"` | PASS, 1 passed; 14 unrelated tests skipped by the name filter |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm exec eslint src/features/world/CameraDirector.ts src/features/world/WorldRuntime.ts src/features/world/WorldRoot.tsx src/ui/ModalDialog.tsx tests/unit/camera-director.test.ts tests/unit/world-runtime-recovery.test.ts tests/integration/production-camera.test.ts tests/e2e/browser-behavior.spec.ts tests/e2e/local-studio-usability.spec.ts tests/e2e/full-stack-integration.spec.ts tests/e2e/public-shell.spec.ts tests/e2e/world-lifecycle.spec.ts --max-warnings=0` | PASS |
| `git diff --check` | PASS; Git emitted existing CRLF normalization warnings for other modified worktree files |
| Playwright browser/E2E, shared Next build, native-GPU rendering | NOT RUN; parent owns coordinated build/browser acceptance |

Raw focused command output is in this attempt directory: `camera-unit.log`, `camera-integration.log`, `saved-preference-unit.log`, `typecheck.log`, `focused-lint.log`, and `diff-check.log`. Prior browser failure contexts remain untouched under `app/test-results`; they are diagnostics from the pre-correction source and do not constitute validation of this candidate.

## Current-source fingerprints

SHA-256 for the full files at freeze time:

| Path | SHA-256 |
|---|---|
| `app/src/features/world/CameraDirector.ts` | `EF700DA9A91DF80FD877BF65D8E28FF31CD5AE2F6F32BAB2009F688F805E7A9B` |
| `app/src/features/world/WorldRuntime.ts` | `EFFEFB7ECDF6CE0340D4B5E5D6053A42602DFEDFAAD7F700A64B77C48A3FF58B` |
| `app/src/features/world/WorldRoot.tsx` | `3D919699DFF257D370167847EA1A78F9DA849A14C763F518B7E3A0AAACA3E0F1` |
| `app/src/ui/ModalDialog.tsx` | `97D57FC0F920899E1EB3A918381E2FB6912C96CB3A849752A5FABD73C9193B81` |
| `app/tests/unit/camera-director.test.ts` | `75F770E1A23CC3C60CD1F3D15BE1C993A9BFE551570E600DA08E23315B75DE40` |
| `app/tests/unit/world-runtime-recovery.test.ts` | `32B420F0C2C4DA9AAD786C8119B9CE8AAC2FFDA5A9502E0792F22E009E860BEC` |
| `app/tests/integration/production-camera.test.ts` | `7B9FB300F81DE6FCDB25F21B7E4623AED7EAE27D9F01CB0C7E0F9180E5C227D1` |
| `app/tests/e2e/browser-behavior.spec.ts` | `5BFE87C775FAAB0E8E85D92EFF6BEBC8BC32907F979975C8F4D24249561A5385` |
| `app/tests/e2e/local-studio-usability.spec.ts` | `5E01B39914F0D064EB59C44963173AE1E28A98CBA0DE26B9A451F349FFD645C8` |
| `app/tests/e2e/full-stack-integration.spec.ts` | `029D934AFB16CDDDFF411DAA32BE522C13FEB25A333A660553E6015F16EAE1A8` |
| `app/tests/e2e/public-shell.spec.ts` | `87E5BB1D93B6082C6330CCB914A77866D500903775FBDE63456F23D2790A3B50` |
| `app/tests/e2e/world-lifecycle.spec.ts` | `9C2BDDF7B24AA5F9A016231928F5725AE357903B691C52E840D1D6F25142FB18` |

No commit was created. No build, browser run, or self-approval was performed.
