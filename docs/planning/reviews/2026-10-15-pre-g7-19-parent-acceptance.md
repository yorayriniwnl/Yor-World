# PRE-G7-19 parent acceptance

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Decision:** **ACCEPTED for the exact local suite-gate scope below.**
- **Authority:** Parent Codex, Architect and Acceptance Authority.

## Accepted candidate and evidence

This acceptance covers the unchanged source snapshot `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`, app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`, verified under PRE-G7-19. No source or test-code change was made in that packet.

Maker evidence is on `codex/pre-g7-19-boundary-runtime-attribution-20261015`:

- Initial evidence commit: `dd014b6b48b21397d9354502f025abe80c996dfc`.
- Final evidence commit: `529d94f2eea101e7d24e2e4d6687e078b407fba9`.
- Final evidence tree: `297c4c9e28973630651bb69446ac1fbb8f383e71`.
- Final inventory SHA-256: `053a4921c6f55fb58d9d35a7889f20b9b38319bf247cde0369ffb06c2bfb3186`.

The required exact default command `pnpm run test:unit`, with no arguments, passed **327/327 tests in 26/26 files**, exit 0, using Node `24.19.0` and pnpm `9.15.9`. The final app test and domain mirror match the base Git blob; all 117 source paths and saved path hashes are unchanged. The historical PRE-G7-13 source-delivery manifest remains byte-identical and correctly classified as historical provenance.

PRE-G7-17's two consecutive default integration passes, each 286/286, carry forward under PRE-G7-19 because the source and integration paths are unchanged. The required full-unit gate is now satisfied for this exact source revision. Integration was not rerun.

The independent reviewer was a **local Codex substitute for GPT Plus #2**, not that external account. Its read-only audit verified local/remote identity, evidence-only commit scope, the 68-entry inventory plus external manifest check, strict JSON/JSONL parsing, sizes/hashes/Git blobs, source and mirror identity, path coverage, manifest preservation, and the exact default run. The maker was a **local Codex substitute for Gemini #3** and did not audit or accept its own work.

## Diagnostic classification

The instrumented diagnostic command was misrouted by a forwarded literal `--`, ran all 327 tests instead of only the boundary test, and its timing worker resolved Node `24.14.0`. It is supplemental only and is not used as a focused, pinned, or gate result. Its limitation is fully disclosed. No causal attribution for PRE-G7-18's earlier timing is made, and no source correction was justified.

PRE-G7-18 remains closed **not accepted** according to its original result. This later acceptance does not rewrite that history; it accepts the unchanged source snapshot under PRE-G7-19's separately authorized exact default run.

## Remaining limits

This is a local suite-gate acceptance only. Device/accessibility sessions remain **NOT RUN**, and the user's browser GPU state remains **NOT PROVIDED**. A production build was not required and was **NOT RUN**. Provider configuration, DNS/domain work, deployment, live verification, and broader G7 acceptance remain open. No production-readiness or G7-complete claim is made; work remains local-only.
