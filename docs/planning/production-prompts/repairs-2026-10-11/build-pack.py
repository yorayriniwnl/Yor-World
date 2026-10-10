"""Assemble and validate the repair documents; never execute production work."""

from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess


PACK = Path(__file__).resolve().parent
ROOT = PACK.parents[3]
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
DESIGN = "8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af"
SOURCES = [
    "01-GEMINI1-PLATFORM.md",
    "02-GEMINI2-WORLD-ART.md",
    "03-GEMINI3-RUNTIME.md",
    "04-SOL-INDEPENDENT-AUDITOR.md",
    "05-PARENT-COMPLETION-AND-RELEASE.md",
    "06-EXTENSIONS.md",
]
PACKET = ROOT / "docs/planning/reconciliation-packets/2026-10-11-finish-05.md"
AUDITS = "deliveries/completion-audits"
REVISION = "finish-04/20261010T211756Z-reaudit"


def git(*args):
    run = subprocess.run(
        ["git", "-C", str(ROOT), *args], capture_output=True, text=True, check=True
    )
    return run.stdout.strip()


def binding(path):
    raw = path.read_bytes()
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "bytes": len(raw),
        "sha256": sha256(raw).hexdigest(),
    }


def finding_ids(text):
    found = set(re.findall(r"\b(?:A3|B3|C3|RT-RA)-\d{2}\b", text))
    ranges = re.finditer(
        r"\b(A3|B3|C3|RT-RA)-(\d{2})(?:\.\.| through (?:A3|B3|C3|RT-RA)-)(\d{2})",
        text,
    )
    for match in ranges:
        found.update(
            f"{match[1]}-{number:02d}"
            for number in range(int(match[2]), int(match[3]) + 1)
        )
    return found


def main():
    raw_sources = [(name, (PACK / name).read_bytes()) for name in SOURCES]
    texts = {name: raw.decode("utf-8") for name, raw in raw_sources}
    records = []
    for index, (name, raw) in enumerate(raw_sources):
        body = texts[name]
        expected = 6 if index == 5 else 1
        fences = re.findall(r"(?m)^```(?:text)?[ \t]*\r?$", body)
        prompts = re.findall(r"(?ms)^```text[ \t]*\r?\n(.*?)^```[ \t]*\r?$", body)
        assert len(fences) == expected * 2 and len(prompts) == expected, name
        if index < 4:
            assert all(identity in body for identity in (BASE, APP_TREE, DESIGN)), name
        for prompt in prompts:
            assert "YOR WORLD" in prompt and "Workspace:" in prompt or (
                "YOR WORLD" in prompt and "Work in C:/Users/yoray/Projects/Yor World" in prompt
            ), name
            assert "AGENTS.md" in prompt and "START_HERE.md" in prompt, name
        records.append({**binding(PACK / name), "fencedPrompts": len(prompts)})
    assert sum(item["fencedPrompts"] for item in records) == 11

    coverage = []
    for lane, source in zip(("FINISH-A1", "FINISH-B1", "FINISH-C1"), SOURCES):
        report = ROOT / f"{AUDITS}/{lane}/{REVISION}/findings.json"
        findings = json.loads(report.read_bytes())["findings"]
        ids = {item["id"] for item in findings}
        assert ids and ids <= finding_ids(texts[source]), (lane, sorted(ids))
        assert ids <= finding_ids(texts[SOURCES[3]]), ("auditor", lane)
        coverage.append({"lane": lane, "source": source, "actualFindingIdsCovered": sorted(ids)})

    header = (
        "# YOR WORLD — all independent repair prompts\n\n"
        "Combined from the six individual prompt files without changing their bytes. "
        "Use [README.md](README.md) to select the proper account and dependency. "
        "Copy only the selected fenced prompt. This document contains 11 prompts.\n"
    ).encode("utf-8")
    combined = header
    for name, raw in raw_sources:
        combined += f"\n\n---\n\nSource: [{name}]({name})\n\n".encode("utf-8") + raw
    (PACK / "ALL-PROMPTS.md").write_bytes(combined)

    named_inputs = {
        "AGENTS.md", "START_HERE.md", "GEMINI.md",
        "docs/planning/reviews/2026-10-10-finish-00-r2/decision.json",
    }
    for body in texts.values():
        normalized = body.replace("\\", "/").replace("C:/Users/yoray/Projects/Yor World/", "")
        paths = re.findall(
            r"\b(?:docs|references|deliveries)/(?:[A-Za-z0-9_.-]+/)*"
            r"[A-Za-z0-9_.-]+\.(?:md|json|png|py|mjs|patch)\b",
            normalized,
        )
        for path in paths:
            if any(path.startswith(root) for root in (
                "deliveries/FINISH-A1/r3/", "deliveries/FINISH-B1-R3/", "deliveries/FINISH-C1-R3/"
            )):
                continue  # Explicit future maker outputs; never pretend they exist.
            named_inputs.add(path)
    input_records = []
    for path in sorted(named_inputs):
        target = ROOT / path
        assert target.is_file(), f"Missing concrete named input: {path}"
        input_records.append(binding(target))

    contract = ROOT / "docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json"
    assert binding(contract)["sha256"] == DESIGN
    contract_records = json.loads(contract.read_bytes())["outputs"]
    for expected in contract_records:
        assert binding(ROOT / expected["path"]) == expected, expected["path"]
    assert git("rev-parse", f"{BASE}:app") == APP_TREE
    assert git("rev-parse", "HEAD:app") == APP_TREE
    assert not git("status", "--porcelain", "--untracked-files=all", "--", "app")

    links = []
    documents = [PACK / name for name in SOURCES] + [PACK / "README.md", PACK / "ALL-PROMPTS.md", PACK / "review.md", PACKET]
    for document in documents:
        for target in re.findall(r"\]\(([^)]+)\)", document.read_bytes().decode("utf-8")):
            target = target.strip("<>").split("#", 1)[0]
            if not target or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", target):
                continue
            resolved = (document.parent / target).resolve()
            if resolved == PACK / "validation.json":
                continue  # The current receipt is written after these checks.
            assert resolved.exists(), f"Broken link: {document.name} -> {target}"
            links.append({"from": document.relative_to(ROOT).as_posix(), "to": resolved.relative_to(ROOT).as_posix()})

    delivery_states = []
    for relative in ("deliveries/FINISH-A1/r3", "deliveries/FINISH-B1-R3", "deliveries/FINISH-C1-R3"):
        target = ROOT / relative
        handoff = {name: (target / name).is_file() for name in (
            "report.md", "input-hashes.json", "output-hashes.json", "source.patch"
        )}
        delivery_states.append({"root": relative, "exists": target.exists(), "topLevelHandoffPresence": handoff,
                                "acceptance": "NOT ASSERTED; file presence alone is not a complete stable return"})

    receipt = {
        "packet": "FINISH-05", "scope": "Documentation only; no implementation or production acceptance",
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "command": "python docs/planning/production-prompts/repairs-2026-10-11/build-pack.py",
        "status": "PASS", "governanceHeadObserved": git("rev-parse", "HEAD"),
        "correctionBase": BASE, "canonicalAppTree": APP_TREE, "acceptedDesignOutputManifestSha256": DESIGN,
        "promptCount": 11, "prompts": records, "combined": binding(PACK / "ALL-PROMPTS.md"),
        "checkedFindingCoverage": coverage, "namedInputBindings": input_records,
        "frozenContractOutputsChecked": len(contract_records), "resolvedLocalMarkdownLinks": links,
        "documentReview": binding(PACK / "review.md"), "assembler": binding(Path(__file__).resolve()),
        "deliveryIntakeObserved": delivery_states,
        "canonicalSourceChanges": [], "productionTests": "NOT RUN; documentation-only changes",
        "externalMakerDispatch": "NOT RUN; ready-to-paste files only",
        "limits": ["Path/identity/navigation validation is not behavioral testing or acceptance.",
                   "Raw input hashes describe preparation bytes, not a promise that live workspace files never change.",
                   "Unknown future successor hashes/allowlists must be bound by Parent when predecessors are accepted.",
                   "validation.json excludes itself; no credential or partial maker file is read or included."],
    }
    (PACK / "validation.json").write_bytes((json.dumps(receipt, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))
    assert (PACK / "validation.json").is_file()
    print(json.dumps({"status": "PASS", "prompts": 11, "inputs": len(input_records),
                      "frozenContractOutputs": len(contract_records), "localLinks": len(links),
                      "canonicalAppTree": APP_TREE, "combinedSha256": receipt["combined"]["sha256"]}))


if __name__ == "__main__":
    main()
