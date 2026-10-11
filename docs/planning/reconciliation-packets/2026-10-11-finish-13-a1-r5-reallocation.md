# FINISH-13 — Parent reallocation: A1-R5 after delivery-root collision

Date: 2026-10-11 UTC
Status: authorized A1-R5 maker candidate at a fresh root; independent audit and separate Parent acceptance remain required.

## Reallocation decision

FINISH-12 authorized deliveries/FINISH-A1/r5/. After that packet was written, the path appeared with only an empty .work directory. Its creation time was 2026-10-11 05:25:23 UTC; the directory contained no files when inspected. The creator and purpose are unknown. Preserve the entire path; do not inspect it as a source baseline, populate it, reuse its worktree, or remove it.

The fresh exclusive output root is deliveries/FINISH-A1/r5-02/. It was absent at this reallocation. Recheck immediately before creation; if occupied, stop and return the exact observed inventory for another Parent decision. Do not alter FINISH-12; this packet rebinds its same authorized correction to a verified new root.

## Exact source and requirements

- Intake commit: 9188b413d37da0ec3381b5430e25dc375a45bb18 on audit/completion-2026-10-09.
- Immutable source base: f62a43c5e71c00dcb89e28275ea81d842167db80; app tree 42ea29ec235225046a75959eb19eb386ac2f821d.
- Accepted FINISH-00-R2 design output-manifest SHA-256: 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af.
- Rejected A1-R4 candidate: commit 2e183eb3a1470427950265fc6bf4dadb8ad6411e; patch SHA-256 7b2dd8ba10801dfca095191ce4b8c81a05d11a95eac4b016dd32fb433c619604; output-manifest SHA-256 c97e0daa58ad2be10dea1477d593cc8d2bb7f42d82403876aa6e1ed8b2ef7604.
- FINISH-10 independent audit: deliveries/completion-audits/FINISH-A1/finish-05/20261011T011000Z-a1-r4-independent-review/report.md and findings.json.
- FINISH-12 contains the full A1-R5 correction requirements, including all reproduced findings, complete evidence matrix and local browser flow. Follow it unchanged except for the output root; also follow the frozen FINISH-00-R2, FINISH-04 and A1 path-ownership contracts.
- The exact 25 source paths remain those in docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md. Do not widen the allowlist.

The accepted base is the patch base. R4 is diagnostic only and may be consulted read-only. If any R4 text or file is reused, identify every reused path and the modifications made; do not call R4 accepted or infer its original author. Do not use the occupied r5/.work directory.

## Ownership and handoff

This is a local Codex platform-maker assignment because no Gemini session is connected. Report the actual worker identity. Own only deliveries/FINISH-A1/r5-02/. Keep canonical app/, R3/R4, every audit root, accepted inputs, and other lanes unchanged. Run the test-first corrections and all checks required by FINISH-12; bind raw commands, exits, counts, source/build/browser identities and limitations to the returned package. Keep native provider, CDN, deployment, device, recovery and manual evidence NOT RUN unless actually performed.

The maker must not accept its own result or integrate into canonical app/. The stable R5 package must be committed and pushed with only its own delivery paths in accordance with AGENTS.md. If commit or push fails, report the exact failure immediately. A separate reviewer audits the exact pushed candidate, after which Parent alone records acceptance or REWORK.
