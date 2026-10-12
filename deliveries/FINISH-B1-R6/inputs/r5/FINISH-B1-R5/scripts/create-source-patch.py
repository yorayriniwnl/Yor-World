import difflib,json,pathlib,pprint
OUT=pathlib.Path(__file__).resolve().parents[1]
base_path=OUT/'inputs/r4-02/source/blender/scripts/build-environment.py'
dest_path=OUT/'source/blender/scripts/build-environment.py'
base=base_path.read_bytes().decode('utf-8')
eol='\r\n' if '\r\n' in base else '\n'
config=json.loads((OUT/'source/palette.json').read_text(encoding='utf-8'))
room={name:(tuple(float(x) for x in row['baseColor']),float(row['roughness']),float(row['metallic']),tuple(float(x) for x in row['emissionColor']),float(row['emissionStrength'])) for name,row in config['roomMaterials'].items()}
lights={name:tuple(float(x) for x in values) for name,values in config['authoredLightColors'].items()}
room_literal=pprint.pformat(room,sort_dicts=False,width=115)
light_literal=pprint.pformat(lights,sort_dicts=False,width=115)
helper='''# FINISH-35: bounded reference palette values. Geometry and room lighting energy stay fixed.\nFINISH35_ROOM_PALETTE = '''+room_literal+'''\nFINISH35_AUTHORED_LIGHT_COLORS = '''+light_literal+'''\n\ndef apply_finish35_reference_palette(materials):\n    for name, (color, roughness, metallic, emission, strength) in FINISH35_ROOM_PALETTE.items():\n        material = materials[name]\n        bsdf = material.node_tree.nodes.get("Principled BSDF")\n        bsdf.inputs["Base Color"].default_value = color\n        bsdf.inputs["Roughness"].default_value = roughness\n        bsdf.inputs["Metallic"].default_value = metallic\n        if "Emission Color" in bsdf.inputs:\n            bsdf.inputs["Emission Color"].default_value = emission\n        elif "Emission" in bsdf.inputs:\n            bsdf.inputs["Emission"].default_value = emission\n        if "Emission Strength" in bsdf.inputs:\n            bsdf.inputs["Emission Strength"].default_value = strength\n        material.diffuse_color = color\n\n'''
helper=helper.replace('\n',eol)
anchor='def create_all_materials(textures_dir):'+eol
if base.count(anchor)!=1:raise RuntimeError('material helper insertion anchor mismatch')
patched=base.replace(anchor,helper+anchor)
if patched.count('    return m'+eol)!=1:raise RuntimeError('material return anchor mismatch')
patched=patched.replace('    return m'+eol,'    apply_finish35_reference_palette(m)'+eol+'    return m'+eol)
light_targets={'HexWall_PointLight':'hex_light_data','CyanUnderdesk_PointLight':'cyan_fill_data','CeilingAmbient_PointLight':'ambient_data'}
for light_name,data_name in light_targets.items():
    if light_name not in lights:raise RuntimeError('missing palette light '+light_name)
    import ast
    tree=ast.parse(base)
    assignment=None
    for node in ast.walk(tree):
        if isinstance(node,ast.Assign) and any(isinstance(target,ast.Attribute) and target.attr=='color' and isinstance(target.value,ast.Name) and target.value.id==data_name for target in node.targets):
            assignment=ast.literal_eval(node.value);break
    if assignment is None:raise RuntimeError('builder light assignment missing '+data_name)
    line=base.splitlines(keepends=True)[node.lineno-1]
    replacement=line[:line.index('=')+1]+' FINISH35_AUTHORED_LIGHT_COLORS['+repr(light_name)+']'+eol
    if patched.count(line)!=1:raise RuntimeError('builder light source anchor mismatch '+line)
    patched=patched.replace(line,replacement)
dest_path.parent.mkdir(parents=True,exist_ok=True);dest_path.write_bytes(patched.encode('utf-8'))
patch=''.join(difflib.unified_diff(base.splitlines(keepends=True),patched.splitlines(keepends=True),fromfile='a/source/blender/scripts/build-environment.py',tofile='b/source/blender/scripts/build-environment.py'))
(OUT/'source.patch').write_bytes(patch.encode('utf-8'))
print(json.dumps({'status':'PASS','baseBuilderBytes':len(base.encode()),'candidateBuilderBytes':len(patched.encode()),'patchBytes':len(patch.encode()),'materials':len(room),'lights':len(lights)},indent=2))