"""Record actual preview differences against the immutable accepted Git inputs."""
from __future__ import annotations
import hashlib
import io
import json
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = HERE / "source"
BASE = "8e5b954e147a87e36a6869d9940c40f3d4c123f0"
TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
ALLOWED = {
    ".gitignore", "next.config.ts", "package.json", "tsconfig.json", "next-env.d.ts",
    "src/app/layout.tsx", "src/app/sitemap.ts", "src/app/robots.ts",
    "src/app/(public)/page.tsx", "src/app/(public)/about/page.tsx",
    "src/app/(public)/projects/page.tsx", "src/app/(public)/projects/[slug]/page.tsx",
    "src/app/(public)/resume/page.tsx", "src/app/(public)/contact/page.tsx",
}
if subprocess.check_output(["git", "rev-parse", f"HEAD:app"], cwd=ROOT).decode().strip() != TREE:
    raise ValueError("Canonical accepted app tree changed")
inputs, changes = [], []
archive = subprocess.check_output(["git", "archive", BASE, "app"], cwd=ROOT)
with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
    for item in bundle.getmembers():
        if not item.isfile():
            continue
        rel = Path(item.name).relative_to("app").as_posix()
        data = bundle.extractfile(item).read()
        digest = hashlib.sha256(data).hexdigest()
        inputs.append({"path": f"app/{rel}", "bytes": len(data), "sha256": digest})
        relocated = rel.startswith(("src/app/api/", "src/app/admin/")) or rel == "src/proxy.ts"
        preview_rel = f"server-source/{rel}" if relocated else rel
        actual = (SOURCE / preview_rel).read_bytes()
        actual_digest = hashlib.sha256(actual).hexdigest()
        if actual != data and rel not in ALLOWED:
            raise ValueError(f"Unexpected modification: {rel}")
        if relocated or actual != data:
            changes.append({"sourcePath": f"app/{rel}", "previewPath": preview_rel,
                            "acceptedSha256": digest, "previewSha256": actual_digest,
                            "relocated": relocated})
manifest = json.loads((SOURCE / ".openai/hosting.json").read_text(encoding="utf-8"))
receipt = {
    "sourceCommit": BASE, "sourceAppTree": TREE,
    "projectId": manifest["project_id"],
    "sourcePolicy": "Accepted RC6 Git blobs with explicit static-preview adapter",
    "canonicalAppChanged": False, "implementationAcceptance": False, "g7Acceptance": False,
    "previewOrigin": "https://yor-world.deadlygamerayush5.chatgpt.site",
    "backend": "Not deployed; direct email retained, contact form unavailable, admin/API excluded",
    "changes": changes, "inputs": inputs,
    "setupRecovery": "Initial cmd mklink invocation failed; native PowerShell junction succeeded. Build retried after linking dependencies.",
}
(HERE / "evidence/preview-source-binding.json").write_text(
    json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": "BOUND", "inputs": len(inputs), "changes": len(changes)}))
