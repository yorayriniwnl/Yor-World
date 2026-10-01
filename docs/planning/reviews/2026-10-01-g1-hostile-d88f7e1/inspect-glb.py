from pathlib import Path
import json,struct
out=Path(__file__).resolve().parent;root=out.parents[3];result={}
for name in ['room-blockout','avatar-proof','fixture-proof']:
    b=(root/'deliveries/G1/source/public/models'/(name+'.glb')).read_bytes()
    d=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
    nodes=d.get('nodes',[]);parents={child:i for i,node in enumerate(nodes) for child in node.get('children',[])}
    result[name]={'nodes':len(nodes),'namedParents':{node.get('name'):(nodes[parents[i]].get('name') if i in parents else None) for i,node in enumerate(nodes) if node.get('name') in ['chair-root','chair','resident','chair-base','resident-body']},'clips':[{'name':a.get('name'),'channels':len(a.get('channels',[]))} for a in d.get('animations',[])]}
(out/'glb-structure.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result,indent=2))
