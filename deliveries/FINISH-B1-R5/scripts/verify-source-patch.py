import hashlib,json,pathlib,shutil,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/"inputs/r4/source/blender/scripts/build-environment.py";PATCH=ROOT/"source.patch";TARGET=ROOT/"source/blender/scripts/build-environment.py"
(ROOT/".work").mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="finish35-patch-",dir=ROOT/".work") as tmp:
 w=pathlib.Path(tmp);dst=w/"source/blender/scripts/build-environment.py";dst.parent.mkdir(parents=True);shutil.copy2(BASE,dst)
 check=subprocess.run(["git","apply","--check",str(PATCH.resolve())],cwd=w,text=True,capture_output=True)
 if check.returncode: raise SystemExit(f"git apply --check failed: {check.stdout}{check.stderr}")
 applied=subprocess.run(["git","apply",str(PATCH.resolve())],cwd=w,text=True,capture_output=True)
 if applied.returncode: raise SystemExit(f"git apply failed: {applied.stdout}{applied.stderr}")
 a=hashlib.sha256(dst.read_bytes()).hexdigest();b=hashlib.sha256(TARGET.read_bytes()).hexdigest();assert a==b,(a,b)
 receipt={"status":"PASS","command":"python scripts/verify-source-patch.py","base":"inputs/r4/source/blender/scripts/build-environment.py","patch":"source.patch","replayedSha256":a,"candidateSourceSha256":b,"byteIdentical":True,"fullGeometryRebuild":"NOT RUN; isolated rebuild of the pinned R4 builder changed the R4-02 wall geometry inventory. Material replay is performed against the exact R4-02 room.blend to preserve geometry."}
(ROOT/"evidence/source-patch-replay.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8");print(json.dumps(receipt))
