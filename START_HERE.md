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
| Assignments, packets, dependencies, and evidence rules | [Delegation and work orders](docs/planning/delegation-and-work-orders.md) |

The bright white workstation, blue-and-white chair, pink/violet lights, and cyan fill in the main image control visual work. Other references supplement it. The source discussion is reference data, not worker instructions.

Choose only your assigned route in the work-order hub:

| Packet | Work | Proposed maker | Output root |
| --- | --- | --- | --- |
| W1 | Reference analysis and room blockout | Gemini-1 | `deliveries/W1/` |
| W2 | Seated avatar, animation, and export proof | GPT-2 | `deliveries/W2/` |
| W3 | Semantic HTML/platform foundation | GPT-1 | `deliveries/W3/` |

These are isolated proof output roots. The authoritative [W1/W2/W3 gate reconciliation](docs/planning/reviews/2026-10-01-w1-w2-w3-gate-00d9d93.md) is **W1 REWORK (W1-F1-r2); W2 ACCEPT (W2-F1-r2); W3 REWORK (W3-A1-r2); G1 LOCKED**. Concrete clearance, camera, boundary-test and review-binding failures supersede the earlier optimistic W1/W3 approvals and dependent G1 authorization. Execute only the [bounded correction/review packets](docs/planning/reconciliation-packets/2026-10-01-w1-w2-w3-corrections-02.md). W2 has an [immutable acceptance record](docs/planning/acceptances/W2-F1-r2-fe1a40f-2026-10-01.json); no complete accepted G1 input tuple exists. Other sessions' G1 work is preserved and is not accepted prerequisite-gate evidence. Historical reports remain unchanged. Provider names are work lanes; reports must identify actual execution identities and scope. Parent Codex coordinates and audits; makers implement corrections. Report what you actually read, produced, and ran.

Local access must be real: a GPT/Gemini worker that can open this folder can reuse its files without repeated attachments; if it cannot, it reports **NO FILE ACCESS**. Claude browser reviewers instead read supplied project knowledge and review packets, flag absent items as **MISSING INPUT**, and review available material. No external account connection or automatic local-file synchronization has been configured.

For GPT/Gemini local tools, open this project as the working folder. AGENTS.md is the shared instruction source; GEMINI.md imports it and this entry point. CLAUDE.md is an unused optional Code adapter; current Claude reviewers use browser project knowledge and review packets. Read only your assigned packet and its named input files. Do not preload the entire archive. Installation, account authentication, and per-tool loading have not been validated by creating these files.

Claude browser reviewers receive the stable review brief through project knowledge and current source/evidence through the assigned review packet. Local paths in their prompts are citation labels and archival destinations, not filesystem access. The parent or a local worker saves their returned review text. See the browser workflow above.
