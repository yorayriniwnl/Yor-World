"""Read-only independent identity/source diagnostics; writes only this audit root."""
from pathlib import Path
import hashlib, json, re, struct, subprocess, datetime

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
PACK = ROOT / 'docs/planning/reconciliation-packets/finish-contracts-r2'
def sha(p):
    b=p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def git(*a): return subprocess.check_output(['git',*a],cwd=ROOT,text=True).strip()
def write(n,v): (OUT/n).write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
checks=[]
for n,k in [('input-hashes.json','inputs'),('output-hashes.json','outputs')]:
    doc=json.loads((PACK/n).read_text(encoding='utf-8'))
    for item in doc[k]:
        p=ROOT/item.get('snapshotPath',item['path'])
        actual=sha(p) if p.is_file() else None
        checks.append({'manifest':n,'declared':item,'actual':actual,'pass':bool(actual and all(actual[x]==item[x] for x in ['bytes','sha256']))})
declared={c['declared']['path'] for c in checks if c['manifest']=='output-hashes.json'}
actual={p.relative_to(ROOT).as_posix() for p in PACK.rglob('*') if p.is_file() and p.name!='output-hashes.json' and '__pycache__' not in p.parts}
ownership=[]
for name in ['02-platform-schema-recovery.md','04-path-ownership.md']:
    section=''
    for i,line in enumerate((PACK/name).read_text(encoding='utf-8').splitlines(),1):
        if line.startswith('#'): section=line
        cols=[x.strip().strip('`') for x in line.split('|')[1:-1]]
        if len(cols)>=3 and cols[0].startswith(('src/','tests/','supabase/')):
            p=ROOT/'app'/cols[0]
            ownership.append({'document':name,'line':i,'section':section,'path':cols[0],'state':cols[1],'exists':p.is_file(),'hash':sha(p) if p.is_file() else None})
sql={}
for p in sorted((ROOT/'app/supabase/migrations').glob('*.sql')):
    text=p.read_text(encoding='utf-8')
    sql[p.name]={'identity':sha(p),'tables':re.findall(r'CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z_]+\.[a-z_]+)',text,re.I),'policies':re.findall(r'CREATE POLICY\s+([a-z_]+)\s+ON\s+([a-z_]+\.[a-z_]+)',text,re.I)}
assets=[]
for p in sorted((ROOT/'deliveries/FINISH-B1/assets').glob('*.glb')):
    b=p.read_bytes(); length,kind=struct.unpack_from('<II',b,12); doc=json.loads(b[20:20+length])
    clips=[]
    for a in doc.get('animations',[]):
        ac=[doc['accessors'][s['input']] for s in a['samplers']]
        clips.append({'name':a['name'],'min':min(x['min'][0] for x in ac),'max':max(x['max'][0] for x in ac),'targets':sorted({doc['nodes'][c['target']['node']].get('name') for c in a['channels']})})
    names={n.get('name'):i for i,n in enumerate(doc['nodes'])}
    relevant={name:doc['nodes'][idx] for name,idx in names.items() if name in ['door-hinge','door-leaf','chair-root','resident','body-turn','Clock_Face','desk_clock_chassis','clock_face','desk_mat','monitor_screen_center']}
    assets.append({'identity':sha(p),'clips':clips,'joints':[doc['nodes'][i].get('name') for s in doc.get('skins',[]) for i in s['joints']],'relevantNodes':relevant})
summary={'timestampUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'appTree':git('rev-parse','HEAD:app'),'baseAppTree':git('rev-parse','f62a43c5e71c00dcb89e28275ea81d842167db80:app'),'appDiff':git('diff','f62a43c5e71c00dcb89e28275ea81d842167db80','--','app'),'inputManifest':sha(PACK/'input-hashes.json'),'outputManifest':sha(PACK/'output-hashes.json'),'hashPasses':sum(x['pass'] for x in checks),'hashChecks':len(checks),'inventoryMissing':sorted(declared-actual),'inventoryExtra':sorted(actual-declared),'ownershipRows':len(ownership),'publicTables':sorted({t for x in sql.values() for t in x['tables'] if t.startswith('public.')})}
write('identity-results.json',summary);write('manifest-verification.json',checks);write('path-state-results.json',ownership);write('sql-inventory-results.json',sql);write('glb-inventory-results.json',assets)
before=[]
for p in sorted((OUT/'before-contracts').rglob('*')):
    if p.is_file(): before.append(sha(p))
write('before-hashes.json',before)
print(json.dumps(summary,indent=2))
