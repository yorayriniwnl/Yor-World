import bpy, json
from pathlib import Path
root = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(root/'avatar-proof.blend'))
rig=bpy.data.objects['resident']; body=bpy.data.objects['resident-body']
rows=[]
for clip,frame in [('coding_idle',1),('notice_visitor',10),('turn_to_visitor',19)]:
    rig.animation_data.action=bpy.data.actions[clip]
    rig.animation_data.action_slot=bpy.data.actions[clip].slots[0]
    bpy.context.scene.frame_set(frame)
    ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get()); mesh=ev.to_mesh()
    row={'clip':clip,'frame':frame,'bones':{n:list(b.matrix.translation) for n,b in rig.pose.bones.items()},'seatVertices':{}}
    for vert in mesh.vertices:
        p=ev.matrix_world@vert.co
        if .04<p.x<.56 and .13<p.y<.62 and .38<p.z<.46:
            names=[body.vertex_groups[g.group].name for g in body.data.vertices[vert.index].groups if g.weight>.9]
            for n in names: row['seatVertices'].setdefault(n,[]).append(list(p))
    ev.to_mesh_clear(); rows.append(row)
(root/'evidence/r2/native-diagnostic.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows))
