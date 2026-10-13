import hashlib,json,pathlib,subprocess
AUDIT=pathlib.Path(__file__).resolve().parent
ROOT=AUDIT.parents[4]
COMMIT='6de3e05a289e86e759d4602e9ee49f1a19f3b8da'
PACKAGE='deliveries/G7/local-corrections/release-tools/attempt-16-r7-writer-corrections-20261012'
def blob(name):
 p=subprocess.run(['git','show',COMMIT+':'+name],cwd=ROOT,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode('utf8','replace'))
 return p.stdout
def identity(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def dump(name,obj):(AUDIT/name).write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8')
manifest=json.loads(blob(PACKAGE+'/output-hashes.json').decode('utf-8-sig'))
sources=json.loads(blob(PACKAGE+'/source-hashes.json').decode('utf-8-sig'))
outputs=[];bindings=[]
for row in manifest['files']:
 rel=PACKAGE+'/'+row['path'];b=blob(rel);c=(ROOT/rel).read_bytes() if (ROOT/rel).is_file() else None
 outputs.append({'path':rel,'expected':{k:row[k] for k in ['bytes','sha256']},'commit':identity(b),'commitMatches':all(identity(b)[k]==row[k] for k in ['bytes','sha256']),'currentPackage':identity(c) if c is not None else None,'currentPackageMatchesCommit':c==b})
 dest=AUDIT/'committed-inputs/package'/row['path'];dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
for row in sources['files']:
 production=blob(row['path']);snapshot=blob(PACKAGE+'/'+row['snapshotPath']);expected={k:row[k] for k in ['bytes','sha256']}
 bindings.append({'path':row['path'],'expected':expected,'commitSource':identity(production),'commitSnapshot':identity(snapshot),'rawSourceMatchesBinding':all(identity(production)[k]==row[k] for k in ['bytes','sha256']),'rawSnapshotMatchesBinding':all(identity(snapshot)[k]==row[k] for k in ['bytes','sha256']),'sourceEqualsSnapshot':production==snapshot,'eolOnlyDifference':production.replace(b'\r\n',b'\n')==snapshot.replace(b'\r\n',b'\n')})
 dest=AUDIT/'committed-inputs/source'/row['path'];dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(production)
for name in ['output-hashes.json','source-hashes.json']:
 (AUDIT/'committed-inputs/package'/name).write_bytes(blob(PACKAGE+'/'+name))
identity_row={'commit':COMMIT,'parent':subprocess.run(['git','rev-parse',COMMIT+'^'],cwd=ROOT,capture_output=True,text=True).stdout.strip(),'observedBranchTip':subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,capture_output=True,text=True).stdout.strip(),'packageOutputManifest':identity(blob(PACKAGE+'/output-hashes.json')),'packageSourceManifest':identity(blob(PACKAGE+'/source-hashes.json'))}
result={'identity':identity_row,'declaredOutputCount':manifest['fileCount'],'verifiedOutputs':len(outputs),'outputMatches':all(x['commitMatches'] for x in outputs),'currentPackageMatchesCommittedPackage':all(x['currentPackageMatchesCommit'] for x in outputs),'verifiedSourceBindings':len(bindings),'allSourceBindingsRawMatch':all(x['rawSourceMatchesBinding'] and x['rawSnapshotMatchesBinding'] and x['sourceEqualsSnapshot'] for x in bindings),'outputs':outputs,'sourceBindings':bindings}
dump('binding-verification.json',result)
print(json.dumps({k:result[k] for k in ['identity','verifiedOutputs','outputMatches','currentPackageMatchesCommittedPackage','verifiedSourceBindings','allSourceBindingsRawMatch']},indent=2))
