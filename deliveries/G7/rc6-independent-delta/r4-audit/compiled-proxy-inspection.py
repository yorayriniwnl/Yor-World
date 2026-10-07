"""Read actual fresh compiled Proxy/source maps. Does not build or mutate production."""
from pathlib import Path
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = "30240b672ae31537d8090b11b60f8bf808a27670"
APP = Path("C:/Users/yoray/Projects/Yor-World-RC6-30240b6/app")

wrapper = APP / ".next/server/middleware.js"
manifest = APP / ".next/server/functions-config-manifest.json"
checks = []
for filename in (APP / ".next/server/chunks").glob("*.map"):
    data = json.loads(filename.read_text(encoding="utf-8"))
    sections = data.get("sections", [{"map": data}])
    for section in sections:
        mapping = section["map"]
        for name, content in zip(mapping.get("sources", []), mapping.get("sourcesContent", [])):
            for expected_path in ["src/proxy.ts", "src/security/policy.ts"]:
                if name.endswith(expected_path):
                    actual = content.replace("\r\n", "\n").encode()
                    expected = subprocess.check_output(["git", "show", SOURCE + ":app/" + expected_path], cwd=ROOT)
                    checks.append({"map": str(filename), "source": name,
                        "sourceContentSha256Lf": hashlib.sha256(actual).hexdigest(),
                        "frozenGitBlobSha256": hashlib.sha256(expected).hexdigest(), "frozenSourceMatches": actual == expected})
receipt = {"source": SOURCE, "freshWorktree": str(APP.parent), "buildId": (APP / ".next/BUILD_ID").read_text(encoding="utf-8").strip(),
    "nodeProxy": json.loads(manifest.read_text(encoding="utf-8"))["functions"]["/_middleware"],
    "compiledWrapperSha256": hashlib.sha256(wrapper.read_bytes()).hexdigest(), "sourceMapChecks": checks,
    "executionClass": "Own read-only inspection of fresh compiled Node Proxy, wrapper and source maps; no own build execution",
    "executionOutcome": "Fresh read-only R4 compiled output inspection."}
(HERE / "compiled-proxy-inspection.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt, indent=2))
