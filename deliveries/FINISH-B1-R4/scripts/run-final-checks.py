"""Final R1 replay and checks. Historical material-only receipts remain untouched."""
import datetime,hashlib,json,pathlib,subprocess,sys
OUT=pathlib.Path(__file__).resolve().parents[1];ROOT=OUT.parents[1]
BLENDER='C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
def digest(p):return hashlib.sha256((OUT/p).read_bytes()).hexdigest()
before={p:digest(p) for p in ['assets/room.glb','evidence/native-room-export.glb','assets/source/room.blend','source/blender/scripts/build-environment.py','source.patch']}
rows=[]
def run(command,log):
    start=datetime.datetime.now(datetime.timezone.utc).isoformat();r=subprocess.run(command,cwd=ROOT,capture_output=True)
    (OUT/log).write_bytes(r.stdout+r.stderr)
    rows.append(dict(command=command,startUTC=start,endUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),exit=r.returncode,status='PASS' if r.returncode==0 else 'FAIL',log=log,logSHA256=digest(log)))
    print(command[-1],r.returncode,flush=True)
    if r.returncode:raise RuntimeError(f'FAIL: {command}; see {log}')
try:
    run([BLENDER,'--background','--python-exit-code','1','--python',str(OUT/'scripts/apply-native-geometry.py')],'evidence/final-native-replay.log')
    run([sys.executable,str(OUT/'scripts/export-final-room.py')],'evidence/final-room-replay.log')
    after={p:digest(p) for p in before}
    assert all(before[p]==after[p] for p in before if p!='assets/source/room.blend'),(before,after)
    (OUT/'evidence/final-export-reproducibility.json').write_text(json.dumps(dict(status='PASS',beforeSHA256=before,afterSHA256=after,productionGLBReplayByteExact=True,nativeRoomGLBReplayByteExact=True,sourceAndPatchUnchanged=True,recipe='Exact R3 native + final patched authoring recipes, actual native room export, original-record-preserving production merge.',nativeBlendByteIdentityRequired=False,nativeBlendCaveat='Saved .blend container is compared by exact semantic reopened inventories, not timestamp-dependent container byte identity.'),indent=2)+'\n',encoding='utf-8')
    run([sys.executable,str(OUT/'scripts/verify-final-lineage.py')],'evidence/final-lineage.log')
    run([BLENDER,'--background','--python-exit-code','1','--python',str(OUT/'scripts/verify-native-parity.py')],'evidence/final-native-parity.log')
    run([BLENDER,'--background','--python-exit-code','1','--python',str(OUT/'scripts/verify-blender-imports.py')],'evidence/final-blender-imports.log')
    run(['node',str(OUT/'scripts/validate-glb.mjs')],'evidence/final-gltf-validation.log')
    run([sys.executable,str(OUT/'scripts/verify-captures.py')],'evidence/final-capture-reverification.log')
    run([sys.executable,str(OUT/'scripts/verify-final-budgets.py')],'evidence/final-budgets.log')
    run([sys.executable,str(OUT/'scripts/bind-final-inputs.py')],'evidence/final-input-binding.log')
finally:
    (OUT/'evidence/final-check-commands.json').write_text(json.dumps(dict(commands=rows,scope='Final amended R4 local checks; provider/physical-device acceptance is not performed.'),indent=2)+'\n',encoding='utf-8')
