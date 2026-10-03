# Local production and browser review access

The user selected local coding tools for GPT/Gemini production and confirmed that Claude accounts are browser-based. The inventory is **2 GPT Plus, 3 Gemini AI Pro and 15 Claude free browser accounts**. The coordinator uses the existing GPT resources; it is not a third GPT account. GPT-2 handles avatar/export work first, then integration after independent review. Account labels are work lanes, not proof of simultaneous capacity.

## Shared files

All supplied reference files are under [references](../../references/README.md). [START_HERE.md](../../START_HERE.md) maps the specifications, references, and [account prompts](account-prompts.md). [AGENTS.md](../../AGENTS.md) holds the shared worker and Git rules.

GPT/Gemini workers with real filesystem access read these files directly, without repeated uploads. Start the installed tool with this project as its working folder, then give it the assigned account and packet, for example: `Read START_HERE.md and execute only GPT-1 / W3 from the account prompts.` The image and video must still be opened with tools that support their formats; text context files do not inspect media automatically.

## Startup files and verification

| Tool | Project entry | Current evidence |
| --- | --- | --- |
| Current Codex session / local Codex | [AGENTS.md](../../AGENTS.md), then START_HERE | This session reads the folder; `codex` resolves on PATH. Other account sign-ins are unverified. |
| Gemini CLI | [GEMINI.md](../../GEMINI.md) imports AGENTS and START_HERE | Entry file prepared; `gemini` was not found on PATH. No Gemini account authenticated or dispatched. |
| Claude browser chats | [Browser review workflow](browser-review-workflow.md), stable project knowledge and task packets | User-confirmed mode; no browser account/project has been configured or dispatched here. Local CLI access is not part of this lane. |

These are PATH observations, not a claim that no IDE extension or application exists elsewhere. No CLI installation, global settings, credential files, or provider account configuration was changed by this setup. Import targets are local and can be checked without using model quota. Actual loading still needs a first session in each tool.

Gemini documents workspace context discovery and relative file imports in [GEMINI.md](https://geminicli.com/docs/cli/gemini-md/). The small entry file imports the shared instructions and map; it does not preload the full specifications or historical discussion. [CLAUDE.md](../../CLAUDE.md) is retained only as an optional future Code adapter and is not used by the current browser reviewers.

## Claude review access

The fifteen Claude roles remain assigned to browser reviewers. They inspect provided source, designs, requirements, and test evidence, and return findings or precise requests for local reproduction. They do not need Claude Code for that work.

Use one YOR WORLD Review project in each account that is put to work. Free accounts support Projects, and documents added to project knowledge can be reused across chats in that same project. Store a small stable review brief there; provide only changed requirements and current source/evidence for each review. Account projects are separate, and saving a file on this PC does not update them. [Project availability](https://support.claude.com/en/articles/9517075-what-are-projects), [project knowledge](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects).

Return reviews in chat or an actually generated file. A local worker saves them under reviews/claude-NN/ with packet ID, input revision, reviewer, and date. Native Blender, application/browser/device tests, and database tests remain local execution work. See the [browser review workflow](browser-review-workflow.md) for the packet and result format.

## Current handoff state

Current candidate: `v1.0.0-rc3`, canonical `app/`, pinned maker evidence commit `261c483646f68692a3fe8e184d48d25b8264a6d7`. Fresh maker checks and both exact-candidate GitHub workflows passed. Subsequent [supplemental Codex verification](../../deliveries/G6/rc3-supplemental-codex-verification/report.md) reproduced seven unfixed platform defects, including two P1 defects. Next: [Gemini #1 platform correction packet](reconciliation-packets/2026-10-03-rc3-platform-corrections.md), execution NOT RUN. The original platform verification and GPT Plus #2 audit packets are held for corrections, fresh candidate binding and an actual platform return. G1-G5 ACCEPTED; G6 ACTIVE / REWORK; G7 LOCKED. On 2026-10-03, no callable Gemini CLI was found on PATH or in checked common npm/Node/pnpm/Scoop locations, and checked VS Code/Cursor extension directories contained no Gemini/Google extension. No callable Gemini connector is available. This bounded search does not establish absence of every possible application. No installation, authentication, credential inspection or provider dispatch occurred. Supplemental local tests do not replace either formal account return.

The September 30 / October 1 W1/W2/W3 rework and G1-locked observations in the [historical reconciliation](reviews/2026-10-01-reconciliation.md), old no-Git statements and former three-GPT inventory are preserved history. Later accepted rulings and current work orders govern today's status. Startup files and these packets do not establish account access or model execution.
