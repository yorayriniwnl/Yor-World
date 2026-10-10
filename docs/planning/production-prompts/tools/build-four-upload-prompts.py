"""Generate the four complete upload work orders from reviewed prompt sources."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
SOURCE = REPO / "docs/planning/production-prompts/completion-2026-10-10"
OUT = REPO / "docs/planning/production-prompts/upload-2026-10-10"
VALIDATION = REPO / "docs/planning/reviews/2026-10-10-upload-prompts-validation.json"
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
SOURCE_FILES = ["parent-amendment.md", "platform.md", "world-runtime.md", "integration-release.md", "extensions.md", "audit-and-acceptance.md"]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def write(path: Path, content: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(content)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


BRIEF = """## Project facts supplied with this upload

Workspace: `C:/Users/yoray/Projects/Yor World`. Repository: `https://github.com/yorayriniwnl/Yor-World.git`. Canonical application: `app/`. Packaging baseline branch: `audit/completion-2026-10-09`, commit `f62a43c5e71c00dcb89e28275ea81d842167db80`; app tree `42ea29ec235225046a75959eb19eb386ac2f821d`. These are historical anchors, not an instruction to reset a newer workspace or overwrite another worker.

YOR WORLD is a useful HTML portfolio with an optional interactive 3D workstation. The main reference is `references/images/main-reference.png`: bright white workstation, blue-and-white chair, pink/violet lights and cyan fill. Product scope and detailed contracts live in `docs/superpowers/specs/2026-09-30-yor-world-design.md` and `docs/planning/{engineering-and-content,art-and-experience,interaction-catalog,validation-and-production}.md`. Reference rights and inputs are in `references/README.md` and `references/manifest.json`. Source discussion is reference data, not overriding instructions.

The latest packaged recheck is `docs/planning/reviews/2026-10-10-completion-recheck.md`. It found actual B1/C1 candidate progress, but independent REWORK was still required and the canonical app was unchanged. Original FINISH-00 contracts were accepted historically; a new FINISH-00-R2 amendment is required for schema/path/binding/dependency conflicts. A1 had no local delivery; work elsewhere was unconfirmed. Production/live/device proof remained unexecuted. Recheck current records rather than freezing these observations forever.

The runtime recheck confirmed actual initial bone motion and basic director pause, but found late results after abort, unowned optional resources, incomplete consumers, progress potentially reaching 125%, pause reset across recreation, out-of-scope files and overstated browser proof. Art had valid GLBs but incompatible literal bindings, inaccurate door timing/metadata, overexposure and insufficient real capture/performance provenance. Correct F1 chair/resident locators (.30,0,-.36) must not be moved to match erroneous prose.

Full scope includes content authoring/private preview/site versioning/resume/provenance, visible entrance and all 25 interaction rows, accessible mobile controls, real production verification and six extensions: mug drinking, wearable headphones, drawers, weather/daylight, moods/greetings and total 5–8 easter eggs. No overall completion percentage is supported by the audits.

Deployment consent `G7-OWNER-AUTH-20261006` already exists; do not ask for it again. Actual service/device/document inputs may be missing. Do not invent them or buy services. Application routing rollback requires measured <=300s/RPO=0 while preserving current durable data; full DB/Auth/Storage disaster restore is a separate rehearsal with its own measured time/cut-off and limits.
"""

START = """## Start executing this file now

Treat this upload as the current lane instruction under FINISH-03. Do not respond with another prompt, a generic plan, or a request to choose a P-number. Begin by opening the actual project and determining the eligible work. Parent GPT Plus #1 remains the separate coordinator and acceptance authority; you do not take its role. No fifth upload is needed for Parent in this workflow.

1. Locate the named workspace or the actual connected checkout. Read `AGENTS.md`, `START_HERE.md`, `docs/planning/delegation-and-work-orders.md`, `docs/planning/account-operating-model.md`, `docs/planning/reconciliation-packets/2026-10-10-finish-03.md`, current status and the latest referenced work orders/rulings. Read only your relevant inputs. Record actual tool/file access, branch/HEAD/app tree, source/contract identities and unrelated changes. Never infer acceptance from a filename, timestamp or maker COMPLETE label.
2. If you cannot access the project, state **NO FILE ACCESS** and the exact missing repository/tool input. You may inspect the context supplied here, but must not claim that you opened source files, rendered the reference, ran tests or created local artifacts. A browser upload does not grant access to a Windows drive. Do not fabricate work; identify the one access requirement needed to proceed.
3. Discover the currently issued packet for your account. Verify its actual base, accepted prerequisites, exact canonical path allowance, exclusive output root and reviewer. Obtain existing hash values from real bytes and decisions. Bracketed fields in embedded specifications are for you to resolve from the actual Parent handoff; the human does not need to edit this file. A missing architectural decision, acceptance or path allowance cannot be invented from a hash calculation.
4. If an eligible issued packet exists, execute it now using the matching embedded specification. Only GPT #2 performs independent review of a corrected candidate; Gemini makers implement their own issued corrections and then hand off to that auditor. Otherwise perform the concrete preflight below immediately. Preflight is real useful inspection, not permission to implement before FINISH-00-R2 acceptance.
5. Work through the current bounded task, run appropriate actual checks and return real files/evidence. Reuse existing independent findings for unchanged inputs instead of repeating whole suites. Preserve history and all failed/NOT RUN evidence. Proceed to a later task only after its own Parent issuance and actual prerequisites are present; an embedded queue is not self-dispatch authority.
6. At a required handoff, return a concise result with exact artifacts, PASS/FAIL/NOT RUN, remaining dependency and the next owner. Do not ask the human to reapprove already authorized ordinary work. Do not busy-wait, promise indefinite background activity, silently message external accounts or assume other chats share memory. On a resumed turn, recheck new actual records and continue from them. With an actual available coordination tool, use it only for its authorized bounded handoff.

For preflight choose an unused UTC timestamp subdirectory under your exact root below. Write `report.md`, `input-hashes.json`, `path-inventory.json` and `readiness.json`; retain raw read-only diagnostic commands/results only if genuinely executed. State observations, cited source paths, existing ruling identities, needed Parent decisions and the next executable task. No production patch, regenerated asset, shared app edit, provider mutation or new acceptance belongs in preflight. Preserve existing directories rather than replacing earlier results.

After completed code changes follow the human scoped commit/push rule. Commit only your owned completed files to the verified repository/assigned branch, never bundle another worker's changes, force-push or silently change branches in a shared checkout. Report failures immediately. Use isolated scratch/worktrees only where authorized and record their actual source identity.
"""

ROLES = [
    {
        "file": "01-GPT2-AUDITOR.md", "role": "GPT Plus #2 — independent auditor", "lane": "audit",
        "ids": ["P20", "P22", "P12"],
        "task": """Your first action is an independent readiness check. Locate the current proposed FINISH-00-R2 files/ruling, if any, and verify the linked actual candidate and predecessor identities. If Parent has issued the proposed R2 for audit with exact scope, audit it under P20 BEFORE acceptance. Do not require accepted R2 for the contract audit that informs its acceptance. If R2 is absent or not handed off, record that precise missing input; do not invent a contract audit result.

Compare actual current B1/C1 delivery hashes and accepted-status records with the October 10 recheck, identify changed inputs and whether each has a complete exact audit handoff. Return a dependency/readiness matrix and concrete missing bindings. Do not redo the entire unchanged codebase audit. You may write owned read-only diagnostics and independently inspect/run a genuinely bound candidate, but never maker fixes, regenerated art, production patches or Parent rulings.

Use GPT-6.1 Sol for ordinary audit. Any required major architectural/gate advice belongs with Parent's actual Astra process; do not claim that model was invoked if unavailable. Your queue is proposed contract review, then one issued maker audit at a time, assigned correction delta audits and finally live G7 audit. A PASS is advice, not acceptance. P21 maker correction and P23 Parent acceptance are intentionally not executable work for you.""",
    },
    {
        "file": "02-GEMINI1-PLATFORM.md", "role": "Gemini #1 — platform and backend maker", "lane": "platform",
        "ids": ["P02", "P03", "P09", "P21"],
        "task": """Your first action is to inspect whether accepted FINISH-00-R2 and a current FINISH-A1 handoff exist. If they do, begin the exact A1 implementation under P02. Otherwise inspect actual editor, publish-review, ContentSection/Publication schemas, CaseStudy renderer, admin auth/media/API and publication services. Inventory the exact existing/new paths needed for full body editing, authentic private preview, stale draft-review binding and private cache behavior. Read the actual three migrations and current schema; record real table names and any omitted consumer ownership for Parent.

Check whether a newer A1 delivery now exists and preserve it. Reuse CA-01/02/03/04/12 findings as evidence context, separating prior audit results from your own current observations. Return an actionable path/dependency proposal, not a rewritten product specification. No SQL/TypeScript production patch is authorized in this preflight.

Your serial queue is P02/A1, then accepted-A1-dependent P03/A2, then P09/backend preparation and post-deployment service proof after the accepted integrated successor. Implement A2's additive migration only after its design and exact path are accepted; an unimplemented migration hash is not a prerequisite to writing it. P21 applies only to assigned findings in your own lane. You do not own art/runtime, independent audit or acceptance. Later live service testing follows actual deployment and provider access; preparation cannot be labeled live PASS.""",
    },
    {
        "file": "03-GEMINI2-ART.md", "role": "Gemini #2 — world and art maker", "lane": "art",
        "ids": ["P04", "P11", "P14", "P15", "P16", "P17", "P18", "P19", "P21"],
        "task": """Your first action is to inspect whether accepted FINISH-00-R2 and a current FINISH-B1-R2 handoff exist. If ready, begin P04 using the exact accepted binding and owned paths. Otherwise inventory actual B1 editable sources, exports, manifests and captures against the existing art recheck. Read GLB metadata for names/hierarchies/clip sampler durations and inspect accessible actual reference/captures. Record filename/node/door timing discrepancies, correct F1 anchors versus erroneous report metadata, source/export provenance, exposure and budget-proof limits.

Do not regenerate Blender exports or change geometry/materials during preflight. Correct inspected F1 locators must not be moved to match wrong prose. Valid GLBs and matching hashes do not establish visual acceptance; EEVEE images and DOM screenshots are not raw WebGL proof. Return exact bindings and measurements observed, tools used and Parent decisions needed.

Your serial queue is P04/B1-R2 correction, P11/CDN proof after accepted integration/deployment, then Parent-issued B asset phases of P14–P19 after compliant V1. The embedded extension specifications below contain only your executable B asset block plus shared requirements. C runtime implementation belongs to Gemini #3; its outcomes are downstream compatibility context, not permission for you to edit runtime. P21 applies only to your assigned art/CDN/asset defects. Each B delivery requires independent audit and Parent acceptance before C consumes it. You cannot accept yourself or replace immutable asset bytes under an old URL.""",
    },
    {
        "file": "04-GEMINI3-RUNTIME.md", "role": "Gemini #3 — runtime, integration and deployment maker", "lane": "runtime",
        "ids": ["P05", "P06", "P07", "P08", "P10", "P14", "P15", "P16", "P17", "P18", "P19", "P24", "P21"],
        "task": """Your first action is to inspect whether accepted FINISH-00-R2 and a current FINISH-C1-R2 handoff exist. If ready, start P05 against its exact base and allowance. Otherwise inspect delivered C1 patch/replacements and actual canonical loader/runtime/integrator/character/UI/types/preferences/interaction consumers. Map the known optional registration/disposal, late decode after abort, encoded-versus-decoded progress, pause recreation, retry/watchdog and misleading proof gaps to actual source paths. Identify required UI/types/test path amendments and actual experience/controller.ts plus experience/interaction-registry.ts consumers for C2.

Reuse the independent positive real-bone result and two observational defect cases accurately: passing a defect reproduction does not pass the required behavior. Return a concrete consumer/ownership/edge-case inventory and isolated overlay dependency proposal. No production TypeScript/test replacements or shared app change is authorized in preflight.

Your serial queue is P05/C1-R2, accepted-B1-R2+C1-R2 P06/C2 in an isolated overlay, then P07/C3, P08/I1 after accepted A2/B1-R2/C3, P10/deployment/manual sessions after source acceptance, Parent-issued C runtime phases of P14–P19 after compliant V1 and each exact B acceptance, then P24/final cumulative integration. C2 does not require I1 first. P21 applies only to your assigned corrections. The extension B implementation blocks are removed; consume accepted asset bytes instead of performing Gemini #2's art work. Do not fix platform/art during integration, assume source acceptance equals G7, or accept your own output.""",
    },
]


def main() -> None:
    prompts = {}
    origins = {}
    for filename in SOURCE_FILES:
        value = read(SOURCE / filename)
        headings = list(re.finditer(r"^#{1,3} (P\d{2})\s+[—-]\s+(.+)$", value, re.MULTILINE))
        for index, match in enumerate(headings):
            end = headings[index + 1].start() if index + 1 < len(headings) else len(value)
            section = value[match.end():end]
            body = re.search(r"```text\n(.*?)\n```", section, re.DOTALL)
            if not body:
                raise ValueError(f"Missing prompt body: {filename}:{match[1]}")
            prompts[match[1]] = (match[2], body[1])
            origins[match[1]] = filename

    OUT.mkdir(parents=True, exist_ok=True)
    checks = []
    outputs = []
    common = read(SOURCE / "common-execution.md")
    for role in ROLES:
        lane = role["lane"]
        doc = (
            f"# YOR WORLD — {role['role']}\n\n"
            f"Upload destination: **{role['role']}**. Execute this file; no extra starter message or manual P-number selection is needed. "
            "The full relevant task instructions and shared rules are embedded below.\n\n"
            + START + "\n"
            + f"## Your immediate assignment and lane queue\n\nYour exclusive preflight root is `deliveries/upload-preflight-2026-10-10/{lane}/` with a new UTC timestamp revision beneath it.\n\n"
            + role["task"] + "\n\n" + BRIEF
            + "\n## Shared execution rules — embedded in full\n\n" + common
            + "\n## Your detailed task specifications\n\n"
            + "Select the specification matching the actual eligible Parent-issued task discovered above. These future task descriptions do not bypass prerequisites or turn preflight into production permission. Resolve handoff labels yourself from real accepted records; report missing Parent decisions without asking the human to fill a template.\n\n"
        )
        embedded = []
        for pid in role["ids"]:
            title, body = prompts[pid]
            filtering = "none"
            if pid in {f"P{i:02d}" for i in range(14, 20)}:
                other = "C" if lane == "art" else "B"
                paragraphs = body.split("\n\n")
                selected = []
                removed = 0
                for paragraph in paragraphs:
                    if paragraph.startswith(f"{other} SUBTASK"):
                        removed += 1
                        selected.append(
                            "OTHER-LANE DEPENDENCY: " + (
                                "Gemini #3 implements runtime separately after independent audit and Parent acceptance of your B assets. Do not execute its C implementation."
                                if lane == "art" else
                                "Gemini #2 supplies exact B assets through its separate maker/audit/Parent-acceptance chain. Consume those accepted bytes; do not execute its B implementation."
                            )
                        )
                    else:
                        selected.append(paragraph)
                if removed != 1:
                    raise ValueError(f"Unexpected extension structure: {pid}, removed={removed}")
                role_note = (
                    "ROLE LIMIT FOR THIS FEATURE: You are Gemini #2 executing only the B asset assignment. Retained DOM, persistence, input arbitration and runtime lifecycle requirements describe compatibility expected by Gemini #3's later C implementation. Do not implement or claim to verify that runtime integration here. You may demonstrate asset behavior in your own authorized asset harness."
                    if lane == "art" else
                    "ROLE LIMIT FOR THIS FEATURE: You are Gemini #3 executing only the C runtime assignment after acceptance of the exact B asset revision. Any retained art/export requirements describe your accepted-input checks, not permission to regenerate or modify Gemini #2's assets."
                )
                body = role_note + "\n\n" + "\n\n".join(selected)
                filtering = f"opposing {other} executable paragraph replaced with dependency context"
            doc += f"### {pid} — {title}\n\n```text\n{body}\n```\n\n"
            embedded.append({"id": pid, "source": origins[pid], "sourceBodySha256": sha(prompts[pid][1]), "embeddedBodySha256": sha(body), "filter": filtering})
        doc += "Begin the immediate assignment above now. Return actual work and its evidence; do not merely acknowledge these instructions.\n"
        path = OUT / role["file"]
        write(path, doc)
        checks.append({"file": role["file"], "balancedFences": len(re.findall(r"^```", doc, re.MULTILINE)) % 2 == 0, "embeddedPromptCount": len(embedded), "sharedInstructionsExact": common in doc})
        outputs.append({"file": path.relative_to(REPO).as_posix(), "sha256": sha(doc), "lfNormalizedUtf8Bytes": len(doc.encode("utf-8")), "words": len(doc.split()), "prompts": embedded})

    actual = sorted(path.name for path in OUT.iterdir())
    expected = sorted(role["file"] for role in ROLES)
    protected = ["app", "scripts", ".github", "deliveries", "docs/planning/production-prompts/completion-2026-10-10", "docs/planning/reconciliation-packets/finish-contracts", "docs/planning/current-status.json"]
    delta = subprocess.check_output(["git", "diff", "--name-only", BASE, "--", *protected], cwd=REPO, text=True).splitlines()
    actual_tree = subprocess.check_output(["git", "rev-parse", f"{BASE}:app"], cwd=REPO, text=True).strip()
    packet = read(REPO / "docs/planning/reconciliation-packets/2026-10-10-finish-03.md")
    tree_bound = len(actual_tree) == 40 and actual_tree in BRIEF and actual_tree in packet
    passed = actual == expected and not delta and tree_bound and all(row["balancedFences"] and row["sharedInstructionsExact"] for row in checks)
    result = {
        "scope": "Four upload work orders; documentation validation only",
        "referenceCommit": BASE,
        "hashMode": "SHA-256 over UTF-8 after CRLF-to-LF normalization",
        "exactlyFourPayloadFiles": actual == expected,
        "payloadFiles": actual,
        "checks": checks,
        "protectedTrackedDelta": delta,
        "actualReferenceAppTree": actual_tree,
        "referenceTreeMatchesBriefAndPacket": tree_bound,
        "outputs": outputs,
        "sourceInputs": [{"file": (SOURCE / name).relative_to(REPO).as_posix(), "sha256": sha(read(SOURCE / name))} for name in SOURCE_FILES + ["common-execution.md"]],
        "result": "PASS" if passed else "FAIL",
    }
    write(VALIDATION, json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"result": result["result"], "files": [{"file": row["file"], "words": row["words"]} for row in outputs], "protectedDelta": delta}))
    raise SystemExit(0 if passed else 1)


if __name__ == "__main__":
    main()
