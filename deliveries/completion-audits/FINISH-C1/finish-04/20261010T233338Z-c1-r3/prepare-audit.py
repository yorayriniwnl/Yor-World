import hashlib,json,pathlib,subprocess,tarfile,datetime,os
ROOT=pathlib.Path(__file__).resolve().parent
WORK=ROOT.parents[4]
MAKER=WORK/'deliveries/FINISH-C1-R3'
ASSEMBLY=ROOT/'assembly'
BASE='f62a43c5e71c00dcb89e28275ea81d842167db80'
APP_TREE='42ea29ec235225046a75959eb19eb386ac2f821d'
COMMANDS=[]
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def run(args,cwd=WORK):
    start=datetime.datetime.now(datetime.timezone.utc).isoformat()
    env=os.environ.copy();env['GIT_CEILING_DIRECTORIES']=str(ASSEMBLY)
    result=subprocess.run(args,cwd=cwd,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace')
    COMMANDS.append(dict(args=args,cwd=str(cwd),startUtc=start,exitCode=result.returncode,stdout=result.stdout,stderr=result.stderr))
    if result.returncode: raise RuntimeError(str(args)+' failed '+result.stderr)
    return result.stdout.strip()
def write(name,value): (ROOT/name).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
manifest=json.loads((MAKER/'output-hashes.json').read_text(encoding='utf-8'))
binding={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'makerManifestSha256':sha(MAKER/'output-hashes.json'),'makerManifest':manifest,'files':[]}
for relative,declared in manifest['outputs'].items():
    path=MAKER/'source'/relative[4:] if relative.startswith('app/') else MAKER/relative
    observed={'path':relative,'bytes':path.stat().st_size,'sha256':sha(path)}
    observed['matches']=observed['bytes']==declared['bytes'] and observed['sha256']==declared['sha256']
    binding['files'].append(observed)
assert all(f['matches'] for f in binding['files'])
binding['outputEntries']=len(binding['files'])
binding['patchSha256']=sha(MAKER/'source.patch')
assert binding['patchSha256']==manifest['patch']['sha256']
(MAKER/'source.patch').read_text(encoding='utf-8',errors='strict')
write('candidate-binding-before.json',binding)
inputs=json.loads((MAKER/'input-hashes.json').read_text(encoding='utf-8'))
input_checks=[]
for item in inputs['inputs']:
    path=WORK/item['path']
    input_checks.append({'path':item['path'],'bytes':path.stat().st_size,'sha256':sha(path),'matches':path.stat().st_size==item['bytes'] and sha(path)==item['sha256']})
assert all(item['matches'] for item in input_checks)
contracts=json.loads((WORK/'docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json').read_text(encoding='utf-8'))
contract_checks=[]
for item in contracts['outputs']:
    path=WORK/item['path']
    contract_checks.append({'path':item['path'],'matches':path.stat().st_size==item['bytes'] and sha(path)==item['sha256']})
assert all(item['matches'] for item in contract_checks)
write('input-identity-checks.json',{'makerInputs':input_checks,'contracts':contract_checks,'canonicalGovernanceHead':run(['git','rev-parse','HEAD']),'baseCommit':BASE,'baseAppTree':run(['git','rev-parse',BASE+':app'])})
assert not ASSEMBLY.exists()
ASSEMBLY.mkdir()
archive=ROOT/'base-app.tar'
run(['git','archive','--format=tar','--output='+str(archive),BASE,'app'])
with tarfile.open(archive) as tar:
    tar.extractall(ASSEMBLY,filter='data')
run(['git','init',str(ASSEMBLY)])
run(['git','config','core.autocrlf','false'],ASSEMBLY)
run(['git','add','app'],ASSEMBLY)
tree=run(['git','write-tree'],ASSEMBLY)
assert run(['git','rev-parse',tree+':app'],ASSEMBLY)==APP_TREE
run(['git','-c','user.name=Independent Runtime Audit','-c','user.email=audit@local.invalid','commit','-m','Bind exact accepted app archive'],ASSEMBLY)
binding['isolatedSyntheticBaseCommit']=run(['git','rev-parse','HEAD'],ASSEMBLY)
binding['isolatedBaseAppTree']=run(['git','rev-parse','HEAD:app'],ASSEMBLY)
binding['isolatedGitRoot']=run(['git','rev-parse','--show-toplevel'],ASSEMBLY)
run(['git','apply','--check','--whitespace=nowarn',str(MAKER/'source.patch')],ASSEMBLY)
run(['git','apply','--whitespace=nowarn',str(MAKER/'source.patch')],ASSEMBLY)
comparisons=[]
for item in binding['files']:
    if item['path'].startswith('app/'):
        path=ASSEMBLY/item['path']
        comparisons.append({'path':item['path'],'sha256':sha(path),'matches':sha(path)==item['sha256']})
assert all(item['matches'] for item in comparisons)
run(['git','add','-N','app'],ASSEMBLY)
binding['changedPaths']=run(['git','diff','--name-only','--','app'],ASSEMBLY).splitlines()
assert len(binding['changedPaths'])==manifest['patch']['changedPathCount']
binding['appliedComparisons']=comparisons
binding['exactBaseApply']='PASS'
write('patch-verification.json',binding)
node_modules=ASSEMBLY/'app/node_modules'
target=WORK/'app/node_modules'
run(['powershell','-NoProfile','-Command','New-Item -ItemType Junction -Path \''+str(node_modules).replace("'","''")+'\' -Target \''+str(target).replace("'","''")+'\' | Out-Null'])
run(['powershell','-NoProfile','-Command','New-Item -ItemType Junction -Path \''+str(ROOT/'node_modules').replace("'","''")+'\' -Target \''+str(target).replace("'","''")+'\' | Out-Null'])
write('preparation-receipts.json',COMMANDS)
print(json.dumps({'result':'PASS','outputs':binding['outputEntries'],'sourcePaths':len(comparisons),'changedPaths':len(binding['changedPaths']),'patch':binding['patchSha256'],'appTree':binding['isolatedBaseAppTree'],'assembly':str(ASSEMBLY)}))

