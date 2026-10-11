import argparse,hashlib,json,pathlib,subprocess
OUT=pathlib.Path(__file__).resolve().parents[1];ROOT=OUT.parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--git-ref');ap.add_argument('--no-write',action='store_true');args=ap.parse_args()
manifest=(OUT/'output-hashes.json').read_bytes();j=json.loads(manifest)
ignored={'.work','node_modules','__pycache__','.git'}
def included(p):
    rel=p.relative_to(OUT);return not any(v in ignored for v in rel.parts) and p.suffix!='.blend1' and rel.as_posix() not in j['selfExcluded']
actual=sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and included(p))
assert actual==sorted(r['path'] for r in j['files'])
for r in j['files']:
    b=(OUT/r['path']).read_bytes();assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256'],r['path']
    if args.git_ref:
        raw=subprocess.check_output(['git','show',args.git_ref+':deliveries/FINISH-B1-R4/'+r['path']],cwd=ROOT);assert raw==b,r['path']
if args.git_ref:
    assert subprocess.check_output(['git','show',args.git_ref+':deliveries/FINISH-B1-R4/output-hashes.json'],cwd=ROOT)==manifest
receipt=dict(status='PASS',command='python scripts/verify-package.py'+(' --git-ref '+args.git_ref if args.git_ref else ''),filesVerified=len(j['files']),bytesVerified=sum(r['bytes'] for r in j['files']),manifestSHA256=hashlib.sha256(manifest).hexdigest(),packageSetExact=True,rawGitBlobsVerified=bool(args.git_ref),selfExcluded=j['selfExcluded'])
if not args.no_write:(OUT/'evidence/package-verification.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
