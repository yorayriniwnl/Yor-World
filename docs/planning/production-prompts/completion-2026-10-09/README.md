# Prompts to complete YOR WORLD

This pack addresses all thirteen findings in the [2026-10-09 completion audit](../../reviews/2026-10-09-completion-audit.md), production verification, and the six retained full-product extensions. [FINISH-01](../../reconciliation-packets/2026-10-09-finish-01.md) issues the ownership and dependency rules. It operates the existing product specification rather than defining a different product.

Use one bounded packet per worker turn. Paste its complete text, with any named common instructions. Local GPT/Gemini workers read the actual files; a worker without access reports missing inputs. Saving this pack has not connected or dispatched external accounts.

## Send prompts in this order

| Step | Account | Prompt to open | Outcome |
| --- | --- | --- | --- |
| 1 | GPT Plus #1 | [FINISH-00: Parent contract gate](parent-contracts.md) | Binds exact inputs, schema/asset/runtime amendments and ownership before makers begin |
| 2A | Gemini #1 | [FINISH-A1](platform.md) | Actual case-study block editor and authenticated truthful draft preview |
| 2B | Gemini #2 | [FINISH-B1](world-runtime.md) | Reference-faithful room, visible motion bindings and real assets |
| 2C | Gemini #3 | [FINISH-C1](world-runtime.md) | Initial animation, pause, essential/optional loading, truthful progress/retries |
| 3A | Gemini #1 | [FINISH-A2](platform.md) | Site-content versioning, coherent rollback, approved resume, reproducible public claims |
| 3B | Gemini #3 | [FINISH-C2, then C3](world-runtime.md) | Door/arrival/catalog effects, then mobile controls and input coverage |
| Every packet | GPT Plus #2 | [Independent audit and delta prompts](audit-and-acceptance.md) | Defects/evidence review; maker implements corrections; Parent decides acceptance |
| 4 | Gemini #3 | [FINISH-I1 integration](release-backlog.md) | One reviewed successor with bound clean-build/CI/archive proof |
| 5 | Gemini #1 / #3 / #2 | [G7 backend / deployment / CDN prompts](release-backlog.md) | Actual services/setup, bound deployment, post-deployment evidence, physical/manual sessions and recovery |
| 6 | GPT #2, then GPT #1 Astra | [Independent G7 audit and Parent gate](release-backlog.md) | All ten G7 requirements and six manual sessions verified; separate V1 acceptance |
| 7 | Gemini #2, then Gemini #3 | [EXT-01 through EXT-06](release-backlog.md) | Mug, headphones, drawers, weather/daylight, moods/greetings and total 5-8 easter eggs |
| 8 | Integration maker / GPT #2 / GPT #1 | [Final full-product reconciliation](audit-and-acceptance.md) | All original requirements, six extension milestones and final cumulative release evidence |

Steps 2A/2B/2C can run in parallel on separate roots after FINISH-00. Step 3A follows accepted A1; C2 follows accepted B1+C1, then C3. Do not assign concurrent packets to the same account or let multiple workers edit the same application paths. Provider preparation precedes deployment; live backend/CDN tests follow it. All five accounts must not converge on the same problem.

## Shared execution rules

- Audit coordination baseline is `e0f57a49f4c3d38517be1969f96585d01378bd6c`; original accepted app tree is `42ea29ec235225046a75959eb19eb386ac2f821d`. A later documentation-only pack commit may preserve this app tree. Parent supplies actual accepted implementation base, input hashes and exact canonical allowlist for each new packet; later dependent work consumes accepted successors.
- Production makers write only their named delivery roots and execute isolated candidates. They return complete source/patch, actual assets, meaningful outcome tests, raw receipts, hashes and PASS/FAIL/NOT RUN tables. Canonical app changes occur only through assigned integration and new successor acceptance.
- Follow `AGENTS.md`: maker -> independent audit -> maker correction -> delta audit -> Parent acceptance. A passing maker report is not acceptance. GPT #2 identifies/verifies defects and never fixes production source. Use GPT-6.1 Sol for ordinary coordination/audits; Astra for dangerous contract decisions and major gates.
- Existing accepted commits/rulings/deliveries and the audit inventory are immutable. Only new versioned contract packets may change schemas, intents, manifests or asset revisions. Do not weaken tests/budgets, suppress failures, overwrite old proof or reinterpret placeholders as finished behavior.
- Human Git rule applies to completed code: small scoped commit and push to the verified repository/Parent-approved branch. Preserve unrelated changes; report failures immediately. The Parent controls integration/merge and accepted source identities. No force-push or invented remote.
- Never fabricate biography, credentials, model evaluation, personal approval, downloads, service receipts or physical tests. Resume/credential originals require actual inputs/approval; private originals stay private. Missing necessary inputs leave explicit open checks while independent work continues.
- Deployment consent `G7-OWNER-AUTH-20261006` persists; do not request it again. Service access, approved document bytes and physical testing are still actual dependencies. No paid purchase/upgrade is authorized. Field traffic metrics, native PostgreSQL/Supabase, screen readers and physical thermal results cannot be inferred from emulation or lab tests.
- Do not declare completion from the prior percentages or the 713-test count. The six extensions remain part of complete-project scope even after V1 ships. Record remaining effort per packet with estimates/actuals instead of inventing a global percentage.

## Compact dispatch messages

These short messages work for a local account with this workspace. The linked full prompts contain all required ownership and evidence instructions. Copy the full prompts instead when the receiver cannot resolve local paths.

```text
GPT #1: Read C:/Users/yoray/Projects/Yor World/AGENTS.md, START_HERE.md and docs/planning/production-prompts/completion-2026-10-09/README.md. Execute FINISH-00 in parent-contracts.md. Preserve the specification and accepted history; bind exact contracts/paths/inputs and obtain GPT #2 independent contract review. Issue separate maker packets only after the contract gate. Use Astra for dangerous cross-lane contract decisions.
```

```text
Gemini #1: Read the completion pack and execute only FINISH-A1 in platform.md after accepted FINISH-00. Deliver a real structured case-study editor and private draft preview with truthful validation and outcome evidence under deliveries/FINISH-A1/. Stop for independent audit; Parent alone accepts. FINISH-A2 follows only after A1 acceptance and its own bound packet.
```

```text
Gemini #2: Read the completion pack and execute only FINISH-B1 in world-runtime.md, including its common instructions, after accepted FINISH-00. Deliver reference-faithful art, real source/export assets and usable named motion bindings under deliveries/FINISH-B1/. Preserve the main reference and old accepted art. Return actual render/browser/GLB evidence and stop for independent audit.
```

```text
Gemini #3: Read the completion pack and execute only FINISH-C1 in world-runtime.md, including its common instructions, after accepted FINISH-00. Fix initial coding-action activation, actual pause and required/optional loading/progress/retry behavior in an isolated delivery. Return real playback/readiness/cancellation evidence under deliveries/FINISH-C1/. C2 integrates accepted B1+C1; C3 follows accepted C2. Do not start those dependent packets early.
```

```text
GPT #2: Read the completion pack's audit-and-acceptance.md. Independently audit the one Parent-bound maker packet and exact candidate/artifact hashes named in your handoff. Report defects and PASS/FAIL/NOT RUN evidence; do not implement fixes or accept the packet. After the maker corrects assigned defects, execute the delta-audit prompt. Keep live/device evidence distinct from fixtures and source inspection.
```

```text
Gemini #3, after accepted A2/B1/C3: Execute FINISH-I1 in release-backlog.md against Parent-bound predecessor revisions. Produce one isolated successor, complete regression/outcome evidence and exact source/build/archive/CI binding. Preserve old accepted releases. Stop for independent audit and Parent source acceptance before production.
```

```text
Production lanes, after successor acceptance: Use only your individually assigned FINISH-G7-A/B/C prompt in release-backlog.md. Gemini #1 owns backend/services, Gemini #3 owns deployment/runtime/manual sessions, Gemini #2 owns CDN/assets. Serialize setup before deployment and live proof afterward. Existing owner authorization persists. Return actual live/device/recovery receipts; missing access is NOT RUN. Parent Astra adjudicates after independent GPT #2 audit of all ten criteria and six manual sessions.
```

```text
Post-V1 makers: Use the EXT-01 through EXT-06 template/matrix in release-backlog.md. Parent issues one feature's B asset packet, then independently accepts it before its C runtime packet. Deliver all six groups without silently retiring any. Run final cumulative source/live verification, then use audit-and-acceptance.md for complete-project reconciliation.
```
