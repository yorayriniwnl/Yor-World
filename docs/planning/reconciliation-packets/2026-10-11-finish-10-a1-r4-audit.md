# FINISH-10 — independent A1-R4 complete-scope and delta audit

Date: 2026-10-11 UTC
Status: authorized independent review; implementation acceptance and canonical integration remain pending.

## Exact candidate and Parent intake ruling

Review only the stable candidate committed as `2e183eb3a1470427950265fc6bf4dadb8ad6411e` on `audit/completion-2026-10-09`. The candidate source is `deliveries/FINISH-A1/r4/source/`, with `deliveries/FINISH-A1/r4/source.patch`. Its output-manifest SHA-256 is `c97e0daa58ad2be10dea1477d593cc8d2bb7f42d82403876aa6e1ed8b2ef7604`; the patch SHA-256 is `7b2dd8ba10801dfca095191ce4b8c81a05d11a95eac4b016dd32fb433c619604`. The source base is commit `f62a43c5e71c00dcb89e28275ea81d842167db80`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`; the accepted FINISH-00-R2 output-manifest SHA-256 is `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.

Parent admitted this exact content for independent audit only in [the FINISH-07 intake ruling](../reviews/2026-10-11-finish-07-a1-r4-intake.md). The unexpected package creator/last writer remains unknown. The auditor must assess this recorded integrity exception; do not attribute the package to the maker or treat the self-asserted assembly `worker` field as provenance. Preserve all candidate, R3, fixture, and earlier audit bytes.

## Audit assignment

Perform an independent complete-scope and delta audit against the exact FINISH-07 packet, the FINISH-04 contracts and A1 findings, the accepted FINISH-00-R2 design, and the original A1 platform requirements. Inspect the candidate code and actual evidence. Verify the exact allowlist and source/base/manifest/patch identities independently. Determine which A3-01 through A3-05 and other A1 requirements pass, fail, remain open, or were not run. Evaluate test coverage and whether the recorded unit, integration, build, and Chromium results actually exercise the claimed behavior. Keep embedded PGlite, mocked storage/Auth, local browser fixtures, and unobserved CDN/provider/device behavior explicit.

Audit the full R4 integrity exception and preservation records as evidence-integrity matters. Distinguish the verified identity of current bytes from the unknown historical writer. Do not infer intent, causal attribution, or exact R3 preservation from absent processes or self-asserted logs. Raise any concrete source or evidence defect with path, reproduction, and severity.

The auditor is a local Codex reviewer assigned independently of the A1 maker. Do not claim GPT Plus #2, external review, Parent acceptance, or production readiness. Do not edit, fix, repackage, commit, or accept the maker candidate. If defects are found, return REWORK advice and leave correction to a new Parent packet.

## Exclusive audit output

The fresh audit root is `deliveries/completion-audits/FINISH-A1/finish-05/20261011T011000Z-a1-r4-independent-review/`. Recheck that it is absent before writing and write only there. Preserve the R4 candidate, previous FINISH-A1 audits, and all other delivery roots byte-for-byte.

Return `report.md`, `findings.json`, `requirement-matrix.json`, exact input/output hash receipts, and raw logs for every command actually run. Bind all conclusions to the candidate commit, source patch SHA, manifest SHA, app base/tree, and browser/tool versions. Record exact commands, counts, exit codes, and the limitation of each check. Keep test results distinct from provider/deployment/manual acceptance. Do not amend the source allowlist or canonical `app/`.

Parent will review the stable audit output and make a separate implementation-acceptance decision.
