import hashlib,json,pathlib,struct,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT/"inputs/r4/assets";OUT=ROOT/"assets"
sha=lambda b:hashlib.sha256(b).hexdigest()
expected_changed={"room.glb","fixture.glb","source/room.blend"}
asset_files=lambda root:sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and not p.name.endswith(".blend1"))
base_files=set(asset_files(BASE));out_files=set(asset_files(OUT));assert base_files==out_files,(sorted(base_files-out_files),sorted(out_files-base_files))
untouched=[]
for rel in sorted(base_files-expected_changed):
 b=(BASE/rel).read_bytes();o=(OUT/rel).read_bytes();assert b==o,f"untouched asset changed: {rel}";untouched.append({"file":"assets/"+rel,"bytes":len(b),"sha256":sha(b),"status":"BYTE IDENTICAL"})

def read_glb(p):
 b=p.read_bytes();assert b[:4]==b"glTF" and struct.unpack_from("<I",b,4)[0]==2 and struct.unpack_from("<I",b,8)[0]==len(b)
 chunks=[];i=12
 while i<len(b):
  n,t=struct.unpack_from("<II",b,i);chunks.append((t,b[i+8:i+8+n]));i+=8+n
 assert chunks and chunks[0][0]==0x4E4F534A
 return b,chunks,json.loads(chunks[0][1].decode("utf-8"))
def differences(a,b,path=""):
 if type(a)!=type(b):return [(path,a,b)]
 if isinstance(a,dict):
  out=[]
  for k in sorted(set(a)|set(b)):
   if k not in a or k not in b:out.append((path+"/"+k,a.get(k),b.get(k)))
   else:out.extend(differences(a[k],b[k],path+"/"+k))
  return out
 if isinstance(a,list):
  if len(a)!=len(b):return [(path+"/length",len(a),len(b))]
  out=[]
  for i,(x,y) in enumerate(zip(a,b)):out.extend(differences(x,y,path+"/"+str(i)))
  return out
 return [] if a==b else [(path,a,b)]
def mat_names(j):return {i:m.get("name") for i,m in enumerate(j.get("materials",[]))}
def allowed(file,path,name,lightNames):
 bits=path.strip("/").split("/")
 if file=="room.glb":
  targets={"Ceiling_Matte","Wall_SoftLavender","Window_BlindsSatin","Desk_IvoryTop","Alex_DrawerWhite","Desk_MatTopography","Acoustic_Backing","Chair_WhiteNylon","PC_ChassisWhite","Pegboard_Perforated","Plant_CeramicWhite","Hex_LilacEmissive","Hex_VioletEmissive"}
  if len(bits)==4 and bits[0]=="materials" and bits[1].isdigit() and name in targets and bits[2]=="pbrMetallicRoughness":
   return bits[2]=="pbrMetallicRoughness" and bits[3] in ("baseColorFactor","roughnessFactor")
  if len(bits)==5 and bits[0]=="materials" and bits[1].isdigit() and name in targets and bits[2]=="pbrMetallicRoughness" and bits[3]=="baseColorFactor" and bits[4] in ("0","1","2","3"):return True
  if len(bits)==3 and bits[0]=="materials" and bits[1].isdigit() and name in targets and bits[2]=="emissiveFactor":return True
  if len(bits)==4 and bits[0]=="materials" and bits[1].isdigit() and name in targets and bits[2]=="emissiveFactor" and bits[3] in ("0","1","2"):return True
  if len(bits)==5 and bits[0]=="materials" and bits[1].isdigit() and name in {"Hex_LilacEmissive","Hex_VioletEmissive"} and bits[2:4]==["extensions","KHR_materials_emissive_strength"] and bits[4]=="emissiveStrength":return True
  if len(bits)==6 and bits[:3]==["extensions","KHR_lights_punctual","lights"] and bits[3].isdigit() and bits[4]=="color" and bits[5] in ("0","1","2"):
   return lightNames.get(int(bits[3])) in {"HexWall_PointLight","CeilingAmbient_PointLight"}
  if len(bits)==5 and bits[:3]==["extensions","KHR_lights_punctual","lights"] and bits[3].isdigit() and bits[4]=="color":
   return lightNames.get(int(bits[3])) in {"HexWall_PointLight","CeilingAmbient_PointLight"}
 if file=="fixture.glb":
  if len(bits)==4 and bits[0]=="materials" and bits[1].isdigit() and name in {"fixture-ivory","fixture-chair-blue"} and bits[2]=="pbrMetallicRoughness" and bits[3]=="baseColorFactor":return True
  if len(bits)==5 and bits[0]=="materials" and bits[1].isdigit() and name in {"fixture-ivory","fixture-chair-blue"} and bits[2]=="pbrMetallicRoughness" and bits[3]=="baseColorFactor" and bits[4] in ("0","1","2","3"):return True
  if len(bits)==3 and bits[0]=="materials" and bits[1].isdigit() and name in {"fixture-ivory","fixture-chair-blue"} and bits[2]=="emissiveFactor":return True
  if len(bits)==4 and bits[0]=="materials" and bits[1].isdigit() and name in {"fixture-ivory","fixture-chair-blue"} and bits[2]=="emissiveFactor" and bits[3] in ("0","1","2"):return True
 return False

glb_deltas=[]
for file in ["room.glb","fixture.glb"]:
 base_bytes,base_chunks,a=read_glb(BASE/file);out_bytes,out_chunks,b=read_glb(OUT/file)
 assert base_chunks[1:]==out_chunks[1:],f"{file}: binary geometry/resource chunks differ"
 names=mat_names(a);newnames=mat_names(b);assert names==newnames,f"{file}: material indices/names differ"
 changes=[]
 for path,before,after in differences(a,b):
  bits=path.strip("/").split("/");name=None
  if bits[0]=="materials" and bits[1].isdigit():name=names.get(int(bits[1]))
  light_names={i:r.get("name") for i,r in enumerate(a.get("extensions",{}).get("KHR_lights_punctual",{}).get("lights",[]))}
  if not allowed(file,path,name,light_names):raise AssertionError(f"disallowed glTF semantic delta {file} {path}: {before!r} => {after!r}")
  changes.append({"path":path,"materialOrNode":name,"before":before,"after":after})
 assert changes,f"{file}: expected palette changes missing"
 glb_deltas.append({"file":"assets/"+file,"inputBytes":len(base_bytes),"outputBytes":len(out_bytes),"inputSha256":sha(base_bytes),"outputSha256":sha(out_bytes),"binaryChunksByteIdentical":True,"changedFieldCount":len(changes),"changes":changes})

native=[]
for f in [ROOT/"evidence/native-inventory-r4.json",ROOT/"evidence/native-inventory-r5.json"]:
 assert f.is_file(),f"missing Blender inventory {f}"
 native.append(json.loads(f.read_text(encoding="utf-8")))
a,b=native
for key in ["objects","meshGeometry","actions","scenes"]:assert a[key]==b[key],f"native {key} inventory changed"
assert len(a["materials"])==len(b["materials"]) and len(a["lights"])==len(b["lights"])
base_m={m["name"]:m for m in a["materials"]};out_m={m["name"]:m for m in b["materials"]};assert set(base_m)==set(out_m)
allowed_inputs={
"Ceiling_Matte":{"Base Color","Emission Color","Emission Strength"},"Wall_SoftLavender":{"Base Color","Emission Color","Emission Strength"},"Window_BlindsSatin":{"Base Color","Emission Color","Emission Strength"},"Desk_IvoryTop":{"Base Color","Roughness","Emission Color","Emission Strength"},"Alex_DrawerWhite":{"Base Color","Roughness","Emission Color","Emission Strength"},"Desk_MatTopography":{"Base Color"},"Acoustic_Backing":{"Base Color"},"Chair_WhiteNylon":{"Base Color","Emission Color","Emission Strength"},"PC_ChassisWhite":{"Base Color","Emission Color","Emission Strength"},"Pegboard_Perforated":{"Base Color","Emission Color","Emission Strength"},"Plant_CeramicWhite":{"Base Color","Emission Color","Emission Strength"},"Hex_LilacEmissive":{"Base Color","Emission Color","Emission Strength"},"Hex_VioletEmissive":{"Base Color","Emission Color","Emission Strength"}}
material_deltas=[]
for name in sorted(base_m):
 x,y=base_m[name],out_m[name]
 assert (x["name"],x["diffuseColor"],x["useNodes"],x["surfaceRenderMethod"],x["blendMethod"],[(n["name"],n["type"],n["label"],n["image"]) for n in x["nodes"]],x["links"])==(y["name"],y["diffuseColor"],y["useNodes"],y["surfaceRenderMethod"],y["blendMethod"],[(n["name"],n["type"],n["label"],n["image"]) for n in y["nodes"]],y["links"]),f"material topology changed: {name}"
 nx={n["name"]:n for n in x["nodes"]};ny={n["name"]:n for n in y["nodes"]};assert set(nx)==set(ny)
 for node in nx:
  assert nx[node]["type"]==ny[node]["type"] and nx[node]["label"]==ny[node]["label"] and nx[node]["image"]==ny[node]["image"]
  assert set(nx[node]["inputs"])==set(ny[node]["inputs"])
  for inp in nx[node]["inputs"]:
   before=nx[node]["inputs"][inp];after=ny[node]["inputs"][inp]
   assert before["linked"]==after["linked"],f"material link status changed: {name}/{node}/{inp}"
   if before["default"]!=after["default"]:
    assert inp in allowed_inputs.get(name,set()) and node=="Principled BSDF",f"disallowed native material value changed: {name}/{node}/{inp}"
    material_deltas.append({"material":name,"node":node,"input":inp,"before":before["default"],"after":after["default"]})
assert material_deltas,"no Blender material deltas found"
base_l={r["object"]:r for r in a["lights"]};out_l={r["object"]:r for r in b["lights"]};assert set(base_l)==set(out_l)
light_deltas=[]
for name in base_l:
 x,y=base_l[name],out_l[name]
 for field in x:
  if x[field]!=y[field]:
   assert field=="color" and name in {"Light_HexWall","Light_CeilingAmbient"},f"disallowed light delta {name}/{field}"
   light_deltas.append({"light":name,"field":field,"before":x[field],"after":y[field]})
assert light_deltas
receipt={"status":"PASS","command":"python scripts/verify-palette-invariants.py","untouchedAssetsByteIdentical":untouched,"changedAssets":["assets/room.glb","assets/fixture.glb","assets/source/room.blend"],"glbDeltas":glb_deltas,"nativeInventory":{"objects":a["counts"],"unchanged":{"objectNamesParentsTRS":"PASS","meshGeometryIndicesUVs":"PASS","animationActionsDrivers":"PASS","sceneCameraAndRenderSettings":"PASS","materialAssignmentsNodeGraphs":"PASS","lightEnergyTransformsAndSettings":"PASS"},"materialDeltas":material_deltas,"lightDeltas":light_deltas},"scope":"Semantic GLB JSON diffs limited to named existing material values and two authored light colors. Both GLB binary chunks are byte-identical; Blender source mesh geometry, UV, node, hierarchy, transforms, animation, assignments, and scene inventories match exact R4 inputs."}
(ROOT/"evidence/palette-invariants.json").write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8");print(json.dumps({"status":receipt["status"],"untouchedAssets":len(untouched),"roomFields":glb_deltas[0]["changedFieldCount"],"fixtureFields":glb_deltas[1]["changedFieldCount"],"nativeMaterialFields":len(material_deltas),"nativeLightFields":len(light_deltas)}))
