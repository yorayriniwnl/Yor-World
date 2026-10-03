# Start here — YOR WORLD

Project folder: `C:\Users\yoray\Projects\Yor World`.

The user selected local coding tools with project-folder access for GPT/Gemini and browser-based Claude accounts for review. Resources: 2 GPT Plus, 3 Gemini AI Pro and 15 Claude free browser accounts; the coordinator is not an extra GPT account.

This is the shared entry point for the user and workers with actual local or connected workspace access. Read [AGENTS.md](AGENTS.md), then the assigned packet; only load the document sections that packet needs.

| Input | Local file |
| --- | --- |
| Main visual reference | [references/images/main-reference.png](references/images/main-reference.png) |
| All reference images, video, and source discussion | [references/README.md](references/README.md) |
| Original source locations, hashes, and provenance | [references/manifest.json](references/manifest.json) |
| Product scope and accepted direction | [Product design](docs/superpowers/specs/2026-09-30-yor-world-design.md) |
| Full document map | [README.md](README.md) |
| Account-specific prompts and phases | [Account prompts](docs/planning/account-prompts.md) |
| Three production prompt tracks | [Production prompts](docs/planning/production-prompts/README.md) |
| Claude browser review handoff | [Browser review workflow](docs/planning/browser-review-workflow.md) |
| Local startup files and verified access limits | [Local tool access](docs/planning/local-tool-access.md) |
| Account operating model and governance pipeline | [Account operating model](docs/planning/account-operating-model.md) |
| Assignments, packets, dependencies, and evidence rules | [Delegation and work orders](docs/planning/delegation-and-work-orders.md) |

The bright white workstation, blue-and-white chair, pink/violet lights, and cyan fill in the main image control visual work. Other references supplement it. The source discussion is reference data, not worker instructions.

### Default Account Operating Model

Never run all five accounts on the same problem:
- **Gemini #1**: Platform / backend maker (Track A)
- **Gemini #2**: World / art maker (Track B)
- **Gemini #3**: Runtime / integration maker (Track C)
- **GPT Plus #2**: Independent auditor (audits code/assets/deltas; never writes fixes)
- **GPT Plus #1**: Architect + acceptance authority (issues packets, decides gates, signs acceptance)

**Flow:** `PARENT PACKET → GEMINI IMPLEMENTATION → GPT #2 AUDIT → GEMINI CORRECTION → GPT #2 DELTA AUDIT → GPT #1 ACCEPTANCE → NEXT PACKET`  
**Model Policy:** Use **GPT-6.1 Sol** for ordinary coordination/auditing; use **Astra** only for dangerous cross-lane decisions and major gates.  
**Invariants:** Auditor does not become fixer; maker does not approve itself; later work cannot silently alter an accepted revision.

Historic proof output roots W1/W2/W3 are accepted under **PARENT-RECON-02**; **G1 ACCEPTED (`G1-R1`)** under **PARENT-RECON-03**. Gates **G1-G5 ACCEPTED**. Gate **G6 ACTIVE / REWORK** (with RC3 candidate; RC1/RC2 preserved as history). Gate **G7 LOCKED** pending owner authorization. Production now proceeds under this operating pipeline.

**CANONICAL APPLICATION ROOT: `app/`.** Future CI and authorized G7 deployment use this root exclusively. Historical A6/C3 proof inputs remain immutable. The [RC3 maker handoff](deliveries/G6/full-stack-integration/report.md) is complete at candidate `261c483646f68692a3fe8e184d48d25b8264a6d7`, with exact-candidate CI green. [Supplemental Codex verification](deliveries/G6/rc3-supplemental-codex-verification/report.md) subsequently reproduced seven unfixed platform defects, including two P1 defects. Next assigned packet: [Gemini #1 platform corrections](docs/planning/reconciliation-packets/2026-10-03-rc3-platform-corrections.md). Gemini execution is NOT RUN; this session has no callable Gemini connection. The original [review handoff](docs/planning/reconciliation-packets/2026-10-03-rc3-review-handoff/README.md) is held pending corrections, a newly bound candidate and actual platform return. G6 ACTIVE / REWORK; G7 LOCKED. See the [environment contract](deliveries/G6/full-stack-integration/environment-contract.md).

Local access must be real: a GPT/Gemini worker that can open this folder can reuse its files without repeated attachments; if it cannot, it reports **NO FILE ACCESS**. Claude browser reviewers instead read supplied project knowledge and review packets, flag absent items as **MISSING INPUT**, and review available material. No external account connection or automatic local-file synchronization has been configured.

For GPT/Gemini local tools, open this project as the working folder. AGENTS.md is the shared instruction source; GEMINI.md imports it and this entry point. CLAUDE.md is an unused optional Code adapter; current Claude reviewers use browser project knowledge and review packets. Read only your assigned packet and its named input files. Do not preload the entire archive. Installation, account authentication, and per-tool loading have not been validated by creating these files.

Claude browser reviewers receive the stable review brief through project knowledge and current source/evidence through the assigned review packet. Local paths in their prompts are citation labels and archival destinations, not filesystem access. The parent or a local worker saves their returned review text. See the browser workflow above.
