"""Copy only the two residual makers' frozen app delta and bind the result."""
import hashlib, json, pathlib, subprocess

primary = pathlib.Path(r"C:\Users\yoray\Projects\Yor World")
scratch = pathlib.Path(r"C:\Users\yoray\AppData\Local\Temp\yw-res-2af509")
output = primary / "deliveries/G6/rc3-platform-residual-corrections/evidence"
base = "2af509296a1eebd5f8dee37936fbff8ba7bbd658"
def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=root).decode().strip()
def sha(data): return hashlib.sha256(data).hexdigest()
def fingerprint(root):
    names = git(root,"ls-files","--cached","--others","--exclude-standard","--","app").splitlines()
    items = [{"path": name,"sha256": sha((root/name).read_bytes())} for name in sorted(set(names))]
    return sha(json.dumps(items,separators=(",",":")).encode())
allowed = {
    "app/src/server/media/validate-upload.ts", "app/src/server/integrations/github.ts",
    "app/src/server/test-fixture.ts", "app/tests/integration/platform/scp-telemetry-github.test.ts",
    "app/supabase/migrations/20261005000000_github_refresh_state.sql",
    "app/tests/integration/platform/residual-media-still-images.test.ts",
    "app/tests/integration/platform/scp-github-durable.test.ts",
}
allowed.update("app/tests/fixtures/residual-media/" + name for name in [
    "actl-only.png","animated.png","animated.webp","corrupt-second-frame.png","manifest.json",
    "normal-rgb.png","orphan-fctl.png","orphan-fdat.png","pixels-ok.png","truncated-fdat.png"])
assert git(primary,"rev-parse","HEAD") == base == git(scratch,"rev-parse","HEAD")
assert set(git(primary,"diff","--name-only").splitlines()) <= allowed
assert not git(primary,"diff","--cached","--name-only")
assert set(git(primary,"ls-files","--others","--exclude-standard","--","app").splitlines()) <= allowed
changed = set(git(scratch,"diff","--name-only").splitlines())
changed.update(git(scratch,"ls-files","--others","--exclude-standard","--","app").splitlines())
assert changed == allowed, (changed-allowed,allowed-changed)
expected = "c45189848d70d28bfc6c4be2c4328dd0851cf25540d46acae451d042488cac89"
assert fingerprint(scratch) == expected
review = json.loads((output.parent/"review/delta/source-identity.json").read_text(encoding="utf-8-sig"))
rows = []
for name in sorted(allowed):
    target = primary/name
    data = (scratch/name).read_bytes()
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(data)
    blob = git(primary,"hash-object","--path="+name,name)
    rows.append({"path":name,"workingSha256":sha(data),"canonicalGitBlob":blob})
for entry in review["files"]:
    row = next(item for item in rows if item["path"] == entry["path"])
    assert row["workingSha256"] == entry["sha256"] and row["canonicalGitBlob"] == entry["gitBlob"]
line_endings = []
for name in sorted(set(git(primary,"ls-files","--cached","--others","--exclude-standard","--","app").splitlines())):
    first, second = (primary/name).read_bytes(), (scratch/name).read_bytes()
    if first != second:
        assert name not in allowed and first.replace(b"\r\n",b"\n") == second.replace(b"\r\n",b"\n"), name
        line_endings.append(name)
subprocess.run(["git","diff","--check","--","app"],cwd=primary,check=True)
(output/"source-integration.json").write_text(json.dumps({
    "baseHead":base,"appTreeBefore":git(primary,"rev-parse",base+":app"),
    "scratchRoot":str(scratch),"primaryRoot":str(primary),
    "testedScratchWorkingSourceFingerprint":expected,"primaryWorkingSourceFingerprint":fingerprint(primary),"changedFiles":rows,
    "allChangedPathsMatchTestedBytes":True,"unalteredCheckoutCRLFDifferences":line_endings,
    "initialIntegratorExit":1,"initialIntegratorReason":"Whole raw-byte fingerprint differed because 76 unaltered baseline files use different checkout line endings; exact changed bytes and canonical source remain equal",
    "otherTrackedPathsChanged":False,"dependencyAndLockfileChanges":False,
    "sourceTransfer":"Exact bytes; only assigned 17 app paths; no deletes"
},indent=2)+"\n",encoding="utf-8")
(output/"input-packet.txt").write_bytes(pathlib.Path(r"C:\Users\yoray\.codex-account2\attachments\c9407e30-afdf-4b1f-85fe-42abdee1863c\Pasted text.txt").read_bytes())
print(json.dumps({"files":len(rows),"fingerprint":expected,"diffCheck":"PASS"}))
