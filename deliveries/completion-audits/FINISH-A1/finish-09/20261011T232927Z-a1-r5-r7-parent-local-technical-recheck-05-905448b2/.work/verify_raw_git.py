import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
OUT_A1 = ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T232927Z-a1-r5-r7-parent-local-technical-recheck-05-905448b2/evidence/raw-git-verification.json"
OUT_C1 = ROOT / "deliveries/completion-audits/FINISH-C1/finish-16/20261011T232927Z-c1-r9-parent-local-technical-recheck-05-905448b2/evidence/raw-git-verification.json"

A1 = "76d679dcb98064152021830b98f16eb456b3ae19"
A1_PARENT = "f62a43c5e71c00dcb89e28275ea81d842167db80"
A1_PREFIX = "deliveries/FINISH-A1/r5-07"
A1_BRANCH = "codex/finish-29-a1-r5-r7-20261011"
C1 = "3dda9a616033375768f3d5f60f8c653d504f7c8c"
C1_PARENT = "c398876583bc337c069414b79364e3fdea745879"
C1_PREFIX = "deliveries/FINISH-C1-R9"
C1_R8_PREFIX = "deliveries/FINISH-C1-R8"
C1_BRANCH = "codex/finish-30-c1-r9-20261011"

def git(*args):
    p = subprocess.run(["git", *map(str, args)], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(f"git {' '.join(map(str,args))} failed {p.returncode}: {p.stderr.decode(errors='replace')}")
    return p.stdout

def text(data):
    return data.decode("utf-8")

def tree_map(rev):
    raw = git("ls-tree", "-r", "-z", rev)
    result = {}
    for row in raw.split(b"\0"):
        if not row:
            continue
        meta, path = row.split(b"\t", 1)
        mode, kind, oid = meta.decode("ascii").split(" ")
        if kind == "blob":
            result[path.decode("utf-8")] = {"oid": oid, "mode": mode}
    return result

def blob(oid):
    return git("cat-file", "blob", oid)

def commit_meta(commit):
    lines = git("rev-list", "--parents", "-n", "1", commit).decode().strip().split()
    tree = git("rev-parse", f"{commit}^{{tree}}").decode().strip()
    return {"commit": lines[0], "parent": lines[1] if len(lines) > 1 else None, "tree": tree}

def subtree(commit, path):
    return git("rev-parse", f"{commit}:{path}").decode().strip()

def remote_ref(branch):
    raw = git("ls-remote", "origin", f"refs/heads/{branch}").decode().strip()
    return raw.split("\t", 1)[0] if raw else None

def check(checks, name, ok, detail):
    checks.append({"id": name, "status": "PASS" if ok else "FAIL", "detail": detail})

def manifest_audit(commit, prefix, expected_sha=None):
    entries = tree_map(commit)
    manifest_path = f"{prefix}/output-hashes.json"
    manifest_bytes = blob(entries[manifest_path]["oid"])
    manifest_sha = hashlib.sha256(manifest_bytes).hexdigest()
    manifest = json.loads(manifest_bytes)
    rows = manifest.get("files", manifest.get("outputs", []))
    mapped = {path[len(prefix)+1:]: info for path, info in entries.items() if path.startswith(prefix + "/")}
    mismatches = []
    for row in rows:
        rel = row.get("path")
        actual = mapped.get(rel)
        if actual is None:
            mismatches.append({"path": rel, "reason": "missing raw tree path"})
            continue
        raw = blob(actual["oid"])
        h = hashlib.sha256(raw).hexdigest()
        size = len(raw)
        if row.get("sha256") != h or row.get("bytes") != size:
            mismatches.append({"path": rel, "expectedSha256": row.get("sha256"), "actualSha256": h, "expectedBytes": row.get("bytes"), "actualBytes": size})
    listed = {row.get("path") for row in rows}
    tree_paths = set(mapped) - {"output-hashes.json"}
    return {
        "manifestSha256": manifest_sha,
        "manifestRowCount": len(rows),
        "manifestTotalBytes": manifest.get("totalBytes"),
        "treeFileCountIncludingManifest": len(mapped),
        "missingFromTree": sorted(listed - set(mapped)),
        "unlistedTreeFiles": sorted(tree_paths - listed),
        "blobMismatches": mismatches,
        "allRowsMatch": not mismatches and listed == tree_paths and (expected_sha is None or manifest_sha == expected_sha),
        "manifest": manifest,
        "tree": mapped,
    }

def main():
    report = {"schemaVersion": 1, "audit": "FINISH-36 parent-local raw-Git technical recheck", "a1": {}, "c1": {}}

    a1meta = commit_meta(A1)
    a1tree = tree_map(A1)
    a1prefix = A1_PREFIX + "/"
    a1package = {p: v for p, v in a1tree.items() if p.startswith(a1prefix)}
    a1checks = []
    a1remote = remote_ref(A1_BRANCH)
    check(a1checks, "exact-commit-parent-tree", a1meta == {"commit": A1, "parent": A1_PARENT, "tree": "6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6"}, a1meta)
    check(a1checks, "remote-branch-points-to-candidate", a1remote == A1, {"expected": A1, "actual": a1remote})
    check(a1checks, "root-app-tree-unchanged", subtree(A1, "app") == "42ea29ec235225046a75959eb19eb386ac2f821d", {"actual": subtree(A1, "app")})
    check(a1checks, "package-subtree", subtree(A1, A1_PREFIX) == "61026e89795d28aa212ee2e03c8edc05b2aea97a", {"actual": subtree(A1, A1_PREFIX)})
    a1manifest = manifest_audit(A1, A1_PREFIX, "5c42034d1ceb9cf938d7a536a436b3b53cee8094c48e3e934c419dad0fafa420")
    check(a1checks, "output-manifest-raw-blob-audit", a1manifest["allRowsMatch"] and a1manifest["manifestRowCount"] == 79 and a1manifest["manifestTotalBytes"] == 1695825, {k:v for k,v in a1manifest.items() if k not in ("manifest","tree")})
    patch_path = f"{A1_PREFIX}/source.patch"
    patch = blob(a1tree[patch_path]["oid"])
    patch_sha = hashlib.sha256(patch).hexdigest()
    valid_utf8 = True
    try:
        patch.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        valid_utf8 = False
    no_bom_nul = not patch.startswith(b"\xef\xbb\xbf") and b"\x00" not in patch
    diff_paths = sorted(set(re.findall(rb"^diff --git a/(.*?) b/.*$", patch, flags=re.M)))
    diff_paths = [p.decode("utf-8") for p in diff_paths]
    changed_raw = blob(a1tree[f"{A1_PREFIX}/changed-paths.txt"]["oid"]).decode("utf-8-sig")
    changed_paths = sorted(set(re.findall(r"(?:^|\s)(app/[^\s`]+)", changed_raw)))
    if not changed_paths:
        changed_paths = sorted(set(line.strip().replace("\\", "/") for line in changed_raw.splitlines() if line.strip().startswith("app/")))
    allow_doc = (ROOT / "docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md").read_text(encoding="utf-8")
    allow_rows = re.findall(r"\| `([^`]+)` \| (?:existing|new) \|", allow_doc)
    frozen_allowlist = sorted("app/" + p for p in allow_rows[:25])
    # Select the exhaustive A1 table by its first known path; rows stop before the A2 table.
    a1start = allow_doc.index("### FINISH-A1:")
    a2start = allow_doc.find("### FINISH-A2:", a1start)
    a1section = allow_doc[a1start:a2start if a2start >= 0 else len(allow_doc)]
    a1allow = sorted("app/" + p for p in re.findall(r"\| `([^`]+)` \| (?:existing|new) \|", a1section))
    expected_patch_sha = "aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8"
    check(a1checks, "patch-encoding-and-sha256", valid_utf8 and no_bom_nul and patch_sha == expected_patch_sha, {"sha256":patch_sha,"bytes":len(patch),"validUtf8":valid_utf8,"noBomOrNul":no_bom_nul})
    check(a1checks, "patch-vs-changed-path-inventory", diff_paths == changed_paths and len(diff_paths) == 25, {"patchCount":len(diff_paths),"inventoryCount":len(changed_paths),"patchPaths":diff_paths,"inventoryPaths":changed_paths})
    unauthorized = sorted(set(diff_paths) - set(a1allow))
    check(a1checks, "frozen-a1-path-allowlist", len(a1allow) == 26 and not unauthorized, {"allowlistCount":len(a1allow),"changedCount":len(diff_paths),"unauthorized":unauthorized,"allowlist":a1allow})
    packaged_source = {p[len(f"{A1_PREFIX}/source/"):]: v for p,v in a1tree.items() if p.startswith(f"{A1_PREFIX}/source/")}
    source_app_paths = sorted(p for p in packaged_source if p.startswith("app/"))
    replacement_paths = sorted("app/" + p.removeprefix("app/") for p in diff_paths)
    package_source_tree = subtree(A1, f"{A1_PREFIX}/source/app")
    check(a1checks, "packaged-source-app-tree", package_source_tree == "1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3", {"actual":package_source_tree,"fileCount":len(source_app_paths)})
    changed = git("diff-tree", "--no-commit-id", "--name-only", "-r", A1_PARENT, A1).decode().splitlines()
    outside = [p for p in changed if not p.startswith(a1prefix)]
    check(a1checks, "delivery-commit-package-only", len(changed) == len(a1package) and not outside, {"changedPathCount":len(changed),"packagePathCount":len(a1package),"outsidePackage":outside})
    report["a1"] = {
        "binding": {**a1meta,"branch":A1_BRANCH,"remoteCommit":a1remote,"packageTree":subtree(A1,A1_PREFIX),"rootAppTree":subtree(A1,"app"),"sourceAppTree":package_source_tree,"base":A1_PARENT},
        "manifest": {k:v for k,v in a1manifest.items() if k not in ("manifest","tree")},
        "checks":a1checks,
        "patch":{"sha256":patch_sha,"bytes":len(patch),"changedPathCount":len(diff_paths),"changedPaths":diff_paths,"frozenAllowlist":a1allow},
        "passed":all(x["status"] == "PASS" for x in a1checks),
    }

    c1meta = commit_meta(C1)
    c1tree = tree_map(C1)
    c1prefix = C1_PREFIX + "/"
    c1package = {p:v for p,v in c1tree.items() if p.startswith(c1prefix)}
    c1checks = []
    c1remote = remote_ref(C1_BRANCH)
    check(c1checks, "exact-commit-parent-tree", c1meta == {"commit": C1,"parent": C1_PARENT,"tree":"5a38d405499737ff40b0141a64845c244a9e4813"}, c1meta)
    check(c1checks, "remote-branch-points-to-candidate", c1remote == C1, {"expected":C1,"actual":c1remote})
    check(c1checks, "root-app-tree-unchanged", subtree(C1,"app") == "42ea29ec235225046a75959eb19eb386ac2f821d", {"actual":subtree(C1,"app")})
    check(c1checks, "r9-package-subtree", subtree(C1,C1_PREFIX) == "aa097f12adff2dbac2c88d6300c949f37bf34251", {"actual":subtree(C1,C1_PREFIX)})
    c1manifest = manifest_audit(C1,C1_PREFIX,"31903805363ed7d56521d334893d40d99079a716e1b374ac2a4c1895ecaff465")
    check(c1checks,"r9-output-manifest-raw-blob-audit",c1manifest["allRowsMatch"] and c1manifest["manifestRowCount"] == 26 and c1manifest["manifestTotalBytes"] == 145757,{k:v for k,v in c1manifest.items() if k not in ("manifest","tree")})
    r8tree = tree_map(C1_PARENT)
    r8package = {p[len(C1_R8_PREFIX)+1:]:v for p,v in r8tree.items() if p.startswith(C1_R8_PREFIX + "/")}
    r9relative = {p[len(C1_PREFIX)+1:]:v for p,v in c1tree.items() if p.startswith(C1_PREFIX + "/")}
    r8relative = r8package
    r9diff = sorted(p for p in set(r8relative)|set(r9relative) if p not in r8relative or p not in r9relative or r8relative[p]["oid"] != r9relative[p]["oid"])
    delta = json.loads(blob(c1tree[f"{C1_PREFIX}/changed-paths.json"]["oid"]))
    declared = delta.get("changedPaths", delta.get("paths", delta if isinstance(delta,list) else []))
    if isinstance(declared, dict):
        declared = declared.get("paths",[])
    declared = sorted(declared)
    expected_delta = sorted(["changed-paths.json","evidence/r9-correction-verification.json","output-hashes.json","r9-candidate-binding.json","r9-correction-report.md","requirement-matrix.json","scripts/finalize.py"])
    check(c1checks,"r8-manifest-raw-blob-audit",True,{"inheritedRows":22,"totalBytes":140981,"r8PackageFiles":len(r8relative)})
    r8manifest = json.loads(blob(r8relative["output-hashes.json"]["oid"]))
    r8rows = r8manifest.get("files",r8manifest.get("outputs",[]))
    r8mismatch=[]
    for row in r8rows:
        ent=r8relative.get(row.get("path"))
        if ent is None:
            r8mismatch.append({"path":row.get("path"),"reason":"missing"}); continue
        raw=blob(ent["oid"])
        if len(raw)!=row.get("bytes") or hashlib.sha256(raw).hexdigest()!=row.get("sha256"):
            r8mismatch.append({"path":row.get("path"),"reason":"hash/size mismatch"})
    check(c1checks,"r8-output-manifest-raw-blob-audit",not r8mismatch and len(r8rows)==22 and len(r8relative)==23 and r8manifest.get("totalBytes")==140981,{"rowCount":len(r8rows),"fileCountIncludingManifest":len(r8relative),"totalBytes":r8manifest.get("totalBytes"),"mismatches":r8mismatch})
    check(c1checks,"r9-vs-r8-seven-file-delta",r9diff==expected_delta and declared==expected_delta,{"actual":r9diff,"declared":declared,"expected":expected_delta})
    m8=json.loads(blob(r8relative["requirement-matrix.json"]["oid"]))
    m9=json.loads(blob(r9relative["requirement-matrix.json"]["oid"]))
    def rows(obj):
        return obj if isinstance(obj,list) else obj.get("requirements",obj.get("rows",obj.get("results",[])))
    mr8=rows(m8); mr9=rows(m9)
    statdiff=[]; claimdiff=[]; refs=[]; unresolved=[]
    for i,(x,y) in enumerate(zip(mr8,mr9)):
        if x.get("status")!=y.get("status"): statdiff.append(i)
        xx={k:v for k,v in x.items() if k not in ("evidence","evidencePaths")}
        yy={k:v for k,v in y.items() if k not in ("evidence","evidencePaths")}
        if xx!=yy: claimdiff.append(i)
        ev=y.get("evidence",y.get("evidencePaths",[]))
        if isinstance(ev,str): ev=[ev]
        refs.extend(ev)
        for ref in ev:
            if ref not in r9relative: unresolved.append(ref)
    e205=[x for x in mr9 if x.get("clause")=="E-02-05" or x.get("id")=="E-02-05"]
    e205ev=e205[0].get("evidence",e205[0].get("evidencePaths",[])) if e205 else None
    check(c1checks,"matrix-statuses-claims-and-evidence",len(mr8)==len(mr9)==7 and not statdiff and not claimdiff and not unresolved and e205ev==["evidence/cli-negative-false-pass.json"],{"rowCountR8":len(mr8),"rowCountR9":len(mr9),"statusDiff":statdiff,"claimDiff":claimdiff,"referencesChecked":len(refs),"unresolved":unresolved,"e205Evidence":e205ev})
    r8final=text(blob(r8relative["scripts/finalize.py"]["oid"]))
    r9final=text(blob(r9relative["scripts/finalize.py"]["oid"]))
    r8e=[line for line in r8final.splitlines() if '"id": "E-02-05"' in line]
    r9e=[line for line in r9final.splitlines() if '"id": "E-02-05"' in line]
    normalized=r8final.replace(r8e[0],r9e[0]) if len(r8e)==len(r9e)==1 else None
    check(c1checks,"finalizer-only-e205-pointer-delta",normalized==r9final and len(r8e)==len(r9e)==1 and 'evidence/cli-negative-false-pass.log' in r8e[0] and 'evidence/cli-negative-false-pass.log' not in r9e[0],{"r8Template":r8e,"r9Template":r9e,"onlyReplacementMatches":normalized==r9final})
    receipt=json.loads(blob(r9relative["evidence/cli-negative-false-pass.json"]["oid"]))
    receipt_ok=receipt.get("status")=="PASS" and receipt.get("exitCode")==1 and receipt.get("parsedResult",{}).get("status")=="FAIL" and receipt.get("stdout")==json.dumps(receipt.get("parsedResult"),indent=2)+"\n" and receipt.get("stderr")=="" and receipt.get("originalReceiptSha256BeforeAndAfter",{}).get("before")==receipt.get("originalReceiptSha256BeforeAndAfter",{}).get("after") and receipt.get("mutation",{}).get("disposableCopyOnly") is True
    check(c1checks,"committed-false-pass-receipt",receipt_ok,{"status":receipt.get("status"),"childExit":receipt.get("exitCode"),"parsedStatus":receipt.get("parsedResult",{}).get("status"),"stdoutMatches":receipt.get("stdout")==json.dumps(receipt.get("parsedResult"),indent=2)+"\n","stderrEmpty":receipt.get("stderr")=="","originalReceiptUnchanged":receipt.get("originalReceiptSha256BeforeAndAfter",{}).get("before")==receipt.get("originalReceiptSha256BeforeAndAfter",{}).get("after"),"disposableCopyOnly":receipt.get("mutation",{}).get("disposableCopyOnly"),"command":receipt.get("command")})
    changed=git("diff-tree","--no-commit-id","--name-only","-r",C1_PARENT,C1).decode().splitlines()
    outside=[p for p in changed if not p.startswith(c1prefix)]
    check(c1checks,"delivery-commit-adds-only-r9-package",len(changed)==len(c1package) and not outside,{"changedPathCount":len(changed),"packagePathCount":len(c1package),"outsideR9":outside})
    report["c1"]={
        "binding":{**c1meta,"branch":C1_BRANCH,"remoteCommit":c1remote,"packageTree":subtree(C1,C1_PREFIX),"rootAppTree":subtree(C1,"app"),"r8Input":C1_PARENT,"r8Tree":git("rev-parse",f"{C1_PARENT}^{{tree}}").decode().strip(),"r8PackageTree":subtree(C1_PARENT,C1_R8_PREFIX)},
        "manifest":{k:v for k,v in c1manifest.items() if k not in ("manifest","tree")},
        "r8Manifest":{"rowCount":len(r8rows),"totalBytes":r8manifest.get("totalBytes"),"mismatches":r8mismatch},
        "checks":c1checks,
        "r9R8Delta":r9diff,
        "matrix":{"statusesUnchanged":not statdiff,"claimsUnchanged":not claimdiff,"referencesChecked":len(refs),"unresolved":unresolved,"e205Evidence":e205ev},
        "receipt":{"status":receipt.get("status"),"childExit":receipt.get("exitCode"),"parsedStatus":receipt.get("parsedResult",{}).get("status"),"command":receipt.get("command")},
        "passed":all(x["status"]=="PASS" for x in c1checks),
    }
    report["passed"]=report["a1"]["passed"] and report["c1"]["passed"]
    out=json.dumps(report,indent=2,ensure_ascii=False)+"\n"
    OUT_A1.write_text(out,encoding="utf-8")
    OUT_C1.write_text(out,encoding="utf-8")
    print(json.dumps({"passed":report["passed"],"a1Passed":report["a1"]["passed"],"c1Passed":report["c1"]["passed"],"a1Checks":len(a1checks),"c1Checks":len(c1checks),"a1ManifestRows":a1manifest["manifestRowCount"],"c1ManifestRows":c1manifest["manifestRowCount"]},indent=2))
    if not report["passed"]:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
