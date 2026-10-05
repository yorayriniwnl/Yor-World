from pathlib import Path
import hashlib
import sys

root = Path(sys.argv[1]).resolve()
lines = []
for path in sorted(root.rglob("*")):
    if path.is_file() and path.name != "SHA256SUMS.txt":
        lines.append(hashlib.sha256(path.read_bytes()).hexdigest() + "  " + path.relative_to(root).as_posix())
(root / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf8")
print(f"Hashed {len(lines)} returned files; SHA256SUMS.txt excludes itself.")
