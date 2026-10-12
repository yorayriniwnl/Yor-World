import copy,hashlib,json,pathlib,struct
OUT=pathlib.Path(__file__).resolve().parents[1]
CONFIG=json.loads((OUT/'source/palette.json').read_text(encoding='utf-8'))
BASE=OUT/'inputs/r4-02/assets'
ASSETS=OUT/'assets'

def sha(b):return hashlib.sha256(b).hexdigest()
def canonical_hash(v):return sha(json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8'))
def glb(path):
    raw=path.read_bytes()
    if raw[:4]!=b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2 or struct.unpack_from('<I',raw,8)[0]!=len(raw):raise RuntimeError('bad GLB '+str(path))
    n,kind=struct.unpack_from('<II',raw,12)
    if kind!=0x4E4F534A:raise RuntimeError('GLB JSON chunk missing '+str(path))
    return raw,json.loads(raw[20:20+n]),raw[20+n:]
def named(rows):
    result={row.get('name'):row for row in rows}
    if len(result)!=len(rows):raise RuntimeError('duplicate/missing record name')
    return result
def material_fields(row):
    p=row.get('pbrMetallicRoughness',{})
    return {'baseColorFactor':p.get('baseColorFactor'),'roughnessFactor':p.get('roughnessFactor'),'metallicFactor':p.get('metallicFactor'),
            'emissiveFactor':row.get('emissiveFactor'),'emissiveStrength':row.get('extensions',{}).get('KHR_materials_emissive_strength')}
def close_values(actual,expected,label,tolerance=1e-5):
    if actual is None or len(actual)!=len(expected) or any(abs(float(a)-float(b))>tolerance for a,b in zip(actual,expected)):
        raise RuntimeError(label+' does not match the authored palette: '+repr(actual)+' != '+repr(expected))
def close_scalar(actual,expected,label,tolerance=1e-5):
    if actual is None or abs(float(actual)-float(expected))>tolerance:
        raise RuntimeError(label+' does not match the authored palette: '+repr(actual)+' != '+repr(expected))
def normalize_glb(doc,mat_allow,light_allow):
    j=copy.deepcopy(doc);materials=named(j.get('materials',[]))
    for name in mat_allow:
        m=materials[name];p=m.get('pbrMetallicRoughness',{})
        for key in ('baseColorFactor','roughnessFactor','metallicFactor'):p.pop(key,None)
        m.pop('emissiveFactor',None)
        ext=m.get('extensions',{});ext.pop('KHR_materials_emissive_strength',None)
        if not ext:m.pop('extensions',None)
    lights=j.get('extensions',{}).get('KHR_lights_punctual',{}).get('lights',[])
    if light_allow:
        for name,row in named(lights).items():
            if name in light_allow:row.pop('color',None)
    return j

def check_asset(filename,mat_allow,light_allow=()):
    before_raw,before,binary0=glb(BASE/filename);after_raw,after,binary1=glb(ASSETS/filename)
    if binary0!=binary1:raise RuntimeError(filename+' GLB binary buffer changed')
    if normalize_glb(before,mat_allow,light_allow)!=normalize_glb(after,mat_allow,light_allow):raise RuntimeError(filename+' has an unauthorized GLB JSON change')
    beforem=named(before.get('materials',[]));afterm=named(after.get('materials',[]))
    if filename=='room.glb' and beforem.get('PC_TemperedGlass')!=afterm.get('PC_TemperedGlass'):
        raise RuntimeError('R4 PC_TemperedGlass material changed')
    export_path=OUT/'evidence'/('native-room-export.glb' if filename=='room.glb' else 'native-fixture-export.glb')
    _,native,_=glb(export_path);nativem=named(native.get('materials',[]))
    fields=[]
    for name in mat_allow:
        if name not in beforem or name not in afterm or name not in nativem:raise RuntimeError('missing palette material '+name)
        if material_fields(afterm[name])!=material_fields(nativem[name]):raise RuntimeError(filename+' source/export material parity mismatch '+name)
        authored=(CONFIG['roomMaterials'] if filename=='room.glb' else CONFIG['fixtureMaterials'])[name]
        f=material_fields(afterm[name])
        close_values(f['baseColorFactor'],authored['baseColor'],filename+'/'+name+'/baseColor')
        close_scalar(f['roughnessFactor'],authored['roughness'],filename+'/'+name+'/roughness')
        close_scalar(f['metallicFactor'],authored['metallic'],filename+'/'+name+'/metallic')
        actual_strength=f['emissiveStrength'].get('emissiveStrength',1.0) if f['emissiveStrength'] is not None else 1.0
        actual_emission=[v*actual_strength for v in f['emissiveFactor']]
        expected_emission=[v*authored['emissionStrength'] for v in authored['emissionColor'][:3]]
        close_values(actual_emission,expected_emission,filename+'/'+name+'/effective emission')
        fields.append({'name':name,'before':material_fields(beforem[name]),'after':material_fields(afterm[name])})
    lightdiff=[]
    if light_allow:
        oldlights=named(before.get('extensions',{}).get('KHR_lights_punctual',{}).get('lights',[]));newlights=named(after.get('extensions',{}).get('KHR_lights_punctual',{}).get('lights',[]))
        for name in light_allow:
            if name not in oldlights or name not in newlights:raise RuntimeError('missing authored punctual light '+name)
            if {k:v for k,v in oldlights[name].items() if k!='color'}!={k:v for k,v in newlights[name].items() if k!='color'}:raise RuntimeError('light non-color fields changed '+name)
            close_values(newlights[name].get('color'),CONFIG['authoredLightColors'][name],filename+'/'+name+'/color')
            lightdiff.append({'name':name,'before':oldlights[name].get('color'),'after':newlights[name].get('color')})
    return {'file':filename,'inputSHA256':sha(before_raw),'outputSHA256':sha(after_raw),'bytesBefore':len(before_raw),'bytesAfter':len(after_raw),
      'binaryPayloadExact':True,'allOtherGlbJsonExact':True,'nodesBefore':len(before.get('nodes',[])),'nodesAfter':len(after.get('nodes',[])),
      'materialsBefore':len(before.get('materials',[])),'materialsAfter':len(after.get('materials',[])),'meshesBefore':len(before.get('meshes',[])),'meshesAfter':len(after.get('meshes',[])),
      'animationsBefore':len(before.get('animations',[])),'animationsAfter':len(after.get('animations',[])),'texturesBefore':len(before.get('textures',[])),'texturesAfter':len(after.get('textures',[])),
      'materialDiff':fields,'lightColorDiff':lightdiff}

room=check_asset('room.glb',CONFIG['roomMaterials'].keys(),['HexWall_PointLight','CyanUnderdesk_PointLight','CeilingAmbient_PointLight'])
fixture=check_asset('fixture.glb',CONFIG['fixtureMaterials'].keys())
all_asset_paths=['room.glb','resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb','source/room.blend','textures/deskmat-topography.png','textures/monitor-wallpaper.png']
expected=sorted(all_asset_paths);actual=sorted(p.relative_to(ASSETS).as_posix() for p in ASSETS.rglob('*') if p.is_file())
if actual!=expected:raise RuntimeError('unexpected candidate runtime asset universe: '+repr(actual))
untouched=[]
for rel in ['resident.glb','group-b-props.glb','on-demand-projects.glb','textures/deskmat-topography.png','textures/monitor-wallpaper.png']:
    a=(BASE/rel).read_bytes();b=(ASSETS/rel).read_bytes()
    if a!=b:raise RuntimeError('untouched asset changed '+rel)
    untouched.append({'path':'assets/'+rel,'bytes':len(b),'sha256':sha(b),'byteIdenticalToR4':True})
manifest=json.loads((OUT/'inputs/r4-02/output-hashes.json').read_text(encoding='utf-8'))
manifest_files={r['path']:r for r in manifest['files']}
for rel in all_asset_paths:
    source=manifest_files['assets/'+rel];raw=(BASE/rel).read_bytes()
    if len(raw)!=source['bytes'] or sha(raw)!=source['sha256']:raise RuntimeError('R4 output-manifest mismatch '+rel)
browser=json.loads((OUT/'evidence/browser-results.json').read_text(encoding='utf-8'))
profile_rows=[];expected_models=['room.glb','resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb']
for key in ['desktop-home','mobile-home']:
    baseline=next(m for m in browser['measurements'] if m['variant']=='R4' and m['key']==key)
    candidate=next(m for m in browser['measurements'] if m['variant']=='R5' and m['key']==key)
    for field in ('camera','renderer','animationState','loadedModels'):
        if baseline[field]!=candidate[field]:raise RuntimeError(f'matched renderer setting changed: {key}/{field}')
    if candidate['loadedModels']!=expected_models:raise RuntimeError('runtime model requests changed '+key)
    mobile=key=='mobile-home';cap=80 if mobile else 120
    tri=140000 if mobile else 300000
    if candidate['rendererInfo']['calls']>cap or candidate['rendererInfo']['triangles']>tri or candidate['frameDelta']!=1 or candidate['byPass'].get('transmission',0):raise RuntimeError('renderer budget/pass failure '+key)
    base_lights={x['name']:x for x in baseline['lights']};new_lights={x['name']:x for x in candidate['lights']}
    for name in base_lights:
        if name not in new_lights:raise RuntimeError('runtime light inventory changed '+name)
        mutable=name in {'Light_HexWall','Light_CyanFill','Light_CeilingAmbient'}
        if mutable:
            if {k:v for k,v in base_lights[name].items() if k!='color'}!={k:v for k,v in new_lights[name].items() if k!='color'}:raise RuntimeError('runtime authored light non-color changed '+name)
        elif base_lights[name]!=new_lights[name]:raise RuntimeError('unexpected runtime light change '+name)
    profile_rows.append({'profile':key,'camera':candidate['camera'],'renderer':candidate['renderer'],'drawCalls':candidate['rendererInfo']['calls'],'triangles':candidate['rendererInfo']['triangles'],
      'callsLimit':cap,'trianglesLimit':tri,'loadedModels':candidate['loadedModels'],'transmissionPasses':candidate['byPass'].get('transmission',0),'matchedSettingsUnchanged':True,'status':'PASS LOCAL'})
receipt={'status':'PASS LOCAL','r4Commit':'7936fa981a24fe4af834ff250ffec8a7b02b09b3','changedAssets':['assets/room.glb','assets/fixture.glb','assets/source/room.blend'],
 'room':room,'fixture':fixture,'untouchedAssets':untouched,'runtimeAssetUniverse':actual,'runtimeRequestSetUnchanged':True,
 'nativeSourceScopeReceipt':'evidence/native-palette-scope.json','fixtureSourceScopeReceipt':'evidence/fixture-palette-scope.json',
 'nativeRoomGeometryUvNodeTransformActionCameraDoorHookInventoriesUnchanged':True,'r4TemperedGlassSemanticallyUnchanged':True,
 'browserProfiles':profile_rows,'scope':'Exact R4 output JSON/binary compared with candidate; only listed material/color/roughness/metalness/emissive values and named authored punctual-light colors differ. No geometry, UV, node, transform, animation, camera, doorway, hook, asset ID or runtime source changes.'}
(OUT/'evidence/final-scope.json').write_text(json.dumps(receipt,indent=2)+chr(10),encoding='utf-8')
print(json.dumps({'status':receipt['status'],'roomSHA256':room['outputSHA256'],'fixtureSHA256':fixture['outputSHA256'],'unchangedAssets':len(untouched),'desktopCalls':profile_rows[0]['drawCalls'],'mobileCalls':profile_rows[1]['drawCalls'],'scopeEvidence':'evidence/final-scope.json'},indent=2))
