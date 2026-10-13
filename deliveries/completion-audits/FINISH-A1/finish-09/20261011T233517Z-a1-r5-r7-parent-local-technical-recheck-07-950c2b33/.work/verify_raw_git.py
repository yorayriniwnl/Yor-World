import hashlib, json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[6]
OUTS = [
    ROOT / "deliveries/completion-audits/FINISH-A1/finish-09/20261011T233517Z-a1-r5-r7-parent-local-technical-recheck-07-950c2b33/evidence/raw-git-verification.json",
    ROOT / "deliveries/completion-audits/FINISH-C1/finish-16/20261011T233517Z-c1-r9-parent-local-technical-recheck-07-950c2b33/evidence/raw-git-verification.json",
]
A1="76d679dcb98064152021830b98f16eb456b3ae19"; A1BASE="f62a43c5e71c00dcb89e28275ea81d842167db80"; A1P="deliveries/FINISH-A1/r5-07"; A1BR="codex/finish-29-a1-r5-r7-20261011"
C1="3dda9a616033375768f3d5f60f8c653d504f7c8c"; R8="c398876583bc337c069414b79364e3fdea745879"; C1P="deliveries/FINISH-C1-R9"; R8P="deliveries/FINISH-C1-R8"; C1BR="codex/finish-30-c1-r9-20261011"

def git(*args):
    p=subprocess.run(["git",*map(str,args)],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode: raise RuntimeError(f"git {args}: {p.returncode}: {p.stderr.decode(errors='replace')}")
    return p.stdout
def blob(oid): return git("cat-file","blob",oid)
def tree(rev):
    result={}
    for rec in git("ls-tree","-r","-z",rev).split(b"\0"):
        if not rec: continue
        meta,path=rec.split(b"\t",1); mode,kind,oid=meta.decode().split()
        if kind=="blob": result[path.decode()]={"oid":oid,"mode":mode}
    return result
def meta(commit):
    ps=git("rev-list","--parents","-n","1",commit).decode().split()
    return {"commit":ps[0],"parent":ps[1] if len(ps)>1 else None,"tree":git("rev-parse",f"{commit}^{{tree}}").decode().strip()}
def subtree(commit,path): return git("rev-parse",f"{commit}:{path}").decode().strip()
def remote(branch):
    s=git("ls-remote","origin",f"refs/heads/{branch}").decode().strip()
    return s.split("\t")[0] if s else None
def add(checks,name,ok,detail): checks.append({"id":name,"status":"PASS" if ok else "FAIL","detail":detail})
def audit_manifest(commit,prefix,expected):
    t=tree(commit); raw=blob(t[prefix+"/output-hashes.json"]["oid"]); sha=hashlib.sha256(raw).hexdigest(); m=json.loads(raw)
    rows=m.get("files",m.get("outputs",[])); files={p[len(prefix)+1:]:v for p,v in t.items() if p.startswith(prefix+"/")}; mismatches=[]
    for r in rows:
        ent=files.get(r["path"])
        if not ent: mismatches.append({"path":r["path"],"reason":"missing"}); continue
        b=blob(ent["oid"]); h=hashlib.sha256(b).hexdigest()
        if len(b)!=r.get("bytes") or h!=r.get("sha256"): mismatches.append({"path":r["path"],"bytes":len(b),"sha256":h})
    listed={r["path"] for r in rows}; treepaths=set(files)-{"output-hashes.json"}
    return {"sha256":sha,"expectedSha256":expected,"rowCount":len(rows),"totalBytes":m.get("totalBytes"),"treeFileCount":len(files),"missingFromTree":sorted(listed-set(files)),"unlistedTreeFiles":sorted(treepaths-listed),"blobMismatches":mismatches,"ok":sha==expected and not mismatches and listed==treepaths,"manifest":m,"files":files}

def main():
    result={"schemaVersion":1,"auditType":"FINISH-36 Parent-local raw-Git recheck","a1":{},"c1":{}}
    # A1 exact binding and every output-manifest row.
    at=tree(A1); am=meta(A1); abranch=remote(A1BR); apack={p:v for p,v in at.items() if p.startswith(A1P+"/")}; ac=[]
    add(ac,"candidate-binding",am=={"commit":A1,"parent":A1BASE,"tree":"6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6"},{**am,"expectedParent":A1BASE})
    add(ac,"remote-branch",abranch==A1,{"branch":A1BR,"remote":abranch,"expected":A1})
    aroot=subtree(A1,"app"); apkg=subtree(A1,A1P); asrc=subtree(A1,A1P+"/source/app")
    add(ac,"unchanged-root-app",aroot=="42ea29ec235225046a75959eb19eb386ac2f821d",{"actual":aroot})
    add(ac,"package-and-source-subtrees",apkg=="61026e89795d28aa212ee2e03c8edc05b2aea97a" and asrc=="1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3",{"package":apkg,"sourceApp":asrc})
    amf=audit_manifest(A1,A1P,"5c42034d1ceb9cf938d7a536a436b3b53cee8094c48e3e934c419dad0fafa420")
    add(ac,"all-output-manifest-rows-from-raw-blobs",amf["ok"] and amf["rowCount"]==79 and amf["totalBytes"]==1695825,{k:v for k,v in amf.items() if k not in ("manifest","files")})
    patch=blob(at[A1P+"/source.patch"]["oid"]); ph=hashlib.sha256(patch).hexdigest(); valid=True
    try: patch.decode("utf-8","strict")
    except UnicodeDecodeError: valid=False
    encok=valid and not patch.startswith(b"\xef\xbb\xbf") and b"\0" not in patch
    ppaths=sorted(set(x.decode() for x in re.findall(rb"^diff --git a/(.*?) b/.*$",patch,re.M)))
    changed=blob(at[A1P+"/changed-paths.txt"]["oid"]).decode("utf-8-sig").splitlines(); changed=sorted(set(x.strip() for x in changed if x.strip()))
    add(ac,"patch-hash-encoding-paths",ph=="aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8" and encok and ppaths==changed and len(ppaths)==25,{"sha256":ph,"bytes":len(patch),"validUtf8NoBomNul":encok,"patchPaths":ppaths,"changedPaths":changed})
    contract=(ROOT/"docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md").read_text(encoding="utf-8")
    a1s=contract.index("### FINISH-A1:"); next_heading=contract.find("### FINISH-A2:",a1s); section=contract[a1s:next_heading if next_heading!=-1 else len(contract)]
    allow=sorted("app/"+x for x in re.findall(r"\| `([^`]+)` \| (?:existing|new) \|",section)); unauthorized=sorted(set(ppaths)-set(allow))
    add(ac,"frozen-26-path-allowlist",len(allow)==26 and not unauthorized,{"count":len(allow),"changedCount":len(ppaths),"unauthorized":unauthorized,"allowlist":allow})
    adiff=git("diff-tree","--no-commit-id","--name-only","-r",A1BASE,A1).decode().splitlines(); outside=[p for p in adiff if not p.startswith(A1P+"/")]
    add(ac,"candidate-commit-only-adds-delivery",not outside and len(adiff)==len(apack),{"changed":len(adiff),"packageFiles":len(apack),"outside":outside})
    result["a1"]={"binding":{"branch":A1BR,"remoteCommit":abranch,**am,"packageTree":apack and apkg,"sourceAppTree":asrc,"rootAppTree":aroot,"base":A1BASE},"manifest":{k:v for k,v in amf.items() if k not in ("manifest","files")},"patch":{"sha256":ph,"bytes":len(patch),"paths":ppaths,"allowlist":allow},"checks":ac,"passed":all(c["status"]=="PASS" for c in ac)}

    # C1 exact binding; compare every R9/R8 raw file and evidence reference.
    ct=tree(C1); cm=meta(C1); cbranch=remote(C1BR); cpack={p:v for p,v in ct.items() if p.startswith(C1P+"/")}; cc=[]
    add(cc,"candidate-binding",cm=={"commit":C1,"parent":R8,"tree":"5a38d405499737ff40b0141a64845c244a9e4813"},{**cm,"expectedParent":R8})
    add(cc,"remote-branch",cbranch==C1,{"branch":C1BR,"remote":cbranch,"expected":C1})
    croot=subtree(C1,"app"); csub=subtree(C1,C1P)
    add(cc,"unchanged-root-app-and-package-tree",croot=="42ea29ec235225046a75959eb19eb386ac2f821d" and csub=="aa097f12adff2dbac2c88d6300c949f37bf34251",{"rootApp":croot,"package":csub})
    cmf=audit_manifest(C1,C1P,"31903805363ed7d56521d334893d40d99079a716e1b374ac2a4c1895ecaff465")
    add(cc,"r9-output-manifest-raw-blobs",cmf["ok"] and cmf["rowCount"]==26 and cmf["totalBytes"]==145757,{k:v for k,v in cmf.items() if k not in ("manifest","files")})
    r8t=tree(R8); r8rel={p[len(R8P)+1:]:v for p,v in r8t.items() if p.startswith(R8P+"/")}; r9rel={p[len(C1P)+1:]:v for p,v in ct.items() if p.startswith(C1P+"/")}
    r8m=json.loads(blob(r8rel["output-hashes.json"]["oid"])); r8rows=r8m.get("files",r8m.get("outputs",[])); r8mis=[]
    for r in r8rows:
        e=r8rel.get(r["path"])
        if not e: r8mis.append({"path":r["path"],"reason":"missing"}); continue
        b=blob(e["oid"])
        if len(b)!=r.get("bytes") or hashlib.sha256(b).hexdigest()!=r.get("sha256"): r8mis.append({"path":r["path"],"reason":"hash/size mismatch"})
    add(cc,"r8-output-manifest-raw-blobs",len(r8rows)==22 and len(r8rel)==23 and r8m.get("totalBytes")==140981 and not r8mis,{"rowCount":len(r8rows),"totalBytes":r8m.get("totalBytes"),"fileCount":len(r8rel),"mismatches":r8mis})
    actual_delta=sorted(p for p in set(r8rel)|set(r9rel) if p not in r8rel or p not in r9rel or r8rel[p]["oid"]!=r9rel[p]["oid"])
    declared=json.loads(blob(ct[C1P+"/changed-paths.json"]["oid"])).get("changedPaths",[])
    expected_delta=sorted(["changed-paths.json","evidence/r9-correction-verification.json","output-hashes.json","r9-candidate-binding.json","r9-correction-report.md","requirement-matrix.json","scripts/finalize.py"])
    add(cc,"exact-seven-path-r9-r8-delta",actual_delta==expected_delta and sorted(declared)==expected_delta,{"actual":actual_delta,"declared":sorted(declared),"expected":expected_delta})
    m8=json.loads(blob(r8rel["requirement-matrix.json"]["oid"])); m9=json.loads(blob(r9rel["requirement-matrix.json"]["oid"])); rows8=m8.get("results",[]); rows9=m9.get("results",[])
    statusdiff=[]; claimdiff=[]; refs=[]; unresolved=[]
    for i,(x,y) in enumerate(zip(rows8,rows9)):
        if x.get("status")!=y.get("status"): statusdiff.append(i)
        if {k:v for k,v in x.items() if k!="evidence"}!={k:v for k,v in y.items() if k!="evidence"}: claimdiff.append(i)
        for ref in y.get("evidence",[]): refs.append(ref); unresolved.extend([] if ref in r9rel else [ref])
    e205=[x for x in rows9 if x.get("id")=="E-02-05"]; e205ev=e205[0].get("evidence") if e205 else None
    add(cc,"matrix-status-claim-evidence-paths",len(rows8)==len(rows9)==7 and not statusdiff and not claimdiff and not unresolved and e205ev==["evidence/cli-negative-false-pass.json"],{"rowsR8":len(rows8),"rowsR9":len(rows9),"statusDiff":statusdiff,"claimDiff":claimdiff,"evidenceRefs":len(refs),"unresolved":unresolved,"E205":e205ev})
    f8=blob(r8rel["scripts/finalize.py"]["oid"]).decode(); f9=blob(r9rel["scripts/finalize.py"]["oid"]).decode(); l8=[l for l in f8.splitlines() if '"id": "E-02-05"' in l]; l9=[l for l in f9.splitlines() if '"id": "E-02-05"' in l]
    finalizer_ok=len(l8)==len(l9)==1 and f8.replace(l8[0],l9[0])==f9 and "evidence/cli-negative-false-pass.log" in l8[0] and "evidence/cli-negative-false-pass.log" not in l9[0]
    add(cc,"finalizer-only-pointer-change",finalizer_ok,{"R8":l8,"R9":l9,"onlyReplacementMatches":finalizer_ok})
    receipt=json.loads(blob(r9rel["evidence/cli-negative-false-pass.json"]["oid"]))
    try: stdout_json=json.loads(receipt.get("stdout","")); stdout_matches=stdout_json==receipt.get("parsedResult")
    except Exception: stdout_matches=False
    stable=receipt.get("originalReceiptSha256BeforeAndAfter",{}); mutation=receipt.get("mutation",{})
    receipt_ok=receipt.get("status")=="PASS" and receipt.get("exitCode")==1 and receipt.get("parsedResult",{}).get("status")=="FAIL" and stdout_matches and receipt.get("stderr")=="" and stable.get("before")==stable.get("after") and mutation.get("disposableCopyOnly") is True
    add(cc,"false-pass-receipt",receipt_ok,{"status":receipt.get("status"),"childExit":receipt.get("exitCode"),"parsedStatus":receipt.get("parsedResult",{}).get("status"),"stdoutMatches":stdout_matches,"stderrEmpty":receipt.get("stderr")=="","originalReceiptUnchanged":stable.get("before")==stable.get("after"),"disposableCopyOnly":mutation.get("disposableCopyOnly"),"command":receipt.get("command")})
    cdiff=git("diff-tree","--no-commit-id","--name-only","-r",R8,C1).decode().splitlines(); cout=[p for p in cdiff if not p.startswith(C1P+"/")]
    add(cc,"candidate-commit-only-adds-r9",not cout and len(cdiff)==len(cpack),{"changed":len(cdiff),"packageFiles":len(cpack),"outside":cout})
    result["c1"]={"binding":{"branch":C1BR,"remoteCommit":cbranch,**cm,"packageTree":csub,"rootAppTree":croot,"r8Input":R8,"r8Tree":git("rev-parse",f"{R8}^{{tree}}").decode().strip(),"r8PackageTree":subtree(R8,R8P)},"manifest":{k:v for k,v in cmf.items() if k not in ("manifest","files")},"r8Manifest":{"rows":len(r8rows),"totalBytes":r8m.get("totalBytes"),"mismatches":r8mis},"checks":cc,"delta":actual_delta,"matrix":{"statusesUnchanged":not statusdiff,"claimsUnchanged":not claimdiff,"referencesChecked":len(refs),"unresolved":unresolved},"receipt":{"status":receipt.get("status"),"exitCode":receipt.get("exitCode"),"parsedStatus":receipt.get("parsedResult",{}).get("status")},"passed":all(x["status"]=="PASS" for x in cc)}
    result["passed"]=result["a1"]["passed"] and result["c1"]["passed"]
    data=json.dumps(result,indent=2,ensure_ascii=False)+"\n"
    for p in OUTS: p.write_text(data,encoding="utf-8")
    print(json.dumps({"passed":result["passed"],"a1Passed":result["a1"]["passed"],"c1Passed":result["c1"]["passed"],"a1Checks":len(ac),"c1Checks":len(cc)},indent=2))
    if not result["passed"]: raise SystemExit(1)
if __name__=="__main__": main()
