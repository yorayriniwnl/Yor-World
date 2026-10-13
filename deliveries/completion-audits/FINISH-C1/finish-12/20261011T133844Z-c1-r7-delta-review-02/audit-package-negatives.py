"""Disposable installed-package negative probes; no production dependency edits."""
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
REPO = next(p for p in ROOT.parents if (p/'.git').exists())
PACKAGE_DIR = ROOT/'.work/exact-candidate/deliveries/FINISH-C1-R7'
SPEC = importlib.util.spec_from_file_location('fin26_package_negative_verifier', PACKAGE_DIR/'verify-input-provenance.py')
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)
MOD.REPO_ROOT = REPO
MOD.PACKAGE_DIR = PACKAGE_DIR
C = 'e2670d4152c461005da86b392dbcea12cec740bf'
raw_git = MOD.git_bytes
CACHE = {}
def cached_git(*args):
    if args not in CACHE: CACHE[args] = raw_git(*args)
    return CACHE[args]
MOD.git_bytes = cached_git
assert MOD.run_verification(C)['status']=='PASS'
BASE_FILES = {p.relative_to(PACKAGE_DIR).as_posix():p.read_bytes() for p in PACKAGE_DIR.rglob('*') if p.is_file()}
INPUT = json.loads(BASE_FILES['candidate-input-provenance.json'])
fake_root = ROOT/'.work/package-availability-negative'
fake_package = fake_root/'app/node_modules/three'
real_package = (REPO/'app/node_modules/three').resolve(strict=True)
INSTALLED = {relative:(real_package/relative).read_bytes() for relative in ('package.json','build/three.module.js','build/three.core.js')}

def reset_fake_package():
    for relative, data in INSTALLED.items():
        path = fake_package/relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    for relative, data in BASE_FILES.items(): (PACKAGE_DIR/relative).write_bytes(data)
    for row in INPUT['inputs']:
        if row['provenance']['kind']=='installed-package-file': row['installedPackageRoot']='app/node_modules/three'
    (PACKAGE_DIR/'candidate-input-provenance.json').write_bytes((json.dumps(INPUT,indent=2)+'\n').encode())

MOD.REPO_ROOT = fake_root
reset_fake_package()
assert MOD.run_verification(C)['status']=='PASS'
CASES=[]
def case(name, mutation, expected_rejection=True):
    reset_fake_package()
    mutation()
    try:
        MOD.run_verification(C)
        rejected=False
        detail='Verifier returned PASS'
    except Exception as error:
        rejected=True
        detail=type(error).__name__+': '+str(error)
    CASES.append({'case':name,'expectedRejection':expected_rejection,'rejected':rejected,'status':'PASS' if rejected==expected_rejection else 'FAIL','result':detail})

case('missing installed package manifest',lambda:(fake_package/'package.json').unlink())
case('missing installed three.module.js',lambda:(fake_package/'build/three.module.js').unlink())
case('missing installed three.core.js',lambda:(fake_package/'build/three.core.js').unlink())
case('installed three.module.js bytes corrupted',lambda:(fake_package/'build/three.module.js').write_bytes(INSTALLED['build/three.module.js']+b'\n'))
case('installed three.core.js bytes corrupted',lambda:(fake_package/'build/three.core.js').write_bytes(INSTALLED['build/three.core.js']+b'\n'))
def wrong_package(field,value):
    info=json.loads(INSTALLED['package.json'])
    info[field]=value
    (fake_package/'package.json').write_bytes(json.dumps(info).encode())
case('installed package version corrupted',lambda:wrong_package('version','0.181.0'))
case('installed package name corrupted',lambda:wrong_package('name','not-three'))
MOD.REPO_ROOT=REPO
def restore_candidate():
    for relative,data in BASE_FILES.items(): (PACKAGE_DIR/relative).write_bytes(data)
restore_candidate()
assert MOD.run_verification(C)['status']=='PASS'
def extra_metadata_case(name, file, mutation):
    restore_candidate()
    data=json.loads(BASE_FILES[file])
    mutation(data)
    (PACKAGE_DIR/file).write_bytes((json.dumps(data,indent=2)+'\n').encode())
    try:
        MOD.run_verification(C)
        rejected=False
        detail='Verifier returned PASS'
    except Exception as error:
        rejected=True
        detail=type(error).__name__+': '+str(error)
    CASES.append({'case':name,'expectedRejection':True,'rejected':rejected,'status':'PASS' if rejected else 'FAIL','result':detail})
extra_metadata_case('candidate sourceManifest path corrupted','candidate-input-provenance.json',lambda v:v['sourceManifest'].__setitem__('path','app/no-such-file'))
extra_metadata_case('source-binding packageFiles[0] hash corrupted','source-binding.json',lambda v:v['threeDependencyEvidence']['packageFiles'][0].__setitem__('sha256','0'*64))
restore_candidate()
assert MOD.run_verification(C)['status']=='PASS'
result={'method':'Exact candidate verifier runs against disposable copied installed-package bytes; only scratch receipt installedPackageRoot changes for fake-root baseline. Raw immutable Git reads are cached after the original real-repository positive run; production node_modules was neither modified nor replaced. Final scratch receipts restored byte-for-byte to candidate.','cases':CASES,'passed':sum(r['status']=='PASS' for r in CASES),'failed':sum(r['status']=='FAIL' for r in CASES),'productionPackageEdits':False}
(ROOT/'evidence/package-negative-probes.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(result,indent=2))
