import hashlib,json,pathlib,subprocess,sys
root=pathlib.Path(r'C:\Users\yoray\Projects\Yor World')
aud=root/'deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03'
commit='9188b413d37da0ec3381b5430e25dc375a45bb18'
r=json.loads((aud/'evidence/candidate-hash-receipt.json').read_text(encoding='utf-8'))
def blob(path):
 p=subprocess.run(['git','-C',str(root),'show',f'{commit}:{path}'],capture_output=True,check=True)
 return p.stdout
def check(label,path,expected,expected_bytes,actual):
 lf=actual.count(b'\n')
 crlf=actual.count(b'\r\n')
 # If already has any CR, do not treat a conversion as applicable.
 converted=actual.replace(b'\n',b'\r\n') if b'\r' not in actual else None
 return {'label':label,'path':path,'expectedSha256':expected,'actualBytes':len(actual),'expectedBytes':expected_bytes,'lfCount':lf,'rawSha256':hashlib.sha256(actual).hexdigest(),'crlfNormalizedSha256':hashlib.sha256(converted).hexdigest() if converted is not None else None,'crlfNormalizedBytes':len(converted) if converted is not None else None,'rawMatches':hashlib.sha256(actual).hexdigest()==expected and len(actual)==expected_bytes,'crlfMatches':converted is not None and hashlib.sha256(converted).hexdigest()==expected and len(converted)==expected_bytes}
rows=[]
for item in r['declaredInputs']['inputs']:
 if item['status']=='PASS': continue
 path=item['path']
 candidate_path=f'app/{path[4:]}' if path.startswith('app/') else path
 rows.append(check('R6_DECLARED_INPUT',candidate_path,item['expectedSha256'],item['expectedBytes'],blob(candidate_path)))
for pred in r['predecessors']:
 if pred['delivery']!='FINISH-C1-R5': continue
 for item in pred['verifiedOutputs']:
  if item['status']=='PASS': continue
  rows.append(check('R5_PREDECESSOR_OUTPUT',item['path'],item['sha256Expected'],item['bytesExpected'],blob(item['path'])))
summary={'candidate':commit,'rows':rows,'counts':{'mismatchedRows':len(rows),'crlfEquivalent':sum(x['crlfMatches'] for x in rows),'notCrLfEquivalent':sum(not x['crlfMatches'] for x in rows)}}
print(json.dumps(summary,indent=2))
