# Local proof audit — 2026-09-30

Reviewer and acceptance owner: parent Codex. Product baseline: revision 2; feasibility dimensions: F1. Production is delegated to local Codex workers, not connected external subscription accounts. This record covers feasibility; it is not V1, final-art, likeness, or release approval.

## Preflight

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Saved reference integrity | PASS | [JSON audit](2026-09-30-reference-audit.json): 12 files, 20,642,135 bytes; all recorded hashes and available original files match |
| Reference index and manifest bookkeeping | PASS | [Index](../../../references/README.md) restored; total bytes and main/01 duplicate pair corrected |
| Documentation local links | PASS | Python path resolution of 89 Markdown links after restoring the index; no missing targets |
| Native execution tools | PASS | Blender 5.2.2 LTS, Node 24.19.0, pnpm 9.15.9, Python 3.12.10, installed Chromium/Chrome/Edge |
| Repository/remote | NOT RUN | Folder is not a Git repository; no repository identity or remote is configured; no commit or push claimed |
| External provider sessions | NOT RUN | Gemini, Claude, and other subscription accounts are not connected or dispatched |

## Delivery review

| Delivery | Maker | Current review state | Required evidence before acceptance |
| --- | --- | --- | --- |
| W1 room/blockout | `w1_room` | Awaiting returned files | Repeatable Blender source/export; reference and gray views; entry/home/mobile/monitor/reverse views; measured door/path and seated-turn clearance |
| W2 avatar/export | `w2_avatar` | Awaiting returned files | Real source/export; five named clips; exported browser playback; repeated/aborted motion and drift/contact evidence; fixture separation |
| W3 HTML foundation | `w3_platform` | Awaiting returned files | Exact schemas and dependency lock; production build; no-JS and world-blocked navigation; keyboard/skip link; honest empty states; payload observations |
| Combined G1 | To be assigned | Waiting for accepted inputs | Separate integration worker; exact input hashes; combined scene with one resident/chair; coherent axes/scale/camera; browser recording and renderer-independent shell |

Each maker returns `report.md` and actual evidence inside its owned delivery directory. A non-maker review and parent audit decide acceptance or rework. Passing source inspection alone does not reproduce a browser or Blender result.

## Integration constraints checked before production handoff

- W1 must expose removable static chair and resident proxy nodes.
- W2 exports the resident and fixture separately, with exact runtime hierarchy recorded. Both scenes load at identity; the export performs the Blender-to-glTF axis conversion once.
- The combined proof keeps the W1 desk/environment and uses one moving resident/chair. It must not double-apply the resident position or chair yaw.
- Shared schemas remain the engineering specification's contracts; proof-only cameras or diagnostics do not silently expand production schemas.
- W3 public projects remain empty and studio entry remains honestly unavailable in its standalone foundation. Development fixtures and combined proof controls must stay outside production routes.
- W2/W3 dependency installs and builds use isolated external temporary directories. Source, generated lockfiles, and evidence are returned to the workspace; no global or workspace dependency installation is part of these packets.

## Remaining gates

User content, project evidence, final likeness, physical mobile/Safari/screen-reader validation, backend services, production asset optimization, all V1 interactions, restore/release proof, and queued extensions remain future work. Feasibility acceptance cannot mark those complete.
