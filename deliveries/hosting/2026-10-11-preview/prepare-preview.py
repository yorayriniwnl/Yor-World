"""Create a private, static preview from accepted RC6 without editing canonical app."""
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
ORIGIN = "https://yor-world.deadlygamerayush5.chatgpt.site"
if subprocess.check_output(["git", "rev-parse", f"{BASE}:app"], cwd=ROOT).decode().strip() != TREE:
    raise ValueError("Accepted source binding differs")
if (SOURCE / "src").exists():
    raise ValueError("Prepared source already exists; do not overwrite")
archive = subprocess.check_output(["git", "archive", BASE, "app"], cwd=ROOT)
inputs = []
with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
    for item in bundle.getmembers():
        if not item.isfile():
            continue
        rel = Path(item.name).relative_to("app")
        target = (SOURCE / rel).resolve()
        if not target.is_relative_to(SOURCE.resolve()):
            raise ValueError("Source archive escapes preview checkout")
        data = bundle.extractfile(item).read()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        inputs.append({"path": f"app/{rel.as_posix()}", "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})

changes = []
def replace(rel: str, before: str, after: str) -> None:
    target = SOURCE / rel
    value = target.read_text(encoding="utf-8")
    if before not in value:
        raise ValueError(f"Expected adapter input absent: {rel}")
    target.write_text(value.replace(before, after), encoding="utf-8", newline="\n")
    changes.append(rel)

# Preserve backend/admin source, but exclude it from the static route tree.
for rel in ["src/app/api", "src/app/admin", "src/proxy.ts"]:
    old = (SOURCE / rel).resolve()
    new = (SOURCE / "server-source" / rel).resolve()
    if not old.is_relative_to(SOURCE.resolve()) or not new.is_relative_to(SOURCE.resolve()):
        raise ValueError("Move escapes isolated preview checkout")
    new.parent.mkdir(parents=True, exist_ok=True)
    old.rename(new)
    changes.append(f"{rel} -> server-source/{rel}")
replace("src/app/layout.tsx", 'import { connection } from "next/server";\n', "")
replace("src/app/layout.tsx", '  // Nonces are per request; every HTML route must render after an actual request.\n  await connection();\n', "")
for target in (SOURCE / "src/app").rglob("*.tsx"):
    if 'export const dynamic = "force-dynamic";' in target.read_text(encoding="utf-8"):
        replace(target.relative_to(SOURCE).as_posix(), 'export const dynamic = "force-dynamic";', 'export const dynamic = "force-static";')
replace("src/app/sitemap.ts", 'export const dynamic = "force-dynamic";', 'export const dynamic = "force-static";')
replace("src/app/robots.ts", 'import type { MetadataRoute } from "next";', 'import type { MetadataRoute } from "next";\nexport const dynamic = "force-static";')
replace("src/app/(public)/projects/[slug]/page.tsx", 'import type { Metadata } from "next";',
        'import type { Metadata } from "next";\nimport { approvedPublication } from "@/content/approved-publication";\nexport function generateStaticParams() { return approvedPublication.projects.filter(p => p.id !== "candidatex").map(p => ({ slug: p.slug })); }\nexport const dynamicParams = false;')
replace("src/app/(public)/projects/[slug]/page.tsx", 'https://www.yorayriniwnl.in/projects/', f'{ORIGIN}/projects/')
replace("src/app/(public)/contact/page.tsx", 'import { ContactForm } from "@/features/contact/contact-form";\n', "")
replace("src/app/(public)/contact/page.tsx", 'Verified contact channels and durable in-browser messaging for Ayush Roy.', 'Direct contact channels for Ayush Roy.')
contact = SOURCE / "src/app/(public)/contact/page.tsx"
text = contact.read_text(encoding="utf-8")
start = text.index('        <section aria-labelledby="form-heading">')
end = text.index('        <section aria-labelledby="direct-heading">', start)
text = text[:start] + '''        <section aria-labelledby="form-heading">
          <h2 id="form-heading">Send a message</h2>
          <p>Message sending is not available in this preview. Please use the direct email link below.</p>
        </section>

''' + text[end:]
contact.write_text(text, encoding="utf-8", newline="\n")
changes.append("src/app/(public)/contact/page.tsx: truthful unavailable form notice")
(SOURCE / "next.config.ts").write_text('import type { NextConfig } from "next";\nconst config: NextConfig = { output: "export", poweredByHeader: false, reactStrictMode: true, images: { unoptimized: true } };\nexport default config;\n', encoding="utf-8")
changes.append("next.config.ts: static preview export")
ts = SOURCE / "tsconfig.json"
config = json.loads(ts.read_text(encoding="utf-8"))
config["exclude"] = list(set(config.get("exclude", [])) | {"tests", "server-source"})
ts.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
package_path = SOURCE / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package["scripts"]["build"] = "next build --webpack"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")
changes += ["tsconfig.json: preview build excludes preserved backend route tree and tests", "package.json: explicit webpack export build"]
manifest_path = SOURCE / ".openai/hosting.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["static"] = {"directory": "out", "not_found_handling": "404-page"}
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
with (SOURCE / ".gitignore").open("a", encoding="utf-8") as file:
    file.write("\nout/\n.sites-runtime/\n")
if not (SOURCE / "node_modules").exists():
    def ps_literal(value: Path) -> str:
        return "'" + str(value).replace("'", "''") + "'"
    subprocess.run(["powershell", "-NoProfile", "-Command",
                    f"New-Item -ItemType Junction -Path {ps_literal(SOURCE / 'node_modules')} -Target {ps_literal(ROOT / 'app/node_modules')} | Out-Null"], check=True)
(HERE / "evidence/preview-source-binding.json").write_text(json.dumps({"sourceCommit": BASE, "sourceAppTree": TREE,
    "sourcePolicy": "Accepted RC6 code copied from Git blobs; explicit static-preview adapter only",
    "canonicalAppChanged": False, "implementationAcceptance": False, "g7Acceptance": False,
    "previewOrigin": ORIGIN, "adapterChanges": changes,
    "backend": "Not deployed; contact form unavailable with direct email retained, admin/API routes excluded",
    "inputs": inputs}, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": "PREPARED", "inputs": len(inputs), "adapterChanges": len(changes), "canonicalAppChanged": False}))
