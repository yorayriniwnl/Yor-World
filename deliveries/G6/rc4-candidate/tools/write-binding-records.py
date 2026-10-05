import json, subprocess, platform, datetime, pathlib
root = pathlib.Path(".").resolve(); rc = root / "deliveries/G6/rc4-candidate"
def git(*a): return subprocess.check_output(["git", *a], cwd=root, text=True).strip()
S = git("rev-parse", "HEAD"); BASE = "195ea1300000000000000000000000000000000000"
BASE = git("rev-parse", "195ea13")
RC3_SOURCE = "6129ad7a870f9f391455eb8a0582733a5ccccd11"; RC3_CAND = "261c483646f68692a3fe8e184d48d25b8264a6d7"
def out(name, data): (rc / name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")
ver = lambda *c: subprocess.check_output(c, cwd=root / "app", text=True, shell=(c[0] == "pnpm")).strip()
out("evidence/versions.json", {"clientDate": datetime.date.today().isoformat(), "clientTimezone": "Asia/Calcutta", "node": ver("node", "--version"), "pnpm": ver("pnpm", "--version"), "python": platform.python_version(), "os": platform.platform(), "sourceCommit": S, "workingDirectory": str(root), "executionMode": "Repository working tree at clean detached-equal HEAD; local Playwright config (CI unset) runs the 97 E2E and 17 accessibility tests in both chrome and msedge projects, giving 194 and 34 executions. GitHub CI sets CI=true and uses one Chromium project.", "cleanInitialState": "Not a fresh checkout. node_modules/.next may pre-exist locally; frozen install and a full production build were executed against the exact commit. Independent fresh-checkout proof comes from GitHub CI at the pushed HEAD."})
paths = ["deliveries/A6","deliveries/C3","deliveries/C2","deliveries/C1","deliveries/C4","deliveries/production-environment","deliveries/interaction-assets","deliveries/B4","deliveries/G6/corrections","deliveries/G6/full-stack-integration","deliveries/G6/gemini-1-platform","deliveries/G6/gemini-2-world","deliveries/G6/rc3-supplemental-codex-verification","deliveries/G6/rc3-platform-corrections","deliveries/G6/rc3-platform-independent-verification","deliveries/G6/rc3-platform-residual-corrections","docs/planning/reviews","references"]
changed = [p for p in git("diff", "--name-only", BASE, S, "--", *paths).splitlines() if p]
out("evidence/historical-immutability.json", {"baseCommit": BASE, "sourceCommit": S, "paths": paths, "changedPaths": changed, "overallStatus": "PASS" if not changed else "FAIL"})
delta = [l.split("\t") for l in git("diff", "--name-status", RC3_SOURCE, S, "--", "app", "scripts", ".github").splitlines()]
cats = {}
for status, *names in delta: cats.setdefault(status, []).append(names[-1] if status != "R100" else " -> ".join(names))
out("source-binding.json", {
  "releaseId": "v1.0.0-rc4", "sourceCommit": S, "coordinationBaseCommit": BASE,
  "appTreeAtSource": git("rev-parse", S + ":app"),
  "supersedes": {"releaseId": "v1.0.0-rc3", "candidateCommit": RC3_CAND, "implementationSource": RC3_SOURCE, "appTree": git("rev-parse", RC3_SOURCE + ":app"), "disposition": "Historical. Preserved by immutable Git identity and delivery root deliveries/G6/full-stack-integration; not overwritten."},
  "correctionCommits": [{"sha": "02380c323154fdf0815e10543de0a936619f2b79", "scope": "SCP-01..SCP-06 platform corrections"}, {"sha": "83000ceb4f6046ba92f4764cb99ee64bde68dd22", "scope": "SCP-04 APNG rejection, SCP-07 durable GitHub attempt coordination, migration 20261005000000_github_refresh_state.sql"}, {"sha": S, "scope": "RC4 release tooling, CI, version and status-token rebind only"}],
  "schemaRevision": "20261005000000_schema_v2",
  "diffFromRc3Source": {"changedFileCount": len(delta), "byStatus": {k: len(v) for k, v in cats.items()}, "paths": cats},
  "limits": "Source binding record only. Not an audit or acceptance."})
print("source", S, "base", BASE, "historicalChanged", len(changed), "diff files", len(delta))
