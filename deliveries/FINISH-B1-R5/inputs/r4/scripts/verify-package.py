import argparse,hashlib,json,pathlib,subprocess
OUT=pathlib.Path(__file__).resolve().parents[1];ROOT=OUT.parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--git-ref');ap.add_argument('--no-write',action='store_true');args=ap.parse_args()
manifest=(OUT/'output-hashes.json').read_bytes();j=json.loads(manifest)
ignored={'.work','node_modules','__pycache__','.git'}
def included(p):
    rel=p.relative_to(OUT);return not any(v in ignored for v in rel.parts) and p.suffix!='.blend1' and rel.as_posix() not in j['selfExcluded']
actual=sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and included(p))
assert actual==sorted(r['path'] for r in j['files'])
assert len(j['files'])==198 and len(j['selfExcluded'])==2
rootName=OUT.name
def digest(p):return hashlib.sha256((OUT/p).read_bytes()).hexdigest()
room=digest('assets/room.glb');native=digest('evidence/native-room-export.glb');blend=digest('assets/source/room.blend')
def evidence(p):return json.loads((OUT/p).read_text())
replay=evidence('evidence/final-export-reproducibility.json')
for phase in ['firstFreshReplaySHA256','secondFreshReplaySHA256']:
    assert replay[phase]['assets/room.glb']==room and replay[phase]['evidence/native-room-export.glb']==native
assert replay['secondFreshReplaySHA256']['assets/source/room.blend']==blend
export=evidence('evidence/final-room-export.json');assert export['outputSHA256']==room and export['nativeExportSHA256']==native
browser=evidence('evidence/browser-results.json');assert browser['assetHashes']['R4']['room.glb']['sha256']==room
for name in ['evidence/final-lineage.json','evidence/production-lineage.json']:
    assert next(r for r in evidence(name)['productionLineage'] if r['path']=='assets/room.glb')['outputSHA256']==room
for name,key in [('evidence/gltf-validation.json','files'),('evidence/blender-imports.json','files'),('evidence/final-budgets.json','assets')]:
    assert next(r for r in evidence(name)[key] if r['file']=='assets/room.glb')['sha256']==room
assert evidence('evidence/final-material-inspection.json')['roomSHA256']==room
eligible=j['eligiblePaths'];assert len(eligible)==200 and sorted(eligible)==sorted(actual+j['selfExcluded'])
excluded={'scripts/build-r1-room.py','scripts/verify-browser-r1.mjs','scripts/verify-r1-lineage.py','scripts/verify-r1-native.py','evidence/build-r1-final.log','evidence/build-r1-replay.log','evidence/lineage-r1.json','evidence/native-debug-r1.json','evidence/native-debug-r1.log','evidence/native-parity-r1.json','evidence/native-parity-r1.log'}
assert not set(eligible)&excluded
for r in j['files']:
    b=(OUT/r['path']).read_bytes();assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256'],r['path']
    if args.git_ref:
        raw=subprocess.check_output(['git','show',args.git_ref+':deliveries/'+rootName+'/'+r['path']],cwd=ROOT);assert raw==b,r['path']
if args.git_ref:
    assert subprocess.check_output(['git','show',args.git_ref+':deliveries/'+rootName+'/output-hashes.json'],cwd=ROOT)==manifest
receipt=dict(status='PASS',command='python scripts/verify-package.py'+(' --git-ref '+args.git_ref if args.git_ref else ''),filesVerified=len(j['files']),bytesVerified=sum(r['bytes'] for r in j['files']),manifestSHA256=hashlib.sha256(manifest).hexdigest(),packageSetExact=True,exactEligiblePathCount=200,excludedUnknownPathsAbsent=True,allFinalRoomArtifactBindingsAgree=True,finalRoomSHA256=room,finalNativeExportSHA256=native,rawGitBlobsVerified=bool(args.git_ref),selfExcluded=j['selfExcluded'])
if not args.no_write:(OUT/'evidence/package-verification.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
