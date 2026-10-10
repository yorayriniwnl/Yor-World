import pathlib, os, subprocess, json, hashlib
OUT=pathlib.Path(__file__).resolve().parent
ROOT=OUT.parents[4]
scratch=OUT/'scratch'
patch=ROOT/'deliveries/FINISH-C1-R2/source.patch'
environment=dict(os.environ)
environment['GIT_CEILING_DIRECTORIES']=str(OUT)
receipts=[]
def run(args,cwd,env=None):
    r=subprocess.run(args,cwd=cwd,env=env,capture_output=True)
    receipts.append({'command':args,'cwd':str(cwd),'environmentOverride':{'GIT_CEILING_DIRECTORIES':str(OUT)} if env else {},'exit':r.returncode,'stdout':r.stdout.decode('utf8','replace'),'stderr':r.stderr.decode('utf8','replace')})
    return r
probe=run(['git','rev-parse','--show-toplevel'],scratch,environment)
if probe.returncode==0: raise RuntimeError('isolated patch check unexpectedly sees repository')
check=run(['git','apply','--check','--verbose',str(patch)],scratch,environment)
canonical_check=run(['git','apply','--check','--verbose',str(patch)],ROOT)
result={'patchSha256':hashlib.sha256(patch.read_bytes()).hexdigest(),'earlierNestedCheckWasNoOp':True,'earlierCheckExplanation':'git discovery found parent repository and skipped all app paths outside the nested working prefix; exit 0 did not establish applicability. Corrected check excludes parent discovery. No production/index mutation occurred.','isolatedExactBaseCheckExit':check.returncode,'canonicalUnchangedExactAppCheckExit':canonical_check.returncode,'appliedPatch':False,'agreementWithReplacements':'NOT RUN: applicable patch prerequisite failed; diagnostic assembly separately matches all 29 replacements byte for byte','receipts':receipts}
(OUT/'patch-verification.json').write_text(json.dumps(result,indent=2)+'\n')
identity=json.loads((OUT/'identity-checks.json').read_text('utf8'))
identity['initialNestedPatchExit']=identity.pop('patchExit')
identity['patchExit']=check.returncode
identity['patchVerification']='patch-verification.json'
(OUT/'identity-checks.json').write_text(json.dumps(identity,indent=2)+'\n')
print(json.dumps(result,indent=2))
