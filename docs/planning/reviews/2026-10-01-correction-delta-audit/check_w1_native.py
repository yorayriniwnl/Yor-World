"""Parent delta audit: open delivered native read-only, execute actual checker in memory.
No render, save, export, generator main, or maker-evidence write is performed.
"""
import ast, datetime, hashlib, json, math, struct
from pathlib import Path
import bpy, mathutils

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
D = ROOT / 'deliveries/W1/revisions/W1-F1-r2'

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def functions(path, names):
    tree = ast.parse(path.read_text(encoding='utf8'), str(path))
    selected = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
    assert len(selected) == len(names)
    ns = {'bpy': bpy, 'mathutils': mathutils, 'math': math}
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(path), 'exec'), ns)
    return ns

maker = functions(D / 'build-blockout.py', {'b2r', 'get_obj_runtime_bounds', 'evaluate_clearance_and_collisions'})
fault = functions(D / 'evidence/fault-injection-runner.py', {'b2r', 'get_obj_runtime_bounds', 'evaluate_chair_base_to_desk'})
b2r = maker['b2r']
bounds = maker['get_obj_runtime_bounds']

def reopen():
    bpy.ops.wm.open_mainfile(filepath=str(D / 'blockout.blend'), load_ui=False, use_scripts=False)
    bpy.context.view_layer.update()

def pos(obj):
    return list(b2r(*obj.matrix_world.translation))

def brief():
    r = maker['evaluate_clearance_and_collisions']()
    return {k: {a: b for a, b in v.items() if a != 'samples'} for k, v in r.items()}

reopen()
before = {name: digest(D / name) for name in ['blockout.blend', 'room-blockout.glb', 'build-blockout.py', 'asset-register.json']}
result = {'executedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'evidenceClass': 'PARENT EXECUTED', 'blenderVersion': bpy.app.version_string,
          'blenderBuild': bpy.app.build_hash.decode(), 'inputSha256': before, 'baselineActualGeneratorChecker': brief()}
result['nativeObjects'] = {o.name: {'type': o.type, 'parent': o.parent.name if o.parent else None,
    'worldRuntime': pos(o), 'runtimeBounds': bounds(o) if o.type == 'MESH' else None,
    'rotationEuler': list(o.rotation_euler)} for o in bpy.data.objects}
raw = (D / 'room-blockout.glb').read_bytes()
g = json.loads(raw[20:20+struct.unpack_from('<I', raw, 12)[0]])
parents = {c: i for i, n in enumerate(g['nodes']) for c in n.get('children', [])}
worlds = {}
def world(i):
    if i in worlds:
        return worlds[i]
    n = g['nodes'][i]
    if 'matrix' in n:
        local = mathutils.Matrix([n['matrix'][k:k+4] for k in range(0, 16, 4)]).transposed()
    else:
        q = n.get('rotation', [0, 0, 0, 1])
        local = mathutils.Matrix.LocRotScale(mathutils.Vector(n.get('translation', [0, 0, 0])),
            mathutils.Quaternion((q[3], q[0], q[1], q[2])), mathutils.Vector(n.get('scale', [1, 1, 1])))
    worlds[i] = world(parents[i]) @ local if i in parents else local
    return worlds[i]
comparisons = []
for i, n in enumerate(g['nodes']):
    o = bpy.data.objects.get(n.get('name', ''))
    if o:
        p = pos(o)
        exported = list(world(i).translation)
        comparisons.append({'name': n['name'], 'native': p, 'exported': exported,
                            'maxPositionErrorMeters': max(abs(a-b) for a, b in zip(p, exported))})
result['nativeExportPositionAgreement'] = {'compared': len(comparisons),
    'maxPositionErrorMeters': max(x['maxPositionErrorMeters'] for x in comparisons), 'rows': comparisons,
    'scope': 'Agreement is a consistency check, not proof every coordinate is intended or every hit zone is aligned.'}
result['cameras'] = []
for i, n in enumerate(g['nodes']):
    if 'camera' not in n:
        continue
    o = bpy.data.objects[n['name']]
    perspective = g['cameras'][n['camera']]['perspective']
    result['cameras'].append({'name': n['name'], 'worldRuntime': pos(o),
        'nativeSensorFit': o.data.sensor_fit, 'nativeAngleDegrees': math.degrees(o.data.angle),
        'nativeAngleXDegrees': math.degrees(o.data.angle_x), 'nativeAngleYDegrees': math.degrees(o.data.angle_y),
        'glTFPerspective': perspective, 'exportedYfovDegrees': math.degrees(perspective['yfov'])})
result['removalSubtrees'] = {name: {'root': name, 'descendants': sorted(o.name for o in bpy.data.objects[name].children_recursive),
                                  'descendantCount': len(bpy.data.objects[name].children_recursive)} for name in ['chair', 'resident', 'chair-root']}
result['chairGlbNodes'] = [n for n in g['nodes'] if n.get('name') in ['chair', 'chair-root']]
result['faultReproductions'] = []
# Reproduce the maker's exact chair-root mutation against both functions.
bpy.data.objects['chair-root'].location.y += .29
bpy.context.view_layer.update()
result['faultReproductions'].append({'case': 'same +0.29 Blender Y chair-root displacement as FAULT-INJECT-03',
    'actualGeneratorChecker': brief()['chair_turn'], 'separateFaultRunnerChecker': fault['evaluate_chair_base_to_desk'](),
    'chairRootWorld': pos(bpy.data.objects['chair-root']), 'chairMeshRootWorld': pos(bpy.data.objects['chair'])})
reopen()
# Move actual wall geometry into the closed door; fixed wall coordinates must not certify it clear.
bpy.data.objects['wall_left'].location.x = -1.2
bpy.context.view_layer.update()
a, b = bounds(bpy.data.objects['wall_left']), bounds(bpy.data.objects['door_leaf'])
overlap = [min(a['max'][i], b['max'][i])-max(a['min'][i], b['min'][i]) for i in range(3)]
result['faultReproductions'].append({'case': 'wall_left X moved to -1.2; closed door collision',
    'wallBounds': a, 'doorBounds': b, 'aabbOverlapMeters': overlap, 'overlapOnAllAxes': all(v > 0 for v in overlap),
    'actualGeneratorDoorChecker': brief()['door_sweep']})
reopen()
# Only left corridor clearance participates in the actual entry predicate.
bpy.data.objects['Camera_Entry'].location.x = 0
bpy.context.view_layer.update()
result['faultReproductions'].append({'case': 'entry camera moved beyond right corridor boundary',
    'actualGeneratorEntryChecker': brief()['entry_path']})
reopen()
result['inputFilesUnchanged'] = {name: digest(D / name) == value for name, value in before.items()}
(OUT / 'w1-native-delta.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8')
print(json.dumps({'nativeExportAgreement': {k: v for k, v in result['nativeExportPositionAgreement'].items() if k != 'rows'},
                  'cameras': result['cameras'], 'faultReproductions': result['faultReproductions'],
                  'inputFilesUnchanged': result['inputFilesUnchanged']}, indent=2))
