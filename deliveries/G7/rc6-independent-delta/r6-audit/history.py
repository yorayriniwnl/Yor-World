"""Own raw history snapshot; never modifies input files."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
PREFIXES = [
    "deliveries/C4", "deliveries/G6/full-stack-integration",
    "deliveries/G6/rc4-candidate", "deliveries/G6/rc5-candidate",
    "deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
    "deliveries/G7/rc6-candidate-r3", "deliveries/G7/rc6-candidate-r4",
    "deliveries/G7/rc6-candidate-r5", "deliveries/G7/rc6-independent-delta/r5-audit",
    "deliveries/G7/rc6-independent-delta/r2-audit",
    "deliveries/G7/rc6-independent-delta/r3-audit",
    "deliveries/G7/rc6-independent-delta/r4-audit",
    "deliveries/G7/rc6-independent-delta/gate-advice/final-r3",
    "deliveries/G7/rc6-independent-delta/gate-advice/final-r4",
    "docs/planning/reviews/2026-10-06-g6-r1",
    "docs/planning/reviews/2026-10-06-g6-r1.md",
    "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
    *[f"docs/releases/v1.0.0-rc{n}.md" for n in range(1, 6)],
]

def snapshot():
    result = {}
    for name in PREFIXES:
        path = ROOT / name
        if not path.exists():
            continue
        files = path.rglob("*") if path.is_dir() else [path]
        for file in files:
            if file.is_file():
                result[file.relative_to(ROOT).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    return dict(sorted(result.items()))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=["before", "after"])
    args = parser.parse_args()
    actual = snapshot()
    if args.phase == "before":
        target = HERE / "historical-before.json"
        if target.exists():
            raise SystemExit("Refuse to replace original baseline")
        target.write_text(json.dumps(actual, indent=2) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps({"snapshotFiles": len(actual)}))
    else:
        before = json.loads((HERE / "historical-before.json").read_text(encoding="utf-8"))
        changed = sorted(name for name in set(actual) | set(before) if actual.get(name) != before.get(name))
        receipt = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   "files": len(actual), "changed": changed, "ownCheck": True,
                   "overallStatus": "PASS" if not changed else "FAIL"}
        (HERE / "history-preservation.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
        print(json.dumps(receipt))
        if changed:
            raise SystemExit(1)
