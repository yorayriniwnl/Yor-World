"""Reviewer-designed uncached CLI and independent parsed-schema probes."""
import concurrent.futures,copy,datetime,hashlib,importlib.util,json,os,pathlib,subprocess,sys
from audit import OUT,ROOT,CANDIDATE,R7,PREFIX,THREE,blob,git,sha,write,junction,tree_inventory
NAMES=['source-binding.json','candidate-input-provenance.json','predecessor-output-git-blobs.json']
docs={n:json.loads(blob(CANDIDATE,PREFIX+n)) for n in NAMES};script=blob(CANDIDATE,PREFIX+'verify-input-provenance.py')
scratch=OUT/'.work/independent-probes';scratch.mkdir(exist_ok=False)
gitdir=git('rev-parse','--absolute-git-dir').decode().strip()
def package(repo):
    physical=repo/'app/node_modules/.pnpm/three@0.180.0/node_modules/three'
    for rel in ['package.json','build/three.module.js','build/three.core.js']:
        f=physical/rel;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes((THREE/rel).read_bytes())
    junction(repo/'app/node_modules/three',physical);return physical
def prepare_case(index):
    repo=scratch/f'case-{index:03d}';p=repo/'deliveries/FINISH-C1-R8';p.mkdir(parents=True)
    (p/'verify-input-provenance.py').write_bytes(script)
    for n in NAMES:(p/n).write_bytes(blob(CANDIDATE,PREFIX+n))
    package(repo);return repo,p
def dump(p,n,data):(p/n).write_text(json.dumps(data,separators=(',',':'))+'\n',encoding='utf-8')
def raw_duplicate(p,n,container,key,wrong,first=True):
    value=copy.deepcopy(docs[n]);target=container(value);old=json.dumps(target,separators=(',',':'));new=('{'+json.dumps(key)+':'+json.dumps(wrong)+','+old[1:]) if first else (old[:-1]+','+json.dumps(key)+':'+json.dumps(wrong)+'}')
    raw=json.dumps(value,separators=(',',':'));assert raw.count(old)==1;raw=raw.replace(old,new);(p/n).write_text(raw+'\n',encoding='utf-8')
cases=[]
def add(name,fn,expected_exit=1,duplicate=False):cases.append((name,fn,expected_exit,duplicate))
add('exact independent positive control',lambda p:None,0)
for field,wrong in [('commit','0'*40),('path','deliveries/not-pinned/input-hashes.json'),('blobOid','0'*40),('sha256','0'*64),('bytes',-1)]:
    def mutation(p,field=field,wrong=wrong):
        x=copy.deepcopy(docs['candidate-input-provenance.json']);x['sourceManifest'][field]=wrong;dump(p,'candidate-input-provenance.json',x)
    add('former sourceManifest '+field+' false-pass control',mutation)
    add('duplicate contradictory sourceManifest '+field+' wrong then correct',lambda p,field=field,wrong=wrong:raw_duplicate(p,'candidate-input-provenance.json',lambda d:d['sourceManifest'],field,wrong),1,True)
add('duplicate sourceManifest sha256 correct then wrong order control',lambda p:raw_duplicate(p,'candidate-input-provenance.json',lambda d:d['sourceManifest'],'sha256','0'*64,False),1,True)
def package_hash_wrong(p):
    d=copy.deepcopy(docs['source-binding.json']);d['threeDependencyEvidence']['packageFiles'][0]['sha256']='0'*64;dump(p,'source-binding.json',d)
add('former duplicated installed-Three SHA false-pass control',package_hash_wrong)
for row in range(2):
    for field,wrong in [('alias','candidate-app/node_modules/three/build/unbound.js'),('packageFile','build/not-three.js'),('sha256','0'*64),('bytes',-1)]:
        add(f'duplicate packageFiles row {row} {field} wrong then correct',lambda p,row=row,field=field,wrong=wrong:raw_duplicate(p,'source-binding.json',lambda d:d['threeDependencyEvidence']['packageFiles'][row],field,wrong),1,True)
for field,wrong in [('packageName','three-fork'),('packageVersion','0.0.0')]:
    add('duplicate installed identity '+field+' wrong then correct',lambda p,field=field,wrong=wrong:raw_duplicate(p,'source-binding.json',lambda d:d['threeDependencyEvidence'],field,wrong),1,True)
def cli_case(item):
    index,(name,mutator,expected,duplicate)=item;repo,p=prepare_case(index);mutator(p)
    env=dict(os.environ);env.update(GIT_DIR=gitdir,GIT_WORK_TREE=str(repo));argv=[sys.executable,'-B',str(p/'verify-input-provenance.py'),'--json','--check-output-manifest','--commit',R7]
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();r=subprocess.run(argv,cwd=repo,env=env,capture_output=True)
    logbase=OUT/'logs'/f'probe-{index:03d}';logbase.with_suffix('.stdout.log').write_bytes(r.stdout);logbase.with_suffix('.stderr.log').write_bytes(r.stderr)
    payload=json.loads(r.stdout);raws={n:dict(sha256=sha((p/n).read_bytes()),bytes=(p/n).stat().st_size) for n in NAMES}
    changed={n for n in NAMES if (p/n).read_bytes()!=blob(CANDIDATE,PREFIX+n)}
    record=dict(name=name,kind='uncached independent CLI',command=argv,gitEnvironment={k:env[k] for k in ['GIT_DIR','GIT_WORK_TREE']},startedUTC=started,endedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),exit=r.returncode,expectedExit=expected,returnedStatus=payload.get('status'),expectedStatus='PASS' if expected==0 else 'FAIL',status='PASS' if r.returncode==expected else 'FAIL',duplicateJSONMembers=duplicate,changedReceipts=sorted(changed),verifierSHA256=sha((p/'verify-input-provenance.py').read_bytes()),receiptHashes=raws,stdout=f'logs/probe-{index:03d}.stdout.log',stderr=f'logs/probe-{index:03d}.stderr.log',errors=payload.get('errors',[]),cacheUsed=False)
    write('probes/'+f'case-{index:03d}.json',record);print(index,name,r.returncode,flush=True);return record
results=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(cli_case,enumerate(cases,1)))
write('independent-cli-probes.json',dict(candidateCommit=CANDIDATE,verifierSHA256=sha(script),cases=results,failedExpectations=sum(r['status']=='FAIL' for r in results),uncachedProcesses=True,allFixturesInAuditScratch=True,minimalInstalledPackageFixture='Exact package.json plus both pinned build files copied inside each disposable repo; positive control validates this fixture.'))
# Schema probes call the exact unmodified functions with freshly copied JSON.
spec=importlib.util.spec_from_file_location('independent_c1_verifier',ROOT/PREFIX/'verify-input-provenance.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
apiRepo,apiPackage=prepare_case(900);module.REPO_ROOT=apiRepo;module.PACKAGE_DIR=apiPackage
saved={k:os.environ.get(k) for k in ['GIT_DIR','GIT_WORK_TREE']};os.environ.update(GIT_DIR=gitdir,GIT_WORK_TREE=str(apiRepo))
source=module.validate_source_binding(copy.deepcopy(docs['source-binding.json']));api=[]
def call_case(name,action):
    try:action()
    except (module.VerificationError,OSError,KeyError,TypeError,ValueError) as error:rejected=True;message=str(error)
    else:rejected=False;message='Returned PASS'
    api.append(dict(name=name,status='PASS' if rejected else 'FAIL',expectedRejection=True,rejected=rejected,result=message))
for field in ['commit','path','blobOid','sha256','bytes']:
    for bad in [None,True,[],{}]+([str(docs['candidate-input-provenance.json']['sourceManifest']['bytes']),float(docs['candidate-input-provenance.json']['sourceManifest']['bytes'])] if field=='bytes' else [0]):
        d=copy.deepcopy(docs['candidate-input-provenance.json']);d['sourceManifest'][field]=bad;dump(apiPackage,'candidate-input-provenance.json',d)
        call_case('sourceManifest '+field+' wrong type '+type(bad).__name__,lambda:module.validate_candidate_inputs(copy.deepcopy(docs['source-binding.json']),source))
for bad in [None,True,[],0,'invalid']:
    d=copy.deepcopy(docs['candidate-input-provenance.json']);d['sourceManifest']=bad;dump(apiPackage,'candidate-input-provenance.json',d)
    call_case('sourceManifest container '+type(bad).__name__,lambda:module.validate_candidate_inputs(copy.deepcopy(docs['source-binding.json']),source))
dump(apiPackage,'candidate-input-provenance.json',docs['candidate-input-provenance.json'])
info=json.loads((THREE/'package.json').read_text());physical=apiRepo/'app/node_modules/.pnpm/three@0.180.0/node_modules/three'
for row in range(2):
    for field in ['alias','packageFile','sha256','bytes']:
        for bad in [None,True,[],{}]+([float(docs['source-binding.json']['threeDependencyEvidence']['packageFiles'][row]['bytes'])] if field=='bytes' else [0]):
            dep=copy.deepcopy(docs['source-binding.json']['threeDependencyEvidence']);dep['packageFiles'][row][field]=bad
            call_case(f'packageFiles row {row} {field} wrong type {type(bad).__name__}',lambda dep=dep:module.validate_installed_three_declarations(dep,info,physical))
for bad in [None,{},'not-list',True,0]:
    dep=copy.deepcopy(docs['source-binding.json']['threeDependencyEvidence']);dep['packageFiles']=bad
    call_case('packageFiles container '+type(bad).__name__,lambda dep=dep:module.validate_installed_three_declarations(dep,info,physical))
for k,v in saved.items():
    if v is None:os.environ.pop(k,None)
    else:os.environ[k]=v
write('independent-schema-probes.json',dict(candidateCommit=CANDIDATE,verifierSHA256=sha(script),cases=api,rejected=sum(r['rejected'] for r in api),total=len(api),cacheUsed=False))
print('PROBE SUMMARY',len(results),'CLI,',sum(r['status']=='FAIL' for r in results),'false passes;',len(api),'schema',flush=True)
