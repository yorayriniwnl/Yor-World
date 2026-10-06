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

**Current ruling (2026-10-06): G1-G6 ACCEPTED. v1.0.0-rc5 = accepted release candidate under [G6-R1](docs/planning/reviews/2026-10-06-g6-r1.md). G7 LOCKED — awaiting explicit owner production authorization.** Prior proof/gate records remain immutable.

**CANONICAL APPLICATION ROOT: `app/`.** Accepted source/bundle and the maker-era app README remain frozen. The [independent RC5 audit](docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md), [RC5 dossier](docs/releases/v1.0.0-rc5.md) and [Parent ruling](docs/planning/reviews/2026-10-06-g6-r1.md) separate maker, auditor and acceptance authority. All required hosted checks passed on audited HEAD 2a0b1ad.

Use [current pre-G7 prerequisites](docs/operations/pre-g7-prerequisites.md) for schema-v2/three-migration and full publication hardening preparation. The old environment contract is historical, not current setup guidance. G6's explicit P2/P3 deferrals and physical/manual/hosted NOT RUN limits remain open requirements; neither acceptance nor this entry point starts their execution.

RC4 is historical/superseded; all RC1–RC4 evidence remains unchanged. Any accepted-source change requires a new bounded Parent packet, revision-bound proof and independent delta adjudication. No deployment, resources or DNS changes are authorized.

Historical maker-phase status (2026-10-06, before G6-R1): G1 ACCEPTED; G1-G5 ACCEPTED; G6 ACTIVE / REWORK; RC5 candidate; RC1/RC2/RC3/RC4 preserved as history; G7 LOCKED. This visible dated record is retained for maker-era provenance and the frozen integrity workflow. The legacy token check does not adjudicate current acceptance; the leading G6-R1 status is authoritative.

Local access must be real: a GPT/Gemini worker that can open this folder can reuse its files without repeated attachments; if it cannot, it reports **NO FILE ACCESS**. Claude browser reviewers instead read supplied project knowledge and review packets, flag absent items as **MISSING INPUT**, and review available material. No external account connection or automatic local-file synchronization has been configured.

For GPT/Gemini local tools, open this project as the working folder. AGENTS.md is the shared instruction source; GEMINI.md imports it and this entry point. CLAUDE.md is an unused optional Code adapter; current Claude reviewers use browser project knowledge and review packets. Read only your assigned packet and its named input files. Do not preload the entire archive. Installation, account authentication, and per-tool loading have not been validated by creating these files.

Claude browser reviewers receive the stable review brief through project knowledge and current source/evidence through the assigned review packet. Local paths in their prompts are citation labels and archival destinations, not filesystem access. The parent or a local worker saves their returned review text. See the browser workflow above.
