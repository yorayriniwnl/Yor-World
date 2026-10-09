import pathlib,hashlib,json,re,subprocess
root=pathlib.Path.cwd();out=root/'deliveries/completion-audits/recheck-2026-10-10/governance'
def hashfile(p,lf=False):
 b=(root/p).read_bytes()
 return hashlib.sha256(b.replace(b'\r\n',b'\n') if lf else b).hexdigest()
checks=[]
for path in ['docs/planning/reconciliation-packets/finish-contracts/04-input-output-hashes.json','deliveries/completion-audits/FINISH-00/input-hashes.json','deliveries/completion-audits/FINISH-00/output-hashes.json','deliveries/completion-audits/FINISH-00/r1/input-hashes.json','deliveries/completion-audits/FINISH-00/r1/output-hashes.json']:
 j=json.loads((root/path).read_text(encoding='utf-8-sig'))
 for key in ['inputs','outputs']:
  for x in j.get(key,[]):
   if not isinstance(x,dict) or 'path' not in x or 'sha256' not in x:continue
   p=x['path'];actual=hashfile(p,True) if (root/p).is_file() else None
   checks.append({'ledger':path,'path':p,'hashMode':'lf','expected':x['sha256'],'actual':actual,'status':'PASS' if actual==x['sha256'] else 'MISMATCH'})
ruling='docs/planning/reviews/2026-10-09-finish-00-contract-ruling.md'
text=(root/ruling).read_text(encoding='utf-8-sig')
for p,h in re.findall(r'`([^`]+\.(?:md|json))` \(`([0-9a-f]{64})`\)',text):
 actual=hashfile(p,True)
 checks.append({'ledger':ruling,'path':p,'hashMode':'lf','expected':h,'actual':actual,'status':'PASS' if actual==h else 'MISMATCH'})
original='deliveries/completion-audits/FINISH-00/report.md';copy='deliveries/completion-audits/FINISH-00/r1/report.md'
tables=[]
for p in sorted((root/'app/supabase/migrations').glob('*.sql')):
 tables+=re.findall(r'CREATE TABLE(?: IF NOT EXISTS)?\s+([\w.]+)',p.read_text(),flags=re.I)
inputs=['AGENTS.md','START_HERE.md','docs/planning/reconciliation-packets/2026-10-10-completion-recheck.md','docs/planning/delegation-and-work-orders.md','docs/planning/current-status.json',ruling,original,copy,'docs/planning/reconciliation-packets/finish-contracts/00-contract-decision.md','docs/planning/reconciliation-packets/finish-contracts/01-path-ownership-and-allowlists.md','docs/planning/reconciliation-packets/finish-contracts/02-coverage-and-dependencies.md','docs/planning/reconciliation-packets/finish-contracts/03-missing-inputs-ledger.md','docs/planning/reconciliation-packets/finish-contracts/05-maker-packets.md','deliveries/FINISH-B1/report.md','deliveries/FINISH-B1/binding-inventory.json','deliveries/FINISH-C1/report.md']
j={'scope':'Fresh local status/hash/schema inspection; no fresh production execution or maker acceptance','head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'appTree':subprocess.check_output(['git','rev-parse','HEAD:app'],text=True).strip(),'appDelta':subprocess.check_output(['git','diff','--name-only','8e5b954e147a87e36a6869d9940c40f3d4c123f0','--','app'],text=True),'declaredHashChecks':checks,'priorAuditReportCopiesIdentical':(root/original).read_bytes()==(root/copy).read_bytes(),'schemaTables':tables,'A1DeliveryPresent':(root/'deliveries/FINISH-A1').exists(),'g7EvidenceFiles':[p.relative_to(root).as_posix() for p in (root/'deliveries/G7/evidence').rglob('*') if p.is_file()],'inputs':[{'path':p,'rawSha256':hashfile(p)} for p in inputs]}
(out/'evidence.json').write_text(json.dumps(j,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'mismatches':[x for x in checks if x['status']!='PASS'],'identicalPriorAuditReports':j['priorAuditReportCopiesIdentical'],'schemaTables':tables,'A1Present':j['A1DeliveryPresent'],'head':j['head'],'appTree':j['appTree'],'appDelta':j['appDelta']},indent=2))
