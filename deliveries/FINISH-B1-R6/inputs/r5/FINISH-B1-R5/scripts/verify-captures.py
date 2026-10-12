import hashlib,json,pathlib,struct
OUT=pathlib.Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
browser=json.loads((OUT/'evidence/browser-results.json').read_text(encoding='utf-8'))
expected_views={'desktop-home','mobile-home','pc-glass-outside','pc-glass-inside','window-glass','window-glass-outside','pc-glass-outside-base'}
rows=[]
for variant in ('R4','R5'):
    captures={r['view']:r for r in browser['captures'] if r['variant']==variant}
    if set(captures)!=expected_views:raise RuntimeError(variant+' capture view set mismatch: '+repr(sorted(captures)))
    for key,row in sorted(captures.items()):
        p=OUT/row['file']
        if not p.is_file():raise RuntimeError('missing capture '+row['file'])
        b=p.read_bytes()
        if b[:8]!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('invalid PNG '+row['file'])
        width,height=struct.unpack_from('>II',b,16)
        if (len(b),sha(p),width,height)!=(row['bytes'],row['sha256'],row['width'],row['height']):raise RuntimeError('capture metadata/hash mismatch '+row['file'])
        rows.append({'variant':variant,'view':key,'path':row['file'],'bytes':len(b),'sha256':sha(p),'width':width,'height':height,'camera':row.get('camera')})
reference=OUT/'inputs/references/main-reference.png'
if sha(reference)!='37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362':raise RuntimeError('reference image is not the packet-bound raw input')
receipt={'status':'PASS LOCAL','reference':{'path':'inputs/references/main-reference.png','sha256':sha(reference),'width':struct.unpack_from('>I',reference.read_bytes(),16)[0],'height':struct.unpack_from('>I',reference.read_bytes(),20)[0]},'captureCount':len(rows),'captures':rows,'scope':'Verifies supplied reference binding and byte hashes, PNG dimensions, and presence of every matched R4/R5 capture listed by the browser run. It does not judge visual fidelity.'}
(OUT/'evidence/capture-verification.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'captureCount':len(rows),'referenceSHA256':receipt['reference']['sha256']},indent=2))
