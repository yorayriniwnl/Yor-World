import hashlib,json,pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
def sha(b):return hashlib.sha256(b).hexdigest()
excluded={'output-hashes.json','evidence/package-verification.json'}
manifest_path=OUT/'output-hashes.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
listed={row['path']:row for row in manifest['files']}
if set(manifest['selfExcluded'])!=excluded:raise RuntimeError('package manifest exclusions differ')
actual={p.relative_to(OUT).as_posix():p for p in OUT.rglob('*') if p.is_file() and p.relative_to(OUT).as_posix() not in excluded}
if set(actual)!=set(listed):raise RuntimeError('exact package file set mismatch; missing='+repr(sorted(set(listed)-set(actual)))+' extra='+repr(sorted(set(actual)-set(listed))))
for rel,p in actual.items():
    row=listed[rel];raw=p.read_bytes()
    if len(raw)!=row['bytes'] or sha(raw)!=row['sha256']:raise RuntimeError('package hash mismatch '+rel)
commands=json.loads((OUT/'evidence/final-check-commands.json').read_text(encoding='utf-8'))
if commands['status']!='PASS LOCAL' or any(row['exitCode']!=0 for row in commands['commands']):raise RuntimeError('final validation command did not pass')
validator=json.loads((OUT/'evidence/gltf-validation.json').read_text(encoding='utf-8'))
if validator['errors'] or validator['warnings'] or len(validator['files'])!=5:raise RuntimeError('GLB validator evidence is not clean')
scope=json.loads((OUT/'evidence/final-scope.json').read_text(encoding='utf-8'))
if scope['status']!='PASS LOCAL' or not scope['r4TemperedGlassSemanticallyUnchanged'] or not scope['runtimeRequestSetUnchanged']:raise RuntimeError('scope evidence failed')
assets=json.loads((OUT/'candidate-asset-manifest.json').read_text(encoding='utf-8'))
if sorted(assets['runtimeRequestIDs'])!=sorted(pathlib.PurePosixPath(p).name for p in scope['runtimeAssetUniverse'] if p.endswith('.glb')):raise RuntimeError('runtime request IDs differ from final scope evidence')
for row in assets['runtimeAssets']:
    p=OUT/row['path']
    if p.stat().st_size!=row['bytes'] or sha(p.read_bytes())!=row['sha256']:raise RuntimeError('candidate asset manifest mismatch '+row['path'])
source=assets['nativeSource'];source_path=OUT/source['path']
if sha(source_path.read_bytes())!=source['sha256']:raise RuntimeError('native source manifest mismatch')
capture=json.loads((OUT/'evidence/capture-verification.json').read_text(encoding='utf-8'))
if capture['status']!='PASS LOCAL' or capture['captureCount']!=14:raise RuntimeError('matched capture integrity evidence failed')
root=OUT.parents[1]
if root/'.work' == OUT or OUT in (root/'.work').resolve().parents:raise RuntimeError('scratch path is inside stable delivery root')
receipt={'status':'PASS','command':'python scripts/verify-package.py','filesVerified':len(actual),'bytesVerified':sum(row['bytes'] for row in listed.values()),
 'manifestSHA256':sha(manifest_path.read_bytes()),'packageSetExact':True,'excludedFiles':sorted(excluded),'finalCommandsPassed':True,'gltfErrors':0,'gltfWarnings':0,
 'r4TemperedGlassSemanticallyUnchanged':True,'runtimeRequestSetUnchanged':True,'candidateAssetHashesMatch':True,'captureCount':capture['captureCount'],'scratchOutsidePackage':True}
(OUT/'evidence/package-verification.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
