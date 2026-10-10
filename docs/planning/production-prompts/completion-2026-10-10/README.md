# Detailed prompts to complete YOR WORLD

**25 copy-ready prompts covering the actual remaining project work.** Start with **P01**, then use one numbered prompt per assigned task. The [complete combined copy](ALL-PROMPTS.md) contains the shared instructions and every prompt; the smaller files below are easier to send to individual workers.

This pack responds to the request for longer, more detailed work prompts and incorporates the [October 10 recheck](../../reviews/2026-10-10-completion-recheck.md). It is issued by [FINISH-02](../../reconciliation-packets/2026-10-10-finish-02.md). The [October 9 pack](../completion-2026-10-09/README.md) remains historical context. These prompts do not implement fixes, dispatch external accounts, accept FINISH-B1/C1, issue FINISH-00-R2 decisions or change production status.

## Read the current situation correctly

At the recheck commit `ff05a155b1d630bdf9d5ce852a1af56415c074ee`, FINISH-00 contract acceptance was recorded, but its handoffs contained concrete conflicts. B1 art and C1 runtime candidates existed and received independent REWORK advice. A1 had no local delivery; activity elsewhere was unconfirmed. Canonical `app/` was still tree `42ea29ec235225046a75959eb19eb386ac2f821d`. G7 had no proven live completion and the six extensions remained open. Recheck actual current files at each dispatch; these are historical observations, not claims that no later work can exist.

P01 repairs the contract/schema/path/binding dependencies through a new versioned Parent amendment. It preserves the historical accepted FINISH-00. B1-R2/C1-R2 correct their own deliveries. Successful maker output then needs independent audit, any correction, delta review and Parent acceptance before a dependent packet starts.

## Prompt index

| ID | Send to | Bounded result | Full copy-ready prompt |
| --- | --- | --- | --- |
| P01 | GPT Plus #1 | FINISH-00-R2: exact contract, schema, ownership and asset-binding amendment | [Parent amendment](parent-amendment.md) |
| P02 | Gemini #1 | FINISH-A1: block authoring, authentic private preview, truthful publish review | [Platform](platform.md) |
| P03 | Gemini #1 | FINISH-A2: site publication/rollback, approved resume and claim provenance | [Platform](platform.md) |
| P04 | Gemini #2 | FINISH-B1-R2: correct bindings, lighting, metadata and genuine asset proof | [Art and runtime](world-runtime.md) |
| P05 | Gemini #3 | FINISH-C1-R2: optional resources, cancellation, progress, pause and watchdog | [Art and runtime](world-runtime.md) |
| P06 | Gemini #3 | FINISH-C2: visible entrance, eight clips and all 25 catalog outcomes | [Art and runtime](world-runtime.md) |
| P07 | Gemini #3 | FINISH-C3: initial mobile framing, reachable controls and accessibility | [Art and runtime](world-runtime.md) |
| P08 | Gemini #3 | FINISH-I1: combined accepted successor and reproducible source release | [Integration and release](integration-release.md) |
| P09 | Gemini #1 | FINISH-G7-A: actual backend, jobs, configuration and recovery proof | [Integration and release](integration-release.md) |
| P10 | Gemini #3 | FINISH-G7-C: exact deployment, live runtime and physical/manual sessions | [Integration and release](integration-release.md) |
| P11 | Gemini #2 | FINISH-G7-B: real CDN integrity, delivery headers and asset budgets | [Integration and release](integration-release.md) |
| P12 | GPT Plus #2 | Independent live G7/source/deployment/manual/recovery audit | [Integration and release](integration-release.md) |
| P13 | GPT Plus #1, Astra gate | Separate V1/G7 acceptance tied to actual live evidence | [Integration and release](integration-release.md) |
| P14 | Gemini #2 B, then Gemini #3 C | EXT-01: mug pickup and drinking | [Six extensions](extensions.md) |
| P15 | Gemini #2 B, then Gemini #3 C | EXT-02: wearable headphones | [Six extensions](extensions.md) |
| P16 | Gemini #2 B, then Gemini #3 C | EXT-03: several interactive drawers | [Six extensions](extensions.md) |
| P17 | Gemini #2 B, then Gemini #3 C | EXT-04: additional weather/daylight scenes | [Six extensions](extensions.md) |
| P18 | Gemini #2 B, then Gemini #3 C | EXT-05: alternative moods and greetings | [Six extensions](extensions.md) |
| P19 | Gemini #2 B, then Gemini #3 C | EXT-06: total 5–8 distinct easter eggs | [Six extensions](extensions.md) |
| P20 | GPT Plus #2 | Independent audit of one bound contract/code/asset packet | [Audit and acceptance](audit-and-acceptance.md) |
| P21 | Original assigned maker | Corrections to specific independently identified findings | [Audit and acceptance](audit-and-acceptance.md) |
| P22 | GPT Plus #2 | Independent delta verification of corrected exact bytes | [Audit and acceptance](audit-and-acceptance.md) |
| P23 | GPT Plus #1 | Packet acceptance or rework and next exact handoff | [Audit and acceptance](audit-and-acceptance.md) |
| P24 | Gemini #3, with separate release lanes | Final cumulative full-product integration and live evidence refresh | [Audit and acceptance](audit-and-acceptance.md) |
| P25 | GPT Plus #1, Astra gate | Complete-project reconciliation against all original requirements | [Audit and acceptance](audit-and-acceptance.md) |

Every prompt includes role, local inputs, prerequisites, write ownership, concrete work, edge cases, actual evidence and handoff. Read [common execution](common-execution.md) as well. Where a future Parent packet must specify source hashes, exact path allowlists or a design choice, the prompt identifies that dependency rather than inventing an accepted answer.

## Execution order

1. **P01**, then **P20 → correction/delta if needed → P23** for the new contract amendment. Use Astra only for dangerous cross-lane decisions and major gates; do not label ordinary drafting as an Astra invocation.
2. After amendment acceptance, **P02**, **P04** and **P05** may run in parallel on separate roots, one maker per lane. Audit/accept each separately using P20–P23. Do not start all five accounts on one problem.
3. **P03** follows accepted A1. **P06** follows accepted B1-R2 and C1-R2 in a documented isolated overlay, then **P07** follows accepted C2. Gemini #3 executes these sequentially. Canonical integration is later; the C2 isolated assembly removes the old circular dependency.
4. **P08** follows accepted A2/B1-R2/C3 and their predecessors. Its source candidate needs independent audit and Parent source acceptance.
5. **P09 preparation → P10 deployment → P09 post-deployment backend proof + P11 CDN proof + P10 manual/runtime proof → P12 → P13.** The three production lanes have distinct owners; no self-acceptance or inferred live results.
6. **P14–P19** each require a Parent-bound B asset packet, independent audit/acceptance, then that feature's C runtime packet and another audit/acceptance. Copy the feature prompt to only the role/phase currently assigned. Do not let one worker execute and approve both lanes. Parent binds cumulative dependencies; serialize work assigned to the same account.
7. **P24 → independent source/live review → P25.** A previous V1 G7 ruling cannot accept later changed extension code/assets without current affected release evidence.

For every implementation packet use: **maker → P20 audit → P21 correction when required → P22 delta audit → P23 Parent ruling**. Already verified requirements do not need unnecessary repeated work, but an unrun mandatory outcome remains open.

## Finding coverage

| Finding or unfinished scope | Primary prompts |
| --- | --- |
| CA-01/02 owner authoring/private preview | P01, P02 |
| CA-03/04/12 site/versioning/resume/provenance | P01, P03 |
| CA-05/08/09 door, physical reactions and project motifs | P01, P04, P06 |
| CA-06/07/10 initial animation, pause and loading | P01, P05 |
| CA-11 reference fidelity and mobile controls | P04, P07 |
| CA-13 actual production/manual/recovery | P08–P13 |
| GOV-01–08 schema, recovery, allowlists, bindings, dependency, jobs and status | P01, then corresponding makers/auditor |
| C1-R1–R7 late assets, disposal, bytes, pause, scope, proof and retries | P01, P05, P20–P23 |
| B1-R1–R6 literal bindings, timeline, exposure, metadata, budgets and provenance | P01, P04, P20–P23 |
| Six retained full-product extension groups | P14–P19 |
| Combined final release, original scope and truthful completion | P24–P25 |

The old full-project percentage remains withdrawn. These prompts cover the remaining work; prompt count, passing tests and completed documents are not a new completion percentage.

## Practical dispatch rules

Paste the complete numbered fenced prompt into the assigned account, with access to this workspace. Have Parent fill concrete handoff fields from actual files before implementation. Do not paste all 25 into one maker and ask it to take every role. For a browser-only reviewer, supply the real relevant files/evidence using [the browser review workflow](../../browser-review-workflow.md), and archive the returned text locally; the browser does not gain filesystem access from path labels.

Original and failed evidence stays intact. New B1/C1 correction roots are `deliveries/FINISH-B1-R2/` and `deliveries/FINISH-C1-R2/`; other exact roots/revisions follow their bound packet. Production workers return actual source/patch/assets and PASS/FAIL/NOT RUN proof, commit/push completed code in scoped changes and preserve unrelated work. Parent alone advances acceptance status.

Owner deployment authorization `G7-OWNER-AUTH-20261006` persists. Obtain missing provider/document/device inputs specifically; do not ask again for blanket deployment consent. Saving prompts cannot supply access, approve a resume or perform a physical test. No paid purchase/upgrade is authorized. Missing evidence is reported honestly while independent work continues.

The combined file is a generated verbatim convenience copy of the shared instructions and numbered prompt source files. [Validation](validation.json) records its input/output identities, prompt count and document checks; [review advice](review.md) records the pack review. Neither is production acceptance.
