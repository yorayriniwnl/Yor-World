import hashlib, io, json, pathlib, re, shutil, subprocess, tarfile, datetime

ROOT = pathlib.Path(__file__).resolve().parents[5]
OUT = pathlib.Path(__file__).resolve().parent
BASE = 'f62a43c5e71c00dcb89e28275ea81d842167db80'
MAKER = ROOT / 'deliveries/FINISH-C1-R2'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
receipts = []
def run(args, cwd=ROOT):
    result = subprocess.run(args, cwd=cwd, capture_output=True)
    receipts.append({'command':args,'cwd':str(cwd),'exit':result.returncode,'stdout':result.stdout.decode('utf8','replace'),'stderr':result.stderr.decode('utf8','replace')})
    return result
inputs = ['AGENTS.md','START_HERE.md','docs/planning/delegation-and-work-orders.md','docs/planning/reconciliation-packets/2026-10-10-finish-04.md','docs/planning/reviews/2026-10-10-finish-00-r2.md','docs/planning/reviews/2026-10-10-finish-00-r2/decision.json','docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json','docs/planning/reconciliation-packets/finish-contracts-r2/input-hashes.json','docs/planning/reconciliation-packets/finish-contracts-r2/01-runtime-lifecycle.md','docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md','docs/planning/reconciliation-packets/finish-contracts-r2/05-handoffs-and-dependencies.md','docs/planning/production-prompts/corrections-2026-10-10/03-GEMINI3-C1-R3.md','docs/planning/production-prompts/corrections-2026-10-10/04-GPT2-AUDITOR.md','docs/planning/reviews/2026-10-10-finish-04/readiness.md','deliveries/completion-audits/FINISH-C1/2026-10-10-r2/report.md','deliveries/completion-audits/FINISH-C1/2026-10-10-r2/test-execution-results.json']
inputs += [str(p.relative_to(ROOT)).replace('\\','/') for p in MAKER.rglob('*') if p.is_file() and 'candidate' not in p.relative_to(MAKER).parts]
(OUT/'input-hashes.json').write_text(json.dumps([{'path':p,'bytes':(ROOT/p).stat().st_size,'sha256':sha(ROOT/p)} for p in inputs],indent=2)+'\n')
maker_manifest=json.loads((MAKER/'output-hashes.json').read_text('utf8'))
maker_check=[{'path':p,'expected':h,'actual':sha(MAKER/p),'pass':h==sha(MAKER/p)} for p,h in maker_manifest.items()]
contract_manifest=ROOT/'docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json'
contract=json.loads(contract_manifest.read_text('utf8'))
contract_check=[{'path':r['path'],'bytesPass':(ROOT/r['path']).stat().st_size==r['bytes'],'hashPass':sha(ROOT/r['path'])==r['sha256']} for r in contract['outputs']]
ownership=(ROOT/'docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md').read_text('utf8').split('## FINISH-C2:')[0]
allow={p:s for p,s in re.findall(r'^\| ((?:src|tests)/[^|]+?) \| ([EN]) \|',ownership,re.M)}
source=list((MAKER/'source').rglob('*'))
paths=[str(p.relative_to(MAKER/'source')).replace('\\','/') for p in source if p.is_file()]
path_check=[]
for p in paths:
    blob=run(['git','cat-file','-e',BASE+':app/'+p])
    path_check.append({'path':p,'allowed':p in allow,'declaredState':allow.get(p),'baseExists':blob.returncode==0,'statePass':(blob.returncode==0)==(allow.get(p)=='E')})
scratch=OUT/'scratch'; scratch.mkdir()
archive=run(['git','archive',BASE,'app'])
if archive.returncode: raise RuntimeError('git archive failed')
with tarfile.open(fileobj=io.BytesIO(archive.stdout)) as tar:
    tar.extractall(scratch,filter='data')
patch=run(['git','apply','--check',str(MAKER/'source.patch')],scratch)
candidate=OUT/'candidate'
shutil.copytree(scratch/'app',candidate)
for p in paths:
    target=candidate/p; target.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(MAKER/'source'/p,target)
agreement=[{'path':p,'hash':sha(candidate/p),'matchesReplacement':sha(candidate/p)==sha(MAKER/'source'/p)} for p in paths]
run(['cmd','/c','mklink','/J',str(candidate/'node_modules'),str(ROOT/'app/node_modules')])
run(['git','rev-parse','HEAD']); run(['git','rev-parse',BASE+':app']); run(['git','rev-parse','HEAD:app'])
run(['node','--version']);run(['cmd','/c','pnpm','--version']);run(['node',str(ROOT/'app/node_modules/vitest/vitest.mjs'),'--version'])
# Archive output is binary and is bound by hash, rather than stored as text.
for r in receipts:
    if r['command'][:2]==['git','archive']:
        r['stdout']='(binary tar omitted; SHA-256 '+hashlib.sha256(archive.stdout).hexdigest()+')'
(OUT/'identity-checks.json').write_text(json.dumps({'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidateRoot':str(MAKER),'correctionRootExists':(ROOT/'deliveries/FINISH-C1-R3').exists(),'base':BASE,'contractManifestSha256':sha(contract_manifest),'contractManifestMatchesRuling':sha(contract_manifest)=='8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af','makerManifestSha256':sha(MAKER/'output-hashes.json'),'patchSha256':sha(MAKER/'source.patch'),'makerHashes':maker_check,'contractHashes':contract_check,'sourceOwnership':path_check,'replacementAssemblyAgreement':agreement,'patchExit':patch.returncode,'assemblyPolicy':'DIAGNOSTIC ONLY: exact git archive app base plus byte-identical delivered replacements; not patch-applicable integration or acceptance'},indent=2)+'\n')
(OUT/'preparation-receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
print(json.dumps({'makerHashRows':len(maker_check),'makerMismatch':sum(not r['pass'] for r in maker_check),'contractRows':len(contract_check),'contractMismatch':sum(not(r['hashPass'] and r['bytesPass']) for r in contract_check),'sourceRows':len(paths),'ownershipMismatch':sum(not(r['allowed'] and r['statePass']) for r in path_check),'patchExit':patch.returncode,'patchError':patch.stderr.decode('utf8','replace'),'candidate':str(candidate)},indent=2))
