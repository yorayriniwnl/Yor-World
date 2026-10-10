"""Bind/check the R2 architecture packet. Does not execute application tests."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

PACK = Path(__file__).resolve().parent
ROOT = PACK.parents[3]
BASE = "f62a43c5e71c00dcb89e28275ea81d842167db80"
APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
MUTABLE = {"START_HERE.md", "docs/planning/delegation-and-work-orders.md",
           "docs/planning/current-status.json"}


def record(path: Path) -> dict:
    value = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(value),
            "sha256": hashlib.sha256(value).hexdigest()}


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT).decode().strip()


def write_json(path: Path, obj: object) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def bind() -> None:
    if git("rev-parse", "HEAD:app") != APP_TREE:
        raise ValueError("Canonical app changed; a new Parent source binding is required")
    # Normalize only newly owned docs; never normalize predecessor source/evidence.
    for path in PACK.glob("*.md"):
        path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
    inspected: dict[str, str] = {}
    for name in ["02-platform-schema-recovery.md", "03-asset-bindings.md"]:
        for rel, digest in re.findall(r"\| `([^`]+)` \| `([a-f0-9]{64})` \|", (PACK / name).read_text(encoding="utf-8")):
            if rel in inspected and inspected[rel] != digest:
                raise ValueError(f"Conflicting contributor input hash: {rel}")
            inspected[rel] = digest
    extra = ["docs/planning/current-status.json", "references/README.md", "app/pnpm-lock.yaml",
             "app/src/contracts/experience.ts", "app/src/features/experience/preferences-store.ts",
             "app/src/features/experience/controller.ts", "app/src/features/experience/return-snapshot.ts",
             "app/src/features/experience/intent-arbitration.ts", "app/src/features/character/greeting-controller.ts",
             "app/src/features/room/room-controls.tsx", "app/src/features/room/environment-controller.ts",
             "deliveries/FINISH-C1/source.patch", "deliveries/FINISH-C1/report.md",
             "deliveries/completion-audits/FINISH-C1/2026-10-10-r1/report.md",
             "docs/planning/production-prompts/completion-2026-10-10/audit-and-acceptance.md"]
    extra += [p.relative_to(ROOT).as_posix() for p in (ROOT / "app/src/features/world").glob("*.ts")]
    extra += [p.relative_to(ROOT).as_posix() for p in (ROOT / "deliveries/FINISH-C1/source").rglob("*.ts*")]
    inputs = []
    for rel in sorted(set(inspected) | set(extra)):
        source = ROOT / rel
        snap = PACK / "input-snapshots" / rel
        observed = snap if rel in MUTABLE and snap.exists() else source
        item = record(observed)
        item["path"] = rel
        if rel in inspected and item["sha256"] != inspected[rel]:
            raise ValueError(f"Inspected input changed before binding: {rel}")
        item["inspection"] = "contributor-read" if rel in inspected else "parent-source-or-identity-inventory"
        if rel in MUTABLE:
            snap.parent.mkdir(parents=True, exist_ok=True)
            if not snap.exists():
                snap.write_bytes(source.read_bytes())
            item["snapshotPath"] = snap.relative_to(ROOT).as_posix()
        inputs.append(item)
    write_json(PACK / "input-hashes.json", {"packet": "FINISH-00-R2", "hashPolicy": "SHA-256 of raw bytes",
        "baseCommit": BASE, "sourceAppTree": APP_TREE,
        "mutableInputPolicy": "Preserved observed raw snapshots, not later living coordination bytes",
        "inputs": inputs})
    outputs = [record(p) for p in sorted(PACK.rglob("*"))
               if p.is_file() and p.name != "output-hashes.json" and "__pycache__" not in p.parts]
    write_json(PACK / "output-hashes.json", {"packet": "FINISH-00-R2", "hashPolicy": "SHA-256 of raw bytes",
        "exclusions": ["output-hashes.json (self-reference)", "__pycache__ (untracked interpreter cache)"],
        "reviewPolicy": "Review/ruling/validation receipts outside the immutable contract directory",
        "outputs": outputs})


def validate() -> dict:
    errors: list[str] = []
    inputs = json.loads((PACK / "input-hashes.json").read_text(encoding="utf-8"))
    outputs = json.loads((PACK / "output-hashes.json").read_text(encoding="utf-8"))
    checked = 0
    for items in [inputs["inputs"], outputs["outputs"]]:
        for item in items:
            path = ROOT / item.get("snapshotPath", item["path"])
            if not path.is_file():
                errors.append(f"Missing hashed path: {path}")
                continue
            actual = record(path)
            if actual["bytes"] != item["bytes"] or actual["sha256"] != item["sha256"]:
                errors.append(f"Raw-byte identity mismatch: {item['path']}")
            checked += 1
    declared = {x["path"] for x in outputs["outputs"]}
    current = {p.relative_to(ROOT).as_posix() for p in PACK.rglob("*")
               if p.is_file() and p.name != "output-hashes.json" and "__pycache__" not in p.parts}
    if declared != current:
        errors.append("Output inventory differs from owned contract directory")
    ownership_checks = 0
    for name in ["02-platform-schema-recovery.md", "04-path-ownership.md"]:
        value = (PACK / name).read_text(encoding="utf-8")
        for line in value.splitlines():
            columns = [x.strip().strip("`") for x in line.split("|")[1:-1]]
            if len(columns) < 3 or not columns[0].startswith(("src/", "tests/", "supabase/")):
                continue
            rel, status = columns[:2]
            exists = (ROOT / "app" / rel).is_file()
            if status in {"E", "existing", "existing/A1 amended"} and not exists:
                errors.append(f"Existing allowlist path absent: {rel}")
            if status in {"N", "new", "A1 new"} and exists:
                errors.append(f"New allowlist path already exists: {rel}")
            ownership_checks += 1
    link_checks = 0
    for path in PACK.glob("*.md"):
        value = path.read_text(encoding="utf-8")
        if sum(line.startswith("```") for line in value.splitlines()) % 2:
            errors.append(f"Unbalanced code fences: {path.name}")
        # Named inline links only; skip HTTP and literal source examples.
        for target in re.findall(r"\]\(([^)]+)\)", value):
            if target.startswith(("http:", "https:", "#")):
                continue
            target = target.split("#", 1)[0]
            if not (path.parent / target).exists():
                errors.append(f"Missing local link: {path.name} -> {target}")
            link_checks += 1
    migrations = list((ROOT / "app/supabase/migrations").glob("*.sql"))
    tables = set()
    for path in migrations:
        tables.update(re.findall(r"CREATE TABLE(?: IF NOT EXISTS)?\s+(public\.[a-z_]+)", path.read_text(encoding="utf-8"), re.I))
    if len(migrations) != 3 or len(tables) != 16:
        errors.append(f"Actual schema differs: {len(migrations)} migrations, {len(tables)} tables")
    if git("rev-parse", "HEAD:app") != APP_TREE or git("diff", BASE, "--", "app"):
        errors.append("Canonical application changed from bound source")
    return {"packet": "FINISH-00-R2", "status": "FAIL" if errors else "PASS", "hashChecks": checked,
        "allowlistChecks": ownership_checks, "localLinkChecks": link_checks, "migrationCount": len(migrations),
        "publicTableCount": len(tables), "sourceAppTree": APP_TREE, "errors": errors,
        "scope": "Architecture document identity/path/schema checks; application/browser/live tests NOT RUN"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--bind", action="store_true", help="Bind newly owned packet; never change historical inputs")
    args = parser.parse_args()
    if args.bind:
        bind()
    result = validate()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result["errors"] else 0)
