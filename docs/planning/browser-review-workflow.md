# YOR WORLD browser review workflow

Date: 2026-09-30. Claude-01–15 are browser reviewers; GPT/Gemini remain local workers. Parent Codex assigns work, audits evidence and accepts deliverables. This document configures no accounts and sends no files.

## Once per used account

Use one **YOR WORLD Review** project in each used Claude account. Claude's current documentation allows free users up to five projects; no paid Code upgrade is needed for this review workflow. The user's actual account configuration remains unverified. [Claude Projects](https://support.claude.com/en/articles/9517075-what-are-projects)

Store a concise stable brief in project knowledge: product purpose, current F1 geometry/contracts, main workstation reference and its observed-versus-authored distinction, assigned reviewer domain, evidence standards and parent acceptance boundary. Add the shared browser rules from [Account prompts](account-prompts.md) to project instructions. Version/date these materials and replace superseded briefs explicitly.

Project knowledge is reusable across chats within that project; ordinary chat content is not shared context unless added to project knowledge. These are separate account workspaces, without cross-account sharing or local-disk synchronization in this workflow. [Project knowledge and instructions](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects)

## For each review

The parent or a local worker prepares a bounded packet:

1. **Envelope:** packet ID, reviewer role, assigned gate, exact candidate/source revision, relevant asset/publication/schema revisions, manifest ID/content and change summary.
2. **Input inventory:** every supplied/omitted item, repository citation label, original line ranges or evidence timecodes, declared revision/hash and producer. Distinguish actual attached bytes from a manifest's unverified claim that a file exists.
3. **Changed source and dependencies:** changed files/diffs plus enough surrounding code, interfaces and specification excerpts to assess behavior. Include previously accepted context only when still applicable to this revision.
4. **Maker evidence:** sanitized commands, tool versions, exit codes, logs, raw measurements and relevant screenshots/recordings. Identify hardware/browser/environment and source/asset revisions. A recording is supplied evidence, not reviewer execution.
5. **Dispatch:** send the current envelope and selected Claude prompt. Identify and reuse the current Project instructions and stable Project knowledge; do not reattach unchanged briefs. Include the full shared browser rules only if this session lacks the current instructions, including ordinary chats. Attach changed supported files or paste numbered, labeled chunks with a final-chunk marker. Unsupported binary/media inputs become MISSING INPUT; request readable metadata or evidence.

Do not include secrets, tokens, production database contents, private contact messages or unnecessary personal data. Repository paths only identify citations; they do not let a browser reviewer open the user's computer.

The reviewer inventories what arrived, flags MISSING INPUT and reviews available material. Missing context narrows conclusions; it does not erase valid findings from available files. New revisions need an updated packet, not an assumption that project knowledge follows local edits.

## Result and local archival

Return Markdown with:

- Packet/revision/manifest, actual provider/model if exposed, available tools and inspected/missing inventory.
- A ledger separating **SOURCE**, **MAKER EVIDENCE**, **REVIEWER EXECUTED** and **UNVERIFIED**, with PASS/FAIL/NOT RUN and limitations.
- Findings with severity, file/line or node/timecode, evidence, expected/observed behavior, reproduction and exact local-maker test request.
- A scoped accept/rework/insufficient-evidence recommendation, open gaps and next bounded action.

Reviewer-executed checks require an actually available sandbox/research tool and recorded inputs/results. Browser review cannot replace device, Blender, database, integration or production-browser execution by local makers.

The parent or local worker saves returned text under `reviews/claude-NN/`, preserving packet/revision identity and earlier reviews. Requested tests return as a new evidence packet; the parent audits and accepts. No automatic download or synchronization is assumed. If quota interrupts review, retain completed findings and the remaining inventory, then resume within the account's normal limits.

