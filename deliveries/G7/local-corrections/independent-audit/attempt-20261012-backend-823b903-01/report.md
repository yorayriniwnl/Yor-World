# Backend independent delta audit — 823b903

**Fixture correction: PASS advice. Assigned backend completion: REWORK for the current native fixture/evidence gap below.** No production defect was reproduced in the executed focused backend tests. This is a local Codex independent audit, not external GPT Plus #2 execution, maker acceptance, or G7 acceptance. Parent remains acceptance authority.

Inspected worktree `C:/Users/yoray/Projects/Yor-World-Local-Corrections`, branch `fix/local-studio-check`, HEAD `823b90352b3ebd0d84cedf7b59cdfcdfb022449d`. Current backend tracked source/API/migration paths and the changed platform test have no working-tree diff. Other lanes have concurrent changes, so this report does not bind a frozen combined application. Exact raw backend identities, supplied untracked native test/config, scope instructions, maker receipts and Git commit diff are recorded in `input-hashes.json`, `backend-source-identity.json` and `git-receipts.json`. Source was not modified by this auditor.

The task follows LOCAL-CORRECTIONS-03's backend scope: streaming limits and UUID idempotency, forward JWT/RLS identity repair, Storage integrity/lifecycle serialization and native/provider distinction. Earlier FINISH-A1 candidate findings concern different source/contracts and are not applied as conclusions about this worktree.

## Why the correction is valid

Commit `823b903` changes only the canonical publication fixture test plus its evidence. At `app/tests/integration/platform/canonical-platform.test.ts:134`, the mock now consumes the response observer supported by `app/src/server/auth/clients.ts:63`; it provides the actual fixture MIME at line 144, returns a synthetic 404 for a wrong bucket/key at line 140, and asserts the exact requested object at line 176. The existing transaction-connection guard, one `FOR SHARE` check, revision increment, post-publication withdrawal and failed rollback assertions remain at lines 161–182.

This repairs an incomplete provider stand-in. The product verifier still rejects missing/wrong MIME, wrong bytes and unavailable objects. Independent execution passed all nine canonical cases, the thirteen media-integrity cases and nine fail-closed cases: **31/31**, exit 0. The installed-SDK synthetic HTTP cases reject both wrong MIME and absent MIME and accept only the exact bucket/key/type/length/hash (`app/tests/integration/platform/media-integrity.test.ts:234` and `:250`). These are real local JavaScript/SQL executions with synthetic transports; they do not establish live Supabase Storage behavior.

All five hashes declared in the maker's latest `attempt-13-approved-provider-fixture-retest-20261011/final-hashes.txt` match current raw files, including the historical combined integration log. Test hash is `eb76c8704f2f8f1c615e8fd78cc9dfb34922cc55ef18237305c8f0a03d46b44d`. Product hashes remain:

- `app/src/server/media/integrity.ts`: `764ca6f365bc2e7d3a27aa5c12862f93e7d2023f4ff78e7dc58ef649225fd446`
- `app/src/server/media/manifest.ts`: `6bd2ffee5580c3d0facaf1bf0ed68ecf1e259fc3064588b159e68a3f6d0ecaa4`
- `app/src/server/content/publish.ts`: `60d183ef48469dc4879d4609efeee5783a1ec3cada863b6e63ea4da84462b909`

## Remaining finding: BACKEND-NATIVE-01 — MEDIUM

The supplied current native fixture at `app/tests/native/backend-native.test.ts:76` still mocks `createAdminServiceRoleClient` without accepting or invoking its response observer. It returns valid image bytes, but `app/src/server/media/integrity.ts:47` initializes the observed MIME to null and lines 62–65 reject that absent MIME. Current positive native publication, approval-before-withdrawal and rollback setup cases depend on that mock (`app/tests/native/backend-native.test.ts:148`, `:169`, `:178`).

Trigger: run those native cases after a successful cluster setup. Expected: the valid object stand-in supplies its exact MIME, then the existing real multi-connection race/retention assertions execute. Observed by source inspection: the stand-in omits the callback, so the updated verifier cannot accept its valid-object response. The independently executed missing-header provider regression confirms rejection of that exact absent-header condition. This is a fixture defect and proof gap; no executed native failure of the underlying product is claimed.

A bounded current native attempt using the documented loopback URL failed in `beforeAll` with `connect ECONNREFUSED 127.0.0.1:54329` before database creation. Exit 1, fourteen skipped cases, zero native cases executed. The setup failure is preserved in `native-focused-results.json`; it is **NOT RUN** for application outcomes, not fourteen failed product tests. No cluster or hosted service was provisioned or altered.

The historical local-native `backend/attempt-06-native/tests.log` does contain a 14/14 PASS receipt. Preserve it as earlier local native PostgreSQL evidence with synthetic Auth/Storage. It does not close current MIME-observer media-positive/race proof after the verifier change. Hosted Supabase migration privileges, native hosted Auth/PostgREST semantics and actual Storage remain NOT RUN.

Maker action: correct the native Storage stand-in to report MIME for the exact valid bucket/key and truthful 404 for unavailable objects, preserve all existing concurrency/rollback assertions, and deliver a fresh current-source native receipt from the isolated local PostgreSQL cluster. Product verifier behavior should remain strict. Parent should require this delta before treating current backend native verification as complete.

## Complete assigned-backend verification matrix

| Requirement | Status | Evidence and actual scope |
| --- | --- | --- |
| 823b903 fixture correction is scoped, strengthens exact-object identity and retains assertions | PASS | Git diff; canonical test lines 134–182 |
| Current canonical publication fixture and focused lint | PASS | 9/9 canonical cases within `focused-results.json`; ESLint exit 0; diff check exit 0 |
| Stored object availability, size/hash/type, bounded reads and no partial publication | PASS | 13/13 media-integrity cases; mocked streams plus installed SDK synthetic HTTP; embedded PGlite |
| Legacy metadata fails closed; no environment bucket inference; unique upload keys and owned cleanup | PASS | 9/9 media-fail-closed cases; installed SDK synthetic HTTP and embedded SQL |
| Streaming ceilings, misleading/absent length, cancellation, multibyte boundaries and interruption | PASS | 22/22 streamed-body cases; synthetic streams and explicit memory database |
| UUID schema, ordinary contact validation and idempotency/duplicate/conflict behavior | PASS | 13 contact + 11 contact-idempotency cases; memory/embedded SQL, no real email |
| JSON-only owner/AAL2, denial/revocation/malformed/conflicting claims and compatible forward migration | PASS | 22 schema-v3 cases; embedded PGlite; no hosted Auth attestation |
| Effective application grants/RLS and RPC hardening in supplied local schema fixture | PASS | 14 database-authorization cases; embedded PGlite |
| Exact latest maker fixture/product/log hashes | PASS | 5/5 declared hash matches in `maker-hash-verification.json` |
| Current native valid-object Storage stand-in contract | FAIL | BACKEND-NATIVE-01, source finding supported by executed absent-header regression |
| Current independent native PostgreSQL RLS/concurrency/rollback execution | NOT RUN | Connection refused before setup; 14 skipped, zero executed |
| Historical local native PostgreSQL receipt | PASS, historical only | Read preserved 14/14 log; not added to current test totals or relabeled hosted |
| Hosted Supabase Auth/PostgREST/Storage and production/provider mutations | NOT RUN | No hosted execution or production writes in this audit |
| Full combined application build/browser/CI and final release/G7 acceptance | NOT RUN | Outside this bounded backend delta; Parent owns combined freeze and acceptance |

Current independent execution totals are **113/113 passed across eight distinct files**, in two nonoverlapping batches (31 and 82). Each batch's raw Vitest JSON lists the unique discovered cases. Historical 210/210 and 14/14 receipts are not added to that count. Commands/exits, setup limits and tool versions are in `execution-receipts.json` and `tool-versions.json`. No browser test, native database case, live provider result or full build is inferred from those embedded test counts.

Return this report and machine-readable finding to the assigned backend maker for the native fixture correction. Parent separately decides acceptance of the scoped test fix and any later completed native evidence.
