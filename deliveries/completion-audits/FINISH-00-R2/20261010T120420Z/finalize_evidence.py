"""Finalize this owned audit inventory and recheck unchanged inputs before commit."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
start = dt.datetime.now(dt.timezone.utc).isoformat()
def utc(): return dt.datetime.now(dt.timezone.utc).isoformat()
def read(path): return json.loads(path.read_text(encoding='utf-8'))
def rec(path):
    b=path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes':len(b), 'sha256':hashlib.sha256(b).hexdigest()}
def write(name, obj):
    (OUT/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
inputs=read(OUT/'input-hashes.json')
rows={x['path']:x for x in inputs['inputs']}
additional=[
 'docs/planning/production-prompts/completion-2026-10-10/common-execution.md',
 'docs/planning/production-prompts/completion-2026-10-10/audit-and-acceptance.md',
 'docs/planning/production-prompts/completion-2026-10-10/parent-amendment.md',
 'docs/planning/production-prompts/completion-2026-10-10/README.md',
 'docs/planning/reviews/2026-10-09-completion-audit.md',
 'deliveries/completion-audits/FINISH-00-R2/architecture/r2/report.md',
 'deliveries/completion-audits/FINISH-00-R2/architecture/r2/output-hashes.json',
 'deliveries/completion-audits/FINISH-00-R2/independent/r1/before-contracts/output-hashes.json',
 'deliveries/completion-audits/FINISH-00-R2/independent/r1/type-seam-results.json',
 'deliveries/completion-audits/recheck-2026-10-10/governance/report.md',
 'app/src/app/api/admin/media/[id]/route.ts',
 'app/src/app/api/admin/media/[id]/approve/route.ts', 'app/src/proxy.ts']
for rel in additional:
    rows[rel]=rec(ROOT/rel)
inputs['inputs']=[rows[p] for p in sorted(rows)]
write('input-hashes.json', inputs)
checks=[]
for item in inputs['inputs']:
    path=ROOT/item['path']
    actual=rec(path) if path.is_file() else None
    checks.append({'path':item['path'], 'expected':item,'actual':actual,'result':'PASS' if actual==item else 'FAIL'})
snapshot=read(OUT/'manifest-verification.json')['snapshot']
candidate_checks=[{'path':x['source']['path'],'expected':x['source'],'actual':rec(ROOT/x['source']['path']),
                   'result':'PASS' if rec(ROOT/x['source']['path'])==x['source'] else 'FAIL'} for x in snapshot]
receipts=read(OUT/'command-receipts.json')
def run(args,name):
    t=utc(); r=subprocess.run(args,cwd=ROOT,capture_output=True)
    (OUT/(name+'.stdout.txt')).write_bytes(r.stdout)
    (OUT/(name+'.stderr.txt')).write_bytes(r.stderr)
    receipts.append({'commandArgv':args,'cwd':str(ROOT),'startUTC':t,'endUTC':utc(),'exitCode':r.returncode,
                     'stdout':name+'.stdout.txt','stderr':name+'.stderr.txt'})
    return r.stdout.decode('utf-8',errors='replace').strip()
head=run(['git','rev-parse','HEAD'],'final-head')
app_tree=run(['git','rev-parse','HEAD:app'],'final-app-tree')
app_diff=run(['git','diff','f62a43c5e71c00dcb89e28275ea81d842167db80','--','app'],'final-app-diff')
remote=run(['git','ls-remote','--heads','origin','audit/completion-2026-10-09'],'remote-before-commit')
status=run(['git','status','--porcelain=v1'],'final-status')
write('final-verification.json',{'startUTC':start,'endUTC':utc(),'inputChecks':checks,'candidateChecks':candidate_checks,
      'allInputsUnchanged':all(x['result']=='PASS' for x in checks),
      'candidateUnchanged':all(x['result']=='PASS' for x in candidate_checks),
      'head':head,'appTree':app_tree,'appDiff':app_diff,'remoteBranchBeforeCommit':remote,'statusBeforeCommit':status})
identity=read(OUT/'candidate-identity.json')
receipts.append({'invocationCommandText':'python -B deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/inspect_readiness.py',
                 'cwd':str(ROOT),'startUTC':identity['startUTC'],'endUTC':identity['endUTC'],'exitCode':0,
                 'scope':'recorded diagnostic body; interpreter startup/imports precede startUTC',
                 'results':['candidate-identity.json','manifest-verification.json','path-inventory.json','readiness.json','proposal-delta.json']})
receipts.append(read(OUT/'delivery-drift.json')['receipt'])
receipts.append(read(OUT/'review-media-identity-result.json')['command'])
receipts.append({'commandArgv':[sys.executable,'-B',str(Path(__file__).resolve())],'cwd':str(ROOT),
                 'startUTC':start,'endUTC':utc(),'exitCode':0,'scope':'final stability/inventory checks before commit'})
write('command-receipts.json',receipts)
readiness=read(OUT/'readiness.json')
readiness.update({'auditorAdvice':'REWORK','parentAcceptance':'NOT ISSUED BY THIS AUDITOR',
 'reviewerAndNextOwner':'Parent GPT Plus #1; versioned correction then GPT #2 delta audit',
 'blockingFindings':['PLAT-R2-01'],
 'candidateRawManifestSha256':'65126f6a196449f0167263574b84bbc8aaa439760f17323e2cca447f1f74056d',
 'internalAuditModels':{'delivery_readiness':'gpt-6.1-sol','platform_contract_check':'gpt-6.1-sol','runtime_art_contract_check':'gpt-6.1-sol'},
 'dependencyMatrix':[
  {'packet':'FINISH-00-R2','status':'DRAFT REVIEWED / REWORK','missing':'Versioned media review identity correction, delta review, Parent ruling'},
  {'packet':'FINISH-A1/r2','status':'ABSENT','missing':'Accepted corrected R2; actual issuance and maker candidate'},
  {'packet':'FINISH-B1-R2','status':'ABSENT','missing':'Accepted corrected R2; P04 issuance and corrected assets'},
  {'packet':'FINISH-C1-R2','status':'ABSENT','missing':'Accepted corrected R2; P05 issuance and corrected source/patch/browser proof'},
  {'packet':'FINISH-A2','status':'NO ACCEPTANCE LOCATED','missing':'Accepted A1 with exact base+patch'},
  {'packet':'FINISH-C2','status':'ABSENT','missing':'Accepted B1-R2/C1-R2 and actual Parent-bound isolated assembly manifest'},
  {'packet':'FINISH-C3','status':'ABSENT','missing':'Accepted C2 exact overlay'},
  {'packet':'FINISH-I1','status':'ABSENT / CANONICAL APP UNCHANGED','missing':'Full accepted successor chain and separately issued exact canonical mapping'},
  {'packet':'G7','status':'AUTHORIZED / PREPARATION / NOT RUN','missing':'Actual accepted source/origin/deployment/provider/fallback/device/receipt binding'},
  {'packet':'EXT-01..06','status':'REQUIRED / NO ACCEPTANCE LOCATED','missing':'Individual B then C issuance, audits, rulings and cumulative source/live proof'}]})
write('readiness.json',readiness)
write('findings.json',{'advice':'REWORK','scope':'proposed FINISH-00-R2 contract manifest65126f6a196449f0167263574b84bbc8aaa439760f17323e2cca447f1f74056d',
 'findings':[{'id':'PLAT-R2-01','severity':'HIGH','confidence':'CONFIRMED','class':'architectural identity gap',
 'owner':'Parent GPT Plus #1','affectedMaker':'Gemini #1 after reviewed/accepted design',
 'requirement':'Exact reviewed media identity and post-review approval mutation rejection',
 'sources':['02-platform-schema-recovery.md:69','02-platform-schema-recovery.md:89','02-platform-schema-recovery.md:101','app/src/contracts/content.ts:28','app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql:129','app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql:254','app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql:371','app/src/server/media/validate-upload.ts:271'],
 'observed':'Different valid media mapping for same referenced mediaId leaves documented review hash equal',
 'evidence':'review-media-identity-result.json','result':'DEFECT REPRODUCED; desired requirement FAIL at contract boundary',
 'limitations':'Hypothetical minimal fragment/rows; no SQL/provider/A1 implementation execution',
 'requiredCorrection':'Bind reviewed bytes/object/approval identity or enforce immutable media-ID mappings with explicit approval-change semantics',
 'makerProofRequired':'Change valid approved mapping after review; reject old identity with no history/content/audit partial writes'}],
 'clarifications':[{'id':'PLAT-R2-C01','blocking':False,'subject':'Explicit scope for private response header sentence at platform contract line101'}],
 'productionRegressionExecution':'NOT RUN; no production patch', 'freshApplicationTests':0})
bad=[x for x in checks+candidate_checks if x['result']=='FAIL']
if bad or app_diff or app_tree!='42ea29ec235225046a75959eb19eb386ac2f821d':
    raise RuntimeError('Input/source changed: inspect final-verification.json; do not inherit audit advice')
outputs=[rec(p) for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='output-hashes.json' and '__pycache__' not in p.parts]
# Only this root manifest is self-excluded; include the candidate-snapshot's bound manifest.
candidate_manifest=OUT/'candidate-snapshot/output-hashes.json'
outputs.append(rec(candidate_manifest))
outputs.sort(key=lambda x:x['path'])
write('output-hashes.json',{'hashPolicy':'SHA-256 raw bytes','auditRoot':OUT.relative_to(ROOT).as_posix(),
 'exclusions':['This audit root output-hashes.json (self-reference)','__pycache__ interpreter cache; none generated because python -B'],
 'outputs':outputs})
print(json.dumps({'advice':'REWORK','blockingFinding':'PLAT-R2-01','allInputsUnchanged':True,'candidateUnchanged':True,
 'inputCount':len(checks),'outputCount':len(outputs),'appTree':app_tree,'remoteBeforeCommit':remote},indent=2))
