# FINISH-24 independent A1-R5 audit

Recommendation: **REWORK**. Local source/contract and workflow checks **FAIL** for six findings. This is a local Codex independent review; external GPT Plus #2 execution is **NOT RUN**. Parent acceptance and canonical integration remain **NOT RUN** and are not authorized by this report.

The reviewed delivery is exact commit `8f3aa566f36c92bb98658090ef91f9bfa96e8a79`, full tree `4b0f51f7462af578422cca05c3e30c9bfc0b4c8f`, parent `29400979676c1005e18cead5d1457924a2394963`. Its assembled app tree is `cb42202d3be7f4f10c460d2e1b43db853910b87f`. The commit itself preserves canonical app tree `42ea29ec235225046a75959eb19eb386ac2f821d`; the assembly tree is derived from the delivery patch, not the commit's canonical app directory. Immutable base is `f62a43c5e71c00dcb89e28275ea81d842167db80`.

Patch SHA-256: `945bee3ccf793d56f6ffc2319cf3d6ede52a9f8bec665ac3d568272f1a179b41`. Maker output-manifest SHA-256: `a54f2796bd8cee902b4b0f70266545d4130698914bede71fedd00b85f19f24f1`. Accepted design output manifest: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.

The remote branch had advanced to `618ac109ae949019c327b8ec6c524809f4b6f23f` through later governance commits when inspected. Literal equality of branch head to candidate is **FAIL**, while exact candidate ancestry/reachability is **PASS**. This is reported explicitly; the later head was not substituted as the audit candidate. See `candidate-binding.json` and raw `git ls-remote`/ancestry command receipts.

## Findings

1. **A1R5-01 / FAIL:** frozen DTO compatibility fails. The approved `approvalAudit.eventId` becomes `id` plus required `action`; PrivateDraftReview requires an extra `previewProjectId`; the accepted generic site ReviewCheck seam is narrowed away. Three positive frozen-contract objects fail actual candidate schemas. Current candidate-shape validation is internally coherent, but is a substituted API contract.
2. **A1R5-02 / FAIL:** both healthy publication refresh paths expect `publication`, whereas GET /api/admin/publish returns `activePublication`. Refresh always reports an incomplete response, leaving the page's review stale after commit. The maker rollback screenshot already shows active r3 versus reviewed expected r1 and this exact failure. Its passing browser test misses recovery because it asserts committed feedback and deliberately injects one failed refresh.
3. **A1R5-03 / FAIL:** a known project with no genuine draft throws during strict review construction before intended not-found handling. The owner API returns503 instead of404; the private page's later notFound branch is also unreachable for this case by source inspection. Privacy headers are preserved.
4. **A1R5-04 / FAIL:** authorized stale saves return409 with only error/code, omitting the required current draft identity/content handoff. Rejection preserves the unsaved buffer and prevents writes; those passing properties do not supply the missing response data.
5. **A1R5-05 / FAIL:** draft rendering accepts an absolute `http://yor-world.local/...` URL and a traversal-containing relative URL because it validates a normalized path then renders the original URL. Independent React rendering reproduced both img outputs. The production resolver currently returns safe relative paths; no auth bypass or XSS exploit is claimed.
6. **A1R5-06 / FAIL:** new sections, paragraphs and list items still insert valid nonempty invented content; Add link invents example.com record data and a current check date. New evidence correctly defaults unknown/null. Direct source inspection establishes the remaining default-content violation; no additional browser execution is claimed for it.

`findings.json` gives exact candidate locations, contracts, reproductions, impacts and evidence. `audit-contract-probes.test.ts` is reviewer code executed only in scratch. Eight final assertions fail across findings01–05; these expected red reproductions are separate from the candidate's unchanged passing suites.

## Passing evidence and remaining scope

| Check | Status | Evidence and scope |
| --- | --- | --- |
| Exact package and input identity | PASS | 88 commit paths, all under r5-05; 87/87 raw Git output rows match local bytes. Accepted contract-manifest digest matches. All25 maker input receipts match the appropriate raw candidate Git or received local audit inputs. |
| Exact-base replay and ownership | PASS | Strict UTF-8 without BOM/NUL; apply/check/whitespace exit0; 25/25 replacements exact; only25 of26 allocated paths. Dependencies/content/auth/migrations/public pages/other lanes and published-media.test.ts unchanged. |
| Full candidate source versus available maker worktree | PASS | All251 candidate tracked app blobs match C:/yw-r5c/app raw bytes. This authenticates currently available source content, not historical authorship. |
| Unchanged unit suite | PASS | Reviewer24 files /316 tests, exit0; `independent-unit.log/.exit`. Includes full-body/order/key-order hash and strict malformed/positive candidate DTO cases. |
| Unchanged integration suite | PASS | Reviewer28 files /306 tests, exit0; `independent-integration.log/.exit`. PGlite, synthetic auth, mocked Storage. Stale-review/media mutation/no-partial-writes, durable revision, saves, byte checks, private proxy denial/headers and rollback in this local scope. |
| Available exact build bytes | PASS | All630 physical output files /116,591,312 bytes match the maker manifest; build ID rLA3QF1UjefZlpylb6Izw. Six external dependency junctions are recorded separately and excluded from the physical output inventory. |
| Maker Chromium result/binding inspection | PASS | Exact6/6 expected outcomes, zero unexpected/flaky/errors; raw logs/exits and all binding-linked hashes verify. Actual synthetic picker/save/reopen/guarded16x12 PNG source and screenshot inspected. The fixture is not provider-approved. |
| Maker lint/typecheck/build receipts | PASS | Final source-bound raw logs and exit0 receipts match package/binding. Fresh reviewer execution of these commands is NOT RUN. |
| Named static sentinel scan | PASS | Reviewer rechecked five exact local sentinels in the available bound build, no matches. This does not prove deployed/cache-wide privacy. |
| Fresh reviewer Chromium execution | NOT RUN | Maker browser evidence was inspected; no new browser/server was launched by reviewer. |
| Native/provider/deployed/device/recovery/manual gates | NOT RUN | No native PostgreSQL/Auth/Storage sessions, multiple-process races, real approval, deployment/CDN, physical devices/assistive technology, backup/recovery or manual operations were executed. |
| External GPT Plus #2, Parent acceptance, canonical integration, G7 | NOT RUN | No external account execution, acceptance, integration or production gate is claimed. |

Review hashing includes full publishable PublishedProject documents, sorted project IDs, recursive object-key canonicalization with ordered arrays preserved, A1 site=null, the actual asset-manifest revision and complete reviewed-media vector. CandidateX is excluded and remains nonpublishable. The original FINISH-10 hash omission and unbounded arrayBuffer findings no longer reproduce. Malformed DTOs now reject correctly; frozen DTO compatibility remains a distinct failure. Standalone matrix and actual synthetic image selection/preview evidence have been supplied. `prior-defect-reconciliation.json` resolves each prior finding to FINISH-12 and this candidate.

The media reader rejects oversized declared lengths before reading, accumulates at most 5 MiB, requests cancellation on overflow/error, checks EOF declared length, and bounds waiting for URL creation plus streaming with a shared 10-second timer. The repeated integration suite explicitly observes overflow cancellation and streaming AbortSignal. Its stream-error case checks failure without observing cancel-call count. URL creation is abandoned through a timeout race; aborting the underlying provider signing request is not demonstrated and remains NOT RUN. No signed URL is returned in the review identity or private HTML.

Input receipts distinguish25 rows:21 bind exact raw candidate Git blobs, and four bind received local FINISH-10 audit files absent from that commit. Current START_HERE/work-order copies have legitimately evolved after the pinned candidate; their candidate blobs still match the receipts. No EOL or hash mismatch is inferred from these later governance changes. R4's historical writer/preservation uncertainty remains unresolved; it was not converted into R5 authorship proof. Occupied prior R5 roots and C:/yw-r5b were not used as candidate source or evidence.

The complete reviewer matrix independently resolves every maker FINISH-04/A1, split A3 and FINISH-12 row, plus explicit grouped A3-01 through06 and limits. Broad workflow/API/DTO PASS claims are FAIL where these findings apply. Passing maker receipts remain valid for the executed tests; they do not cover the missed assertions or accept the candidate.

## Artifact boundary

The exact audit root was absent immediately before creation. All reviewer writes, scripts, logs and disposable scratch remain beneath it. Canonical app, candidate, packets, accepted contracts and prior delivery roots were not edited. No fix, acceptance, integration, commit or push occurred. Parent must inspect this stable audit and issue any correction/acceptance decision separately.

Stable outputs: report.md, findings.json, requirement-matrix.json, candidate-binding.json, input/output/replacement/source/build/browser verification receipts, prior-defect-reconciliation.json, static-sentinel-verification.json, preflight.json, raw commands.json and test logs/exits, tool-versions.json, reviewer probes and reproducible audit scripts. output-hashes.json excludes itself and .work/. An early console encoding error is disclosed in preflight.json and does not alter the recorded subprocess exits; final probes use the corrected wrapper.
