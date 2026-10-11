import hashlib,json,pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
EXCLUDED={'output-hashes.json','evidence/package-verification.json'}
files=[]
for p in sorted((x for x in OUT.rglob('*') if x.is_file()),key=lambda x:x.relative_to(OUT).as_posix()):
    rel=p.relative_to(OUT).as_posix()
    if rel in EXCLUDED:continue
    raw=p.read_bytes();files.append({'path':rel,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
receipt={'schemaVersion':1,'candidate':'FINISH-B1-R5','baseCommit':'7936fa981a24fe4af834ff250ffec8a7b02b09b3',
 'selfExcluded':sorted(EXCLUDED),'files':files,'totalBytes':sum(row['bytes'] for row in files)}
(OUT/'output-hashes.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','files':len(files),'bytes':receipt['totalBytes']},indent=2))
