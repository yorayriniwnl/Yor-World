# Parent decision — FINISH-10 / A1-R4

Date: 2026-10-11 UTC

## Decision

**REWORK. Implementation acceptance is false; canonical integration is not authorized.** The independent FINISH-10 audit is complete at `deliveries/completion-audits/FINISH-A1/finish-05/20261011T011000Z-a1-r4-independent-review/`. Parent reviewed its report, findings, requirement matrix, exact patch replay, source hashes, local test receipts, and final output-hash validation.

The exact candidate remains commit `2e183eb3a1470427950265fc6bf4dadb8ad6411e`, based on `f62a43c5e71c00dcb89e28275ea81d842167db80`. Its current bytes and patch/source mapping are verified, but the historical source/patch writer remains unknown. This decision does not attribute the candidate to the assigned maker, claim Gemini execution, or resolve the R3 preservation discrepancy.

The audit reproduced three contract defects: the candidate hash omits project document bodies/order; private Storage bytes are fully materialized before enforcing the size limit and have no read deadline/abort; and the private review DTO schema accepts malformed draft and cross-field review data. The maker package also lacks the requested standalone complete requirement matrix, and the approved-image browser flow remains unrun. Passing local tests do not offset those failures.

The A1-R4 bytes are preserved for audit history. A new bounded maker packet is required to correct the A1 scope from the immutable accepted base and return it for independent review. The auditor must not repair this candidate. Native provider, CDN, deployment, device, recovery, and G7 gates remain open.
