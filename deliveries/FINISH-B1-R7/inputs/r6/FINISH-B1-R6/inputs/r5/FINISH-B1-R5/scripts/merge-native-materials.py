import copy,hashlib,json,pathlib,struct
OUT=pathlib.Path(__file__).resolve().parents[1]
CONFIG=json.loads((OUT/'source/palette.json').read_text(encoding='utf-8'))
def sha(b):return hashlib.sha256(b).hexdigest()
def decode(raw):
    if raw[:4]!=b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2:raise ValueError('not GLB v2')
    total=struct.unpack_from('<I',raw,8)[0]
    if total!=len(raw):raise ValueError('GLB total length mismatch')
    n,kind=struct.unpack_from('<II',raw,12)
    if kind!=0x4E4F534A:raise ValueError('first GLB chunk is not JSON')
    return json.loads(raw[20:20+n]),raw[20+n:]
def encode(doc,tail):
    payload=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf-8')
    payload+=b' ' *((-len(payload))%4)
    return struct.pack('<III',0x46546C67,2,20+len(payload)+len(tail))+struct.pack('<II',len(payload),0x4E4F534A)+payload+tail
def by_name(items):
    rows={item.get('name'):item for item in items}
    if len(rows)!=len(items):raise ValueError('missing or duplicate names')
    return rows
def near(a,b,tol=1e-7):
    if isinstance(a,(int,float)) and isinstance(b,(int,float)):return abs(a-b)<=tol
    if isinstance(a,list) and isinstance(b,list):return len(a)==len(b) and all(near(x,y,tol) for x,y in zip(a,b))
    if isinstance(a,dict) and isinstance(b,dict):return a.keys()==b.keys() and all(near(a[k],b[k],tol) for k in a)
    return a==b
def merge(asset,materials,lights=()):
    original=(OUT/'inputs/r4-02/assets'/asset).read_bytes()
    dest=OUT/'assets'/asset
    if dest.read_bytes()!=original:raise RuntimeError('candidate did not start from exact R4 asset '+asset)
    export=OUT/'evidence'/('native-room-export.glb' if asset=='room.glb' else 'native-fixture-export.glb')
    source=export.read_bytes();base,basebin=decode(original);native,nativebin=decode(source)
    oldmaterials=by_name(base['materials']);newmaterials=by_name(native['materials'])
    changes=[]
    for name in materials:
        if name not in oldmaterials or name not in newmaterials:raise RuntimeError('material missing from source/export '+name)
        old=oldmaterials[name];new=newmaterials[name]
        before=copy.deepcopy(old)
        oldp=old.setdefault('pbrMetallicRoughness',{});newp=new.get('pbrMetallicRoughness',{})
        for field in ('baseColorFactor','roughnessFactor','metallicFactor'):
            if field not in newp:raise RuntimeError(f'native material misses {name}/{field}')
            oldp[field]=copy.deepcopy(newp[field])
        if 'emissiveFactor' in new:old['emissiveFactor']=copy.deepcopy(new['emissiveFactor'])
        else:old.pop('emissiveFactor',None)
        oldext=old.setdefault('extensions',{})
        newext=new.get('extensions',{})
        strength='KHR_materials_emissive_strength'
        if strength in newext:oldext[strength]=copy.deepcopy(newext[strength])
        else:oldext.pop(strength,None)
        if not oldext:old.pop('extensions',None)
        # Preserve every other material extension and property exactly.
        for field in ('baseColorFactor','roughnessFactor','metallicFactor'):
            if not near(old['pbrMetallicRoughness'][field],newp[field]):raise RuntimeError('native material parity mismatch '+name+'/'+field)
        if not near(old.get('emissiveFactor'),new.get('emissiveFactor')):raise RuntimeError('native emission parity mismatch '+name)
        if old.get('extensions',{}).get(strength)!=new.get('extensions',{}).get(strength):raise RuntimeError('native emissive-strength mismatch '+name)
        changes.append({'material':name,'before':before,'after':copy.deepcopy(old),'sourceExport':copy.deepcopy(new),
                        'fields':['pbrMetallicRoughness.baseColorFactor','pbrMetallicRoughness.roughnessFactor','pbrMetallicRoughness.metallicFactor','emissiveFactor','extensions.KHR_materials_emissive_strength']})
    light_changes=[]
    if lights:
        base_lights=base.get('extensions',{}).get('KHR_lights_punctual',{}).get('lights',[])
        native_lights=native.get('extensions',{}).get('KHR_lights_punctual',{}).get('lights',[])
        oldlights=by_name(base_lights);newlights=by_name(native_lights)
        for name in lights:
            if name not in oldlights or name not in newlights:raise RuntimeError('authored light missing '+name)
            before=copy.deepcopy(oldlights[name].get('color'))
            oldlights[name]['color']=copy.deepcopy(newlights[name]['color'])
            light_changes.append({'light':name,'field':'color','before':before,'after':copy.deepcopy(oldlights[name]['color'])})
    if basebin!=basebin or nativebin is None:raise RuntimeError('unreachable binary check')
    out=encode(base,basebin)
    if decode(out)[1]!=basebin:raise RuntimeError('GLB binary chunk changed')
    dest.write_bytes(out)
    receipt={'status':'PASS','asset':asset,'inputR4SHA256':sha(original),'nativeExportSHA256':sha(source),'outputSHA256':sha(out),'inputBytes':len(original),'outputBytes':len(out),
             'glbBinaryPayloadExact':decode(out)[1]==basebin,'materialDiff':changes,'lightDiff':light_changes}
    (OUT/'evidence'/(asset.replace('.glb','')+'-native-material-merge.json')).write_text(json.dumps(receipt,indent=2)+chr(10),encoding='utf-8')
    return receipt
room=merge('room.glb',CONFIG['roomMaterials'].keys(),CONFIG['authoredLightColors'].keys())
fixture=merge('fixture.glb',CONFIG['fixtureMaterials'].keys())
print(json.dumps({'status':'PASS','room':{'bytes':room['outputBytes'],'sha256':room['outputSHA256'],'materialChanges':len(room['materialDiff']),'lightChanges':len(room['lightDiff'])},
 'fixture':{'bytes':fixture['outputBytes'],'sha256':fixture['outputSHA256'],'materialChanges':len(fixture['materialDiff'])}},indent=2))