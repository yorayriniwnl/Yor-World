"""Read raw committed inputs, and prepare the strictly material-only successor."""
import copy, difflib, hashlib, json, pathlib, struct, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = pathlib.Path(__file__).resolve().parents[1]
COMMIT = '1753b9278c4537b5377c3893172b2a0f26d13b10'
receipts = []
def blob(p, commit=COMMIT):
    b = subprocess.check_output(['git','show',f'{commit}:{p}'], cwd=ROOT)
    receipts.append(dict(commit=commit,path=p,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
    return b
def write(p,b):
    f=OUT/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b)
def decode(b):
    n,t=struct.unpack_from('<II',b,12);assert t==0x4e4f534a
    return json.loads(b[20:20+n]),b[20+n:]
def encode(j,tail):
    b=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();b+=b' '*((-len(b))%4)
    return struct.pack('<III',0x46546c67,2,20+len(b)+len(tail))+struct.pack('<II',len(b),0x4e4f534a)+b+tail
def correct(b):
    j,tail=decode(b);m=next(m for m in j['materials'] if m['name']=='PC_TemperedGlass')
    assert m['extensions']['KHR_materials_transmission']['transmissionFactor']>0.9
    m['pbrMetallicRoughness']['baseColorFactor'][3]=0.18
    m['alphaMode']='BLEND'
    del m['extensions']['KHR_materials_transmission']
    # Blender omits IOR for non-transmissive default-specular materials.
    m['extensions'].pop('KHR_materials_ior',None)
    if not m['extensions']:del m['extensions']
    for field in ('extensionsUsed','extensionsRequired'):
        if field in j and not any('KHR_materials_transmission' in v.get('extensions',{}) for v in j['materials']):
            j[field]=[v for v in j[field] if v!='KHR_materials_transmission']
            if not j[field]:del j[field]
        if field in j and not any('KHR_materials_ior' in v.get('extensions',{}) for v in j['materials']):
            j[field]=[v for v in j[field] if v!='KHR_materials_ior']
            if not j[field]:del j[field]
    return encode(j,tail)
if __name__=='__main__':
    for p in ['assets/room.glb','assets/resident.glb','assets/fixture.glb','assets/group-b-props.glb','assets/on-demand-projects.glb','assets/textures/deskmat-topography.png','assets/textures/monitor-wallpaper.png','assets/source/room.blend']:
        b=blob('deliveries/FINISH-B1-R3/'+p)
        write('inputs/r3/'+p,b)
        if p!='assets/source/room.blend':write(p,correct(b) if p=='assets/room.glb' else b)
    sourcepath='deliveries/FINISH-B1-R3/source/blender/scripts/build-environment.py'
    old=blob(sourcepath);text=old.decode()
    changed=text.replace('base_color=(0.95, 0.95, 1.0, 0.35),','base_color=(0.95, 0.95, 1.0, 0.18),').replace('transmission=0.92, ior=1.52','transmission=0.0, ior=1.52')
    needle='    )\r\n\r\n    # 5. Emissive Lights'
    if needle not in changed:needle=needle.replace('\r\n','\n')
    eol='\r\n' if '\r\n' in text else '\n'
    replacement='    )'+eol+'    # FINISH-25: glossy alpha glass avoids the duplicate scene transmission pass.'+eol+'    glass = m["PC_TemperedGlass"]'+eol+'    glass.surface_render_method = "BLENDED"'+eol+'    glass.node_tree.nodes.get("Principled BSDF").inputs["Alpha"].default_value = 0.18'+eol+'    glass.node_tree.nodes.get("Principled BSDF").inputs["IOR"].default_value = 1.52'+eol+eol+'    # 5. Emissive Lights'
    assert changed.count(needle)==1;changed=changed.replace(needle,replacement)
    write('inputs/r3/source/blender/scripts/build-environment.py',old)
    write('source/blender/scripts/build-environment.py',changed.encode())
    diff=''.join(difflib.unified_diff(text.splitlines(keepends=True),changed.splitlines(keepends=True),fromfile='a/'+sourcepath,tofile='b/'+sourcepath))
    write('source.patch',diff.encode())
    for p in ['scripts/test-browser-playback.mjs','validator-logs/instrumented-maker-harness.html','source/harness/package.json','source/harness/package-lock.json']:
        write('inputs/r3/'+p,blob('deliveries/FINISH-B1-R3/'+p))
    for p in ['AGENTS.md','START_HERE.md','docs/planning/reconciliation-packets/2026-10-11-finish-25-b1-r4-material-pass-correction.md','docs/planning/production-prompts/repairs-2026-10-11/15-CODEX-B1-R4.md','docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md','docs/planning/art-and-experience.md','references/README.md','references/manifest.json','references/images/main-reference.png']:
        blob(p,'105d79b1d4d3d36064a933fa745e3ca43a35a8cf')
    blob('deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/report.md','3ce6bbf9c960abc2bc1bf6be7e9536bf74a3bf64')
    write('evidence/input-hashes.json',(json.dumps(receipts,indent=2)+'\n').encode())
    print(json.dumps(dict(inputs=len(receipts),roomSHA256=hashlib.sha256((OUT/'assets/room.glb').read_bytes()).hexdigest())))
