# PRE-G7-13D — Make the existing chair recognizable in the opening view

- **Date:** 2026-10-14 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Applies to:** PRE-G7-13 only; all other packet constraints remain unchanged

## Reason

The independent delta audit found that the PRE-G7-13 attempt-33 chair backrest and wheels are visible, but the seat remains occluded at 390×844. The chair therefore does not meet the packet's mobile recognition target. The original PRE-G7-13 scope already allows bounded runtime transforms and scale for the existing chair groups; this amendment narrows the correction to that unresolved anchor.

## Narrow scope amendment

The maker may adjust runtime translation, rotation, and scale only on the existing `chair-root` and `chair-base` groups in `app/src/features/world/ReferenceComposition.ts` and the corresponding mirror file. The maker may inspect existing descendant geometry to measure the seat, but may not add, remove, or reshape chair geometry or add chair assets.

Keep the resident, desk, camera presets, lighting, and all non-chair anchors unchanged. Preserve the GLB bytes, node names, hierarchy, interaction roots, navigation, and renderer/fallback behavior. Do not edit CSS, routes, providers, dependencies, project-wide timeouts, or unrelated files. The 13C fallback pointer-interception result remains separate and must stay visible in evidence.

## Required result and evidence

- In the raw closed-HUD opening captures at 390×844 and 1440×900, show enough of the existing seat, backrest, and chair base together for the chair to read clearly as a chair. The seat must not be hidden behind the desktop; do not claim projected bounds alone prove recognition.
- Keep the workstation and all other required anchors visible and unclipped, with no page-level horizontal overflow or control obstruction.
- Record the exact source diff and attempt-34 screenshots/measurements. Run the existing focused visual-composition coverage with default settings and relevant unit/type/lint checks; record commands, exit codes, artifacts, and any unchanged failures. Do not change assertions or timeouts to make the result pass.
- Mirror the changed source/test files and update only the corresponding manifest entries. Recheck the frozen GLB SHA-256 and mirror verifier.

This amendment does not accept the candidate, PRE-G7-13, G7, physical-device behavior, or deployment.
