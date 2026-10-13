from pathlib import Path
import subprocess, json, hashlib, io, tarfile, re, os, sys
ROOT=Path(__file__).resolve().parent
REPO=Path.cwd()
DELIVERY=REPO/'deliveries/FINISH-A1/r5-05'
C='8f3aa566f36c92bb98658090ef91f9bfa96e8a79'
B='f62a43c5e71c00dcb89e28275ea81d842167db80'
COMMANDS=[]
def dump(name,value): (ROOT/name).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
def run(args,cwd=REPO, env=None, required=True):
    p=subprocess.run(args,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    COMMANDS.append({'argv':args,'cwd':str(cwd),'exitCode':p.returncode,'stdout':p.stdout.decode('utf-8','replace'),'stderr':p.stderr.decode('utf-8','replace')})
    dump('commands.json',COMMANDS)
    if required and p.returncode: raise RuntimeError(COMMANDS[-1])
    return p.stdout
def sha(b): return hashlib.sha256(b).hexdigest()
def git(*args): return run(['git',*args])
def blob(path,commit=C): return git('show',f'{commit}:{path}')
def rows(value): return value.get('files',value.get('outputs',value.get('inputs',[])))
def verify(row,data): return {'path':row['path'],'bytes':len(data),'sha256':sha(data),'status':'PASS' if len(data)==row.get('bytes',len(data)) and sha(data)==row['sha256'] else 'FAIL','claimedSha256':row['sha256'],'claimedBytes':row.get('bytes')}
binding={'commit':C,'tree':git('rev-parse',f'{C}^{{tree}}').decode().strip(),'parent':git('rev-parse',f'{C}^').decode().strip(),'canonicalAppTree':git('rev-parse',f'{C}:app').decode().strip(),'baseCommit':B,'baseAppTree':git('rev-parse',f'{B}:app').decode().strip()}
binding['remote']=git('ls-remote','origin','refs/heads/audit/completion-2026-10-09').decode().strip()
binding['remoteContainsCandidate']=git('merge-base','--is-ancestor',C,'refs/remotes/origin/audit/completion-2026-10-09').decode().strip()
paths=git('diff-tree','--no-commit-id','--name-only','-r',C).decode().splitlines()
binding['commitPaths']=paths; binding['commitPathCount']=len(paths); binding['allCommitPathsUnderDelivery']=all(p.startswith('deliveries/FINISH-A1/r5-05/') for p in paths)
manifest=json.loads((DELIVERY/'output-hashes.json').read_bytes()); binding['outputManifestSha256']=sha((DELIVERY/'output-hashes.json').read_bytes())
checks=[]
for row in rows(manifest):
    p=row['path']; relative=p.removeprefix('deliveries/FINISH-A1/r5-05/')
    raw=blob('deliveries/FINISH-A1/r5-05/'+relative)
    item=verify(row,raw); item['localEqualsGit']=raw==(DELIVERY/relative).read_bytes(); checks.append(item)
dump('output-verification.json',checks)
ledger=json.loads((DELIVERY/'input-hashes.json').read_bytes()); receipts=[]
for row in rows(ledger):
    raw=(REPO/row['path']).read_bytes(); item=verify(row,raw)
    p=run(['git','show',f'{C}:{row["path"]}'],required=False)
    item['candidateGitBytes']=len(p); item['candidateGitSha256']=sha(p); item['candidateGitMatchesReceipt']=sha(p)==row['sha256']
    item['rawLocalEqualsCandidateGit']=raw==p
    receipts.append(item)
    if row['path'].endswith(('.md','.json')): raw.decode('utf-8-sig')
extra=['docs/planning/reviews/2026-10-11-finish-10-a1-r4-parent-decision.md','docs/planning/production-prompts/corrections-2026-10-10/01-GEMINI1-A1-R3.md','docs/planning/reconciliation-packets/2026-10-11-finish-24-a1-r5-independent-audit.md']
for p in extra:
    raw=(REPO/p).read_bytes(); receipts.append({'path':p,'bytes':len(raw),'sha256':sha(raw),'status':'PASS','purpose':'Additional directly read governing input'})
dump('input-verification.json',receipts)
changed=(DELIVERY/'changed-paths.txt').read_text('utf-8-sig').splitlines()
patch=(DELIVERY/'source.patch').read_bytes(); text=patch.decode('utf-8'); patchpaths=re.findall(r'^diff --git a/(\S+) b/(\S+)$',text,re.M)
binding.update(patchSha256=sha(patch),patchBytes=len(patch),strictUtf8NoBomNul=not patch.startswith(b'\xef\xbb\xbf') and b'\0' not in patch,changedPaths=changed,patchPaths=patchpaths)
contract=(REPO/'docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md').read_text('utf-8')
section=contract.split('## A1')[1].split('## A2')[0] if '## A1' in contract else contract
allowlist=re.findall(r'^\| (src/[^ |]+|tests/[^ |]+) \|',section,re.M)
binding['allowlist']=allowlist
scratch=ROOT/'.work/replay'; scratch.mkdir(parents=True,exist_ok=False)
archive=git('archive',B,'app')
with tarfile.open(fileobj=io.BytesIO(archive)) as t: t.extractall(scratch,filter='data')
run(['git','init','-q'],scratch)
run(['git','config','core.autocrlf','false'],scratch)
run(['git','config','core.longpaths','true'],scratch)
run(['git','add','app'],scratch)
base_tree=run(['git','write-tree'],scratch).decode().strip()
run(['git','apply','--check','--whitespace=error-all',str(DELIVERY/'source.patch')],scratch)
run(['git','apply','--whitespace=error-all',str(DELIVERY/'source.patch')],scratch)
replacements=[]
for p in changed:
    candidate=(DELIVERY/'source'/p).read_bytes(); replay=(scratch/p).read_bytes()
    replacements.append({'path':p,'status':'PASS' if replay==candidate else 'FAIL','bytes':len(candidate),'sha256':sha(candidate)})
run(['git','add','app'],scratch)
tree=run(['git','write-tree'],scratch).decode().strip()
binding['replayedAppTree']=run(['git','rev-parse',f'{tree}:app'],scratch).decode().strip()
binding['replayedBaseAppTree']=run(['git','rev-parse',f'{base_tree}:app'],scratch).decode().strip()
binding['actualChangedPaths']=run(['git','diff','--name-only',base_tree,tree],scratch).decode().splitlines()
run(['git','diff','--check',base_tree,tree],scratch)
binding['sourceFiles']=sorted(str(p.relative_to(DELIVERY/'source')).replace('\\','/') for p in (DELIVERY/'source').rglob('*') if p.is_file())
dump('replacement-verification.json',replacements)
dump('candidate-binding.json',binding)
build=json.loads((DELIVERY/'evidence/build-output-manifest.json').read_bytes())
buildroot=Path('C:/yw-r5c/app/.next')
buildchecks=[]
for row in build['files']:
    p=buildroot/row['path']
    buildchecks.append(verify(row,p.read_bytes()) if p.is_file() else {'path':row['path'],'status':'NOT RUN','reason':'file unavailable'})
dump('build-verification.json',{'root':str(buildroot),'buildId':(buildroot/'BUILD_ID').read_text() if (buildroot/'BUILD_ID').is_file() else None,'manifestBuildId':build['buildId'],'rows':buildchecks})
versions={}
for args in [['python','--version'],['git','--version'],['node','--version'],['pnpm.cmd','--version']]: versions[' '.join(args)]=run(args).decode().strip()
dump('tool-versions.json',versions)
print(json.dumps({'binding':{k:v for k,v in binding.items() if k not in ['commitPaths','changedPaths','patchPaths','allowlist','sourceFiles','actualChangedPaths']},'outputRows':len(checks),'outputFailures':[r for r in checks if r['status']=='FAIL' or not r['localEqualsGit']],'inputFailures':[r for r in receipts if r['status']=='FAIL' or r.get('candidateGitMatchesReceipt') is False],'replacementFailures':[r for r in replacements if r['status']=='FAIL'],'buildCounts':{s:sum(r['status']==s for r in buildchecks) for s in ['PASS','FAIL','NOT RUN']},'allowlistCount':len(allowlist)},indent=2))
