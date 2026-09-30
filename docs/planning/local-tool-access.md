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

Existing files under deliveries/W1, W2 and W3 are preserved as unaccepted inputs. This folder setup does not execute those proofs or accept their results. Historical handoffs may contain the former three-GPT inventory; the current instructions and account map supersede that count. Each new assignment names exact input revisions, owned paths, and independent review evidence.
