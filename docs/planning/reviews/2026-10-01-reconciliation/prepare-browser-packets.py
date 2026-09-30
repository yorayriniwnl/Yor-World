"""Package actual text inputs for the two pending W2 browser reviews; no dispatch."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "docs/planning/reconciliation-packets"
BASE = "fe1a40f797ce3ec839939c09a1857b797c197269"
ARCHIVE_SHA = "74bdcfe5b8402be0753afb7d05715172a053c208fe95d2e31c0da0c1598ef6c2"


def git_bytes(path):
    return subprocess.check_output(["git", "show", f"{BASE}:{path}"], cwd=ROOT)


def section(text, prefix):
    lines = text.splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith(prefix))
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    return start + 1, end, "\n".join(lines[start:end])


archive_bytes = git_bytes("deliveries/W2/w2-avatar-proof-r2.zip")
assert hashlib.sha256(archive_bytes).hexdigest() == ARCHIVE_SHA
archive = zipfile.ZipFile(ROOT / "deliveries/W2/w2-avatar-proof-r2.zip")
assert hashlib.sha256((ROOT / "deliveries/W2/w2-avatar-proof-r2.zip").read_bytes()).hexdigest() == ARCHIVE_SHA
roles = {
    "01": ["integration-handoff.md", "asset-metadata.json", "evidence/r2/export-hierarchy.txt",
           "playback/proof.js", "evidence/r2/summary.json", "evidence/r2/native-reopen.json"],
    "13": ["report.md", "asset-metadata.json", "build-avatar-proof.py", "output-hashes.json",
           "evidence/r2/summary.json", "evidence/r2/avatar-proof.glb.validator.json",
           "evidence/r2/fixture-proof.glb.validator.json", "playback/vendor/THREE-LICENSE.txt"],
}
for role, selected in roles.items():
    packet = f"W2-REV-{role}"
    parts = [f"# {packet} — Claude-{role} browser review packet\n",
             f"Prepared 2026-10-01 by parent Codex. Candidate W2-F1-r2 at `{BASE}`. "
             f"Original maker archive SHA-256 `{ARCHIVE_SHA}`. **Not dispatched; no acceptance.**\n",
             "The text below is actually included. Original source-file digests identify the full bytes before UTF-8 decoding/newline presentation and display-only trailing-space removal. "
             "Sections have source line labels; use these labels in findings. Browser access to local C: paths is not assumed. "
             "Declare which supplied text you could inspect. Do not infer that a listed binary was attached.\n",
             "Stable context: product revision 2 and F1 at the pinned commit. Runtime meters/Y-up, rear -Z; "
             "room 4.2 x 3.6 x 2.8 m; desk 2.6 x .8 m, top .75 m, center X/Z=(0,-1.15); "
             "chair/resident=(.30,0,-.36). No schema/F1 amendments. "
             "This is a generic seated-avatar feasibility proof; final likeness, B4/CharacterDirector and V1 are outside this review.\n",
             "Parent reconciliation: engineering/art/product/validation at W2 handoff match the examined baseline. "
             "Later snapshot changes concern browser context/track links/formatting. Full original-to-handoff text history is unavailable. "
             "The original ZIP verifies 125/125 declared members. Three current validator/export-inspection files differ only in timestamp; "
             "this packet uses original ZIP evidence. Git CRLF normalization yields different text digests; no source/asset mutation is inferred.\n",
             "Parent reproduced native reopening and Khronos validation of both exact GLBs; zero validator errors/warnings. "
             "Parent did not replay browser motion or reproduce collision sampling. Gemini independently reviewed maker recordings "
             "and declared native/validator execution; that does not mean it ran the browser suite independently. "
             "Required result: evidence ledger, precise P0/P1/P2/P3 findings, scoped recommendation and only justified local test requests.\n",
             "**Intentionally not attached:** .blend/.glb binaries, WebM recordings, screenshots, historical ZIP payloads and installed dependencies. "
             "Their metadata/digests are supplied, not their executable/media contents. This packet requests interface/provenance review, "
             "not a replacement motion review. Ask for a specific missing input if it limits your assigned conclusion.\n"]
    materials = []
    def add(path, data, origin, excerpt=None):
        full_sha = hashlib.sha256(data).hexdigest()
        text = data.decode("utf-8-sig")
        first, last, content = excerpt or (1, len(text.splitlines()), text)
        materials.append((path, origin, full_sha, first, last, content))
    account_path = "docs/planning/account-prompts.md"
    account = git_bytes(account_path)
    for heading in ["## Shared browser review rules", f"## Claude-{role}"]:
        add(account_path, account, f"Git {BASE}", section(account.decode(), heading))
    engineering_path = "docs/planning/engineering-and-content.md"
    engineering = git_bytes(engineering_path)
    for heading in ["## 4.", "## 5."]:
        add(engineering_path, engineering, f"Git {BASE}", section(engineering.decode(), heading))
    for name in selected:
        add("deliveries/W2/" + name, archive.read(name), "original maker ZIP")
    add("deliveries/W2/artifact-receipt.json", git_bytes("deliveries/W2/artifact-receipt.json"), f"Git {BASE}")
    add("reviews/gemini-3/w2-review.md", git_bytes("reviews/gemini-3/w2-review.md"), f"Git {BASE}; independent report, not maker evidence")
    parts += ["## Included input inventory\n", "| Citation | Producer/source | Full-file SHA-256 | Included lines |\n| --- | --- | --- | --- |"]
    for name, origin, digest, first, last, content in materials:
        parts.append(f"| `{name}` | {origin} | `{digest}` | {first}-{last} |")
    for name, origin, digest, first, last, content in materials:
        numbered = "\n".join(f"{index}: {line}".rstrip() for index, line in enumerate(content.splitlines(), first))
        parts.append(f"\n## Supplied text: {name} (lines {first}-{last})\n\n````text\n{numbered}\n````\n")
    parts.append(f"\nEND OF {packet}. Return your review in chat for local archival as reviews/claude-{role}/W2-F1-r2.md. "
                 "Do not claim to have saved that file or accepted the proof.\n")
    destination = OUT / f"{packet}-browser.md"
    destination.write_text("\n".join(parts), encoding="utf-8")
    print(destination.name, destination.stat().st_size, "bytes")
archive.close()
