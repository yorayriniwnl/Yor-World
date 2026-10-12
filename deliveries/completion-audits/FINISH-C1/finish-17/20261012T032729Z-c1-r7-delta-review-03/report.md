# FINISH-46: C1-R7 E-01 receipt-integrity review

Date: 2026-10-12
Reviewer: Parent-local Codex. This is not GPT Plus #2.

## Decision

**PASS for the FINISH-16 E-01 receipt-integrity correction.** The exact C1-R7 candidate's corrected source provenance and output receipts match the pinned raw Git blobs and the two installed `three@0.180.0` package files. The historical receipt mismatches remain disclosed in the candidate evidence and are listed in `findings.json`; this review does not rewrite them.

This decision is limited to receipt integrity. Runtime, build, and browser tests were not rerun. External GPT Plus #2 review remains **NOT RUN**; Parent implementation acceptance remains **PENDING**; canonical integration remains **false**. E-02 follows the separate R8/R9 line. No C1 implementation acceptance or deployment is implied.

## Candidate and source binding

- Candidate: `e2670d4152c461005da86b392dbcea12cec740bf`; required parent: `1058676cb74d8239aae7fed3dfa91defcc8a30a1`; tree: `419950200cc9705a101468d44e5b589b40f609f0`.
- Delivery subtree: `c38993e9d9368cf0feff736debc0c448dcd895d5`.
- Canonical `app/` tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`; the candidate changes exactly 11 declared package paths, while the canonical app tree is unchanged.
- The R7 output manifest binds 10 files totaling 186448 bytes. Every declared hash and byte count matched its raw Git blob.

## Receipt results

- R6 inputs: 29 rows verified (19 direct Git blobs, 8 mapped Git blobs, and 2 installed package files). All corrected raw-byte receipts match their authoritative sources. The prior receipt comparison remains 22 matches and 7 mismatches.
- Installed Three.js: version 0.180.0; `three.module.js` is 603113 bytes with SHA-256 `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a`; `three.core.js` is 1403455 bytes with SHA-256 `eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20`. The package manifest, lockfile integrity, source-build identity, and frozen-install receipt are pinned to R6 and verified. No package was fetched or installed for this review.
- R5 predecessor outputs: 32 rows verified against raw Git blobs; the historical comparison remains 9 matches and 23 mismatches. The original R5 output-manifest blob and both R6 input/output-manifest blobs are independently pinned and preserved: R5 `0825971fdb19d2bd04aee8d250fe0bb58ff93857792365d432778df9ad1ccaf2`, R6 input `5ae6775351c82c861b4748a25421ac5e67afcfc331b01aab1a64ef26543295de`, R6 output `a8dcd6700b2471b3a2d0d98d71a79ce398a33efcea5a1c48fc83d291cdeeb798`.
- The diagnostic-test mismatch is 2874 bytes / SHA-256 `f19932723c3644d4cc25b65d919317bc28e89520c3c47c926b49e08d2fd22235` in the old receipt versus 2873 bytes / SHA-256 `d952aef28ae996208471a13b5dc3aafe2a12e85a219a677463d06691cf03663a` in the committed raw blob. The FINISH-16 log pinned by the candidate identifies exactly one inserted CR byte (`0x0d`) at offset 2872, before the final LF. This is a line-ending representation difference; it does not establish an application-source change.

## Preservation and limits

The earlier FINISH-23/26 audit root was recorded as occupied and is excluded from this evidence and decision. Its report was accidentally opened before the preservation boundary was noticed; it was not modified and is not used here. This review uses the FINISH-16 log only through the exact blob reference in the candidate's source binding.

The raw recomputation records 185 Git commands. Tool versions: Python 3.12.10, Git 2.55.0.windows.5, PowerShell 5.1.26100.9549. The first recomputation attempt exposed that R5 stores its manifest as a path-keyed object; the reader was corrected to preserve that format, then the final stricter recomputation passed. `commands.log` records the attempt outcomes and every Git command from the final successful run.

Detailed row-level values, preserved historical mismatches, command outputs, and exact blob receipts are in `findings.json` and `receipt-recomputation.json`.