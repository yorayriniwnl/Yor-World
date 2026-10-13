import hashlib,json,pathlib,subprocess
root=pathlib.Path(r'C:\Users\yoray\Projects\Yor World')
aud=root/'deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03'
commit='9188b413d37da0ec3381b5430e25dc375a45bb18'
def blob(path):return subprocess.run(['git','-C',str(root),'show',f'{commit}:{path}'],check=True,capture_output=True).stdout
rec=json.loads((aud/'evidence/candidate-hash-receipt.json').read_text())
r5=next(x for x in rec['predecessors'] if x['delivery']=='FINISH-C1-R5')
manifest=blob('deliveries/FINISH-C1-R5/output-hashes.json')
expected_manifest=r5['manifestSha256Expected']
crlf=manifest.replace(b'\n',b'\r\n') if b'\r' not in manifest else None
print('R5_OUTPUT_MANIFEST',json.dumps({'expectedSha256':expected_manifest,'expectedBytes':r5['manifestBytesExpected'],'actualSha256':hashlib.sha256(manifest).hexdigest(),'actualBytes':len(manifest),'lfCount':manifest.count(b'\n'),'crlfSha256':hashlib.sha256(crlf).hexdigest() if crlf is not None else None,'crlfBytes':len(crlf) if crlf is not None else None,'crlfMatches':crlf is not None and hashlib.sha256(crlf).hexdigest()==expected_manifest and len(crlf)==r5['manifestBytesExpected']}))
path='deliveries/completion-audits/FINISH-C1/finish-08/20261011T003551Z-c1-r5-local-review/evidence/retry-aggregation-diagnostic.test.ts'
data=blob(path)
item=next(x for x in rec['declaredInputs']['inputs'] if x['path']==path)
target=item['expectedSha256']
print('DIAGNOSTIC_TEST_RAW',json.dumps({'path':path,'expectedSha256':target,'expectedBytes':item['expectedBytes'],'actualSha256':hashlib.sha256(data).hexdigest(),'actualBytes':len(data),'lfCount':data.count(b'\n'),'crCount':data.count(b'\r'),'endsWith':data[-12:].hex()}))
for label,candidate in [('append_lf',data+b'\n'),('append_cr',data+b'\r'),('append_space',data+b' '),('append_utf8_bom',b'\xef\xbb\xbf'+data)]:print(label,hashlib.sha256(candidate).hexdigest(),len(candidate),hashlib.sha256(candidate).hexdigest()==target)
found=[]
for i in range(len(data)+1):
 for b in range(256):
  if hashlib.sha256(data[:i]+bytes((b,))+data[i:]).hexdigest()==target:
   found.append({'offset':i,'byte':b,'hex':f'{b:02x}'})
   break
print('ONE_BYTE_INSERTION_MATCHES',json.dumps(found))
