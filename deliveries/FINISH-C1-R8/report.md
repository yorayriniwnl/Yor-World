# FINISH-C1-R8 verifier correction

Status: **local correction package PASS; independent delta audit and Parent acceptance pending**.

This evidence-only package corrects E-02 against exact C1-R7 candidate `e2670d4152c461005da86b392dbcea12cec740bf`. It validates all fields in the duplicated R6 source-manifest declaration and every `threeDependencyEvidence.packageFiles` declaration against the pinned receipt and installed Three.js bytes. It adds fail-closed JSON-key handling and regression coverage without changing C1-R7, application/runtime source, dependency files, or canonical `app/`.

The exact candidate output-manifest check passed. The regression suite passed, including all source-manifest fields, package-file row fields, missing/extra/duplicate cases, inherited fail-closed checks, disposable package-identity/version/byte probes, and the uncached CLI false-pass reproduction. The zeroed hash now returns structured `FAIL` with exit 1; the raw child stdout, stderr and command are in `evidence/cli-negative-false-pass.json`.

The corrected source patch replays from the verifier blob pinned by R7 and reproduces the packaged verifier byte-for-byte. The three input receipts are copied as raw bytes from R7 commit `e2670d4152c461005da86b392dbcea12cec740bf`. Installed package identity and both package-file hashes match the R7 evidence and actual local `three@0.180.0` bytes. Stable output hashes are listed in `output-hashes.json`.

The correction does not adjudicate E-01. External GPT Plus #2, separate Parent acceptance, application/runtime/build/browser, native provider, physical-device/accessibility, deployment, recovery, and G7 checks remain **NOT RUN**. This package makes no canonical integration claim.
