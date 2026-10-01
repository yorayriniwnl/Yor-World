"""Run existing W1-r2 checker functions, without generating or saving assets.

The three mutations exist only in the in-memory Blender scene. Reopen original
before each case; never save. These are closure checks for existing W1-02.
"""
import ast, bpy, datetime, hashlib, json, math, mathutils
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
BASE = ROOT / 'deliveries/W1/revisions/W1-F1-r2'
source = (BASE / 'build-blockout.py').read_text(encoding='utf-8-sig')
tree = ast.parse(source)
names = {'b2r', 'get_obj_runtime_bounds', 'evaluate_clearance_and_collisions'}
selected = ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names], type_ignores=[])
exec(compile(selected, str(BASE / 'build-blockout.py'), 'exec'), globals())

def reopen():
    bpy.ops.wm.open_mainfile(filepath=str(BASE / 'blockout.blend'))
    bpy.context.view_layer.update()

def section(name):
    return evaluate_clearance_and_collisions()[name]

reopen()
result = {'executedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'evidenceClass': 'REVIEWER EXECUTED', 'blender': bpy.app.version_string,
          'sourceSha256': hashlib.sha256((BASE / 'build-blockout.py').read_bytes()).hexdigest(),
          'blendSha256': hashlib.sha256((BASE / 'blockout.blend').read_bytes()).hexdigest(),
          'method': 'Compile unmodified checker function AST from candidate. Reopen original blend before each in-memory mutation; no asset saves.',
          'baseline': evaluate_clearance_and_collisions(), 'mutations': []}

# The real tabletop now intersects the closed leaf, but door checker uses its old constants.
reopen()
desk = bpy.data.objects['desk_top']
mat = desk.matrix_world.copy()
mat.translation = mathutils.Vector((-1.2, -1.8, 0.725))
desk.matrix_world = mat
bpy.context.view_layer.update()
db = get_obj_runtime_bounds(desk)
lb = get_obj_runtime_bounds(bpy.data.objects['door_leaf'])
overlap = [min(db['max'][i], lb['max'][i]) - max(db['min'][i], lb['min'][i]) for i in range(3)]
result['mutations'].append({'id': 'real-tabletop-intersects-closed-door',
    'deskBounds': db, 'leafBounds': lb, 'aabbOverlapMeters': overlap,
    'positiveOverlapAllAxes': all(v > 0 for v in overlap),
    'expected': 'door_sweep FAIL', 'actual': section('door_sweep')})

# Replay the maker fault runner's exact chair-root displacement on the actual generator checker.
reopen()
chair = bpy.data.objects['chair-root']
chair.location.y = 0.65  # Blender -Y = runtime +Z, so runtime Z is -0.65.
bpy.context.view_layer.update()
result['mutations'].append({'id': 'maker-chair-root-displacement-on-real-checker',
    'runtimeChairRoot': b2r(*chair.location), 'expected': 'chair_turn FAIL by maker fault-injection-03 criterion',
    'actual': section('chair_turn'),
    'limitation': 'Locator mutation follows maker test; does not claim this locator parents all chair geometry.'})

# Move camera through the known right corridor wall while keeping its other coordinates.
reopen()
bpy.data.objects['Camera_Entry'].location.x = 0.5
bpy.context.view_layer.update()
result['mutations'].append({'id': 'entry-camera-beyond-right-corridor-boundary',
    'expected': 'entry_path FAIL for negative right clearance', 'actual': section('entry_path')})

(OUT / 'w1-checker-retest.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({'baseline': {k:v.get('status') for k,v in result['baseline'].items()},
    'mutations': [{'id':m['id'], 'expected':m['expected'], 'actualStatus':m['actual']['status']} for m in result['mutations']]}, indent=2))
