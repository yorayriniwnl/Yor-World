"""Independent P22 read-only contract delta checks. Writes only this audit root."""
from pathlib import Path
import json,hashlib,re,difflib,subprocess,datetime,sys
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[4]
OLD=OUT.parent/'r1/before-contracts'
PACK=OUT/'reviewed-contracts'
CANON=ROOT/'docs/planning/reconciliation-packets/finish-contracts-r2'
def rec(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def write(n,v): (OUT/n).write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
expected=sys.argv[1]
if rec(PACK/'output-hashes.json')['sha256']!=expected: raise ValueError('Copied review manifest differs from assigned candidate')
if rec(CANON/'output-hashes.json')['sha256']!=expected: raise ValueError('Live candidate changed before verification')
checks=[]
prefix='docs/planning/reconciliation-packets/finish-contracts-r2/'
for manifest,key in [('input-hashes.json','inputs'),('output-hashes.json','outputs')]:
 for item in json.loads((PACK/manifest).read_text(encoding='utf-8'))[key]:
  rel=item.get('snapshotPath',item['path'])
  p=PACK/rel[len(prefix):] if rel.startswith(prefix) else ROOT/rel
  actual=rec(p) if p.is_file() else None
  checks.append({'manifest':manifest,'declared':item,'actual':actual,'pass':bool(actual and all(actual[k]==item[k] for k in ['bytes','sha256']))})
write('manifest-verification.json',checks)
files=sorted({p.relative_to(OLD).as_posix() for p in OLD.rglob('*') if p.is_file()}|{p.relative_to(PACK).as_posix() for p in PACK.rglob('*') if p.is_file()})
delta=[];textdiff=[]
for rel in files:
 before=OLD/rel;after=PACK/rel
 b=before.read_bytes() if before.is_file() else None;a=after.read_bytes() if after.is_file() else None
 if b!=a:
  delta.append({'relativePath':rel,'before':rec(before) if b is not None else None,'after':rec(after) if a is not None else None})
  if rel.endswith(('.md','.py','.gitattributes')) and b is not None and a is not None:
   textdiff.extend(difflib.unified_diff(b.decode('utf-8').splitlines(True),a.decode('utf-8').splitlines(True),fromfile='r1/'+rel,tofile='r2/'+rel))
write('contract-delta.json',delta);(OUT/'contract-delta.diff').write_text(''.join(textdiff),encoding='utf-8')
states=[];errors=[]
for n in ['02-platform-schema-recovery.md','04-path-ownership.md']:
 section=''
 for lineno,line in enumerate((PACK/n).read_text(encoding='utf-8').splitlines(),1):
  if line.startswith('#'):section=line
  cols=[x.strip().strip('`') for x in line.split('|')[1:-1]]
  if len(cols)>2 and cols[0].startswith(('src/','tests/','supabase/')):
   rel,status=cols[:2];exists=(ROOT/'app'/rel).is_file()
   valid=not ((status in ['E','existing','existing/A1 amended'] and not exists) or (status in ['N','new','A1 new'] and exists))
   states.append({'document':n,'line':lineno,'section':section,'path':rel,'state':status,'exists':exists,'pass':valid})
   if not valid: errors.append('Existing/new mismatch '+rel)
write('path-state-results.json',states)
runtime=(PACK/'01-runtime-lifecycle.md').read_text(encoding='utf-8')
start=runtime.index('`CatalogObjectIdSchema` is a literal enum of the existing 25 catalog IDs: ')
listed=runtime[start:].split(': ',1)[1].split('. `CatalogObjectId`',1)[0].split(', ')
catalog=(ROOT/'docs/planning/interaction-catalog.md').read_text(encoding='utf-8')
catalog=catalog.split('## 3. V1 interaction matrix',1)[1].split('## 4.',1)[0]
actualids=re.findall(r'^\| ([a-z][a-z-]+) \|',catalog,re.M)
catalogcheck={'listed':listed,'actual':actualids,'uniqueCount':len(set(listed)),'matches':set(listed)==set(actualids),'missing':sorted(set(actualids)-set(listed)),'extra':sorted(set(listed)-set(actualids))}
if len(set(listed))!=25 or not catalogcheck['matches']:errors.append('Catalog enum differs')
write('catalog-id-results.json',catalogcheck)
for item in checks:
 if not item['pass']:errors.append('Hash/size mismatch '+item['declared']['path'])
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
tree=git('rev-parse','HEAD:app');appdiff=git('diff','f62a43c5e71c00dcb89e28275ea81d842167db80','--','app')
if tree!='42ea29ec235225046a75959eb19eb386ac2f821d' or appdiff:errors.append('Source base changed')
declared={x['declared']['path'][len(prefix):] for x in checks if x['manifest']=='output-hashes.json'}
actual={p.relative_to(PACK).as_posix() for p in PACK.rglob('*') if p.is_file() and p.name!='output-hashes.json' and '__pycache__' not in p.parts}
if actual!=declared:errors.append('Output inventory differs')
summary={'timestampUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'assignedOutputManifestSha256':expected,'inputManifest':rec(PACK/'input-hashes.json'),'outputManifest':rec(PACK/'output-hashes.json'),'oldInputManifest':rec(OLD/'input-hashes.json'),'oldOutputManifest':rec(OLD/'output-hashes.json'),'hashChecks':len(checks),'hashPasses':sum(x['pass'] for x in checks),'allowlistRows':len(states),'catalogIds':len(set(listed)),'observedHead':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'sourceAppTree':tree,'appDiff':appdiff,'changedContractFiles':len(delta),'errors':errors,'scope':'Contract identity/path/catalog/source delta; no implementation, browser or provider test'}
write('delta-results.json',summary);print(json.dumps(summary,indent=2));raise SystemExit(bool(errors))
