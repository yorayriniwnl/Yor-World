from __future__ import annotations
import hashlib,json,pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
EXCLUDED={'output-hashes.json','evidence/package-verification.json','evidence/git-raw-blob-check.json'}
def sha(b):return hashlib.sha256(b).hexdigest()
files=[]
for p in sorted((x for x in OUT.rglob('*') if x.is_file()),key=lambda x:x.relative_to(OUT).as_posix()):
 rel=p.relative_to(OUT).as_posix()
 if rel in EXCLUDED:continue
 raw=p.read_bytes();files.append({'path':rel,'bytes':len(raw),'sha256':sha(raw)})
manifest={'schemaVersion':1,'candidate':'FINISH-B1-R7','baseCommit':'e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf','baseTree':'60da77df9e600670a416635101558203872bde7b','selfExcluded':sorted(EXCLUDED),'files':files}
(OUT/'output-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','files':len(files),'bytes':sum(x['bytes'] for x in files),'manifestSHA256':sha((OUT/'output-hashes.json').read_bytes()),'selfExcluded':sorted(EXCLUDED)},indent=2))
