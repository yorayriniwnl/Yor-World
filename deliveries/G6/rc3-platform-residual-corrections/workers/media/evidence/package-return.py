"""Archive only the maker's owned media files without changing the Git index."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

scratch = Path(sys.argv[1])
project = Path(sys.argv[2])
output = project / "deliveries/G6/rc3-platform-residual-corrections/workers/media"
owned = [Path("app/src/server/media/validate-upload.ts"),
         Path("app/tests/integration/platform/residual-media-still-images.test.ts")]
owned += sorted(path.relative_to(scratch) for path in (scratch / "app/tests/fixtures/residual-media").iterdir() if path.is_file())
files = []
for relative in owned:
    target = output / "files" / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(scratch / relative, target)
    files.append({"canonicalPath": relative.as_posix(), "returnPath": "files/" + relative.as_posix(),
                  "bytes": target.stat().st_size, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})

head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=scratch).decode().strip()
tree = subprocess.check_output(["git", "rev-parse", "HEAD:app"], cwd=scratch).decode().strip()
source = "app/src/server/media/validate-upload.ts"
base = subprocess.check_output(["git", "show", "HEAD:" + source], cwd=scratch)
patch = subprocess.check_output(["git", "diff", "--", source], cwd=scratch)
(output / "source.patch").write_bytes(patch)
(output / "owned-file-list.json").write_text(json.dumps({"files": files}, indent=2) + "\n", encoding="utf8")
inputs = ["AGENTS.md", "START_HERE.md", "docs/planning/delegation-and-work-orders.md",
          "deliveries/G6/rc3-platform-independent-verification/report.md",
          "deliveries/G6/rc3-platform-independent-verification/defects.json",
          "deliveries/G6/rc3-platform-independent-verification/reviewers/media/report.md",
          "deliveries/G6/rc3-platform-independent-verification/reviewers/telemetry-github/report.md",
          "deliveries/G6/rc3-platform-independent-verification/reviewers/contract-crosscheck/report.md"]
identity = {"role": "Fresh Codex production media correction maker; not prior auditor",
            "actualExecution": "Codex production worker (parent model inherited; exact model ID not exposed), Gemini NOT RUN",
            "requestedExecution": "Gemini Pro / Extended Thinking; no callable Gemini available",
            "baseHead": head, "baseAppTree": tree,
            "implementationBase": "02380c323154fdf0815e10543de0a936619f2b79",
            "scratchRoot": str(scratch), "canonicalRoot": "app/",
            "productionSourceBaseSHA256": hashlib.sha256(base).hexdigest(),
            "ownedFiles": files,
            "inputSHA256": [{"path": name, "sha256": hashlib.sha256((project / name).read_bytes()).hexdigest()} for name in inputs],
            "appTreeAfter": None, "appTreeAfterReason": "Parent integrates and commits; maker does not stage or mutate Git index.",
            "newCommit": None, "push": "NOT RUN by this worker; assigned to parent after integrated checks",
            "acceptance": "NOT PERFORMED; maker return requires independent review and parent disposition"}
(output / "implementation-identity.json").write_text(json.dumps(identity, indent=2) + "\n", encoding="utf8")
print(json.dumps({"returnedFiles": len(files), "sourceInsertions": 5, "baseHead": head, "baseAppTree": tree}))
