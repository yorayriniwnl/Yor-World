"""Pin read-only source, input provenance, documentation drift and CI contract observations."""
import datetime, hashlib, json, pathlib, platform, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
repo = root.parents[2]
scratch = pathlib.Path("C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186")
head = "2a1864a0648146462b45ba25e0bbc797cf37f3cd"
implementation = "02380c323154fdf0815e10543de0a936619f2b79"
base = "d13dc181fd765081446093c2e39785123bb7b90c"
packet = pathlib.Path("C:/Users/yoray/.codex-account2/attachments/08ed42e7-ca33-455d-af9c-d99444e3ea59/Pasted text.txt")
def git(*args, cwd=repo):
    return subprocess.check_output(["git", *args], cwd=cwd).decode().strip()
def sha(value):
    return hashlib.sha256(value).hexdigest()
def write(name, value):
    (root / "evidence" / name).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")

inputs = ["AGENTS.md", "START_HERE.md", "docs/planning/delegation-and-work-orders.md",
    "docs/planning/account-operating-model.md", "docs/planning/engineering-and-content.md",
    "docs/planning/validation-and-production.md",
    "docs/planning/reconciliation-packets/2026-10-03-rc3-platform-corrections.md",
    "deliveries/G6/rc3-supplemental-codex-verification/report.md",
    "deliveries/G6/rc3-supplemental-codex-verification/defects.json",
    "deliveries/G6/rc3-platform-corrections/report.md",
    "deliveries/G6/rc3-platform-corrections/defects.json",
    "deliveries/G6/rc3-platform-corrections/implementation-identity.json",
    "deliveries/G6/rc3-platform-corrections/evidence/new-regressions.json"]
write("input-hashes.json", [{"path": path, "sha256": sha((repo / path).read_bytes()),
    "gitBlob": git("rev-parse", f"{head}:{path}")} for path in inputs])
(root / "evidence/input-packet.txt").write_bytes(packet.read_bytes())
protected = ["app/src/features/world", "app/src/features/room", "app/src/features/experience",
    "app/tests/performance", "app/supabase/migrations", "app/public", "app/src/server/contact",
    ".github/workflows", "scripts/release", "deliveries/G6/full-stack-integration",
    "deliveries/G6/rc3-supplemental-codex-verification", "deliveries/A6", "deliveries/C3",
    "deliveries/C1", "deliveries/C2"]
proof = []
for path in protected:
    exists = bool(git("ls-tree", head, "--", path))
    proof.append({"path": path, "present": exists,
                  "changedPaths": git("diff", "--name-only", base, head, "--", path).splitlines()})
write("immutability.json", {"base": base, "auditedHead": head, "appTreeAtHead": git("rev-parse", head + ":app"),
    "appTreeAtImplementation": git("rev-parse", implementation + ":app"),
    "primaryAppDelta": git("diff", "--name-only", head, "--", "app").splitlines(),
    "scratchAppDelta": git("diff", "--name-only", head, "--", "app", cwd=scratch).splitlines(),
    "protected": proof, "correctionChangedPaths": git("diff", "--name-only", base, implementation).splitlines()})

drift = []
for path in ["START_HERE.md", "README.md", "docs/planning/delegation-and-work-orders.md",
             "docs/planning/local-tool-access.md"]:
    for number, line in enumerate((repo / path).read_text(encoding="utf-8-sig").splitlines(), 1):
        if any(text in line for text in ["seven unfixed", "execution NOT RUN", "Next: Gemini #1 platform", "Next assigned packet:"]):
            drift.append({"path": path, "line": number, "text": line,
                "disposition": "Update Codex correction completion; retain truthful Gemini NOT RUN; no edit by verifier"})
write("documentation-drift.json", drift)

versions = {}
for label, argv in [("node", ["node", "--version"]), ("pnpm", ["pnpm.cmd", "--version"]),
                    ("python", ["python", "--version"]), ("git", ["git", "--version"])]:
    proc = subprocess.run(argv, cwd=repo, capture_output=True)
    versions[label] = {"command": argv, "exitCode": proc.returncode,
                       "output": (proc.stdout + proc.stderr).decode().strip()}
write("execution-environment.json", {"observedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "platform": platform.platform(), "versions": versions, "scratchCheckout": str(scratch),
    "scratchHead": git("rev-parse", "HEAD", cwd=scratch),
    "primaryHead": git("rev-parse", "HEAD"),
    "remoteMain": git("ls-remote", "origin", "refs/heads/main"),
    "requestedModel": "Gemini Pro Extended Thinking/highest available", "requestedProviderExecution": "NOT RUN",
    "availableGeminiTools": [], "actualReviewers": "Fresh GPT-6.1 Sol/Codex agents, distinct from makers",
    "parentRole": "Prior maker coordinator; execution capture/aggregation only; no independent acceptance claimed"})

write("performance-observation.json", {"observationKind": "Source/contract inspection plus authenticated CI job logs; no fresh local performance execution",
    "contract": {"path": "docs/planning/validation-and-production.md", "line": 56, "static": "Poster plus full HTML, no canvas"},
    "qualityPolicy": {"path": "app/src/features/room/quality-policy.ts", "line": 154,
        "behavior": "Three sustained slow windows downgrade high -> medium -> low -> static"},
    "runtime": {"path": "app/src/features/world/WorldRoot.tsx", "line": 319, "behavior": "Static tier renders HTML fallback"},
    "test": {"path": "app/tests/performance/world.spec.ts", "lines": [124, 155, 177],
        "behavior": "Static frame or canvas detached/no render >1000ms becomes failure"},
    "ciEvidence": "github-ci-log-receipts.json",
    "analysis": "Potential test-contract contradiction on sustained software-renderer slowdown. Correction changed no world/quality/performance/CI/release source. No demonstrated platform-change cause; timing/build/environment indirect effects not ruled out. Same app tree passed six performance cases on implementation run and failed canvas watchdog on evidence-only run.",
    "owner": "RC4 runtime/integration maker; no fixes or candidate changes performed"})
print(json.dumps({"capturedInputs": len(inputs), "protectedPaths": len(proof), "documentationDriftRows": len(drift), "versions": versions}))
