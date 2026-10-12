from __future__ import annotations
import hashlib,json,pathlib,subprocess
OUT=pathlib.Path(__file__).resolve().parents[1]
REPO=OUT.parents[1]
BASE='e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf'
TREE='60da77df9e600670a416635101558203872bde7b'
R6_MANIFEST_SHA='80d6cb214cf9f1f74334268193365b9f9115c86b884c6762072d777d65c30525'
PREFIX='deliveries/FINISH-B1-R6/'
TARGET=OUT/'inputs/r6/FINISH-B1-R6'
def run(*args): return subprocess.check_output(['git',*args],cwd=REPO)
def sha(b): return hashlib.sha256(b).hexdigest()
head=run('rev-parse','HEAD').decode().strip(); tree=run('rev-parse',f'{BASE}^{{tree}}').decode().strip()
if head!=BASE or tree!=TREE: raise SystemExit(f'exact base mismatch: HEAD={head}, tree={tree}')
manifest_raw=run('show',f'{BASE}:{PREFIX}output-hashes.json')
if sha(manifest_raw)!=R6_MANIFEST_SHA: raise SystemExit('raw R6 output manifest SHA mismatch')
manifest=json.loads(manifest_raw); rows={x['path']:x for x in manifest['files']}
ls=run('ls-tree','-rz',BASE,'--',PREFIX).split(b'\0'); source={}
for rec in ls:
 if not rec: continue
 meta,path=rec.split(b'\t',1); mode,typ,oid=meta.decode().split(); rel=path.decode()[len(PREFIX):]
 if typ!='blob': continue
 raw=run('cat-file','blob',oid); p=TARGET/pathlib.PurePosixPath(rel)
 if p.exists() and p.read_bytes()!=raw:
  p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
 elif not p.exists():
  p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
 source[rel]={'bytes':len(raw),'sha256':sha(raw),'gitBlob':oid}
 if rel in rows and (rows[rel]['bytes']!=len(raw) or rows[rel]['sha256']!=sha(raw)):
  raise SystemExit(f'raw Git file disagrees with committed R6 manifest: {rel}')
for rel,row in rows.items():
 if rel not in source: raise SystemExit(f'manifest file missing from raw Git tree: {rel}')
if len(rows)!=193 or sum(x['bytes'] for x in rows.values())!=33201243: raise SystemExit('R6 manifested inventory differs from pinned expected 193 files / 33,201,243 bytes')
receipt={'status':'PASS','baseCommit':BASE,'baseTree':TREE,'deliveryPath':'deliveries/FINISH-B1-R6','rawGitTreeBlobs':len(source),'manifestListedFiles':len(rows),'manifestListedBytes':sum(x['bytes'] for x in rows.values()),'rawGitOutputManifestSHA256':sha(manifest_raw),'rawOutputManifestBoundToExpectedSHA256':True,'allManifestFilesMatchRawGitBlobs':True,'unmanifestedTrackedFiles':sorted(set(source)-set(rows)),'files':[{'path':p,**v} for p,v in sorted(source.items())]}
(OUT/'evidence/input-hashes.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
(TARGET/'output-hashes.json').write_bytes(manifest_raw)
print(json.dumps({k:v for k,v in receipt.items() if k!='files'},indent=2))
