import hashlib,json,pathlib,subprocess
repo=pathlib.Path(r"C:\Users\yoray\Projects\Yor World")
candidate=pathlib.Path(r"C:\Users\yoray\Projects\Yor World\deliveries\completion-audits\FINISH-B1\finish-07\20261011T145500Z-b1-r4-independent-review-01\.work\candidate")
rows=json.loads((candidate/"deliveries/FINISH-B1-R4-02/evidence/input-hashes.json").read_bytes())
for r in rows:
    assert not r["commit"].startswith("2cc4419") and "deliveries/FINISH-B1-R4/" not in r["path"]
    raw=subprocess.check_output(["git","show",f"{r['commit']}:{r['path']}"],cwd=repo)
    assert len(raw)==r["bytes"] and hashlib.sha256(raw).hexdigest()==r["sha256"],r
out={"status":"PASS","rowsVerified":len(rows),"commits":sorted({r["commit"] for r in rows}),"collisionSnapshotRead":False}
p=(candidate.parent/"input-hash-reverification.json");p.write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8");print(json.dumps(out,indent=2))
