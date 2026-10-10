"""Check scoped staging and preserve whitespace diagnostics for verbatim receipts."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import subprocess

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
prefix=OUT.relative_to(ROOT).as_posix()+'/'
start=dt.datetime.now(dt.timezone.utc).isoformat()
def record(p):
    data=p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def run(argv,name):
    begin=dt.datetime.now(dt.timezone.utc).isoformat()
    r=subprocess.run(argv,cwd=ROOT,capture_output=True)
    (OUT/(name+'.stdout.txt')).write_bytes(r.stdout)
    (OUT/(name+'.stderr.txt')).write_bytes(r.stderr)
    return r,{'commandArgv':argv,'cwd':str(ROOT),'startUTC':begin,
              'endUTC':dt.datetime.now(dt.timezone.utc).isoformat(),'exitCode':r.returncode,
              'stdout':name+'.stdout.txt','stderr':name+'.stderr.txt'}
staged=subprocess.check_output(['git','diff','--cached','--name-only','-z'],cwd=ROOT).decode('utf-8').split('\0')
staged=[p for p in staged if p]
if any(not p.startswith(prefix) for p in staged):
    raise RuntimeError('Unrelated staged paths; do not commit them')
byte_checks=[]
for p in staged:
    blob=subprocess.check_output(['git','show',':'+p],cwd=ROOT)
    actual=record(ROOT/p)
    byte_checks.append({'path':p,'worktree':actual,'stagedBytes':len(blob),
                        'stagedSha256':hashlib.sha256(blob).hexdigest(),
                        'result':'PASS' if blob==(ROOT/p).read_bytes() else 'FAIL'})
full,full_receipt=run(['git','diff','--cached','--check'],'git-whitespace-full')
authored=[p for p in staged if '/candidate-snapshot/' not in p and not p.endswith(('.stdout.txt','.stderr.txt'))]
scoped,scoped_receipt=run(['git','diff','--cached','--check','--',*authored],'git-whitespace-authored')
obj={'startUTC':start,'endUTC':dt.datetime.now(dt.timezone.utc).isoformat(),
     'scopedStagedPaths':staged,'byteChecks':byte_checks,'receipts':[full_receipt,scoped_receipt],
     'fullWhitespaceCheck':'FAIL on verbatim predecessor Markdown hard breaks and CRLF snapshot/command bytes; originals preserved',
     'authoredWhitespaceCheck':'PASS' if scoped.returncode==0 else 'FAIL',
     'exclusionReason':'Raw snapshots and diagnostic stdout/stderr retain exact input/output bytes; no whitespace repair was applied to them'}
(OUT/'git-stage-validation.json').write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8',newline='\n')
if scoped.returncode!=0 or any(x['result']=='FAIL' for x in byte_checks):
    raise RuntimeError('Authored whitespace or staged raw identity mismatch')
manifest={'hashPolicy':'SHA-256 raw bytes','auditRoot':prefix.rstrip('/'),
          'exclusions':['This audit root output-hashes.json (self-reference)','__pycache__ interpreter cache; none generated because python -B'],
          'outputs':[record(p) for p in sorted(OUT.rglob('*')) if p.is_file() and p!=OUT/'output-hashes.json' and '__pycache__' not in p.parts]}
(OUT/'output-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'scopedStagedPaths':len(staged),'allStagedRawBytesMatch':True,
                  'fullWhitespaceExit':full.returncode,'authoredWhitespaceExit':scoped.returncode,
                  'manifestOutputs':len(manifest['outputs'])},indent=2))
