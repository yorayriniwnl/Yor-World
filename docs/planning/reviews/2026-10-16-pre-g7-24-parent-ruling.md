# PRE-G7-24 parent ruling: renderer candidate not accepted

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Scope:** Local PRE-G7-24 surface-parameter batching candidate and its evidence corrections

## Revisions reviewed

- Candidate source: `017bead7813d5ea9875b8789621b93b8a8cd00ce`; app tree `b28bf52127947dce6ad9e032d1fd0ffd2577fb47`.
- Initial failure-evidence commit: `806a26e95caa8506a1d989065cd104761c2699ed`.
- Corrected accepted-P22 comparisons and report: `edd0ab0536f2abe82df68cab770156c9c318fe08`.
- Receipt-binding correction: `a15fa97d0f4741200474626132ae897318f5327e`.
- Read-only local substitute audits reviewed those exact source/evidence revisions. They are Codex-agent reviews, not an external GPT Plus #2 audit.

## Ruling

**PRE-G7-24 is FAIL / NOT ACCEPTED.** The source candidate is not an accepted baseline, must remain immutable, and is not authorized for merge or deployment. This ruling does not accept G7 or authorize production operations.

## Findings

The source/mirror boundary, asset hashes, required composition behavior assertions, unit/lint/typecheck/build results, and two clean integration invocations were verified. The evidence-only corrections also passed the local read-only review: accepted PRE-G7-22 root comparisons are correctly bound, and the three stdout capture/blob differences are fully explained by CRLF-to-LF normalization. The external GPT Plus #2 audit remains **NOT RUN**.

The renderer acceptance criteria fail. The captured `renderer.info` readings omit shadow-map submissions, so the inclusive draw-call ceilings are unproven. Both required 1440×900 captures changed from the accepted HIGH tier (412 calls): Chrome captured LOW (30) and Edge MEDIUM (56), which invalidates same-tier desktop parity. The 390×844 same-tier comparison retains an extra visible upper-left foliage/stem object. The unchanged performance suite failed 4/6 in both recorded runs, including the closed-controls quality selector timeout and a resource-state assertion failure.

Physical iPhone/iPad Safari, Android Chrome/TalkBack, Windows NVDA, Safari/VoiceOver, the physical 10-minute mobile soak, provider/database setup, production-domain verification, and deployment remain **NOT RUN**. No local automation is substituted for those claims.

## Next work

Proceed only under the separately bounded PRE-G7-25 packet, which starts from accepted PRE-G7-22 root source `500d10fa5901be48d4ff877e608d65ba0e271bb9` / app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. PRE-G7-24 may be used as a patch donor and comparison artifact only; it does not replace the accepted scene. Preserve all PRE-G7-22, PRE-G7-23, and PRE-G7-24 records. PRE-G7-25 remains subject to separate review and parent acceptance.
