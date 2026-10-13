import json,os,pathlib,shutil,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[1];REPO=ROOT.parents[1];BLENDER=pathlib.Path(os.environ.get("BLENDER_EXECUTABLE",r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"))
LOG=ROOT/"evidence/logs";LOG.mkdir(parents=True,exist_ok=True);records=[]
def run(name,cmd):
 start=time.time();p=subprocess.run([str(x) for x in cmd],cwd=REPO,text=True,capture_output=True);elapsed=round(time.time()-start,3)
 (LOG/(name+".stdout.log")).write_text(p.stdout,encoding="utf-8");(LOG/(name+".stderr.log")).write_text(p.stderr,encoding="utf-8")
 record={"name":name,"command":[str(x) for x in cmd],"exitCode":p.returncode,"elapsedSeconds":elapsed,"stdoutLog":"evidence/logs/"+name+".stdout.log","stderrLog":"evidence/logs/"+name+".stderr.log"};records.append(record);print(json.dumps(record))
 return p.returncode
py=sys.executable
steps=[
 ("source-patch-replay",[py,ROOT/"scripts/verify-source-patch.py"]),
 ("native-palette-replay",[BLENDER,"--background","--python-exit-code","1","--python",ROOT/"scripts/apply-native-palette.py","--",ROOT/"inputs/r4/assets/source/room.blend",ROOT/"assets/source/room.blend"]),
 ("gltf-palette-replay",[py,ROOT/"scripts/apply-gltf-palette.py"]),
 ("native-inventory-r4",[BLENDER,"--background",ROOT/"inputs/r4/assets/source/room.blend","--python-exit-code","1","--python",ROOT/"scripts/dump-native-inventory.py","--",ROOT/"evidence/native-inventory-r4.json"]),
 ("native-inventory-r5",[BLENDER,"--background",ROOT/"assets/source/room.blend","--python-exit-code","1","--python",ROOT/"scripts/dump-native-inventory.py","--",ROOT/"evidence/native-inventory-r5.json"]),
 ("palette-invariants",[py,ROOT/"scripts/verify-palette-invariants.py"]),
 ("browser-matched-profiles",["node",ROOT/"scripts/verify-browser.mjs"]),
]
for name,cmd in steps:
 rc=run(name,cmd)
 if rc: raise SystemExit(f"FAIL: {name}, exit {rc}")
shutil.copy2(ROOT/"evidence/browser-results.json",ROOT/"evidence/browser-runner-raw.json")
shutil.copytree(ROOT/"captures/R4",ROOT/"captures/R5",dirs_exist_ok=True)
for name,cmd in [
 ("normalize-browser-results",[py,ROOT/"scripts/normalize-browser-results.py"]),
 ("gltf-validator",["node",ROOT/"scripts/validate-glb.mjs"]),
 ("blender-glb-imports",[BLENDER,"--background","--python-exit-code","1","--python",ROOT/"scripts/verify-blender-imports.py"]),
 ("draw-triangle-transfer-budgets",[py,ROOT/"scripts/verify-final-budgets.py"]),
 ("visual-comparisons",[py,ROOT/"scripts/build-comparison-sheets.py"]),
]:
 rc=run(name,cmd)
 if rc: raise SystemExit(f"FAIL: {name}, exit {rc}")
receipt={"status":"PASS","command":"python scripts/run-finish35-checks.py","records":records,"scope":"Repeatable local FINISH-35 package checks. No visual owner review, independent GPT#2 acceptance, production, provider, device, or G7 claim."}
(ROOT/"evidence/commands-and-exit-codes.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":"PASS","checks":len(records)}))
