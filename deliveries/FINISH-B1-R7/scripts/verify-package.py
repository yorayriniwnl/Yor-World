from __future__ import annotations
import hashlib,json,pathlib
OUT=pathlib.Path(__file__).resolve().parents[1];EXCLUDED={'output-hashes.json','evidence/package-verification.json','evidence/git-raw-blob-check.json'}
def sha(b):return hashlib.sha256(b).hexdigest()
m=json.loads((OUT/'output-hashes.json').read_text())
if m['candidate']!='FINISH-B1-R7' or m['baseCommit']!='e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf' or set(m['selfExcluded'])!=EXCLUDED:raise SystemExit('manifest binding/self-exclusion mismatch')
listed={x['path']:x for x in m['files']};actual={p.relative_to(OUT).as_posix():p for p in OUT.rglob('*') if p.is_file() and p.relative_to(OUT).as_posix() not in EXCLUDED}
if set(listed)!=set(actual):raise SystemExit(f"file-set mismatch missing={sorted(set(listed)-set(actual))} extra={sorted(set(actual)-set(listed))}")
for rel,p in actual.items():
 raw=p.read_bytes();x=listed[rel]
 if len(raw)!=x['bytes'] or sha(raw)!=x['sha256']:raise SystemExit(f'hash mismatch {rel}')
commands=json.loads((OUT/'evidence/final-check-commands.json').read_text())
if commands['status']!='PASS' or any(x['exitCode']!=0 for x in commands['commands']):raise SystemExit('final command receipt has failures')
if json.loads((OUT/'evidence/gltf-validation.json').read_text())['errors']!=0 or json.loads((OUT/'evidence/gltf-validation.json').read_text())['warnings']!=0:raise SystemExit('Khronos validation is not clean')
if json.loads((OUT/'evidence/browser-results.json').read_text())['exitCode']!=0:raise SystemExit('browser run failed')
if json.loads((OUT/'evidence/final-invariants.json').read_text())['status']!='PASS':raise SystemExit('invariants failed')
if json.loads((OUT/'evidence/final-budgets.json').read_text())['status']!='PASS_WITH_VISUAL_REVIEW_PENDING':raise SystemExit('budgets failed')
mat=json.loads((OUT/'evidence/requirement-matrix.json').read_text())
if mat['visualAcceptance']!='NOT RUN; owner and independent reviewer must judge the side-by-side captures.':raise SystemExit('review status improperly closed')
rec={'status':'PASS','candidate':'FINISH-B1-R7','filesVerified':len(listed),'bytesVerified':sum(x['bytes'] for x in listed.values()),'manifestSHA256':sha((OUT/'output-hashes.json').read_bytes()),'packageSetExact':True,'excludedFiles':sorted(EXCLUDED),'finalCheckCommandsPassed':True,'gltfErrors':0,'gltfWarnings':0,'matchedCaptures':14,'visualOwnerReview':'NOT RUN','independentAudit':'NOT RUN','parentAcceptance':'NOT RUN'}
(OUT/'evidence/package-verification.json').write_text(json.dumps(rec,indent=2)+'\n',encoding='utf-8');print(json.dumps(rec,indent=2))
