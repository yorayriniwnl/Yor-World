import hashlib,json,pathlib,shutil,subprocess
OUT=pathlib.Path(__file__).resolve().parents[1]
ROOT=OUT.parents[1]
WORK=ROOT/'.work/finish35-b1/builder-replay-final'
BASE=OUT/'inputs/r4-02/source/blender/scripts/build-environment.py'
CANDIDATE=OUT/'source/blender/scripts/build-environment.py'
PATCH=OUT/'source.patch'
def sha(b):return hashlib.sha256(b).hexdigest()
if WORK.exists():raise RuntimeError('preserve existing replay scratch: '+str(WORK))
target=WORK/'source/blender/scripts/build-environment.py';target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(BASE,target)
relative=WORK.relative_to(ROOT).as_posix()
patch_rel=PATCH.relative_to(ROOT).as_posix()
commands=[]
for args in [ ['git','apply','--check','--directory='+relative,patch_rel], ['git','apply','--directory='+relative,patch_rel] ]:
    result=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
    commands.append({'argv':args,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
    if result.returncode:raise RuntimeError(json.dumps(commands[-1]))
replayed=target.read_bytes();candidate=CANDIDATE.read_bytes()
if sha(replayed)!=sha(candidate):raise RuntimeError('replayed source differs from candidate builder')
receipt={'status':'PASS','baseCommit':'7936fa981a24fe4af834ff250ffec8a7b02b09b3','baseInputPath':'deliveries/FINISH-B1-R4-02/source/blender/scripts/build-environment.py',
 'baseBuilderSHA256':sha(BASE.read_bytes()),'sourcePatchSHA256':sha(PATCH.read_bytes()),'candidateBuilderSHA256':sha(candidate),'replayedBuilderSHA256':sha(replayed),
 'replayScratchPath':relative.replace('\\','/')+'/source/blender/scripts/build-environment.py','commands':commands,
 'scope':'git apply --check and apply of the unified source patch to the raw-Git-bound exact R4 builder input in worktree-local scratch.'}
(OUT/'evidence/source-patch-replay.json').write_text(json.dumps(receipt,indent=2)+chr(10),encoding='utf-8')
print(json.dumps({'status':'PASS','baseSHA256':receipt['baseBuilderSHA256'],'patchSHA256':receipt['sourcePatchSHA256'],'replaySHA256':receipt['replayedBuilderSHA256'],'candidateMatch':True},indent=2))
