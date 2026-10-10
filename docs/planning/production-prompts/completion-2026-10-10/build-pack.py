"""Build the verbatim combined prompt copy and validate this documentation pack."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote

PACK = Path(__file__).resolve().parent
REPO = PACK.parents[3]
BASE = "ff05a155b1d630bdf9d5ce852a1af56415c074ee"
SOURCE_NAMES = [
    "common-execution.md",
    "parent-amendment.md",
    "platform.md",
    "world-runtime.md",
    "integration-release.md",
    "extensions.md",
    "audit-and-acceptance.md",
]
PACKET = REPO / "docs/planning/reconciliation-packets/2026-10-10-finish-02.md"
INDEXES = [
    REPO / "docs/planning/delegation-and-work-orders.md",
    PACK.parent / "README.md",
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def write(path: Path, value: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(value)


def identity(path: Path) -> dict:
    data = read(path).encode("utf-8")
    return {
        "path": path.relative_to(REPO).as_posix(),
        "lfNormalizedUtf8Bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def git(*args: str) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=REPO, text=True, encoding="utf-8"
    ).strip()


def main() -> None:
    sources = [PACK / name for name in SOURCE_NAMES]
    texts = {path.name: read(path) for path in sources}
    preface = (
        "# All 25 detailed YOR WORLD work prompts\n\n"
        "Generated verbatim from the separate prompt files. Start with P01 and follow "
        "[the dispatch order](README.md); send one complete numbered prompt to its "
        "assigned role with the shared instructions. These are work instructions, "
        "not executed implementation, contract approval or release acceptance.\n\n"
    )
    combined = preface + "\n\n---\n\n".join(texts[name].rstrip() for name in SOURCE_NAMES) + "\n"
    write(PACK / "ALL-PROMPTS.md", combined)

    checks = []

    def check(name: str, passed: bool, detail: object) -> None:
        checks.append({"name": name, "result": "PASS" if passed else "FAIL", "detail": detail})

    prompt_ids = []
    bodies = []
    source_metrics = []
    for name, value in texts.items():
        ids = re.findall(r"^#{1,3} (P\d{2})\s+[—-]\s+", value, flags=re.MULTILINE)
        prompts = re.findall(r"```text\n(.*?)\n```", value, flags=re.DOTALL)
        prompt_ids.extend(ids)
        bodies.extend(prompts)
        check(f"fences:{name}", len(re.findall(r"^```", value, re.MULTILINE)) % 2 == 0, len(prompts))
        check(f"prompt-headings:{name}", len(ids) == len(prompts), {"ids": ids, "bodies": len(prompts)})
        source_metrics.append({
            "file": name,
            "words": len(value.split()),
            "prompts": ids,
            "promptBodyWords": [len(body.split()) for body in prompts],
        })

    expected = [f"P{number:02d}" for number in range(1, 26)]
    check("exact-prompt-ids", prompt_ids == expected, prompt_ids)
    check("exact-prompt-count", len(bodies) == 25, len(bodies))
    check("combined-is-verbatim", read(PACK / "ALL-PROMPTS.md") == combined, "Source order: " + ", ".join(SOURCE_NAMES))

    local_links = []
    missing_links = []
    documents = sources + [PACK / "README.md", PACK / "review.md", PACK / "ALL-PROMPTS.md", PACKET]
    for path in documents:
        value = read(path)
        # Only Markdown links, outside fenced code; future handoff paths are not claimed to exist.
        value = re.sub(r"```.*?```", "", value, flags=re.DOTALL)
        for target in re.findall(r"(?<!!)\[[^\]]*\]\(([^)]+)\)", value):
            if re.match(r"(?:[a-z]+:|#)", target, flags=re.IGNORECASE):
                continue
            target = unquote(target.split("#", 1)[0].strip("<>"))
            resolved = (path.parent / target).resolve()
            # validation.json is the output of this invocation.
            exists = resolved.exists() or resolved == PACK / "validation.json"
            row = {"source": path.relative_to(REPO).as_posix(), "target": target, "exists": exists}
            local_links.append(row)
            if not exists:
                missing_links.append(row)
    check("markdown-local-links", not missing_links, {"checked": len(local_links), "missing": missing_links})

    protected = [
        "app", "scripts", ".github", "deliveries",
        "docs/planning/reconciliation-packets/finish-contracts",
        "docs/planning/reviews", "docs/planning/current-status.json",
        "docs/planning/production-prompts/completion-2026-10-09",
    ]
    protected_delta = git("diff", "--name-only", BASE, "--", *protected).splitlines()
    app_tree = git("rev-parse", "HEAD:app")
    check("protected-tracked-paths-unchanged", not protected_delta, protected_delta)
    check("canonical-app-tree-unchanged", app_tree == "42ea29ec235225046a75959eb19eb386ac2f821d", app_tree)

    inventory = sources + [PACK / "README.md", PACK / "review.md", PACK / "ALL-PROMPTS.md", Path(__file__).resolve(), PACKET] + INDEXES
    result = {
        "scope": "Documentation structure, identity and links only; no product tests or gate acceptance",
        "referenceCommit": BASE,
        "observedHeadBeforeCommit": git("rev-parse", "HEAD"),
        "canonicalAppTree": app_tree,
        "hashMode": "SHA-256 of UTF-8 text after CRLF-to-LF normalization",
        "inventoryExclusions": ["validation.json excludes itself to avoid a circular hash"],
        "promptCount": len(bodies),
        "promptBodyWords": sum(len(body.split()) for body in bodies),
        "combinedWordsIncludingSharedInstructions": len(combined.split()),
        "sources": source_metrics,
        "checks": checks,
        "localLinks": local_links,
        "outputs": [identity(path) for path in inventory],
        "result": "PASS" if all(item["result"] == "PASS" for item in checks) else "FAIL",
    }
    write(PACK / "validation.json", json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({key: result[key] for key in ["result", "promptCount", "promptBodyWords", "combinedWordsIncludingSharedInstructions"]}))
    for item in checks:
        if item["result"] != "PASS":
            print(json.dumps(item, ensure_ascii=False))
    raise SystemExit(0 if result["result"] == "PASS" else 1)


if __name__ == "__main__":
    main()
