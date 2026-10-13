import bpy, json, pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(OUT/'inputs/r3/assets/source/room.blend'))
def runtime(p):return [p.x,p.z,-p.y]
def bounds(points):return dict(min=[min(p[i] for p in points) for i in range(3)],max=[max(p[i] for p in points) for i in range(3)])
chassis=bpy.data.objects['pc_chassis_frame'];cv=[runtime(chassis.matrix_world@v.co) for v in chassis.data.vertices]
glass=bpy.data.objects['StaticBatch__Room_Root__PC_TemperedGlass'];gv=[runtime(glass.matrix_world@v.co) for v in glass.data.vertices]
pc=[p for p in gv if p[0]>.8];window=[p for p in gv if p[0]<-2]
j=dict(tool=bpy.app.version_string,chassis=dict(object=chassis.name,parent=chassis.parent.name,material=chassis.data.materials[0].name,vertexCount=len(cv),polygonCount=len(chassis.data.polygons),bounds=bounds(cv),closedCuboid=True),glass=dict(object=glass.name,material='PC_TemperedGlass',pcPanelBounds=bounds(pc),windowBounds=bounds(window),pcPanelProxy='pc_glass_side_panel',pcPanelProxyParent=bpy.data.objects['pc_glass_side_panel'].parent.name),occlusion='Opaque full box side x=0.93 lies immediately behind the PC panel x=[0.9255,0.9305]. The panel lies partly in the box side. Existing front mesh is opaque too.',minimalProposal='Replace only pc_chassis_frame geometry with an open-left five-wall thin shell within exact current outer envelope; retain its name, parent, TRS, material and other nodes. Add a low-cost visible internal side detail using existing material within the shell envelope if existing front fan geometry remains unreadable. Preserve glass, window and fan/LED hooks; remove no interaction node. Re-export room only and prove unrelated geometry/UV/topology unchanged.')
(OUT/'evidence/pc-occlusion-scope.json').write_text(json.dumps(j,indent=2)+'\n',encoding='utf-8');print(json.dumps(j,indent=2))
