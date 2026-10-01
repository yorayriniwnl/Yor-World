"""Read-only artifact identity bridge and preservation of prior signed-by-hash decisions."""
from pathlib import Path
import hashlib,json,subprocess,zipfile,shutil,datetime
root=Path(__file__).resolve().parents[4];out=Path(__file__).resolve().parent
prior=Path(r'C:\Users\yoray\AppData\Local\Temp\yor-proof-gate-b760a4d3')
def sha(data):return hashlib.sha256(data).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=root)
def artifact(rel):
    p=root/rel;b=p.read_bytes();g=git('show','HEAD:'+rel)
    return {'path':rel,'bytes':len(b),'sha256':sha(b),'gitBlobSha256':sha(g),'gitBlobBytes':len(g),'lastChange':git('log','-1','--format=%H','--',rel).decode().strip()}
result={'evidenceClass':'REVIEWER EXECUTED','recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidate':git('rev-parse','HEAD').decode().strip(),'candidates':{},'artifacts':[]}
for name,revision,rel in [('W1','ee57da8ee6d0013f523b6eeb88aec0bd023e6135','deliveries/W1/revisions/W1-F1-r2'),('W2','fe1a40f797ce3ec839939c09a1857b797c197269','deliveries/W2'),('W3','20950576f8b9a149fe521ac4ac44056ff263aba9','deliveries/W3/revisions/W3-A1-r2/source'),('G1','d88f7e1600087bfc51ee3a04dbb1c8c7978a1f80','deliveries/G1/source')]:
    old=git('rev-parse',revision+':'+rel).decode().strip();now=git('rev-parse','HEAD:'+rel).decode().strip()
    result['candidates'][name]={'sourceRevision':revision,'path':rel,'tree':now,'originalTree':old,'unchanged':old==now}
for rel in ['deliveries/G1/g1-integration-proof.zip','deliveries/G1/asset-manifest.json','deliveries/G1/accepted-input-manifest.json','deliveries/G1/source/pnpm-lock.yaml','deliveries/G1/source/package.json','deliveries/W1/revisions/W1-F1-r2/w1-f1-r2-proof.zip','deliveries/W2/w2-avatar-proof-r2.zip','deliveries/W3/revisions/W3-A1-r2/W3-A1-r2-handoff.zip']:
    result['artifacts'].append(artifact(rel))
manifest=json.loads((root/'deliveries/G1/asset-manifest.json').read_text(encoding='utf-8'))
result['declaredPackage']=manifest['packageArchive'];result['runtimeAssets']=[]
for item in manifest['runtimeAssets']:
    actual=artifact('deliveries/G1/source/'+item['path']);actual['declaredSha256']=item['sha256'];actual['matchesDeclared']=actual['sha256']==item['sha256'];result['runtimeAssets'].append(actual)
with zipfile.ZipFile(root/'deliveries/G1/g1-integration-proof.zip') as z:
    result['archive']={'entries':len(z.namelist()),'sourceDifferences':[],'archiveLock':None}
    for name in z.namelist():
        if name.endswith('/') or not name.startswith('source/'):continue
        rel='deliveries/G1/'+name;p=root/rel
        if not p.is_file():result['archive']['sourceDifferences'].append({'path':name,'missingInCheckout':True});continue
        archive=z.read(name);checkout=p.read_bytes();g=git('show','HEAD:'+rel)
        if name=='source/pnpm-lock.yaml':result['archive']['archiveLock']={'sha256':sha(archive),'bytes':len(archive),'equalsDeclared':sha(archive)==manifest['dependencies']['pnpmLockfile']['sha256']}
        if archive!=checkout:result['archive']['sourceDifferences'].append({'path':name,'onlyCRLF':archive.replace(b'\r\n',b'\n')==checkout.replace(b'\r\n',b'\n'),'matchesGit':archive==g})
result['preservedRecords']=[]
for rel in ['docs/planning/acceptances/W2-F1-r2-fe1a40f-2026-10-01.json','docs/planning/reviews/2026-10-01-w1-w2-w3-gate-00d9d93.md','docs/planning/reconciliation-packets/2026-10-01-w1-w2-w3-corrections-02.md']:
    source=prior/rel;target=root/rel;target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():assert target.read_bytes()==source.read_bytes()
    else:target.write_bytes(source.read_bytes())
    result['preservedRecords'].append({'path':rel,'sha256':sha(target.read_bytes()),'fromRevision':'0691981c6dc155fb001763281241d2408a120596'})
for rel in ['docs/planning/reviews/2026-10-01-w1-w2-w3-gate-00d9d93']:
    if not (root/rel).exists():shutil.copytree(prior/rel,root/rel)
record=root/'docs/planning/acceptances/W2-F1-r2-fe1a40f-2026-10-01.json'
(record.parent/(record.name+'.sha256')).write_text(sha(record.read_bytes())+'  '+record.name+'\n',encoding='utf-8')
delta=Path(r'C:\Users\yoray\Projects\Yor World\docs\planning\reviews\2026-10-01-correction-delta-audit\report.md')
if delta.exists():
    received=out/'received-correction-delta-review.md';received.write_bytes(delta.read_bytes())
    result['receivedIndependentReview']={'origin':str(delta),'archive':received.name,'sha256':sha(received.read_bytes()),'classification':'Independent supplied review; its execution claims are not rerun in this closure turn.'}
result['remoteMainAtEnd']=git('ls-remote','origin','refs/heads/main').decode().strip()
(out/'identity.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'candidates':result['candidates'],'archive':{k:v for k,v in result['archive'].items() if k!='sourceDifferences'},'differences':len(result['archive']['sourceDifferences']),'semanticDifferences':[x for x in result['archive']['sourceDifferences'] if not x.get('onlyCRLF',False)],'remote':result['remoteMainAtEnd']},indent=2))
