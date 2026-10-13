import json, pathlib, struct, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/"inputs/r4/assets"
OUT=ROOT/"assets"
ROOM_MATS={
 "Ceiling_Matte":{"baseColorFactor":[1,1,1,1],"emissiveFactor":[.16,.16,.16]},
 "Wall_SoftLavender":{"baseColorFactor":[1,.97,1,1],"emissiveFactor":[.10,.096,.10]},
 "Window_BlindsSatin":{"baseColorFactor":[.96,.96,.99,1],"emissiveFactor":[.06,.06,.06]},
 "Desk_IvoryTop":{"baseColorFactor":[1,.98,.94,1],"roughnessFactor":.32,"emissiveFactor":[.2772,.2716,.2632]},
 "Alex_DrawerWhite":{"baseColorFactor":[.99,.97,.93,1],"roughnessFactor":.42,"emissiveFactor":[.343,.336,.322]},
 "Desk_MatTopography":{"baseColorFactor":[.96,.94,.97,1]},
 "Acoustic_Backing":{"baseColorFactor":[.94,.92,.98,1]},
 "Chair_WhiteNylon":{"baseColorFactor":[.99,.97,.93,1],"emissiveFactor":[.099,.097,.094]},
 "PC_ChassisWhite":{"baseColorFactor":[.99,.97,.94,1],"emissiveFactor":[.0693,.0679,.0658]},
 "Pegboard_Perforated":{"baseColorFactor":[.98,.97,.95,1],"emissiveFactor":[.0594,.0588,.0576]},
 "Plant_CeramicWhite":{"baseColorFactor":[.99,.97,.93,1],"emissiveFactor":[.0594,.0582,.0564]},
 "Hex_LilacEmissive":{"baseColorFactor":[.98,.42,.86,1],"emissiveFactor":[.98,.42,.86],"emissiveStrength":.85},
 "Hex_VioletEmissive":{"baseColorFactor":[.66,.43,.98,1],"emissiveFactor":[.66,.43,.98],"emissiveStrength":.85},
}
FIXTURE_MATS={"fixture-ivory":{"baseColorFactor":[.99,.97,.93,1],"emissiveFactor":[.1386,.1358,.1316]},"fixture-chair-blue":{"baseColorFactor":[.08,.42,1.0,1],"emissiveFactor":[.021,.042,.14]}}
LIGHTS={"HexWall_PointLight":[.98,.60,.98],"CeilingAmbient_PointLight":[1,1,1]}
def read_glb(path):
 b=path.read_bytes()
 if b[:4]!=b"glTF" or struct.unpack_from("<I",b,4)[0]!=2 or struct.unpack_from("<I",b,8)[0]!=len(b): raise ValueError(f"bad GLB header: {path}")
 chunks=[];i=12
 while i<len(b):
  n,t=struct.unpack_from("<II",b,i);chunks.append((t,b[i+8:i+8+n]));i+=8+n
 if i!=len(b) or not chunks or chunks[0][0]!=0x4E4F534A: raise ValueError(f"invalid GLB chunks: {path}")
 return b,chunks,json.loads(chunks[0][1].decode("utf-8"))
def patch(path, mats, lights=None):
 path.write_bytes((BASE/path.name).read_bytes())
 before,chunks,j=read_glb(path); changed=[]
 for material in j.get("materials",[]):
  name=material.get("name")
  if name not in mats: continue
  want=mats[name]; pbr=material.setdefault("pbrMetallicRoughness",{})
  for k,v in want.items():
   if k=="emissiveStrength":
    ext=material.setdefault("extensions",{}).setdefault("KHR_materials_emissive_strength",{})
    field="emissiveStrength"; old=ext.get(field); ext[field]=v
   else:
    group="pbrMetallicRoughness" if k in ("baseColorFactor","roughnessFactor","metallicFactor") else None
    target=pbr if group else material;field=k;old=target.get(field);target[field]=v
   if old!=v: changed.append({"material":name,"field":field,"before":old,"after":v})
 if lights:
  rows=j.get("extensions",{}).get("KHR_lights_punctual",{}).get("lights",[])
  for light in rows:
   if light.get("name") in lights:
    old=light.get("color");light["color"]=lights[light["name"]]
    if old!=light["color"]: changed.append({"light":light["name"],"field":"color","before":old,"after":light["color"]})
 for name in mats:
  if not any(r.get("material")==name for r in changed): raise ValueError(f"material unchanged or missing: {name}")
 raw=json.dumps(j,separators=(",",":"),ensure_ascii=False).encode("utf-8")
 raw+=b" "*((-len(raw))%4)
 rebuilt=bytearray(before[:12]);struct.pack_into("<I",rebuilt,8,0)
 rebuilt.extend(struct.pack("<II",len(raw),0x4E4F534A));rebuilt.extend(raw)
 for t,data in chunks[1:]:rebuilt.extend(struct.pack("<II",len(data),t));rebuilt.extend(data)
 struct.pack_into("<I",rebuilt,8,len(rebuilt));path.write_bytes(rebuilt)
 return {"file":str(path.relative_to(ROOT)),"inputSha256":hashlib.sha256(before).hexdigest(),"outputSha256":hashlib.sha256(rebuilt).hexdigest(),"inputBytes":len(before),"outputBytes":len(rebuilt),"binaryChunksByteIdentical":chunks[1:]==read_glb(path)[1][1:],"changed":changed}
rows=[]
for name,mats,lights in [("room.glb",ROOM_MATS,LIGHTS),("fixture.glb",FIXTURE_MATS,None)]:
 rows.append(patch(OUT/name,mats,lights))
report={"command":"python scripts/apply-gltf-palette.py","files":rows}
(ROOT/"evidence/gltf-palette-replay.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report,indent=2))
