import hashlib, json, pathlib, subprocess
R4='7936fa981a24fe4af834ff250ffec8a7b02b09b3'
PARENT='4290a9c0089692a63aed6896df450b6df17a504d'
AUDIT='b25b0bd0b30fe97d7d7173c40bad694c675f026e'
OUT=pathlib.Path(__file__).resolve().parents[1]
ROOT=OUT.parents[1]

def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT)
def raw(commit,path): return git('show',f'{commit}:{path}')
def sha(b): return hashlib.sha256(b).hexdigest()
def write(commit,path,dest):
    destpath=OUT/'inputs'/dest
    if destpath.exists(): raise RuntimeError(f'preserve occupied input destination: {destpath}')
    b=raw(commit,path); destpath.parent.mkdir(parents=True,exist_ok=True); destpath.write_bytes(b)
    return dict(commit=commit,path=path,destination='inputs/'+dest.replace('\\','/'),bytes=len(b),sha256=sha(b))

if git('rev-parse',R4).decode().strip()!=R4: raise RuntimeError('R4 commit mismatch')
tree=git('rev-parse',f'{R4}^{{tree}}').decode().strip()
subtree=git('rev-parse',f'{R4}:deliveries/FINISH-B1-R4-02').decode().strip()
if tree!='98f37af3f3b490a19a25677160c442fa7daef3fc' or subtree!='7df14feefa5b89f02b07c0127992d15189848f7a': raise RuntimeError((tree,subtree))
rows=[]
for c,p,d in [
 (PARENT,'docs/planning/reconciliation-packets/2026-10-12-finish-35-b1-reference-visual-correction.md','FINISH-35.md'),
 (PARENT,'docs/planning/art-and-experience.md','contracts/art-and-experience.md'),
 (PARENT,'docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md','contracts/03-asset-bindings.md'),
 (PARENT,'references/README.md','references/README.md'),
 (PARENT,'references/manifest.json','references/manifest.json'),
 (PARENT,'references/images/main-reference.png','references/main-reference.png'),
 (AUDIT,'deliveries/completion-audits/FINISH-B1/finish-07/20261011T145500Z-b1-r4-independent-review-01/report.md','FINISH-31/report.md'),
]: rows.append(write(c,p,d))
r4manifest_path='deliveries/FINISH-B1-R4-02/output-hashes.json'
r4manifest=raw(R4,r4manifest_path); r4rows={r['path']:r for r in json.loads(r4manifest)['files']}
rows.append(write(R4,r4manifest_path,'r4-02/output-hashes.json'))
r4files=[
 'report.md','issue-matrix.json','assets/room.glb','assets/resident.glb','assets/fixture.glb','assets/group-b-props.glb','assets/on-demand-projects.glb',
 'assets/source/room.blend','assets/textures/deskmat-topography.png','assets/textures/monitor-wallpaper.png','source.patch','source/blender/scripts/build-environment.py',
 'captures/R4/desktop-home/webgl-canvas.png','captures/R4/mobile-home/webgl-canvas.png',
 'evidence/browser-results.json','evidence/final-budgets.json','evidence/final-lineage.json','evidence/final-material-inspection.json','evidence/final-check-commands.json',
 'evidence/tool-versions.json','evidence/final-input-binding.log','evidence/package-verification.json',
 'scripts/apply-native-geometry.py','scripts/export-final-room.py','scripts/prepare.py','scripts/verify-native-parity.py','scripts/verify-blender-imports.py',
 'scripts/validate-glb.mjs','scripts/verify-browser.mjs','scripts/verify-captures.py','scripts/verify-final-budgets.py','scripts/verify-final-lineage.py',
 'inputs/r3/scripts/test-browser-playback.mjs','inputs/r3/validator-logs/instrumented-maker-harness.html','inputs/r3/source/harness/package.json','inputs/r3/source/harness/package-lock.json'
]
for p in r4files:
    blobpath='deliveries/FINISH-B1-R4-02/'+p;b=raw(R4,blobpath);rec=r4rows.get(p)
    if rec is not None and (len(b)!=rec['bytes'] or sha(b)!=rec['sha256']): raise RuntimeError(f'R4 package manifest mismatch: {p}')
    dest='r4-02/'+p;q=OUT/'inputs'/dest
    if q.exists(): raise RuntimeError(f'preserve occupied input destination: {dest}')
    q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
    rows.append(dict(commit=R4,path=blobpath,destination='inputs/'+dest,bytes=len(b),sha256=sha(b),r4OutputManifest=p in r4rows))
expected={
 'references/images/main-reference.png':'37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362',
 'docs/planning/art-and-experience.md':'763d64d20176c6e3a6d9887bdff233fc71fb2751ee142ebd6fd28ed150126ded',
 'docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md':'0f4173cfd4cc7f52562344fc2e087ace13dea5717cb065c7b7a0c0200bfdb360',
}
for p,h in expected.items():
    row=next(r for r in rows if r['path']==p)
    if row['sha256']!=h: raise RuntimeError(f'packet input hash mismatch: {p} {row["sha256"]}')
manifest={'schemaVersion':1,'status':'PASS','r4Commit':R4,'r4Tree':tree,'r4DeliverySubtree':subtree,
 'r4OutputManifestSHA256':sha(r4manifest),'parentPacketCommit':PARENT,'finish31AuditCommit':AUDIT,'packetNamedInputHashes':expected,'rawGitInputs':rows,
 'scope':'Inputs copied from exact named Git commits with git show; R4 package rows cross-checked against its committed output-hashes.json.'}
path=OUT/'evidence/input-bindings.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(manifest,indent=2)+chr(10),encoding='utf-8')
print(json.dumps({'status':'PASS','inputCount':len(rows),'r4Commit':R4,'r4Tree':tree,'r4DeliverySubtree':subtree,'r4OutputManifestSHA256':sha(r4manifest),'inputBindings':'evidence/input-bindings.json'},indent=2))