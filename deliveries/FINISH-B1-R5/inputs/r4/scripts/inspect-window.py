"""Read-only native/source inspection; no edits or exports."""
import bpy, json, pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(OUT/'inputs/r3/assets/source/room.blend'))
def runtime(p):return [p.x,p.z,-p.y]
def bounds(points):return dict(min=[min(p[i] for p in points) for i in range(3)],max=[max(p[i] for p in points) for i in range(3)])
def row(o):return dict(name=o.name,type=o.type,parent=o.parent.name if o.parent else None,matrixLocal=[list(r) for r in o.matrix_local],runtimeWorldOrigin=runtime(o.matrix_world.translation),materials=[m.name if m else None for m in getattr(o.data,'materials',[])])
def components(o):
    adjacency={v.index:set() for v in o.data.vertices}
    for e in o.data.edges:a,b=e.vertices;adjacency[a].add(b);adjacency[b].add(a)
    todo=set(adjacency);out=[]
    while todo:
        seen=set();stack=[next(iter(todo))]
        while stack:
            i=stack.pop()
            if i in seen:continue
            seen.add(i);stack.extend(adjacency[i]-seen)
        todo-=seen;out.append(dict(vertexIndices=sorted(seen),bounds=bounds([runtime(o.matrix_world@o.data.vertices[i].co) for i in seen])))
    return out
wall=bpy.data.objects['StaticBatch__Room_Root__Wall_SoftLavender'];glass=bpy.data.objects['StaticBatch__Room_Root__PC_TemperedGlass'];frame=bpy.data.objects['window_frame']
wallparts=[x for x in components(wall) if x['bounds']['min'][0]<-2.19 and x['bounds']['max'][0]<-2.09 and x['bounds']['min'][2]<-1.79 and x['bounds']['max'][2]>1.79]
glassparts=[x for x in components(glass) if x['bounds']['max'][0]<-2.13]
assert len(wallparts)==1 and len(glassparts)==1
framebound=bounds([runtime(frame.matrix_world@v.co) for v in frame.data.vertices])
objects=[row(bpy.data.objects[n]) for n in ['Room_Root','room-shell','wall_left','window_frame','window_glass']]+[row(o) for o in bpy.data.objects if o.name.startswith('blind_slat_')]
j=dict(status='READ ONLY',version=bpy.app.version_string,objects=objects,wallBatch=row(wall),wallLeftComponent=wallparts[0],glassBatch=row(glass),windowGlassComponent=glassparts[0],frameBounds=framebound,frameVertices=len(frame.data.vertices),framePolygons=len(frame.data.polygons),source='deliveries/FINISH-B1-R3/source/blender/scripts/build-environment.py @ 1753b9278c4537b5377c3893172b2a0f26d13b10',minimalProposal=dict(wall='Replace only wall_left connected component by four wall strips with a rectangular aperture y=[0.85,2.25], z=[-1.20,0.00] within unchanged x=[-2.20,-2.10], y=[0,2.8], z=[-1.8,1.8]. Retain wall_left empty proxy and batch identity, all other batch components exact.',frame='Replace only window_frame solid cuboid by four border strips inside its current outer bounds x=[-2.16,-2.12], y=[0.85,2.25], z=[-1.20,0.00], inner aperture y=[0.89,2.21], z=[-1.16,-0.04]. Keep its name, parent, local/world transforms, material, and node ID.',glass='Keep existing window glass geometry, material binding and proxy exact. Existing blinds and scene lighting remain exact. Do not add sky/weather/outdoor assets.',estimatedTriangleDelta=72,estimatedRawCallDelta=0,estimateReason='Original wall 12 triangles -> four cuboids 48 (+36); original frame 12 -> four border cuboids 48 (+36). Wall remains one primitive in existing opaque batch; frame remains one mesh/primitive. Actual browser counts must still be measured.',visualBoundary='This exposes the pane through the existing blinds; it does not supply a convincing exterior or validate open/closed blind lighting presets. Those remain separate visual gates.'))
(OUT/'evidence/window-occlusion-scope.json').write_text(json.dumps(j,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:j[k] for k in ['wallLeftComponent','windowGlassComponent','frameBounds','minimalProposal']},indent=2))
