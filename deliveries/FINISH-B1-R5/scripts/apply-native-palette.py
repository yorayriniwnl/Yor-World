import bpy, json, pathlib, sys

args=sys.argv[sys.argv.index("--")+1:]
if len(args)!=2: raise SystemExit("usage: blender --background --python apply-native-palette.py -- INPUT.blend OUTPUT.blend")
src,dst=map(pathlib.Path,args)
bpy.ops.wm.open_mainfile(filepath=str(src.resolve()))
materials={
 "Ceiling_Matte":{"baseColor":[1,1,1,1],"emissionColor":[1,1,1,1],"emissionStrength":.16},
 "Wall_SoftLavender":{"baseColor":[1,.97,1,1],"emissionColor":[1,.96,1,1],"emissionStrength":.10},
 "Window_BlindsSatin":{"baseColor":[.96,.96,.99,1],"emissionColor":[1,1,1,1],"emissionStrength":.06},
 "Desk_IvoryTop":{"baseColor":[1,.98,.94,1],"roughness":.32,"emissionColor":[.99,.97,.94,1],"emissionStrength":.28},
 "Alex_DrawerWhite":{"baseColor":[.99,.97,.93,1],"roughness":.42,"emissionColor":[.98,.96,.92,1],"emissionStrength":.35},
 "Desk_MatTopography":{"baseColor":[.96,.94,.97,1]},
 "Acoustic_Backing":{"baseColor":[.94,.92,.98,1]},
 "Chair_WhiteNylon":{"baseColor":[.99,.97,.93,1],"emissionColor":[.99,.97,.94,1],"emissionStrength":.10},
 "PC_ChassisWhite":{"baseColor":[.99,.97,.94,1],"emissionColor":[.99,.97,.94,1],"emissionStrength":.07},
 "Pegboard_Perforated":{"baseColor":[.98,.97,.95,1],"emissionColor":[.99,.98,.96,1],"emissionStrength":.06},
 "Plant_CeramicWhite":{"baseColor":[.99,.97,.93,1],"emissionColor":[.99,.97,.94,1],"emissionStrength":.06},
 "Hex_LilacEmissive":{"baseColor":[.98,.42,.86,1],"emissionColor":[.98,.42,.86,1],"emissionStrength":.85},
 "Hex_VioletEmissive":{"baseColor":[.66,.43,.98,1],"emissionColor":[.66,.43,.98,1],"emissionStrength":.85},
}
lights={"Light_HexWall":[.98,.60,.98],"Light_CeilingAmbient":[1,1,1]}
changed=[]
for name,values in materials.items():
 m=bpy.data.materials.get(name)
 if m is None or not m.use_nodes: raise SystemExit(f"missing material or nodes: {name}")
 nodes=[n for n in m.node_tree.nodes if n.type=="BSDF_PRINCIPLED"]
 if len(nodes)!=1: raise SystemExit(f"expected one Principled node in {name}: {len(nodes)}")
 n=nodes[0]
 for key,value in values.items():
  socket={"baseColor":"Base Color","roughness":"Roughness","metallic":"Metallic","emissionColor":"Emission Color","emissionStrength":"Emission Strength"}[key]
  if socket not in n.inputs: raise SystemExit(f"missing {socket} socket in {name}")
  if n.inputs[socket].is_linked: raise SystemExit(f"refusing linked socket {socket} in {name}")
  n.inputs[socket].default_value=value
 changed.append({"name":name,**values})
for name,color in lights.items():
 o=bpy.data.objects.get(name)
 if o is None or o.type!="LIGHT": raise SystemExit(f"missing light: {name}")
 o.data.color=color; changed.append({"light":name,"color":color})
dst.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(dst.resolve()))
print(json.dumps({"source":str(src),"output":str(dst),"materials":len(materials),"lights":len(lights),"changes":changed},indent=2))
