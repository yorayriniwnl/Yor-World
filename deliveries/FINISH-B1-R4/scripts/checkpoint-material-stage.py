"""Seal the complete material-only stage before authorized successor geometry work."""
import hashlib, json, pathlib, shutil
OUT=pathlib.Path(__file__).resolve().parents[1]
DEST=OUT/'checkpoints/material-only'
assert not DEST.exists(),'Preserve occupied checkpoint; do not overwrite'
files=[p for p in OUT.rglob('*') if p.is_file() and not any(v in p.relative_to(OUT).parts for v in ['.work','checkpoints','__pycache__']) and p.suffix!='.blend1']
rows=[]
for p in sorted(files):
    rel=p.relative_to(OUT);b=p.read_bytes();q=DEST/rel;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
    assert q.read_bytes()==b
    rows.append(dict(path=rel.as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
receipt=dict(stage='FINISH-25 original material-only correction',status='Render budgets PASS; PC glass visual FAIL; no geometry/lighting changed',files=rows,excludes=['checkpoint-hashes.json (self)','source scratch .work/','Python __pycache__/','Blender backups *.blend1'],root='checkpoints/material-only/')
(DEST/'checkpoint-hashes.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(files=len(rows),bytes=sum(x['bytes'] for x in rows),manifestSHA256=hashlib.sha256((DEST/'checkpoint-hashes.json').read_bytes()).hexdigest())))
