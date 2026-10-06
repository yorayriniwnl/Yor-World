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

Historic proof output roots W1/W2/W3 are accepted under **PARENT-RECON-02**; **G1 ACCEPTED (`G1-R1`)** under **PARENT-RECON-03**. Gates **G1-G5 ACCEPTED**. Gate **G6 ACTIVE / REWORK** (with RC5 candidate; RC1/RC2/RC3/RC4 preserved as history). Gate **G7 LOCKED** pending owner authorization. Production now proceeds under this operating pipeline.

**CANONICAL APPLICATION ROOT: `app/`.** CI and future owner-authorized G7 deployment use this root exclusively. Historical A6/C3 proof inputs remain immutable. The [environment contract](deliveries/G6/full-stack-integration/environment-contract.md) remains the safe configuration reference.

**RC5 update (2026-10-06):** the current human packet authorizes the active-world performance benchmark correction and release rebinding only. [RC5 maker evidence](deliveries/G6/rc5-candidate/report.md) and the [RC5 dossier](docs/releases/v1.0.0-rc5.md) identify actual local and exact-candidate GitHub results. Explicit LOW is selected through the real quality control; Auto/STATIC production policy remains supported. Schema stays `20261005000000_schema_v2`; frozen assets, contact R2 and prior platform corrections remain unchanged.

**RC4 HISTORICAL / SUPERSEDED BY RC5:** [RC4 evidence](deliveries/G6/rc4-candidate/report.md) and its [dossier](docs/releases/v1.0.0-rc4.md) remain immutable, including its local PASS and bundle/hash/manifest. Its GitHub release gate failed because the Auto benchmark could enter supported STATIC fallback. G1-G5 ACCEPTED; RC5 CANDIDATE; G6 ACTIVE / REWORK — awaiting GPT Plus #2 independent audit; G7 LOCKED. Next: GPT Plus #2 full-stack RC5 audit, then GPT Plus #1 adjudication. No deployment or G7 work is authorized.

**RC5 maker execution complete:** fresh local checks and both exact-candidate GitHub workflows PASS at `05a3bd44ee3718eeacefe1575ec50f6b70eeb2b9`; all 13 required release steps succeeded with none skipped. Earlier runner-acquisition failures remain preserved as history. G6 ACTIVE / REWORK — awaiting GPT Plus #2 independent audit; G7 LOCKED.

Local access must be real: a GPT/Gemini worker that can open this folder can reuse its files without repeated attachments; if it cannot, it reports **NO FILE ACCESS**. Claude browser reviewers instead read supplied project knowledge and review packets, flag absent items as **MISSING INPUT**, and review available material. No external account connection or automatic local-file synchronization has been configured.

For GPT/Gemini local tools, open this project as the working folder. AGENTS.md is the shared instruction source; GEMINI.md imports it and this entry point. CLAUDE.md is an unused optional Code adapter; current Claude reviewers use browser project knowledge and review packets. Read only your assigned packet and its named input files. Do not preload the entire archive. Installation, account authentication, and per-tool loading have not been validated by creating these files.

Claude browser reviewers receive the stable review brief through project knowledge and current source/evidence through the assigned review packet. Local paths in their prompts are citation labels and archival destinations, not filesystem access. The parent or a local worker saves their returned review text. See the browser workflow above.
