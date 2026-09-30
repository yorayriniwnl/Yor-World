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

These are isolated proof output roots. Earlier local W1/W2/W3 attempts are retained as unaccepted artifacts; consult the work-order hub for the current maker, evidence, and acceptance state. The provider names above remain proposed lanes. Parent Codex coordinates and audits; an assigned production worker performs later integration. Report what you actually read, produced, and ran.

Local access must be real: a worker that can open this folder can reuse its files without repeated attachments. A browser-only ChatGPT, Gemini, or Claude chat does not gain filesystem access from a subscription or this document. No external account connection has been configured. If you cannot open the files, say **NO FILE ACCESS** and identify the missing inputs; use the browser-only fallback in the work-order hub.

For GPT/Gemini local tools, open this project as the working folder. AGENTS.md is the shared instruction source; GEMINI.md imports it and this entry point. CLAUDE.md is an unused optional Code adapter; current Claude reviewers use browser project knowledge and review packets. Read only your assigned packet and its named input files. Do not preload the entire archive. Installation, account authentication, and per-tool loading have not been validated by creating these files.

Claude browser reviewers receive the stable review brief through project knowledge and current source/evidence through the assigned review packet. Local paths in their prompts are citation labels and archival destinations, not filesystem access. The parent or a local worker saves their returned review text. See the browser workflow above.
