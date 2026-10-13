import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
raw=json.loads((ROOT/"evidence/browser-runner-raw.json").read_text(encoding="utf-8"))
for rows in (raw.get("measurements",[]),raw.get("captures",[])):
 for row in rows:
  if row.get("variant")=="R4":row["variant"]="R5"
  if row.get("file"):row["file"]=row["file"].replace("captures/R4/","captures/R5/")
if "R4" in raw.get("assetHashes",{}):raw["assetHashes"]["R5"]=raw["assetHashes"].pop("R4")
if "R4" in raw.get("assetResponses",{}):raw["assetResponses"]["R5"]=raw["assetResponses"].pop("R4")
raw["candidateVariantMapping"]={"runnerVariant":"R4","candidate":"FINISH-B1-R5","evidence":"Final asset hashes and HTTP response paths are rooted under deliveries/FINISH-B1-R5; R4 is the inherited runner slot name."}
(ROOT/"evidence/browser-results.json").write_text(json.dumps(raw,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"candidate":"R5","desktop":next(x["rendererInfo"]["calls"] for x in raw["measurements"] if x.get("variant")=="R5" and x.get("key")=="desktop-home"),"mobile":next(x["rendererInfo"]["calls"] for x in raw["measurements"] if x.get("variant")=="R5" and x.get("key")=="mobile-home")}))
