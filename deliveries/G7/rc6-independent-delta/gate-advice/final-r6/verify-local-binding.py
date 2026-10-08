"""Read-only major-gate binding inspection; output stays in this advisory root."""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
CANDIDATE = ROOT / "deliveries/G7/rc6-candidate-r6"
SOURCE = "8e5b954e147a87e36a6869d9940c40f3d4c123f0"
HEAD = "7837efdfe43a4c129aac3d1737916dc5d5a7f435"
APP_TREE = "42ea29ec235225046a75959eb19eb386ac2f821d"
checks = []

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)

def check(name, value, detail=None):
    checks.append({"name": name, "status": "PASS" if value else "FAIL", "detail": detail})

manifest_bytes = (CANDIDATE / "release-manifest.json").read_bytes()
manifest_hash = sha(manifest_bytes.replace(b"\r\n", b"\n"))
manifest = json.loads(manifest_bytes)
archive_path = ROOT / manifest["releaseBundlePath"]
archive = archive_path.read_bytes()
archive_hash = sha(archive)
check("Exact source and application identity", manifest["sourceCommit"] == SOURCE and manifest["sourceAppTree"] == APP_TREE)
check("Candidate and source protected implementation trees match", not git("diff", "--name-only", SOURCE, HEAD, "--", "app", "scripts/release", ".github/workflows").strip())
check("Actual application tree matches frozen source", git("rev-parse", SOURCE + ":app").decode().strip() == APP_TREE)
check("Archive count, size, and hash match manifest", len(archive) == manifest["bundleMetadata"]["bytes"] == 1655792 and archive_hash == manifest["releaseBundleSha256"] == "d4648de41f631fca5ce71a45397d6bbc34ced8fc8408aeba90e65701a9653e59")

members = []
with tarfile.open(archive_path, "r:gz") as bundle:
    for member in bundle.getmembers():
        if not member.isfile():
            members.append({"path": member.name, "regular": False, "matchesGit": False})
            continue
        data = bundle.extractfile(member).read()
        blob = git("show", SOURCE + ":" + member.name)
        members.append({"path": member.name, "regular": True, "matchesGit": data == blob, "sha256": sha(data)})
check("All archive members are unique regular files matching exact Git blobs", len(members) == manifest["bundleMetadata"]["fileCount"] == 242 and len({m["path"] for m in members}) == len(members) and all(m["regular"] and m["matchesGit"] for m in members), len(members))

inventory = []
for line in (CANDIDATE / "SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
    if not line.strip():
        continue
    expected, path = line.split(maxsplit=1)
    path = path.lstrip("*")
    target = ROOT / path
    exists = target.is_file()
    inventory.append({"path": path, "exists": exists, "matches": exists and sha(target.read_bytes()) == expected})
check("Every portable checksum entry exists and matches raw bytes", bool(inventory) and all(i["matches"] for i in inventory), len(inventory))

receipts = []
for filename in ["release-manifest-validation.receipt.json", "primary-release-manifest-validation.receipt.json"]:
    data = json.loads((CANDIDATE / filename).read_text(encoding="utf-8"))
    matches = data["overallStatus"] == "PASS" and not data["failures"] and data["sourceCommit"] == SOURCE and data["sourceAppTree"] == APP_TREE and data["releaseBundleSha256"] == archive_hash and data["manifestSha256"] == manifest_hash and data["fileCount"] == len(members) and data["archiveBytes"] == len(archive)
    check(filename + " matches final manifest/archive", matches)
    receipts.append({"path": filename, "verifiedHead": data["verifiedHead"], "sha256": sha((CANDIDATE / filename).read_bytes())})

preserved = ["app/public", "app/supabase", "app/src/server/auth", "app/src/server/contact", "app/src/content", "app/pnpm-lock.yaml", "deliveries/G6/rc5-candidate", "docs/planning/reviews/2026-10-06-g6-r1.md", "docs/planning/reviews/2026-10-06-g6-r1", "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md"]
changes = git("diff", "--name-only", "eb1ff201391334d6041b35c59eb350fcd012a79c", HEAD, "--", *preserved).decode().splitlines()
check("Accepted RC5/G6-R1 and unamended assets/schema/auth/contact/content remain unchanged", not changes, changes)
for historical in ["d9277083a00a9d1ed08abff50971310c1fcdf3ec", "49080809", "6c379b0a", "47baabf"]:
    result = subprocess.run(["git", "merge-base", "--is-ancestor", historical, HEAD], cwd=ROOT, capture_output=True)
    check("Historical proof remains ancestor: " + historical, result.returncode == 0)

result = {"createdAt": datetime.now(timezone.utc).isoformat(), "reviewer": "/root/r6_acceptance_advisor", "executionClass": "Own read-only Git/blob/archive/checksum inspection; no application suite or provider execution", "sourceCommit": SOURCE, "candidateHead": HEAD, "sourceAppTree": APP_TREE, "manifestSha256Lf": manifest_hash, "archiveSha256Raw": archive_hash, "archiveBytes": len(archive), "checks": checks, "receipts": receipts, "members": members, "inventory": inventory, "overallStatus": "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL", "sourceAcceptanceClaim": False, "g7AcceptanceClaim": False}
target = OUT / "local-binding-verification.json"
with target.open("x", encoding="utf-8", newline="\n") as stream:
    json.dump(result, stream, indent=2)
    stream.write("\n")
print(json.dumps({k: v for k, v in result.items() if k not in ["members", "inventory"]}, indent=2))
raise SystemExit(0 if result["overallStatus"] == "PASS" else 1)
