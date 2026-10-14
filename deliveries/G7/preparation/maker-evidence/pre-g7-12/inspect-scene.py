#!/usr/bin/env python3
"""Read-only inventory of the accepted production-room GLB and home camera frusta."""
from __future__ import annotations
import json, math, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
GLB = ROOT / "app/public/models/production-room-full.glb"
CAMERAS = {
    "home-desktop": {"position": [-0.45, 1.85, 1.3], "target": [0.0, 1.27, -1.22], "fov": 48, "size": [1440, 900]},
    "home-mobile": {"position": [-0.55, 1.55, 1.45], "target": [0.0, 1.1, -1.2], "fov": 100, "size": [390, 844]},
}
TOKENS = ("hex", "light", "bar", "shelf", "plant", "speaker", "controller", "pegboard", "pc", "microphone", "mic", "console", "headset", "chair", "desk", "monitor", "camera", "ai_cam", "resident")

b = GLB.read_bytes()
magic, version, total = struct.unpack_from("<4sII", b, 0)
assert magic == b"glTF" and version == 2 and total == len(b)
length, kind = struct.unpack_from("<I4s", b, 12)
assert kind == b"JSON"
g = json.loads(b[20:20+length])

# Internal row-major affine matrix operations, matching glTF column-vector convention.
def mul(a, c):
    return [[sum(a[r][k] * c[k][col] for k in range(4)) for col in range(4)] for r in range(4)]
def local_matrix(n):
    if "matrix" in n:
        a=n["matrix"]
        return [[a[r + col*4] for col in range(4)] for r in range(4)]
    t=n.get("translation", [0,0,0]); q=n.get("rotation", [0,0,0,1]); s=n.get("scale", [1,1,1])
    x,y,z,w=q
    r=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)], [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)], [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
    m=[[r[i][j]*s[j] for j in range(3)]+[t[i]] for i in range(3)]
    return [*m, [0,0,0,1]]
def point(m,p):
    v=[*p,1]
    o=[sum(m[r][c]*v[c] for c in range(4)) for r in range(4)]
    return [o[i]/o[3] for i in range(3)]

def normalize(v):
    q=math.sqrt(sum(x*x for x in v)); return [x/q for x in v]
def cross(a,c): return [a[1]*c[2]-a[2]*c[1], a[2]*c[0]-a[0]*c[2], a[0]*c[1]-a[1]*c[0]]
def sub(a,c): return [a[i]-c[i] for i in range(3)]
def cam_project(p,cam):
    f=normalize(sub(cam["target"],cam["position"])); r=normalize(cross(f,[0,1,0])); u=cross(r,f)
    v=sub(p,cam["position"]); depth=sum(v[i]*f[i] for i in range(3))
    th=math.tan(math.radians(cam["fov"])/2); aspect=cam["size"][0]/cam["size"][1]
    if depth <= 0: return {"ndc": None, "depth": round(depth,3)}
    return {"ndc": [round(sum(v[i]*r[i] for i in range(3))/(depth*th*aspect),3), round(sum(v[i]*u[i] for i in range(3))/(depth*th),3)], "depth": round(depth,3)}

nodes=g.get("nodes",[]); names={}
for i,n in enumerate(nodes): names.setdefault(n.get("name",f"<unnamed:{i}>"),[]).append(i)
parents={}
for i,n in enumerate(nodes):
    for c in n.get("children",[]): parents[c]=i
world=[None]*len(nodes)
def calc(i):
    if world[i] is None:
        p=parents.get(i)
        world[i]=mul(calc(p),local_matrix(nodes[i])) if p is not None else local_matrix(nodes[i])
    return world[i]
for i in range(len(nodes)): calc(i)
materials=g.get("materials",[]); meshes=g.get("meshes",[]); accessors=g.get("accessors",[])
def material_info(mi):
    if mi is None: return None
    m=materials[mi]; p=m.get("pbrMetallicRoughness",{})
    return {"name":m.get("name"),"baseColorFactor":p.get("baseColorFactor"),"metallicFactor":p.get("metallicFactor"),"roughnessFactor":p.get("roughnessFactor"),"emissiveFactor":m.get("emissiveFactor"),"alphaMode":m.get("alphaMode"),"doubleSided":m.get("doubleSided",False)}
def node_bounds(i):
    n=nodes[i]
    if "mesh" not in n: return None
    mesh=meshes[n["mesh"]]; lo=[math.inf]*3; hi=[-math.inf]*3
    for prim in mesh.get("primitives",[]):
        ai=prim.get("attributes",{}).get("POSITION")
        if ai is None: continue
        a=accessors[ai]; mn=a.get("min"); mx=a.get("max")
        if mn is None or mx is None: continue
        for bits in range(8):
            p=[mx[k] if bits & (1<<k) else mn[k] for k in range(3)]
            w=point(world[i],p)
            for k in range(3): lo[k]=min(lo[k],w[k]); hi[k]=max(hi[k],w[k])
    if not math.isfinite(lo[0]): return None
    return [lo,hi]

def ancestors(i):
    chain=[]; cur=i
    while cur is not None:
        n=nodes[cur]; chain.append({"name":n.get("name"),"index":cur,"translation":n.get("translation"),"rotation":n.get("rotation"),"scale":n.get("scale"),"worldOrigin":[round(x,4) for x in point(world[cur],[0,0,0])],"mesh":n.get("mesh"),"meshName":meshes[n["mesh"]].get("name") if "mesh" in n else None,"extras":n.get("extras")})
        cur=parents.get(cur)
    return list(reversed(chain))

nodes_out=[]
for i,n in enumerate(nodes):
    name=n.get("name",f"<unnamed:{i}>")
    if not any(t in name.lower() for t in TOKENS): continue
    mi=n.get("mesh"); mesh=meshes[mi] if mi is not None else None
    mats=sorted({prim.get("material") for prim in mesh.get("primitives",[])}- {None}) if mesh else []
    bounds=node_bounds(i)
    info={"name":name,"index":i,"parent":nodes[parents[i]].get("name") if i in parents else None,"localTranslation":n.get("translation"),"localRotation":n.get("rotation"),"localScale":n.get("scale"),"worldOrigin":[round(x,4) for x in point(world[i],[0,0,0])],"meshName":mesh.get("name") if mesh else None,"boundsWorld":[[round(x,4) for x in v] for v in bounds] if bounds else None,"materials":[material_info(mi) for mi in mats],"visible":"default (glTF; no visibility extension)" if not n.get("extras",{}).get("visible") is False else False,"ancestors":ancestors(i)}
    if bounds:
        corners=[[bounds[1][k] if bits&(1<<k) else bounds[0][k] for k in range(3)] for bits in range(8)]
        info["cameraProjection"]={name:{"corners":[cam_project(p,cam) for p in corners]} for name,cam in CAMERAS.items()}
    nodes_out.append(info)

out={"file":"app/public/models/production-room-full.glb","bytes":len(b),"asset":{"version":g.get("asset",{}).get("version"),"generator":g.get("asset",{}).get("generator"),"scenes":g.get("scenes"),"scene":g.get("scene"),"nodeCount":len(nodes),"meshCount":len(meshes),"materialCount":len(materials)},"cameraInputs":CAMERAS,"matchingNodes":nodes_out,"allNodes":[{"index":i,"name":n.get("name"),"parent":nodes[parents[i]].get("name") if i in parents else None,"mesh":meshes[n["mesh"]].get("name") if "mesh" in n else None,"worldOrigin":[round(x,4) for x in point(world[i],[0,0,0])]} for i,n in enumerate(nodes)],"interactionBindingsPath":"app/src/features/world/WorldInteractionBinding.ts; node targets are enumerated by PRODUCTION_INTERACTION_NODES; bindings are object-name based, so moving a target/group preserves target lookup when descendant names are unchanged."}
path=Path(__file__).with_name("scene-node-inventory-final.json")
path.write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"file":str(path.relative_to(ROOT)),"nodeCount":len(nodes),"meshCount":len(meshes),"materialCount":len(materials),"matchingNodes":len(nodes_out),"inventoryBytes":path.stat().st_size},indent=2))
