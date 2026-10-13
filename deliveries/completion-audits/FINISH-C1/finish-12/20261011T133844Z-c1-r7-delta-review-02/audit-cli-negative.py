"""Confirm the contradictory-manifest probe through the exact verifier CLI main."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parent
REPO=next(p for p in ROOT.parents if (p/'.git').exists())
SOURCE=ROOT/'.work/exact-candidate/deliveries/FINISH-C1-R7'
COPY=ROOT/'.work/cli-negative-case'
COPY.mkdir(parents=True,exist_ok=True)
for source in SOURCE.rglob('*'):
    if source.is_file():
        dest=COPY/source.relative_to(SOURCE)
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(source.read_bytes())
receipt_path=COPY/'candidate-input-provenance.json'
original=receipt_path.read_bytes()
receipt=json.loads(original)
receipt['sourceManifest']['sha256']='0'*64
receipt_path.write_bytes((json.dumps(receipt,indent=2)+'\n').encode())
DRIVER=ROOT/'.work/cli-negative-driver.py'
DRIVER.write_bytes(('import importlib.util,sys\nfrom pathlib import Path\np=Path('+repr(str(COPY/'verify-input-provenance.py'))+')\ns=importlib.util.spec_from_file_location("exact_candidate_cli",p)\nm=importlib.util.module_from_spec(s)\ns.loader.exec_module(m)\nm.REPO_ROOT=Path('+repr(str(REPO))+')\nm.PACKAGE_DIR=p.parent\nsys.argv=[str(p),"--json","--check-output-manifest","--commit","e2670d4152c461005da86b392dbcea12cec740bf"]\nsys.exit(m.main())\n').encode())
command=[sys.executable,'-B',str(DRIVER)]
p=subprocess.run(command,cwd=REPO,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
(ROOT/'evidence/cli-negative-false-pass.log').write_bytes(('COMMAND='+json.dumps(command)+'\nCWD='+str(REPO)+'\nMUTATION=candidate-input-provenance.json.sourceManifest.sha256 -> 64 zeros\nVERIFIER_BYTES_UNCHANGED=true\nGIT_CACHE=false\nSTDOUT\n').encode()+p.stdout+b'\nSTDERR\n'+p.stderr+('\nEXIT_CODE='+str(p.returncode)+'\n').encode())
result={'case':'candidate sourceManifest SHA-256 corrupted; exact verifier main CLI','expectedExit':'nonzero','actualExit':p.returncode,'status':'FAIL' if p.returncode==0 else 'PASS','returnedStatus':json.loads(p.stdout).get('status'),'originalReceiptSha256':hashlib.sha256(original).hexdigest(),'mutatedReceiptSha256':hashlib.sha256(receipt_path.read_bytes()).hexdigest(),'verifierSha256':hashlib.sha256((COPY/'verify-input-provenance.py').read_bytes()).hexdigest(),'command':command,'noCandidateFilesEdited':True,'cacheUsed':False}
(ROOT/'evidence/cli-negative-false-pass.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(result,indent=2))
