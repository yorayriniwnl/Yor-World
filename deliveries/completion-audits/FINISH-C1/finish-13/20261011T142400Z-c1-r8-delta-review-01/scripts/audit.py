"""Independent exact-candidate metadata, patch, CLI and maker-suite rerun."""
import datetime,hashlib,json,pathlib,shutil,subprocess,sys,os
OUT=pathlib.Path(__file__).resolve().parents[1];ROOT=OUT.parents[4]
CANDIDATE='364d8ff690d3dc814a09406873433d9cb397b574';R7='e2670d4152c461005da86b392dbcea12cec740bf';PREFIX='deliveries/FINISH-C1-R8/'
THREE=pathlib.Path('C:/Users/yoray/Projects/Yor World/app/node_modules/.pnpm/three@0.180.0/node_modules/three').resolve()
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def blob(c,p):return git('show',c+':'+p)
def write(p,j):
    f=OUT/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(json.dumps(j,indent=2)+'\n',encoding='utf-8')
def tree_inventory(p):return [dict(path=q.relative_to(p).as_posix(),bytes=q.stat().st_size,sha256=sha(q.read_bytes())) for q in sorted(p.rglob('*')) if q.is_file()]
commands=[]
def run(argv,name,cwd=ROOT):
    start=datetime.datetime.now(datetime.timezone.utc).isoformat();env=None
    if cwd==OUT/'.work/exact-package-repo':
        env=dict(os.environ);env['GIT_DIR']=git('rev-parse','--absolute-git-dir').decode().strip();env['GIT_WORK_TREE']=str(cwd)
    r=subprocess.run(argv,cwd=cwd,capture_output=True,env=env)
    dest=OUT/'logs';dest.mkdir(exist_ok=True);(dest/(name+'.stdout.log')).write_bytes(r.stdout);(dest/(name+'.stderr.log')).write_bytes(r.stderr)
    row=dict(name=name,command=argv,cwd=str(cwd),gitEnvironment={k:env[k] for k in ['GIT_DIR','GIT_WORK_TREE']} if env else None,startedUTC=start,endedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),exit=r.returncode,stdout='logs/'+name+'.stdout.log',stderr='logs/'+name+'.stderr.log',stdoutSHA256=sha(r.stdout),stderrSHA256=sha(r.stderr))
    commands.append(row);write('commands.json',commands);print(name,r.returncode,flush=True);return r
def junction(link,target):
    link.parent.mkdir(parents=True,exist_ok=True);assert not link.exists();assert link.resolve().is_relative_to(OUT.resolve())
    cmd="New-Item -ItemType Junction -Path '"+str(link)+"' -Target '"+str(target)+"' | Out-Null"
    r=subprocess.run(['powershell.exe','-NoProfile','-Command',cmd],capture_output=True);assert r.returncode==0,r.stderr
def layout(repo):
    physical=repo/'app/node_modules/.pnpm/three@0.180.0/node_modules/three'
    if physical.exists():assert tree_inventory(physical)==tree_inventory(THREE);return physical
    physical.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(THREE,physical);junction(repo/'app/node_modules/three',physical);return physical
def main():
    assert git('rev-parse','HEAD').decode().strip()==CANDIDATE
    parent=git('rev-parse',CANDIDATE+'^').decode().strip();tree=git('rev-parse',CANDIDATE+'^{tree}').decode().strip();subtree=git('rev-parse',CANDIDATE+':deliveries/FINISH-C1-R8').decode().strip();app=git('rev-parse',CANDIDATE+':app').decode().strip()
    assert (parent,tree,subtree,app)==('b33631a9bcbd74cfca9e8f2495140a5eee322a9a','a29a29f7027f5d72e496c58f327d2e03058d2ad1','b3b98efa08045f520a00abf4569145ffa3ba3ee7','42ea29ec235225046a75959eb19eb386ac2f821d')
    changed=git('diff-tree','--no-commit-id','--name-only','-r',CANDIDATE).decode().splitlines();assert len(changed)==26 and all(p.startswith(PREFIX) for p in changed)
    rows=[dict(path=p,blobOid=git('rev-parse',CANDIDATE+':'+p).decode().strip(),bytes=len(blob(CANDIDATE,p)),sha256=sha(blob(CANDIDATE,p))) for p in changed]
    assert all((ROOT/r['path']).read_bytes()==blob(CANDIDATE,r['path']) for r in rows)
    manifestRaw=blob(CANDIDATE,PREFIX+'output-hashes.json');manifest=json.loads(manifestRaw);outputs=manifest['outputs'];assert len(outputs)==25
    for r in outputs:
        raw=blob(CANDIDATE,PREFIX+r['path']);assert len(raw)==r['bytes'] and sha(raw)==r['sha256']
    assert sum(r['bytes'] for r in outputs)==237622 and sha(manifestRaw)=='0f1a4fd53ca549f35b724fb548272d7b2bd068d0f8f7d41467d5a1d6dd8e1e97'
    verifier=blob(CANDIDATE,PREFIX+'verify-input-provenance.py');assert sha(verifier)=='4ba2f9eb3538bd61a6e82d4ef0958bfa96aad6ce3e50921f8323e3a1e7d114e2'
    for name in ['source-binding.json','candidate-input-provenance.json','predecessor-output-git-blobs.json']:assert blob(CANDIDATE,PREFIX+name)==blob(R7,'deliveries/FINISH-C1-R7/'+name)
    binding=dict(status='PASS',commit=CANDIDATE,parent=parent,fullTree=tree,subtree=subtree,appTree=app,changedPaths=changed,rawBlobs=rows,stableOutputCount=25,stableOutputBytes=237622,outputManifestSHA256=sha(manifestRaw),verifierSHA256=sha(verifier),receiptInputsExactR7=True,otherCandidateLineageRead=False)
    write('candidate-binding.json',binding)
    beforeDeps=tree_inventory(THREE);write('installed-three-before.json',dict(root=str(THREE),files=beforeDeps))
    beforeCandidate=tree_inventory(ROOT/'deliveries/FINISH-C1-R8');write('preservation-before.json',dict(candidateFiles=beforeCandidate,appTree=app))
    package=OUT/'.work/exact-package-repo/deliveries/FINISH-C1-R8';package.mkdir(parents=True,exist_ok=True)
    for r in rows:
        rel=r['path'][len(PREFIX):];f=package/rel;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(blob(CANDIDATE,r['path']))
    layout(package.parents[1]);write('disposable-layout.json',dict(packageRoot=str(package),verifierByteExact=True,installedPackageCopyByteExact=tree_inventory(package.parents[1]/'app/node_modules/.pnpm/three@0.180.0/node_modules/three')==beforeDeps,scratchOnly=True))
    positive=run([sys.executable,'-B',str(package/'verify-input-provenance.py'),'--json','--check-output-manifest','--commit',R7],'independent-positive',package.parents[1]);assert positive.returncode==0 and json.loads(positive.stdout)['status']=='PASS'
    write('independent-positive.json',json.loads(positive.stdout))
    patchRepo=OUT/'.work/patch-replay';src=patchRepo/'deliveries/FINISH-C1-R8/verify-input-provenance.py';src.parent.mkdir(parents=True,exist_ok=True);src.write_bytes(blob(R7,'deliveries/FINISH-C1-R7/verify-input-provenance.py'));patch=OUT/'.work/verifier-diff.patch';patch.write_bytes(blob(CANDIDATE,PREFIX+'evidence/verifier-diff.patch'))
    gitInit=run(['git','init','--quiet',str(patchRepo)],'patch-git-init');assert gitInit.returncode==0
    check=run(['git','-c','core.autocrlf=false','apply','-p0','--check',str(patch)],'patch-check',patchRepo);assert check.returncode==0
    applied=run(['git','-c','core.autocrlf=false','apply','-p0',str(patch)],'patch-apply',patchRepo);assert applied.returncode==0 and src.read_bytes()==verifier
    write('patch-replay.json',dict(status='PASS',baseCommit=R7,baseSHA256=sha(blob(R7,'deliveries/FINISH-C1-R7/verify-input-provenance.py')),patchSHA256=sha(patch.read_bytes()),outputSHA256=sha(src.read_bytes()),exactR8Verifier=True))
    suite=run([sys.executable,'-B',str(package/'run_regressions.py')],'maker-suite-independent-execution',package.parents[1]);assert suite.returncode==0
    suiteResult=json.loads((package/'evidence/negative-regression-results.json').read_text());assert suiteResult['negativeCaseCount']==51 and suiteResult['negativePassed']==51 and suiteResult['failedCount']==0;write('maker-suite-independent-results.json',suiteResult)
    for name in ['regression-command.json','regression-run.stdout.log','regression-run.stderr.log','cli-negative-zero-source-manifest-sha256.stdout.log','cli-negative-zero-source-manifest-sha256.stderr.log']:
        f=OUT/'rerun-maker-logs'/name;f.parent.mkdir(exist_ok=True);f.write_bytes((package/'evidence'/name).read_bytes())
    afterDeps=tree_inventory(THREE);afterCandidate=tree_inventory(ROOT/'deliveries/FINISH-C1-R8');assert afterDeps==beforeDeps and afterCandidate==beforeCandidate
    write('preservation-after.json',dict(status='PASS',installedThreeTreeUnchanged=True,installedThreeFiles=len(afterDeps),candidateFilesExact=True,appGitTreeUnchanged=git('rev-parse','HEAD:app').decode().strip()==app,allMutationsInsideAuditScratch=True,canonicalAppAndBothC1LineagesNotWritten=True))
    versions={}
    for name,argv in [('python',[sys.executable,'--version']),('git',['git','--version']),('powershell',['powershell.exe','-NoProfile','-Command','$PSVersionTable.PSVersion.ToString()'])]:
        r=run(argv,'version-'+name);versions[name]=dict(command=argv,exit=r.returncode,output=(r.stdout+r.stderr).decode().strip())
    write('tool-versions.json',versions);print('CORE AUDIT PASS',flush=True)
if __name__=='__main__':main()
