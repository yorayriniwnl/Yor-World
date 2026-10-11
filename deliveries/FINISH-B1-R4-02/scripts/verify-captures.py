import hashlib,json,pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
j=json.loads((OUT/'evidence/browser-results.json').read_text())
rows=[]
for c in j['captures']:
    b=(OUT/c['file']).read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n'
    assert len(b)==c['bytes'] and hashlib.sha256(b).hexdigest()==c['sha256']
    assert int.from_bytes(b[16:20],'big')==c['width'] and int.from_bytes(b[20:24],'big')==c['height']
    m=next(m for m in j['measurements'] if m['variant']==c['variant'] and m['key']==c['view'])
    assert (c['width'],c['height'])==(m['width'],m['height'])
    other=next(m for m in j['measurements'] if m['variant']!=c['variant'] and m['key']==c['view'])
    assert m['camera']==other['camera'] and m['renderer']==other['renderer'] and m['lights']==other['lights'] and m['animationState']==other['animationState']
    rows.append(dict(file=c['file'],sha256=c['sha256'],width=c['width'],height=c['height'],status='PASS',matchedCameraLightingDPRExposure=True))
for variant,responses in j['assetResponses'].items():
    assert len(responses)==5
    for r in responses:
        f=r['url'].split('/')[-1];expected=j['assetHashes'][variant][f]
        assert r['sha256']==expected['sha256'] and r['bytes']==expected['bytes']
for m in j['measurements']:
    if m['variant']=='R4' and m.get('limit'):
        assert m['rendererInfo']['calls']<=m['limit']
        assert m['rendererInfo']['calls']==m['interceptedCalls'] and m['frameDelta']==1
        assert m['byPass'].get('transmission',0)==0
assert not any(c['type'] in ['error','pageerror','warning'] for c in j['console'])
out=dict(status='PASS',command='python scripts/verify-captures.py',captures=rows,loadedGLBResponseHashesExact=True,matchedAllSettings=True,budgetAssertions=True,scope='Capture identity/settings/loading/call accounting only. No aesthetic approval is inferred.')
(OUT/'evidence/capture-reverification.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print(f"PASS: {len(rows)} PNG hashes/dimensions/settings/pose; fifteen GLB HTTP bodies exact; frozen R4 draw assertions; no browser errors")
