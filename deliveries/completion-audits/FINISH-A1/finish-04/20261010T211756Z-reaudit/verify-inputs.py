import hashlib, io, json, pathlib, re, shutil, subprocess, tarfile

ROOT = pathlib.Path(__file__).resolve().parents[5]
AUDIT = pathlib.Path(__file__).resolve().parent
BASE = 'f62a43c5e71c00dcb89e28275ea81d842167db80'
DELIVERY = ROOT / 'deliveries/FINISH-A1/r2'
CONTRACT = ROOT / 'docs/planning/reconciliation-packets/finish-contracts-r2'
receipts = []
def run(args, cwd=ROOT):
    p = subprocess.run(args, cwd=cwd, capture_output=True)
    receipts.append(dict(command=args, cwd=str(cwd), exitCode=p.returncode, stdout=p.stdout.decode('utf8','replace'), stderr=p.stderr.decode('utf8','replace')))
    return p
def identity(p):
    b=p.read_bytes(); return dict(path=p.relative_to(ROOT).as_posix(), bytes=len(b), sha256=hashlib.sha256(b).hexdigest())
def write(name,obj):
    (AUDIT/name).write_text(json.dumps(obj,indent=2)+'\n',encoding='utf8')

declared=json.loads((DELIVERY/'output-hashes.json').read_text('utf-8-sig'))
checked=[]
for name, expected in declared.items():
    actual=identity(DELIVERY/name)
    checked.append(dict(**actual,expected=expected,match=all(actual[k]==expected[k] for k in ['bytes','sha256'])))
contract_manifest=json.loads((CONTRACT/'output-hashes.json').read_text('utf-8-sig'))
contract_checks=[]
for expected in contract_manifest['outputs']:
    actual=identity(ROOT/expected['path'])
    contract_checks.append(dict(**actual,match=all(actual[k]==expected[k] for k in ['bytes','sha256'])))
source=list(sorted((DELIVERY/'source').rglob('*')))
source=[p for p in source if p.is_file()]
contract_lines=(CONTRACT/'02-platform-schema-recovery.md').read_text('utf8').splitlines()
allowed={re.match(r'\| `([^`]+)`',l)[1] for l in contract_lines[189:218] if re.match(r'\| `([^`]+)`',l)}
paths=[]
for p in source:
    rel=p.relative_to(DELIVERY/'source').as_posix()
    original=run(['git','show',BASE+':app/'+rel])
    b=p.read_bytes()
    paths.append(dict(path=rel,allowed=rel in allowed,state='E' if original.returncode==0 else 'N',rawSameAsBase=original.stdout==b,normalizedSameAsBase=original.stdout.replace(b'\r\n',b'\n')==b.replace(b'\r\n',b'\n'),replacementSha256=hashlib.sha256(b).hexdigest(),baseBlobSha256=hashlib.sha256(original.stdout).hexdigest() if original.returncode==0 else None))
patch=(DELIVERY/'source.patch').read_bytes()
candidate=AUDIT/'candidate'
candidate.mkdir()
archive=run(['git','archive','--format=tar',BASE,'app'])
receipts[-1]['stdout']='[binary tar omitted; extracted bytes came directly from git archive]'
with tarfile.open(fileobj=io.BytesIO(archive.stdout)) as tar: tar.extractall(candidate,filter='data')
check=run(['git','--work-tree='+str(candidate),'apply','--check',str(DELIVERY/'source.patch')])
for p in source:
    dest=candidate/'app'/p.relative_to(DELIVERY/'source');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
assembly=[dict(path=p.relative_to(candidate).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted((candidate/'app').rglob('*')) if p.is_file()]
write('identity-verification.json',dict(head=run(['git','rev-parse','HEAD']).stdout.decode().strip(),appTree=run(['git','rev-parse','HEAD:app']).stdout.decode().strip(),base=BASE,baseAppTree=run(['git','rev-parse',BASE+':app']).stdout.decode().strip(),candidateOutputManifest=identity(DELIVERY/'output-hashes.json'),acceptedContractManifest=identity(CONTRACT/'output-hashes.json'),contractChecks=contract_checks,deliveryChecks=checked,allDeliveryMatch=all(x['match'] for x in checked),allContractMatch=all(x['match'] for x in contract_checks),replacementPaths=paths,missingAllocatedReplacements=sorted(allowed-{x['path'] for x in paths}),patchBom=patch[:4].hex(),patchNulBytes=patch.count(b'\0'),patchApplies=check.returncode==0,patchAgreement='NOT RUN: original delivered patch is rejected; diagnostic assembly uses replacement files only'))
write('diagnostic-assembly-hashes.json',dict(base=BASE,kind='DIAGNOSTIC REPLACEMENT ASSEMBLY, NOT APPLIED DELIVERED PATCH',files=assembly))
write('identity-command-receipts.json',receipts)
inputs=[ROOT/p for p in ['AGENTS.md','START_HERE.md','docs/planning/delegation-and-work-orders.md','docs/planning/reconciliation-packets/2026-10-10-finish-04.md','docs/planning/reviews/2026-10-10-finish-00-r2.md','docs/planning/reviews/2026-10-10-finish-00-r2/decision.json','docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md','docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md','docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json','docs/planning/reconciliation-packets/finish-contracts-r2/input-hashes.json','docs/planning/reviews/2026-10-10-finish-04/readiness.md','docs/planning/production-prompts/corrections-2026-10-10/01-GEMINI1-A1-R3.md','docs/planning/production-prompts/corrections-2026-10-10/04-GPT2-AUDITOR.md','deliveries/completion-audits/FINISH-A1/r2/report.md']]
inputs+=list(p for p in DELIVERY.rglob('*') if p.is_file())
write('input-hashes.json',[identity(p) for p in sorted(set(inputs))])
print(json.dumps(dict(deliveryFiles=len(checked),deliveryMismatches=[x for x in checked if not x['match']],contractFiles=len(contract_checks),contractMismatches=sum(not x['match'] for x in contract_checks),replacementFiles=len(paths),outsideAllowlist=[x['path'] for x in paths if not x['allowed']],patchCheckExit=check.returncode,patchError=check.stderr.decode('utf8','replace'),diagnosticAssembly=str(candidate)),indent=2))
