# RC6 R4 major-gate advice: confirmed output-alias findings

Recorded 2026-10-07. Adviser: local read-only Codex worker `/root/rc6_r3_gate_advice`, assigned Astra by Parent for major-gate advice. This states the assignment rather than independently attesting a backend/session/account. No external account dispatch is claimed. Only new advisory files were written in this directory; Parent retains sole acceptance authority.

**HOLD an unconditional R4 source/output-guard acceptance recommendation.** The exact local R4 bundle and exported proof pass direct verification, and PRE-G7-07 corrects the prior workflow/output-root problems. Two newly reproduced P2 filesystem-alias defects require explicit Parent disposition or correction. The independent final report and actual final hosted run/job/step/artifact review are still pending. No application regression or real historical-file damage is established.

The [source review](source-review.json) records source `30240b672ae31537d8090b11b60f8bf808a27670`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`, both proof histories retained as ancestors, byte-identical latest remote R3 on main, and an actual remote read confirming the durable `archive/rc6-local-71737a6` branch at `d927708`. No app source changes from the remote amendment were made in R4. The generator is removed. CI preflights and derives the current output root, writes the strict receipt inside it and copies that actual receipt into `.rc6-ci/` before artifact upload. All thirteen required steps remain.

Own [local binding verification](local-binding-verification.json) directly compares the actual archive against source Git blobs and checks every portable inventory entry:

| Check | Observed result |
| --- | --- |
| Archive | 242 regular, unique members; all match source Git blobs |
| Archive bytes / SHA-256 | 1,655,793 / `541c3f6c290dbc7ef593e7668265c51b07bff0c937ba13d9a2260c3760470ee5` |
| Manifest LF SHA-256 | `cd1822a88a2ee6010672fa1e607bd1b20420b25a96fb1e8c5ab47f9392640b0b` |
| Primary strict receipt | PASS; exact manifest/archive; verified HEAD equals `30240b6` |
| Portable checksums | All 153 entries exist and match raw bytes |
| Retained browser reports | 109 E2E, 17 accessibility, six performance; zero skipped/flaky/unexpected |

The three optional `.last-run.json` runner-state files are explicitly excluded from this new portable inventory. No old inventory is rewritten. These checks establish the current local proof's identity and integrity; this adviser did not rerun application suites or execute hosted/provider/physical tests.

The separate maker-independent reviewer `/root/rc6_r3_independent_audit` executed both alias probes against frozen R4 code in labelled temporary Windows fixtures. This adviser read their actual code/receipts and traced the relevant production guard/write ordering; the executions below belong to that reviewer.

- **Receipt case collision — P2.** [Probe receipt](../../r4-audit/receipt-case-alias-probe.json) and [probe source](../../r4-audit/receipt-case-alias-probe.mjs): the actual frozen bundle CLI accepts an explicit `--receipt` whose basename is the uppercase spelling of the archive basename. On Windows both names identify the same file. The builder writes gzip, then overwrites it with JSON and exits 0/PASS while reporting the former archive hash. Collision checks compare strings, while output-path checks permit this case alias. An analogous case-sensitive check exists in the validator; a complete validator execution of that outcome is not claimed by this report.
- **Hard-link output alias — P2.** [Probe receipt](../../r4-audit/hardlink-output-probe.json) and [probe source](../../r4-audit/hardlink-output-probe.mjs): an existing mutable R4 output and preserved R3 sentinel have identical filesystem device/inode and link count two. Frozen `assertPolicyOutput` permits the mutable pathname and `writeJson` changes the preserved sentinel through that hard link. This directly defeats the claimed historical-output guard for an existing hard-link alias. Real release/history files were not used or changed.

The normal candidate driver uses distinct canonical receipt names, and normal Git checkouts do not create these hard links. The builder collision's corrupt archive would fail subsequent deterministic archive/hash validation; the complete default proof therefore is not invalidated by the isolated reproduction. Conversely, passing the canonical run does not establish that the alias guard is correct. Severity and gate disposition remain distinct. Parent should either issue bounded maker corrections and new source-bound proof, or record an explicit limited disposition without claiming these guard requirements pass. The hard-link finding particularly prevents an unqualified assertion that resolved filesystem aliases cannot modify preserved proof.

Any correction should reject receipt/input collisions by filesystem identity before writes and prevent writes through hard-link aliases to preserved files. Preserve this actual R4 execution and all previous proofs rather than replacing their source identities or receipts. The auditor and this adviser do not implement fixes or accept their own outputs.

No G7 acceptance is recommended. D01/D02 remain tied to the corrected runtime and exact evidence; D03 truthfully leaves heap/GPU leak absence UNKNOWN; D04 retains the current three-migration/schema-v2 guide; D05 is satisfied only for the verified new inventory; D06 remains deferred. PRE-G7-05 ledger validation is structural consistency and artifact hashing, not operator or execution attestation. Actual provider access/deployment, live backend/Auth/RLS/email/CDN/monitoring/restore/rollback and physical mobile/screen-reader/thermal requirements still need real evidence and a separate Parent G7 ruling. Owner deployment authorization persists.
