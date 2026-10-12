import hashlib,json,pathlib,struct
OUT=pathlib.Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
rows=[];textures={}
limits={'room.glb':1500000,'resident.glb':800000,'fixture.glb':524288}
for p in sorted((OUT/'assets').glob('*.glb')):
    b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=b[28+n:]
    row=dict(file='assets/'+p.name,bytes=len(b),sha256=sha(b),limitBytes=limits.get(p.name),status='PASS' if p.name not in limits or len(b)<=limits[p.name] else 'FAIL');rows.append(row)
    for im in j.get('images',[]):
        assert im.get('mimeType')=='image/png' and 'bufferView' in im
        v=j['bufferViews'][im['bufferView']];img=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
        textures.setdefault(sha(img),dict(bytes=len(img),width=int.from_bytes(img[16:20],'big'),height=int.from_bytes(img[20:24],'big'),sources=[]))['sources'].append(p.name+':'+im.get('name','unnamed'))
for p in sorted((OUT/'assets/textures').glob('*.png')):
    b=p.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';textures.setdefault(sha(b),dict(bytes=len(b),width=int.from_bytes(b[16:20],'big'),height=int.from_bytes(b[20:24],'big'),sources=[]))['sources'].append('textures/'+p.name)
essential=sum(r['bytes'] for r in rows if pathlib.Path(r['file']).name in limits)
allBytes=sum(r['bytes'] for r in rows)+sum(p.stat().st_size for p in (OUT/'assets/textures').glob('*.png'))
textureBytes=sum(r['bytes'] for r in textures.values());assert textureBytes<=1500000
assert essential<=3*1024**2 and allBytes<=7*1024**2
assert all(r['status']=='PASS' for r in rows)
browser=json.loads((OUT/'evidence/browser-results.json').read_text());profiles=[]
for m in browser['measurements']:
    if m['variant']!='R5' or not m.get('limit'):continue
    mobile=m['key']=='mobile-home';callLimit=80 if mobile else 120;triLimit=140000 if mobile else 300000;gpuLimit=(80 if mobile else 160)*1024**2;medianLimit=33.3 if mobile else 18.2;p95Limit=45 if mobile else 25
    census=m['resourceCensus'];gpu=census['geometryAttributeIndexEstimateBytes']+sum((r['width']*r['height']*4*4+2)//3 for r in textures.values())
    actual=dict(calls=m['rendererInfo']['calls'],triangles=m['rendererInfo']['triangles'],allDeliveredUniqueTextureAssetGPUBytesEstimate=gpu,localMedianMs=m['frameSamples']['medianMs'],localP95Ms=m['frameSamples']['p95Ms'])
    assert actual['calls']<=callLimit and actual['triangles']<=triLimit and gpu<=gpuLimit and actual['localMedianMs']<=medianLimit and actual['localP95Ms']<=p95Limit
    profiles.append(dict(profile=m['key'],actual=actual,limits=dict(calls=callLimit,triangles=triLimit,assetGPUBytes=gpuLimit,medianMs=medianLimit,p95Ms=p95Limit),status='PASS LOCAL',gpuScope='Unique loaded attribute/index buffers plus conservative RGBA8 mipmapped estimate for all delivered embedded/late textures, deduplicated by raw image hash; excludes driver overhead/framebuffers.',timingScope=m['frameSamples']['method']))
receipt=dict(status='PASS LOCAL',command='python scripts/verify-final-budgets.py',assets=rows,essentialGLBBytes=essential,allDeliveredTransferBytes=allBytes,essentialLimitsBytes=dict(mobile=3*1024**2,desktop=6*1024**2),fullOptionalLimitsBytes=dict(mobile=7*1024**2,desktop=14*1024**2),uniqueTextureBytes=textureBytes,uniqueTextureLimitBytes=1500000,textures=textures,profiles=profiles,coldWarmNetworkEntryDeviceThermal='NOT RUN',productionDecodedResidencyAndG7='NOT RUN',note='Local isolated asset evidence does not qualify production timing, real device GPU allocation, runtime optional overlap or network entry.')
(OUT/'evidence/final-budgets.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2))
