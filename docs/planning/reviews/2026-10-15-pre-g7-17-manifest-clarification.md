# PRE-G7-17-C1 parent clarification: historical mirror manifest

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Related ruling:** [PRE-G7-17 parent ruling](2026-10-15-pre-g7-17-parent-ruling.md)
- **Related packet:** [PRE-G7-17](../reconciliation-packets/2026-10-15-pre-g7-17-unit-and-final-suite-gate.md)
- **Scope:** Adjudicate the source-delivery-manifest observation only. No source, evidence, or test result is changed.

## Clarification

The independent audit correctly observed that `yorayriniwnl.in/source-delivery-manifest.json` names PRE-G7-13 source `8bc0db9b1572e3603000cbc657a3d04a3dabf0d7`, app tree `7e5ca476b9b9b5544942a3f1229f540dd99b9d8e`, and visual-candidate attempt-50. That file is historical PRE-G7-13 provenance, not the mutable current-candidate pointer. Its Git blob `a4a117eacc9ccecf5584a67c11be034723c143a8` is unchanged in the PRE-G7-14 source `8056fece5cd0b8113b81313b6d6a22099163bb27`, accepted PRE-G7-15 source `8becac4ea3e9decc91ca2807e2004a0aa0407105`, PRE-G7-16 source `f71d1df028f80637abb3e427040f0e0f5085179c`, and PRE-G7-17 source `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`.

PRE-G7-17 separately binds its candidate through the exact source commit, app tree, source patch, test snapshot, changed-pair parity evidence, and evidence inventory. The packet required preserving the mirror manifest and only named the root manifest for update when source paths change. The discovered path set remained the same. The old manifest's identity and hashes therefore remain historical; they are not represented as current PRE-G7-17 hashes.

The audit's “current source-bound manifest FAIL” is classified **HISTORICAL / NOT A PRE-G7-17 ACCEPTANCE GATE**. Future packets must bind their exact candidate and current mirror hashes in their own evidence records while preserving this PRE-G7-13 provenance artifact unless a packet explicitly requires a new mutable delivery manifest.

## Disposition

PRE-G7-17 remains **NOT ACCEPTED** because its required exact default unit suite did not establish 327/327. The two-pass integration subgate passed. This clarification does not waive the unit gate, alter the accepted PRE-G7-15 source, modify the historical manifest, or authorize production work. The instruction remains local-only.
