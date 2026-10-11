# R4 integrity discrepancy and stop record

Captured 2026-10-11 UTC. Status: **STOP — pending Parent review.** The content of the unexpected package artifacts is internally consistent with the authorized base and allowlist, but their writer lineage is unknown. Do not treat this as a stable maker handoff, integration, or acceptance record.

## Unexpected package artifacts

The prior R4 inventory showed `source/` and `source.patch` absent. When this worker later invoked `node evidence/package-r4.mjs`, its no-overwrite guard found those paths already present and exited 1 before writing. The artifacts' creation timestamps precede that invocation. Parent reported that they did not write to R4. No known command by this worker created the package artifacts, and attribution remains unknown.

| Path | Size | First creation (UTC) | Last modified (UTC) | SHA-256 |
|---|---:|---|---|---|
| `source/` | 25 files; 231,319 bytes | 2026-10-11T00:56:24.066Z | 2026-10-11T00:56:24.105Z | See per-file inventory in `r4-concurrent-package-audit.json` |
| `source.patch` | 210,877 bytes | 2026-10-11T00:56:24.114Z | 2026-10-11T00:56:24.115Z | `7b2dd8ba10801dfca095191ce4b8c81a05d11a95eac4b016dd32fb433c619604` |
| `changed-paths.txt` | 1,089 bytes | 2026-10-11T00:56:24.116Z | 2026-10-11T00:56:24.116Z | `9cb3e6c090522954935fc0721c0cdf1cb38254e711406d691f48ef21338af751` |
| `patch-assembly.json` | 10,369 bytes | 2026-10-11T00:56:24.480Z | 2026-10-11T01:01:05.425Z | `f1980b0846295fb7b56ee647b3f2de563d42583018f9e2424dca237a38b3dc15` |
| `patch-application.json` | 17,635 bytes | 2026-10-11T00:57:07.957Z | 2026-10-11T00:57:54.653Z | `ea0051ff601014f7eceb615d34610dd0568ac20ac09599189b96d523319043a8` |

`patch-check/` appeared at 00:56:34.905Z and was last modified at 00:56:50.230Z. Its HEAD is the exact base commit `f62a43c5e71c00dcb89e28275ea81d842167db80`; its base app tree is `42ea29ec235225046a75959eb19eb386ac2f821d`.

## Read-only content and manifest checks

`evidence/r4-concurrent-package-audit.json` (71423 bytes, SHA-256 `1e001dd533088fdd28883ad6e4bbbbb9c136b8501cb4573985a1ee3efc644654`) records the corrected comparisons. It verifies:

- `source/` has exactly the 25 allowlisted files and matches the patch-applied tree byte-for-byte on all 25 paths.
- The assembly manifest's actual map, `replacementMapping.files`, matches every current source path, byte count, and SHA-256. The patch application manifest matches all 25 source entries as well.
- `source.patch` is valid UTF-8 without BOM or NUL, contains exactly the exhaustive allowlist, and is byte-identical to the current verification worktree Git diff. Its SHA-256 is also the diff SHA-256.
- `git apply --check` and apply receipts report success from the exact base, yielding app tree `ae4f54e366774969dfd202806451e7e4ec66d10b`, with 25 paths, a complete path set, and zero mismatches.
- The accepted output manifest still matches SHA-256 `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.

There are six raw-byte differences between `source/` and the verification worktree. They are CRLF-only normalization differences; removing CRLF pairs makes all six equal to `source/`. The affected paths are `app/src/app/admin/publish/page.tsx`, `app/src/app/api/admin/publish/route.ts`, `app/src/server/content/publish.ts`, `app/src/server/content/revisions.ts`, `app/src/server/media/manifest.ts`, and `app/tests/integration/platform/completion-authoring-preview.test.ts`. The assembly receipt maps the LF bytes, and the exact patch-applied comparison confirms those bytes.

The first audit run reported false assembly-manifest flags because its checker looked for a nonexistent top-level `sourceFiles` property. The checker was corrected to read `replacementMapping.files`; the corrected receipt above reports the exact comparisons. This correction changed only the R4 evidence checker and its evidence output, not `source/`, `source.patch`, or the verification source.

## Process and command lineage

`evidence/r4-process-commandline-snapshot.json` (SHA-256 `582c2e9daed4b56a8bfd5fd2887bdb4720a54a0bba15504222991f1de816d112`) was captured at 2026-10-11T01:04:14.3108983Z. Its live `Win32_Process` query searched command lines for R4 packaging, audit, cleanup, patch, fixture, and root identifiers. It found zero matching processes and therefore no matching parent command lines. The earlier exact-path process query also found zero matches. This is a live snapshot only; it cannot identify an exited writer.

Known commands launched by this worker completed before handoff. The package script stopped at its pre-write collision guard with exit 1. The audit, process-snapshot, and late-fixture inventory commands completed and wrote only evidence under this R4 root. Earlier typecheck, lint, unit, integration, build, and browser commands had returned. No known earlier R4 command remains active or could still be writing. The exact historical writer of the package outputs cannot be recovered from the available process snapshots.

## Preserved discrepancies

- **R3:** This worker made no R3 writes. The preserved baseline `evidence/r3-before.json` is 358 entries / 270 files / 8,821,907 bytes, captured 2026-10-10T23:50:54.234313Z, raw SHA-256 `97299b0c48a155a09499b12f24963c66280c6e57f7236ff3fb907d5ab307aa7a`. The later inventory `evidence/r3-after.json` is 30,212 entries / 25,402 files / 552,454,229 bytes, captured 2026-10-11T00:49:05.551Z, raw SHA-256 `318f7f0bd9de1d68ed5eb5209de8096416cdd4e0f8ff505d2efc3b892dfa4513`. No R3 root path was added; the new direct child was `candidate/node_modules` (25,131 files / 543,621,411 bytes, created 23:56:52.711Z, last modified 23:57:34.596Z). Seventeen existing files differ. Attribution is unknown. Details remain in `evidence/r3-discrepancy.json` (SHA-256 `659571b2c46133a19d78c89c914558ae7f4a56ea884d0610b02fb70b797eedef`). Preserve R3 byte-for-byte.
- **Late fixture:** Preserve `verification/app/.a1-r4-final-db-20261011`. Its recorded inventory is 1,081 entries, 1,055 files, 26 directories, 40,861,791 bytes, and zero symlinks. The directory timestamps are 2026-10-11T00:54:00.599Z / 00:54:04.592Z. Its `postmaster.pid` sentinel is `-42`, 55 bytes, SHA-256 `161c4eec76ffe272be27ccad79b2a49bb18465acbeabb8a62c7095861afe1218`, modified 00:54:04.635Z. The exact-path process query found no active process. Creation attribution is unknown. Inventory receipt SHA-256: `e444980a4963a4490ea318a8dabd7693db17f4c0d859e4c9b18aaf337bce4b78`; process receipt SHA-256: `7031d90338b521c047039a9c23c61ce7b7f9cd70f77aa9b7111f495e1053cb5e`.
- **Out-of-root browser evidence:** Two earlier browser artifacts were mistakenly created under `deliveries/FINISH-A1/evidence/e2e/`. Their originals were preserved and exact byte copies were placed under `r4/evidence/e2e/out-of-root-preserved/`. `browser-results.json` is 3,157 bytes, SHA-256 `042d75cb9c3b089a01dc8afc2a33081f4a63272f2e89fb1c3f080cebc22a62f6`; `r4-browser-rerun.log` is 152 bytes, SHA-256 `b18a868f789a2a75db9cad2cbb8326d01c15f5f79464d029c5c398fa39819628`. Copy lineage receipt SHA-256: `f299a93948fb99b0c57dbf5b902607f776ae7d646a51c0ac1cdece4ad296feeb`.

## Disposition

The content checks pass, but content consistency does not establish who created or last changed the package. The `worker` label inside `patch-assembly.json` is a self-asserted field, not independent writer evidence. Keep the unexpected artifacts and all discrepancy records unchanged. Do not package further or claim stable Parent intake until Parent adjudicates the unknown lineage. No integration or self-acceptance occurred.
