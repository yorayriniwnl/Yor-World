import datetime,hashlib,json,os,pathlib,shutil,subprocess,sys,time
OUT=pathlib.Path(__file__).resolve().parents[1]
ROOT=OUT.parents[1]
EVIDENCE=OUT/'evidence'
CHECKS=EVIDENCE/'checks'
SCRATCH=ROOT/'.work/finish35-b1'
BLENDER=pathlib.Path(r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def rel(path):return path.relative_to(ROOT).as_posix()
def run(name,args,env=None):
    started=time.perf_counter();utc=datetime.datetime.now(datetime.timezone.utc).isoformat()
    result=subprocess.run([str(x) for x in args],cwd=ROOT,env=env,capture_output=True,text=True,errors='replace')
    elapsed=round(time.perf_counter()-started,3)
    (CHECKS/(name+'.stdout.log')).write_text(result.stdout,encoding='utf-8')
    (CHECKS/(name+'.stderr.log')).write_text(result.stderr,encoding='utf-8')
    row={'name':name,'argv':[str(x) for x in args],'startedUTC':utc,'durationSeconds':elapsed,'exitCode':result.returncode,
         'stdoutLog':rel(CHECKS/(name+'.stdout.log')),'stderrLog':rel(CHECKS/(name+'.stderr.log'))}
    records.append(row)
    if result.returncode:raise RuntimeError(name+' exited '+str(result.returncode)+'; inspect '+row['stderrLog']+' and '+row['stdoutLog'])
    return result.stdout
CHECKS.mkdir(parents=True,exist_ok=True)
records=[]
if not BLENDER.is_file():raise RuntimeError('required Blender executable unavailable: '+str(BLENDER))
# Confirm the prior candidate is exactly the recorded one before restoring R4 inputs for a deterministic rebuild.
browser=json.loads((EVIDENCE/'browser-results.json').read_text(encoding='utf-8'))
native=json.loads((EVIDENCE/'native-palette-scope.json').read_text(encoding='utf-8'))
for name in ('room.glb','fixture.glb'):
    expected=browser['assetHashes']['R5'][name]['sha256'];path=OUT/'assets'/name
    if sha(path)!=expected:raise RuntimeError('refusing to rebuild: current '+name+' differs from last recorded R5 candidate')
if sha(OUT/'assets/source/room.blend')!=native['outputNativeSHA256']:
    raise RuntimeError('refusing to rebuild: current native room blend differs from last recorded R5 candidate')
manifest=json.loads((OUT/'inputs/r4-02/output-hashes.json').read_text(encoding='utf-8'))
manifest_files={row['path']:row for row in manifest['files']}
for relpath in ('assets/room.glb','assets/fixture.glb','assets/source/room.blend'):
    source=OUT/'inputs/r4-02'/relpath;candidate=OUT/relpath;row=manifest_files[relpath]
    if len(source.read_bytes())!=row['bytes'] or sha(source)!=row['sha256']:raise RuntimeError('raw R4 manifest mismatch before rebuild: '+relpath)
    shutil.copyfile(source,candidate)
env=os.environ.copy();env['FINISH_B1_DEPENDENCY_ROOT']=str(SCRATCH/'harness')
run('create-source-patch',[sys.executable,rel(OUT/'scripts/create-source-patch.py')])
run('source-patch-replay',[sys.executable,rel(OUT/'scripts/replay-source-patch.py')])
run('blender-room-palette',[BLENDER,'--background','--python-exit-code','1','--python',rel(OUT/'scripts/apply-room-palette.py')])
run('blender-fixture-palette',[BLENDER,'--background','--python-exit-code','1','--python',rel(OUT/'scripts/apply-fixture-palette.py')])
run('native-material-merge',[sys.executable,rel(OUT/'scripts/merge-native-materials.py')])
run('matched-browser',["node",rel(OUT/'scripts/verify-browser.mjs')],env)
run('gltf-validator',["node",rel(OUT/'scripts/validate-glb.mjs')],env)
run('blender-final-imports',[BLENDER,'--background','--python-exit-code','1','--python',rel(OUT/'scripts/verify-blender-imports.py')])
run('final-budgets',[sys.executable,rel(OUT/'scripts/verify-final-budgets.py')])
run('correction-scope',[sys.executable,rel(OUT/'scripts/verify-correction-scope.py')])
run('capture-integrity',[sys.executable,rel(OUT/'scripts/verify-captures.py')])
receipt={'schemaVersion':1,'status':'PASS LOCAL','candidate':'FINISH-B1-R5','baseCommit':'7936fa981a24fe4af834ff250ffec8a7b02b09b3',
 'commands':records,'scope':'Rebuilt only the room native source, room GLB and chair-fixture GLB from the packet-bound R4 inputs, then replayed the palette patch and reran native, browser, validator, import, budget, scope and capture checks. Other delivery assets were not rewritten.'}
(EVIDENCE/'final-check-commands.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
browser=json.loads((EVIDENCE/'browser-results.json').read_text(encoding='utf-8'))
versions={'schemaVersion':1,'node':browser['node'],'chromium':browser['browser'],'playwright':browser['playwright'],'three':browser['three'],
 'gltfValidator':json.loads((SCRATCH/'harness/node_modules/gltf-validator/package.json').read_text(encoding='utf-8'))['version'],
 'blender':'5.2.2 LTS','python':sys.version.split()[0], 'dependencySource':'Exact R4 pinned package-lock installed in worktree-local .work/finish35-b1/harness; scratch excluded from delivery.'}
(EVIDENCE/'tool-versions.json').write_text(json.dumps(versions,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'commands':len(records),'browserCaptures':len(browser['captures']),'toolVersions':versions},indent=2))
