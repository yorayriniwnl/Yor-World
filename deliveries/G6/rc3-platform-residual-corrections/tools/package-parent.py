"""Bind parent execution evidence to the scoped, pushed implementation commit."""
import hashlib, json, pathlib, subprocess

repo = pathlib.Path(r"C:\Users\yoray\Projects\Yor World")
root = repo / "deliveries/G6/rc3-platform-residual-corrections"
base = "2af509296a1eebd5f8dee37936fbff8ba7bbd658"
implementation = "83000ceb4f6046ba92f4764cb99ee64bde68dd22"
def git(*args): return subprocess.check_output(["git",*args],cwd=repo).decode().strip()
def load(name): return json.loads((root/name).read_text(encoding="utf-8-sig"))
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(name, data):
    path = root/name
    path.parent.mkdir(parents=True,exist_ok=True)
    if isinstance(data,str):
        for before,after in [("in20","in 20"),("in26","in 26"),("The56","The 56"),
            ("The17","The 17"),("with422","with 422"),("Media66","Media 66"),
            ("GitHub41","GitHub 41"),("unit266","unit 266"),("integration280","integration 280"),
            ("including32","including 32"),("including24","including 24"),
            ("reviewer initially","reviewer initially"),("exit2","exit 2"),("exit1","exit 1"),("exit0","exit 0"),
            ("saw76","saw 76"),("all17","all 17"),("generic503","generic 503"),
            ("PostgreSQL17.11","PostgreSQL 17.11"),("WinError4551","WinError 4551"),
            ("SQL503","SQL 503"),("independent delta25","independent delta 25"),
            ("two genuine still","two genuine still"),("media32","media 32"),("GitHub24","GitHub 24"),
            ("including original34","including original 34"),("including original17","including original 17"),
            ("with422","with 422"),("four-second","four-second")]:
            data = data.replace(before,after)
    path.write_text(json.dumps(data,indent=2)+"\n" if not isinstance(data,str) else data,encoding="utf-8")
assert git("rev-parse","HEAD") == implementation
app_before, app_after = git("rev-parse",base+":app"), git("rev-parse",implementation+":app")
integration = load("evidence/source-integration.json")
owned = [row["path"] for row in integration["changedFiles"]]
assert set(git("diff","--name-only",base,implementation).splitlines()) == set(owned)
assert not git("diff","--name-only") and not git("diff","--cached","--name-only")
for row in integration["changedFiles"]:
    assert git("rev-parse",implementation+":"+row["path"]) == row["canonicalGitBlob"]
    assert sha(repo/row["path"]) == row["workingSha256"]
remote = git("ls-remote","origin","refs/heads/main").split()[0]
assert remote == implementation
receipts = []
for name in ["frozen-install","lint","typecheck","unit","integration","production-build"]:
    receipt = load("evidence/"+name+".json")
    assert receipt["exitCode"] == 0 and receipt["sourceUnchanged"]
    assert sha(root/"evidence"/receipt["log"]) == receipt["logSha256"]
    if name != "frozen-install":
        assert receipt["workingSourceBefore"] == integration["testedScratchWorkingSourceFingerprint"]
    receipts.append({"name":name,"receipt":"evidence/"+name+".json",**receipt})
checks = []
for name,file,count in [
    ("unit","evidence/unit-results.json",266),
    ("integration","evidence/integration-results.json",280),
    ("focused-media","workers/media/evidence/focused-results.json",66),
    ("focused-github","workers/github/focused-final.json",41),
    ("independent-delta","review/delta/results.json",25),
]:
    data = load(file)
    assert data["success"] and data["numTotalTests"] == data["numPassedTests"] == count
    assert data["numFailedTests"] == data["numPendingTests"] == data.get("numTodoTests",0) == 0
    checks.append({"name":name,"result":file,"passed":count,"failed":0,"skipped":0,"files":len(data["testResults"])})
inputs = ["AGENTS.md","START_HERE.md","docs/planning/delegation-and-work-orders.md",
    "docs/planning/account-operating-model.md","docs/planning/engineering-and-content.md",
    "deliveries/G6/rc3-platform-independent-verification/report.md",
    "deliveries/G6/rc3-platform-independent-verification/defects.json",
    "deliveries/G6/rc3-platform-independent-verification/reviewers/media/report.md",
    "deliveries/G6/rc3-platform-independent-verification/reviewers/telemetry-github/report.md",
    "deliveries/G6/rc3-platform-independent-verification/reviewers/contract-crosscheck/report.md"]
limitations = [
    "Gemini requested but unavailable: NOT RUN; fresh Codex makers inherited parent model, exact service ID not exposed.",
    "Native independent PostgreSQL sessions: NOT RUN; Windows Application Control WinError4551 blocked postgres.exe --version before initialization. No bypass attempted.",
    "Executed durable SQL uses one PGlite backend with separately initialized modules and distinct simulated wrapper handles; this is not native backend concurrency proof.",
    "Hosted database/grant/Auth/Storage, real GitHub and deployed restart/scaling/restore: NOT RUN.",
    "Unconfigured no-database mode is explicitly process-local; configured coordination failure grants no upstream permission.",
    "RC4, G6 acceptance, performance changes and G7/deployment are outside this packet and were not performed.",
]
defects = [
    {"id":"SCP-04","severity":"P2","status":"FIXED","verification":"PASS, bounded local evidence",
     "originalCounterexample":"Valid-CRC APNG with corrupt second frame passed first-frame Sharp validation; original corrupt fixture SHA256 536989dab6f4b7892a26009cccca13781462f4c02d7fb543d58dc1cce23512fe.",
     "source":["app/src/server/media/validate-upload.ts"],
     "regression":["app/tests/integration/platform/residual-media-still-images.test.ts","app/tests/fixtures/residual-media/"],
     "result":"Reject acTL/fcTL/fdAT as 422 INVALID_MEDIA before registration; 20 actual JSON/multipart POST rejections caused zero media rows, storage objects/calls and approval events; 2 genuine still successes retained exact bytes and pending status.",
     "evidence":["workers/media/report.md","workers/media/evidence/focused-results.json","workers/media/evidence/post-observations.json","review/delta/results.json"],
     "acceptance":"Not claimed; historical defect ledger unchanged"},
    {"id":"SCP-07","severity":"P2","status":"FIXED","verification":"PASS, bounded local SQL/source evidence; native sessions NOT RUN",
     "originalCounterexample":"Reset/isolated process Maps allowed multiple failed GitHub attempts inside one hour; only successful snapshots persisted.",
     "source":["app/src/server/integrations/github.ts","app/supabase/migrations/20261005000000_github_refresh_state.sql"],
     "regression":["app/tests/integration/platform/scp-github-durable.test.ts"],
     "result":"Conditional atomic UPSERT reserves every attempt for one hour with database clock and full-precision fencing; 10 simulated concurrent cold callers yield one upstream attempt, same-hour reset/restart yields zero additional attempts, 59:59 blocks and exact hour permits one winner. Failure preserves successful snapshots.",
     "evidence":["workers/github/report.md","workers/github/focused-final.json","review/delta/results.json","schema-amendment.md"],
     "nativeIndependentSessions":"NOT RUN: Windows Application Control WinError4551",
     "acceptance":"Not claimed; historical defect ledger unchanged"},
]
write("defects.json",{"scope":"Only SCP-04 and SCP-07 residual correction","implementationCommit":implementation,
    "appTree":app_after,"closureMatrix":defects,"limitations":limitations,"g6Acceptance":"NOT RUN"})
versions = {"node":"24.19.0","pnpm":"9.15.9","vitest":"5.0.2","pglite":"0.5.8",
    "pg":"8.16.3","sharp":"0.35.5","libvips":"8.18.7","python":"3.12.10","pillow":"12.3.0"}
write("implementation-identity.json",{
    "clientDate":"2026-10-05","role":"Platform Residual Correction Maker",
    "baseHead":base,"earlierImplementationBase":"02380c323154fdf0815e10543de0a936619f2b79",
    "newCommitSha":implementation,"implementationCommit":implementation,
    "applicationTreeBefore":app_before,"applicationTreeAfter":app_after,"canonicalApplication":"app/",
    "oldSchemaRevision":"20261002000000_schema_v1",
    "migrationAdded":"20261005000000_github_refresh_state.sql","expectedNextRC4SchemaRevision":"20261005000000_schema_v2",
    "rc4Created":False,"releaseManifestsModified":False,"deployed":False,"g6Accepted":False,
    "maker":{"requestedModel":"Gemini Pro / highest thinking","Gemini":"NOT RUN: unavailable",
        "actual":"Fresh Codex makers inheriting parent model; exact service model ID not exposed"},
    "independentReviewer":{"actual":"Fresh GPT-6.1 Sol/Codex","scope":"Maker-independent supplemental local review; not provider/account independence or gate acceptance","report":"review/delta/report.md"},
    "executionRoot":"C:/Users/yoray/AppData/Local/Temp/yw-res-2af509/app","versions":versions,
    "workingSourceBinding":integration,"changedFiles":owned,
    "allOtherTrackedPathsIdenticalToBaseInGit":True,"dependencyAndLockfileChanges":False,
    "inputs":[{"path":name,"workingSha256":sha(repo/name),"baseGitBlob":git("rev-parse",base+":"+name)} for name in inputs],
    "humanPacket":{"original":"C:/Users/yoray/.codex-account2/attachments/c9407e30-afdf-4b1f-85fe-42abdee1863c/Pasted text.txt","copy":"evidence/input-packet.txt","sha256":sha(root/"evidence/input-packet.txt")},
    "checks":checks,"push":{"result":"PASS","branch":"main","remoteHeadObservedAfterImplementationPush":remote,
        "command":["git","-c","http.version=HTTP/1.1","-c","http.postBuffer=1048576","push","origin","main"],"exitCode":0,
        "output":"To https://github.com/yorayriniwnl/Yor-World.git\n   2af5092..83000ce  main -> main\n"},
    "artifactCommit":"This return is committed separately after the implementation; it preserves the same application tree. Its own hash is not embedded in itself.",
    "limitations":limitations})
write("evidence/parent-checks.json",{"receipts":receipts,"tests":checks,"versions":versions})
rows = "\n".join(f"| `{ ' '.join(item['command']) }` | {item['exitCode']} | {item['seconds']}s | [receipt]({item['receipt']}) |" for item in receipts)
write("commands-and-exit-codes.md",f"""# Parent execution ledger

All six requested combined checks executed in `C:/Users/yoray/AppData/Local/Temp/yw-res-2af509/app`, a detached checkout of `{base}`. Frozen dependency installation preceded the final source freeze; dependency/lockfile bytes were unchanged. Lint, typecheck, unit, integration and build then ran against the two makers' frozen 17-file delta. Node 24.19.0, pnpm 9.15.9; exact argument arrays, UTC times, raw logs and their hashes are in [parent-checks.json](evidence/parent-checks.json). The full checks used CI=true and NEXT_TELEMETRY_DISABLED=1. Build and final typecheck ran sequentially.

| Exact executable and arguments | Exit | Elapsed | Receipt |
| --- | --- | --- | --- |
{rows}

Actual final unit counts: 266/266 PASS in20 files; integration: 280/280 PASS in26 files; zero failures/skips/todos. The56 new canonical tests are media32 and durable GitHub24. Focused media66/66 and GitHub41/41 overlap existing/full integration tests and must not be added to those totals. Independent delta25/25 is a separate executed probe suite. [Test evidence map](tests/evidence/README.md).

Earlier failures remain disclosed in the [media ledger](workers/media/commands-and-exit-codes.md), [GitHub ledger](workers/github/commands-and-exit-codes.md) and [independent report](review/delta/report.md): media narrow compiler exit2 (two owned test typing defects and the other maker fixture query type), failed shell-quoted version query exit1, GitHub initial31/37 exit1 (six millisecond stale-boundary failures), narrow compiler exit1 and two new-test lint errors exit1. Makers corrected their own assigned files; final focused/full checks passed without weakening rules. The reviewer initially encountered MODULE_NOT_FOUND before installation; its final25 executed cases passed.

Parent native fixture preparation exited1: `postgres.exe --version` was blocked by Windows Application Control WinError4551 before initdb/server startup. [Exact blocker and publisher provenance](evidence/postgres-execution-block.json). Native DB sessions NOT RUN; no policy bypass. Optional runnable probes remain in [native.optional.ts](review/delta/native.optional.ts) and the canonical GitHub test's YOR_GITHUB_TEST_DATABASE_URL branch.

Initial `python tools/integrate-source.py` exited1 after copying the scoped delta: a whole raw-byte fingerprint check saw76 unaltered baseline files with checkout CRLF differences. The corrected verification exited0 after checking all17 changed files against tested raw bytes and the reviewer Git blobs, and checking every other difference was only CRLF. [Integration receipt](evidence/source-integration.json). No source correction or new suite rerun was required. Canonical committed app/source identity matches the tested delta.

Initial parent return-validator executions exited1 for a retained PowerShell UTF-16 JSON receipt decoded as UTF-8 and a link to its own not-yet-created validation receipt. The reader now honors byte-order markers and the staged read-only pass verifies the final receipt target; original worker evidence bytes were preserved. Final validation checks every JSON document, local Markdown target, worker checksum, source/input identity and root inventory. [Final packaging validation](evidence/return-validation.json).

`git diff --cached --check` exited0. `git commit -m 'fix(platform): reject APNG and coordinate GitHub refresh attempts'` exited0 and produced `{implementation}`. `git -c http.version=HTTP/1.1 -c http.postBuffer=1048576 push origin main` exited0, output `2af5092..83000ce main -> main`; independent `git ls-remote origin refs/heads/main` matched the implementation commit. Return artifacts are committed/pushed separately with the same app tree.

No E2E/accessibility/performance, exact RC4 CI, hosted external services, release regeneration, acceptance or deployment was run by this packet. Earlier evidence is not represented as fresh execution.
""")
write("tests/evidence/README.md","""# Executed test evidence

Canonical new source is app/tests/integration/platform/residual-media-still-images.test.ts (32 cases) and app/tests/integration/platform/scp-github-durable.test.ts (24 cases). Production commit and canonical file blobs are bound in [parent identity](../../implementation-identity.json). Exact source copies are under workers/media/files/app/ and workers/github/source-*.txt.

| Executed suite | Actual result | Raw/structured evidence |
| --- | --- | --- |
| Full unit | 266/266,0 skipped | [JSON](../../evidence/unit-results.json), [log](../../evidence/unit.log) |
| Full integration | 280/280,0 skipped | [JSON](../../evidence/integration-results.json), [log](../../evidence/integration.log) |
| Media focused, including original34 | 66/66,0 skipped | [JSON](../../workers/media/evidence/focused-results.json), [observed POST side effects](../../workers/media/evidence/post-observations.json) |
| GitHub focused, including original17 | 41/41,0 skipped | [JSON](../../workers/github/focused-final.json), [log](../../workers/github/focused-final.log) |
| Supplemental independent delta | 25/25,0 skipped | [JSON](../../review/delta/results.json), [independent source/report](../../review/delta/report.md) |

Fixtures include the immutable corrupt-second-frame APNG bytes and fresh bounded PNG cases. The media generator/oracle, source snapshots, and fixture SHA inventory are in [media maker report](../../workers/media/report.md). Storage HTTP transport is mocked; SQL runs in PGlite. Native independent PostgreSQL sessions were NOT RUN after the OS executable block; native.optional.ts is retained source, excluded from the executed suite rather than counted as a skip. Counts across focused and full suites overlap.
""")
write("report.md",f"""# Platform residual corrections return

**SCP-04 and SCP-07 are FIXED in the bounded implementation; local checks and fresh maker-independent delta review PASS.** The correction is committed and pushed to main as `{implementation}`. Native independent PostgreSQL sessions remain NOT RUN. This return does not accept G6.

| Finding | Original counterexample | Corrected behavior | Actual evidence |
| --- | --- | --- | --- |
| SCP-04 / P2 | A valid-CRC PNG with a corrupt APNG second frame passed Sharp's fallback-frame decode. | Complete PNG parsing rejects acTL/fcTL/fdAT with422 INVALID_MEDIA before registration. Exact validated still bytes are retained; existing MIME/CRC/decoder/5MiB/8192-axis/16,777,216-pixel constraints remain. | Media66/66 PASS, including32 new cases;20 actual JSON/multipart rejection routes produced zero media DB records, storage client/object calls or approval events. Two genuine still successes preserved exact bytes and pending status. [Maker evidence](workers/media/report.md). |
| SCP-07 / P2 | Process reset/isolated Maps allowed repeated failed GitHub attempts inside one hour. | A database-clock conditional UPSERT reserves each attempt for an hour, including failures; losers never fetch. Full-precision claim tokens fence late status/snapshot writes. Successful fetched_at remains separate from attempts. | GitHub41/41 PASS, including24 new actual-SQL cases. Ten independently initialized simulated callers through distinct handles yielded one upstream attempt; reset/restart,59:59/exact-hour, cold/warm403/429/5xx/network/JSON/timeout/success, fallback, ACL and clock/fence checks passed. [Maker evidence](workers/github/report.md). |

Combined requested checks: frozen install, lint, typecheck and build all exit0; **unit266/266 and integration280/280 PASS**, zero failures/skips/todos. There are56 new canonical cases; focused totals overlap the full suite. The [fresh independent reviewer](review/delta/report.md) executed25 additional probes, PASS, and checked schema/backup/rollback consistency. [Exact command ledger](commands-and-exit-codes.md), [test evidence map](tests/evidence/README.md), [defect records](defects.json), [identity](implementation-identity.json).

| Git/schema binding | Value |
| --- | --- |
| Base HEAD | `{base}` |
| Earlier implementation base | `02380c323154fdf0815e10543de0a936619f2b79` |
| New production commit, pushed main | `{implementation}` |
| App tree before | `{app_before}` |
| App tree after | `{app_after}` |
| New migration | `20261005000000_github_refresh_state.sql` |
| Old logical schema | `20261002000000_schema_v1` |
| Expected next RC4 schema, documentation only | `20261005000000_schema_v2` |

The17 changed application files comprise the two production modules, new migration, directly necessary test-fixture/bootstrap changes, two new integration tests and ten media fixture/manifest files. [Exact changed paths and byte/Git blob identities](evidence/source-integration.json). All other tracked paths match the base in Git, including historical migrations, dependency/lockfiles, world/camera/quality/performance, assets, contact R2, publication/outbox, accepted/independent evidence, release manifests and living gate/deployment documentation. Parent copied only the assigned paths, bound the reviewer blobs to the committed source, and committed source separately from this return. Raw baseline checkout line endings differed between worktrees; that disclosed tooling check was corrected without changing source or weakening verification.

[Schema amendment](schema-amendment.md) records additive rollout and rollback. Bounded private operational github_refresh_state is intentionally excluded from the unchanged historical logical backup inventory, while github_snapshots stays included. In-place restore retains an existing reservation; clean restore resets this operational state and can permit one additional coordinated attempt, explicitly without claiming pre-restore failed-attempt cadence. No hosted migration or destructive down migration ran. Code rollback leaves the table intact but restores the prior process-local limitation.

Configured coordination errors fail closed for upstream work and can return last-good memory cache or generic503. Unconfigured offline behavior remains process-local. Failure/status storage never contains credentials, headers, upstream bodies or exception text. Snapshot storage errors preserve the already committed reservation; fetched metadata may be returned without a persisted-success claim. Native Node fetch/JSON timeout probes exercised the real four-second abort against a synthetic loopback server; real GitHub calls were not made.

The requested Gemini provider was unavailable: **Gemini NOT RUN**. Two fresh Codex makers inherited the parent model (exact service model ID not exposed); their assigned paths stayed separate. The supplemental reviewer used GPT-6.1 Sol/Codex and only reported findings and verified maker output. It did not fix source or approve a gate. This is maker-independent local review, with no claim of separate provider/account verification. Earlier auditor returns are immutable.

Native PostgreSQL17.11 publisher binaries were downloaded into an isolated temporary fixture, but Windows Application Control blocked postgres.exe --version with WinError4551 before initialization/server startup. [Blocker evidence](evidence/postgres-execution-block.json). No bypass was attempted. The executed connection simulations share one actual PGlite backend and do not prove native independent backend sessions; runnable optional native probes are retained. Hosted database/Auth/Storage/effective grants, real upstream services and deployed restart/scaling/restore remain NOT RUN. Exact versions, retained initial failures and successful reruns are recorded in the ledgers; no failures were suppressed or canonical tests skipped.

G1-G5 remain accepted; G6 remains ACTIVE/REWORK and G7 LOCKED. RC3 remains historical; RC4 is NOT CREATED. No performance change, release rebinding, G6 adjudication, deployment or next packet execution occurred. The next assigned maker owns RC4 and its exact-candidate checks. This bounded correction stops after its source and evidence are pushed.
""")
print(json.dumps({"implementationCommit":implementation,"appTreeAfter":app_after,"checks":checks,"ownedSourcePaths":len(owned),"remoteImplementationPush":"PASS"}))
