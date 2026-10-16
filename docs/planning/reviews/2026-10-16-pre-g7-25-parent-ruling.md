# PRE-G7-25 parent ruling: renderer candidate remains unaccepted

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Scope:** PRE-G7-25 source candidate and its attempt-03/04/05 evidence

## Revisions reviewed

- Accepted PRE-G7-22 source: `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`.
- PRE-G7-25 source candidate: `28fb4187445206bcc62e2ef0ae2678e44ac6604b`, app tree `f68074b41b8d2eea228d7fa964d3db8358a9fea4`.
- Evidence commits: source evidence `afb42f938eef80a27e406bda3f976b519ae71bc7`, byte/provenance correction `793f2dbbc318cfa152a8ec00f69b8f1f8da73658`, and path/ancestry correction `4ddd00a8924546f49a742f9c5ec4bf10242621e7`.
- The exact source and evidence branch is pushed; the local Codex substitute audited the candidate and both evidence deltas. This is **not** the external GPT Plus #2 audit.

## Ruling

**PRE-G7-25 is FAIL / NOT ACCEPTED.** Do not merge or deploy this candidate. G7 remains unaccepted. This ruling does not authorize production operations.

## Findings

| Gate | Ruling |
|---|---|
| Source identity, owned paths, evidence binding, and source/mirror integrity | **PASS** in the local read-only substitute audit. The latest evidence commit is `4ddd00a`; its provenance delta passed a separate read-only delta audit. |
| Renderer call ceilings | **FAIL**. Every required capture reports 129 inclusive calls (118 main + 11 shadow): +9 over the desktop/landscape ceiling and +49 over the phone/compact ceiling. Triangle ceilings pass. I independently recomputed all eight runtime-snapshot JSON hashes; they match the report. |
| Unit, integration, composition E2E, lint, typecheck, builds | **PASS receipts**: focused 67/67, unit 336/336, integration 286/286 twice, composition 6/6, lint/typecheck and both builds exit 0. |
| Performance suite | **FAIL, 5/6**. The resource-stability test timed out when the Projects link was intercepted by the accessibility rail/toolbar. No retry was made. |
| Full-frame pixels | Pixel-06 metrics and file hashes independently recompute. Pixel equality is **not exact** (desktop 211, phone 46, compact 11, landscape 17 changed pixels). The P25 packet requires comparison and visual review; it does not define exact RGBA equality as a separate numerical gate. Preserve the measured deltas and do not claim pixel identity. |
| Physical checks, external reviewer, services, deployment | **NOT RUN**. The local Codex substitute is not GPT Plus #2. Parent acceptance is withheld. |

## Accepted-root visual authority correction

The PRE-G7-25 packet's sentence “Do not carry the upper-left foliage/stem objects absent from the accepted root scene” conflicts with the exact accepted source it names. `ReferenceComposition.ts` at `500d10fa` explicitly restores the existing upper-shelf ivy cluster, and the source-bound `accepted-root-500-source` capture includes it. The P25 candidate capture includes the same cluster. Therefore, for this exact existing cluster, preserve the accepted `500d` source composition; do not remove it based on the historical P22 screenshot.

The historical P22 visual-run PNGs identify `63756c058de7fec92ba9699b327667207fe48488`, which is an ancestor and earlier, distinct capture history. They are not the accepted `500d` root captures. The two histories must remain separate. This ruling supersedes only the contradictory foliage sentence for the cluster already present in the accepted `500d` source; all other P25 visual, behavior, and performance constraints remain unchanged. The nonzero pixel deltas still require review, and this ruling does not accept visual parity.

## Remaining work

Proceed only under the separately bounded PRE-G7-26 packet. First attribute the measured main/shadow submissions; then test a compatible renderer-only optimization against the exact accepted root. Preserve the 500d source and all its visible objects, including the existing upper-shelf plant cluster. If the frozen ceilings cannot be met without changing semantics, report exact gaps and propose an asset-lane packet; do not change thresholds or omit geometry.

The user-provided hydration diff names Dark Reader and Grammarly injected attributes; local E2E did not reproduce that warning. A local automation run did create WebGL2 on Intel Iris Xe, while the user's normal Chrome screenshot showed startup failure and the accessible fallback. The normal-profile `chrome://gpu` lines and physical-device/screen-reader/soak checks remain **NOT RUN**; no root cause is claimed.
