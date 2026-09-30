"""Reopen the delivered .blend, verify its saved state, and render three poses."""
import bpy, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parent
evidence=root/'evidence/r2'
bpy.ops.wm.open_mainfile(filepath=str(root/'avatar-proof.blend'))
scene=bpy.context.scene
rig=bpy.data.objects['resident']; chair=bpy.data.objects['chair-root']
clips={'coding_idle':181,'notice_visitor':19,'turn_to_visitor':37,'greeting_nod':28,'return_to_work':40}
checks=[{'name':'saved 30 FPS meter source','status':'PASS' if scene.render.fps==30 and scene.unit_settings.scale_length==1 else 'FAIL'},
        {'name':'saved coding rest pose','status':'PASS' if scene.frame_current==1 and rig.animation_data.action.name=='coding_idle' else 'FAIL'}]
for clip,end in clips.items():
    action=bpy.data.actions[clip]
    checks.append({'name':clip+' source range','status':'PASS' if list(action.frame_range)==[1.,float(end)] else 'FAIL','range':list(action.frame_range)})
hashes={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in ['avatar-proof.blend','avatar-proof.glb','fixture-proof.glb']}
(evidence/'native-reopen.json').write_text(json.dumps({'blender':bpy.app.version_string,'hashes':hashes,'checks':checks},indent=2))
assert all(c['status']=='PASS' for c in checks),checks
for clip,frame,label in [('coding_idle',1,'coding'),('notice_visitor',19,'hands-clear'),('greeting_nod',14,'greeting')]:
    for obj,name in [(rig,clip),(chair,'fixture-'+clip)]:
        action=bpy.data.actions[name]
        obj.animation_data.action=action; obj.animation_data.action_slot=action.slots[0]
    scene.frame_set(frame)
    scene.render.filepath=str(evidence/f'blender-{label}.png')
    bpy.ops.render.render(write_still=True)
print('REOPEN_AND_RENDER_PASS',json.dumps(hashes))
