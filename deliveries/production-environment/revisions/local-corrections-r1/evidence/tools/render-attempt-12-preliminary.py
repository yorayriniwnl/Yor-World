import bpy, json, sys, time
from pathlib import Path
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
mode=args[0] if args else 'environment'
repo=Path(bpy.data.filepath).resolve()
outdir=repo.parent/'renders-preliminary'
outdir.mkdir(parents=True, exist_ok=True)
if mode=='environment':
    views=[
        ('desktop-1440x1000','camera-home-desktop',1440,1000),
        ('wide-1920x1080','camera-home-desktop',1920,1080),
        ('tablet-1024x768','camera-home-desktop',1024,768),
        ('portrait-390x844','camera-mobile-portrait',390,844),
        ('small-portrait-320x600','camera-mobile-portrait',320,600),
        ('landscape-844x390','camera-home-desktop',844,390),
        ('entrance-1440x1000','camera-entry',1440,1000),
        ('monitor-focus-1440x1000','camera-monitor-detail',1440,1000),
    ]
    scene=bpy.context.scene
    if scene.render.engine.startswith('BLENDER_EEVEE') and hasattr(scene,'eevee'):
        scene.eevee.taa_render_samples=min(32,scene.eevee.taa_render_samples)
elif mode=='fixture':
    views=[('fixture-hero-1140x800','prod-camera',1140,800)]
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=min(16,scene.cycles.samples or 16)
    scene.cycles.use_denoising=True
else:
    raise RuntimeError('mode must be environment or fixture')
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.color_depth='8'
scene.render.film_transparent=False
rows=[]
for label,camera_name,width,height in views:
    camera=bpy.data.objects.get(camera_name)
    if not camera or camera.type!='CAMERA':
        raise RuntimeError(f'Missing camera {camera_name}')
    scene.camera=camera
    scene.render.resolution_x=width
    scene.render.resolution_y=height
    output=outdir/f'{mode}-{label}.png'
    if output.exists():
        raise RuntimeError(f'Refusing to overwrite {output}')
    scene.render.filepath=str(output)
    started=time.time()
    print(f'RENDER_START {label} camera={camera_name} size={width}x{height}',flush=True)
    bpy.ops.render.render(write_still=True)
    rows.append({'view':label,'camera':camera_name,'width':width,'height':height,'path':str(output),'bytes':output.stat().st_size,'seconds':round(time.time()-started,3)})
    print(f'RENDER_DONE {label} bytes={output.stat().st_size}',flush=True)
manifest=outdir/f'{mode}-render-manifest.json'
if manifest.exists():
    raise RuntimeError(f'Refusing to overwrite {manifest}')
manifest.write_text(json.dumps({'mode':mode,'blend':str(repo),'blender':bpy.app.version_string,'evidenceKind':'offline Blender source render; not browser/runtime integration or visual acceptance','renders':rows},indent=2)+'\n',encoding='utf-8')
print(f'MANIFEST {manifest}',flush=True)
