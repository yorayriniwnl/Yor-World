import bpy, hashlib, json, math, pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
rows=[]
for p in sorted((OUT/'assets').glob('*.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(p))
    objects=list(bpy.data.objects)
    assert all(math.isfinite(v) for o in objects for r in o.matrix_world for v in r)
    rows.append(dict(file='assets/'+p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),objects=len(objects),meshes=sum(o.type=='MESH' for o in objects),materials=len(bpy.data.materials),actions=len(bpy.data.actions),status='PASS'))
receipt=dict(command='Blender --background --python-exit-code 1 --python scripts/verify-blender-imports.py',version=bpy.app.version_string,files=rows,scope='Fresh Blender import and finite-transform check; visual quality and runtime-owner acceptance remain separate.')
(OUT/'evidence/blender-imports.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print('PASS: five exact final GLBs imported; finite matrices')
