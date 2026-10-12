from __future__ import annotations
import hashlib,json,pathlib,subprocess,sys
OUT=pathlib.Path(__file__).resolve().parents[1];REPO=OUT.parents[1];EXCLUDED={'output-hashes.json','evidence/package-verification.json','evidence/git-raw-blob-check.json'}
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git',*a],cwd=REPO)
commit=git('rev-parse','HEAD').decode().strip();tree=git('rev-parse',f'{commit}^{{tree}}').decode().strip();prefix='deliveries/FINISH-B1-R7/'
m=json.loads((OUT/'output-hashes.json').read_text());rows={x['path']:x for x in m['files']}
# Verify the candidate touched only its owned delivery and remains directly based on R6.
parent=git('rev-parse',f'{commit}^').decode().strip()
ancestry=subprocess.run(['git','merge-base','--is-ancestor',m['baseCommit'],commit],cwd=REPO).returncode==0
if not ancestry:raise SystemExit(f'candidate does not descend from exact R6 base: {commit}')
paths=git('diff','--name-only',m['baseCommit'],commit).decode().splitlines()
if any(not x.startswith(prefix) for x in paths):raise SystemExit(f'outside delivery changed: {paths}')
if git('rev-parse',f"{m['baseCommit']}:app").strip()!=git('rev-parse',f'{commit}:app').strip():raise SystemExit('canonical app subtree changed')
for rel,row in rows.items():
 spec=f'{commit}:{prefix}{rel}'
 raw=git('show',spec)
 if len(raw)!=row['bytes'] or sha(raw)!=row['sha256']:raise SystemExit(f'raw Git blob mismatch {rel}')
 local=(OUT/pathlib.PurePosixPath(rel)).read_bytes()
 if local!=raw:raise SystemExit(f'working package differs from committed blob {rel}')
receipt={'status':'PASS','verifiedCandidateCommit':commit,'verifiedTree':tree,'parent':parent,'baseCommit':m['baseCommit'],'baseIsAncestor':ancestry,'appTreeUnchanged':True,'changedPathsAreR7Only':True,'manifestListedBlobsComparedToRawGit':len(rows),'manifestListedBytes':sum(x['bytes'] for x in rows.values()),'allRawBlobsMatchManifestAndWorkingFiles':True,'manifestSHA256':sha((OUT/'output-hashes.json').read_bytes()),'excludedFiles':sorted(EXCLUDED),'note':'The receipt and package-verification.json are excluded from output-hashes to avoid recursive hashing. Their addition does not change manifest-listed blobs.'}
if '--check-only' not in sys.argv:
 (OUT/'evidence/git-raw-blob-check.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt,indent=2))
