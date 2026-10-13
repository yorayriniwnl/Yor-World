import hashlib, json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
repo = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
candidate = "9188b413d37da0ec3381b5430e25dc375a45bb18"
base = "f62a43c5e71c00dcb89e28275ea81d842167db80"
def git_bytes(spec):
    p = subprocess.run(["git", "show", f"{candidate}:{spec}"], cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise RuntimeError(f"git show failed for {spec}: {p.stderr.decode(errors='replace')}")
    return p.stdout
def sha(data): return hashlib.sha256(data).hexdigest()
def load_json(spec):
    data = git_bytes(spec)
    return json.loads(data.decode("utf-8-sig")), data
root = "deliveries/FINISH-C1-R6"
output_manifest, manifest_bytes = load_json(f"{root}/output-hashes.json")
input_manifest, input_bytes = load_json(f"{root}/input-hashes.json")
outputs=[]
for rel, declared in output_manifest["outputs"].items():
    data=git_bytes(f"{root}/{rel}")
    actual={"path":rel,"expectedSha256":declared["sha256"],"actualSha256":sha(data),"expectedBytes":declared["bytes"],"actualBytes":len(data),"status":"PASS" if sha(data)==declared["sha256"] and len(data)==declared["bytes"] else "FAIL"}
    outputs.append(actual)
inputs=[]
def declared_input_bytes(path):
    wt=out/".work"/"replay-sequential"
    if path.startswith("candidate-app/app/"):
        return (wt/path[len("candidate-app/"):]).read_bytes()
    if path.startswith("candidate-app/node_modules/"):
        return (wt/"app"/"node_modules"/path[len("candidate-app/node_modules/"):]).read_bytes()
    return git_bytes(path)
for entry in input_manifest["r6Inputs"]:
    data=declared_input_bytes(entry["path"])
    inputs.append({"path":entry["path"],"expectedSha256":entry["sha256"],"actualSha256":sha(data),"expectedBytes":entry["bytes"],"actualBytes":len(data),"status":"PASS" if sha(data)==entry["sha256"] and len(data)==entry["bytes"] else "FAIL"})
predecessors=[]
for label, pred in input_manifest["predecessorManifests"].items():
    m=pred["outputManifest"]
    manifest_data=git_bytes(m["path"])
    item={"delivery":label,"manifestPath":m["path"],"manifestSha256Expected":m["sha256"],"manifestSha256Actual":sha(manifest_data),"manifestBytesExpected":m["bytes"],"manifestBytesActual":len(manifest_data),"declaredOutputCount":pred["declaredOutputCount"],"verifiedOutputs":[]}
    for entry in pred["verifiedOutputs"]:
        data=git_bytes(entry["deliveryPath"])
        item["verifiedOutputs"].append({"path":entry["deliveryPath"],"sha256Expected":entry["sha256"],"sha256Actual":sha(data),"bytesExpected":entry["bytes"],"bytesActual":len(data),"status":"PASS" if sha(data)==entry["sha256"] and len(data)==entry["bytes"] else "FAIL"})
    item["status"]="PASS" if item["manifestSha256Actual"]==item["manifestSha256Expected"] and item["manifestBytesActual"]==item["manifestBytesExpected"] and all(x["status"]=="PASS" for x in item["verifiedOutputs"]) else "FAIL"
    predecessors.append(item)
r6_replacements=[]
for entry in input_manifest["r6Outputs"]:
    data=git_bytes(f"{root}/{entry['sourcePath']}")
    expected=entry["r6Output"]
    r6_replacements.append({"sourcePath":entry["sourcePath"],"targetPath":entry["path"],"expectedSha256":expected["sha256"],"actualSha256":sha(data),"expectedBytes":expected["bytes"],"actualBytes":len(data),"status":"PASS" if sha(data)==expected["sha256"] and len(data)==expected["bytes"] else "FAIL"})
patches=[]
for label, path, expected, expected_size in [
    ("R3","deliveries/FINISH-C1-R3/source.patch","e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d",157355),
    ("R5","deliveries/FINISH-C1-R5/source.patch","d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d",34904),
    ("R6",f"{root}/source.patch","17ae6aaab7910546d3527feec26926d8d1fd604e3bc60e2ae0eb9f549f7fc2a6",6475)]:
    data=git_bytes(path)
    patches.append({"label":label,"path":path,"expectedSha256":expected,"actualSha256":sha(data),"expectedBytes":expected_size,"actualBytes":len(data),"status":"PASS" if sha(data)==expected and len(data)==expected_size else "FAIL"})
base_tree=subprocess.run(["git","rev-parse",f"{base}:app"],cwd=repo,text=True,capture_output=True,check=True).stdout.strip()
candidate_commit=subprocess.run(["git","show","-s","--format=%H%n%P%n%T%n%s",candidate],cwd=repo,text=True,capture_output=True,check=True).stdout.strip().splitlines()
root_output_bytes=sum(x["actualBytes"] for x in outputs)
status="PASS" if all(x["status"]=="PASS" for x in outputs+inputs+patches+r6_replacements) and all(x["status"]=="PASS" for p in predecessors for x in p["verifiedOutputs"]) and all(x["status"]=="PASS" for x in predecessors) and len(outputs)==35 and root_output_bytes==1415587 and len(inputs)==29 and len(r6_replacements)==2 else "FAIL"
receipt={"schemaVersion":1,"review":"FINISH-16 fresh candidate binding","reviewer":"local Codex; not GPT Plus #2","capturedAtUtc":datetime.now(timezone.utc).isoformat(),"candidate":{"commit":candidate_commit[0],"parent":candidate_commit[1],"tree":candidate_commit[2],"subject":candidate_commit[3],"baseCommit":base,"baseAppTreeExpected":"42ea29ec235225046a75959eb19eb386ac2f821d","baseAppTreeActual":base_tree},"candidateOutputManifest":{"sha256":sha(manifest_bytes),"bytes":len(manifest_bytes),"expectedSha256":"a8dcd6700b2471b3a2d0d98d71a79ce398a33efcea5a1c48fc83d291cdeeb798","declaredCount":output_manifest["outputFileCount"],"verifiedCount":len(outputs),"actualTotalBytes":root_output_bytes,"expectedTotalBytes":output_manifest["totalOutputBytes"],"outputs":outputs},"declaredInputs":{"manifestSha256":sha(input_bytes),"manifestBytes":len(input_bytes),"declaredCount":len(inputs),"verifiedCount":sum(x["status"]=="PASS" for x in inputs),"inputs":inputs},"predecessors":predecessors,"r6Replacements":r6_replacements,"patches":patches,"status":status}
(out/"evidence").mkdir(parents=True,exist_ok=True)
(out/"evidence"/"candidate-hash-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":status,"candidate":candidate_commit[0],"candidateManifestSha256":sha(manifest_bytes),"outputsVerified":len(outputs),"outputBytes":root_output_bytes,"inputsVerified":sum(x["status"]=="PASS" for x in inputs),"declaredInputs":len(inputs),"R3Verified":len(predecessors[0]["verifiedOutputs"]),"R5Verified":len(predecessors[1]["verifiedOutputs"]),"replacementsVerified":sum(x["status"]=="PASS" for x in r6_replacements),"patches":patches},indent=2))
if status!="PASS": sys.exit(1)





