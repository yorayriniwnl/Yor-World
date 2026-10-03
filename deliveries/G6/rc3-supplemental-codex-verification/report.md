# RC3 supplemental local Codex verification

The bounded platform input is **not ready for independent audit**: seven reproduced defects remain unfixed. All seven require Gemini #1 platform/backend correction under an explicit parent packet. No fix was implemented. This local Codex review is neither the formal Gemini #1 return nor the GPT Plus #2 independent account audit, and does not accept G6. G6 remains ACTIVE / REWORK; G7 remains LOCKED.

Reviewed candidate: `261c483646f68692a3fe8e184d48d25b8264a6d7`; implementation source: `6129ad7a870f9f391455eb8a0582733a5ccccd11`; observed documentation HEAD: `2bbf7f05b34e17094acaa0078e9c6743d73f8196`. Their `app` trees match `174ccd19091622c3dbce5f6b0ce3fe7fb38e1985`; auth/CMS probe also checked no tracked `app` diff before execution. Production sources, accepted migrations and maker evidence were not edited.

## Executed evidence and meaning

The shared-config run exited **0**, with **2 files / 6 tests PASS**, duration **5.44s**, recorded in [shared-config-probes.log](evidence/shared-config-probes.log). PASS means the defective behavior was reproduced, **not** that the product requirement passed. Six cases reproduce seven defects because the single auth/CMS case establishes both direct owner DML and corrupt-image acceptance. Actual observations are recorded in [auth-cms-result.json](evidence/auth-cms-result.json) and [contact-ops-result.json](evidence/contact-ops-result.json); structured findings with source lines, expected/actual behavior and ownership are in [defects.json](defects.json).

Node 24.19.0, pnpm 9.15.9 and cached Vitest 5.0.2 were used from canonical `app/`. Auth/CMS executes actual local PGlite SQL after the exact accepted A3/A4 migrations and canonical publication-grant hardening, with explicit authenticated role and synthetic JWT settings; it invokes actual canonical `validateUpload`. Contact/operations executes canonical worker/API/integration modules against actual accepted SQL in one embedded PGlite instance with controlled clocks and synthetic provider responses. Telemetry SQL reproduction explicitly selects the production branch around a test-injected local database; this is not a hosted production run. The body-size case and GitHub cache/failure case exercise local canonical paths. No credentials, upstream services, mail or hosted databases were used.

## Reproduced defects

| ID | Severity | Observed defective behavior | Evidence boundary |
| --- | --- | --- | --- |
| SCP-01 | P1 | Authenticated active owner AAL2 remains able to INSERT/UPDATE public content and UPDATE prior history after RPC hardening. Synthetic revision 999 was inserted and changed, history revision 1 rewritten, and audit count stayed zero; helper RPC privilege was correctly false. | Actual embedded SQL and role/claim policies. This is owner bypass of server revision/content/audit gates and history immutability, not non-owner privilege escalation. |
| SCP-02 | P1 | Worker A's expired lease was reclaimed by B, which wrote sent; A's later synthetic retryable failure overwrote sent with retrying/attempts 1 while retaining B's provider ID. | Actual canonical worker and embedded SQL with controlled interleaving; no independent hosted sessions or real duplicate delivery. |
| SCP-03 | P2 | Unexpected provider exception at attempts 4 wrote retrying/attempts 5. Later processing claimed nothing and called the provider zero times. | Actual worker and embedded SQL; synthetic thrown provider error. |
| SCP-04 | P2 | Signature-only PNG 8 bytes, JPEG 3 bytes and WebP 12 bytes all passed upload validation and received invented 1200x800 dimensions. | Actual canonical validation of synthetic corrupt inputs; no hosted upload/approval call. |
| SCP-05 | P2 | Two valid events sharing date/event/project/tier but differing code produced 202 then 503; SQL raised 23505 on dimensional uniqueness and aggregate count remained 1. | Canonical API and production persistence branch with actual local SQL. |
| SCP-06 | P3 | A body of 2037 characters but 6037 UTF-8 bytes, without Content-Length, received 202 despite the 4096-byte limit. | Actual canonical local events route, synthetic Unicode payload; no stress test. |
| SCP-07 | P2 | Three requests at the same injected clock each performed a synthetic failing upstream fetch against an expired snapshot; all returned last-good data, but attempts were not hourly bounded. | Actual GitHub integration/cache with injected fetch; zero actual upstream calls. |

Product outcome for each row is **FAIL / unfixed**. Relevant requirements include immutable history and atomic publication/audit (`docs/planning/engineering-and-content.md:244`, `:271`, `:273`), verified image dimensions and decodeability (`:277`), bounded outbox retries (`:289`), and the canonical integrations' hourly-refresh and telemetry-byte contracts. SCP-01 derives from retained accepted grants/policies: it requires an explicit operational correction packet, not silent alteration of frozen migrations. Existing tests expecting owner direct public-table mutations do not establish compliance with server publication gates. Existing upload tests describe incomplete image headers as valid; signing tests use mocked Storage and cannot prove hosted object existence/privacy.

## Separate source-only concerns

These are not included among the seven reproduced defects or six executed cases:

- **P2 stale rollback concern — NOT RUN:** `app/src/app/api/admin/rollback/route.ts:17` and `app/src/server/content/publish.ts:398` accept targetRevision without the caller's expected current revision. Advisory locking serializes writes but does not reject stale-tab intent. The exact rollback API contract needs a parent decision before assignment as a confirmed defect.
- **P2 unbounded telemetry Map concern — NOT RUN:** `app/src/server/telemetry/events.ts:68`, `:98`, `:115` retain process-lifetime aggregate keys with no eviction or cardinality cap, including arbitrary accepted code strings and production events after successful SQL writes. No memory stress or resource-exhaustion reproduction was performed.

## Limits and next authorized step

Hosted Supabase Auth/REST/Storage/RLS, independent production PostgreSQL sessions, actual mail/provider behavior, physical devices, hosted restore/rollback and deployment are **NOT RUN**. Inspection of correct-looking owner claims checks, page guards and transactional imports is source evidence rather than a fresh executed PASS. The source-only media-object existence concern likewise does not establish a hosted failure.

Result JSON paths overwrite on rerun; contact/operations writes in afterAll even if assertions fail, while a failed auth/CMS rerun could leave older JSON. The shared passing log and recorded exit are therefore authoritative for successful execution, with the current JSON supplying observations. Dimensions 1200x800 were observed in output rather than separately asserted. The existing empty server-only fixture supports local imports and supplies no browser-bundle isolation evidence. SCP-01 proves direct table mutation, not that arbitrary malformed JSON survives the canonical public reader.

The parent issued [G6-RC3-PLATFORM-CORRECT-01](../../../docs/planning/reconciliation-packets/2026-10-03-rc3-platform-corrections.md) to Gemini #1; its execution remains NOT RUN because no callable Gemini connection is available here. After the maker correction return, a separately assigned integrated candidate refresh must bind fresh source/evidence before new platform verification and GPT Plus #2 independent audit. Supplemental proof files replace neither account return nor G6 adjudication. See the [identity and input hashes](verification-identity.json), [actual command ledger](commands-and-exit-codes.md) and [checksum inventory](SHA256SUMS.txt).
