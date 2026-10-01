from pathlib import Path
import subprocess, json, hashlib, zipfile, io

root=Path(__file__).resolve().parents[4]
out=Path(__file__).resolve().parent
def git(*args): return subprocess.check_output(['git',*args],cwd=root)
def digest(b): return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def blob(path,rev='HEAD'): return git('show',rev+':'+path)
def tree(path): return git('ls-tree','-r','--name-only','HEAD',path).decode().splitlines()
def same_text(a,b): return a.replace(b'\r\n',b'\n')==b.replace(b'\r\n',b'\n')
record={'head':git('rev-parse','HEAD').decode().strip(),'g1SourceTree':git('rev-parse','HEAD:deliveries/G1/source').decode().strip()}
record['canonical']={}
for path in ['deliveries/W1/revisions/W1-F1-r2/room-blockout.glb','deliveries/W2/avatar-proof.glb','deliveries/W2/fixture-proof.glb','deliveries/W3/revisions/W3-A1-r2/source/package.json','deliveries/W3/revisions/W3-A1-r2/source/pnpm-lock.yaml','deliveries/W3/revisions/W3-A1-r2/W3-A1-r2-handoff.zip','deliveries/G1/source/package.json','deliveries/G1/source/pnpm-lock.yaml']:
 record['canonical'][path]={'gitBlob':digest(blob(path)),'checkoutBytes':digest((root/path).read_bytes())}
record['assetCopies']=[]
for p in tree('deliveries/G1/source/public'):
 if p.endswith('.glb'): record['assetCopies'].append({'path':p,**digest(blob(p))})
record['archives']={}
for rev in ['62ee8a064e744e0ff7a52f85fd550aef3f66def9','HEAD']:
 b=blob('deliveries/G1/g1-integration-proof.zip',rev);z=zipfile.ZipFile(io.BytesIO(b))
 row={**digest(b),'members':len(z.namelist()),'sourceMembers':[],'sourceMissing':[],'sourceDifferent':[],'sourceLineEndingsOnly':[]}
 for p in tree('deliveries/G1/source'):
  suffix=p.removeprefix('deliveries/G1/')
  matches=[n for n in z.namelist() if n==suffix or n.endswith('/'+suffix)]
  if not matches: row['sourceMissing'].append(p);continue
  member=z.read(matches[0]);g=blob(p);row['sourceMembers'].append({'path':p,**digest(member)})
  if member!=g:
   (row['sourceLineEndingsOnly'] if same_text(member,g) else row['sourceDifferent']).append(p)
 record['archives'][rev]=row
w3base='deliveries/W3/revisions/W3-A1-r2/source/'
row={'unchanged':[],'changed':[],'missing':[],'added':[]}
for p in tree(w3base):
 relative=p.removeprefix(w3base);target='deliveries/G1/source/'+relative
 if not (root/target).exists(): row['missing'].append(relative)
 elif same_text(blob(p),blob(target)): row['unchanged'].append(relative)
 else: row['changed'].append(relative)
known={p.removeprefix(w3base) for p in tree(w3base)}
row['added']=[p.removeprefix('deliveries/G1/source/') for p in tree('deliveries/G1/source') if p.removeprefix('deliveries/G1/source/') not in known]
record['w3IntegrationDelta']=row
(out/'authoritative-binding.json').write_text(json.dumps(record,indent=2)+'\n')
delta=subprocess.run(['git','diff','--no-index',str(root/w3base),str(root/'deliveries/G1/source')],cwd=root,capture_output=True)
if delta.returncode not in (0,1): raise RuntimeError(delta.stderr.decode())
(out/'w3-integration.diff').write_bytes(delta.stdout)
print(json.dumps({'archives':{k:{x:y for x,y in v.items() if x not in ['sourceMembers','sourceLineEndingsOnly']} for k,v in record['archives'].items()},'w3IntegrationDelta':row},indent=2))
