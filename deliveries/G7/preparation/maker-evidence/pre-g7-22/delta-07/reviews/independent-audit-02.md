# Independent audit 02 - PRE-G7-22 evidence commit ddc70d9d596c7a9242ade16029523e55120921a1

Reviewer: separate local read-only reviewer; not the parent acceptance authority.

Exact commits reviewed:

- Source: 7b63604979db4426d334b16f049bd1be3b84f16e
- Manifest binding: 07204a66cebbcdef353e4b266ff9b430687075e9
- Evidence: ddc70d9d596c7a9242ade16029523e55120921a1

## Findings

- Candidate commit, remote push, source identity, and manifest binding: PASS.
- Manifest parity pointer and test list: PASS; it points to the candidate report and includes frozen-world-binding.test.ts. The report lists 116 source and 10 test files; normalized and Git-blob parity failures are zero.
- Evidence inventory: FAIL. All 642 paths matched the committed tree for path, Git blob ID, and mode, but 277 entries had byte counts and SHA-256 values that did not match the committed blob content (554 field mismatches). Example: root .gitattributes recorded 521 bytes while its Git blob contained 500. The generator mixed working-tree bytes with staged blob IDs, consistent with Windows line-ending conversion.
- Recorded checks and acceptance: E2E failed 6/6; integration failed 285/286 twice before the -0.91 correction and was not rerun; exact-run provenance is NOT ESTABLISHED; required physical-device, assistive-technology, 10-minute mobile soak, and interactive chrome://gpu checks remain NOT RUN.

Recommendation: do not accept. Fix the inventory generator to derive both size and SHA-256 from staged Git blobs, then audit the corrected evidence.

No files were changed and no tests were run by the reviewer.
