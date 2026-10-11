from __future__ import annotations
import hashlib, json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
REPO=Path(sys.argv[1]).resolve(); ROOT=Path(sys.argv[2]).resolve()
CAND='1753b9278c4537b5377c3893172b2a0f26d13b10'
GOV='ffab7383d031698994e9136f704a73e536cb9dd3'
BASE='f62a43c5e71c00dcb89e28275ea81d842167db80'
R2='54c2448bbabb8bfb8bd7fd55ff4a25b3a4343feb'
STAGE=ROOT/'.work'/'source-root'

def git(*args): return subprocess.run(['git','-C',str(REPO),*args],capture_output=True,check=True).stdout
def blob(commit,path): return git('show',f'{commit}:{path}')
def sha(data): return hashlib.sha256(data).hexdigest()
def put(rel,data):
    dest=STAGE/rel; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(data); return dest

gov_paths=[
 'AGENTS.md','START_HERE.md','docs/planning/delegation-and-work-orders.md',
 'docs/planning/reconciliation-packets/2026-10-11-finish-18-b1-r3-independent-audit.md',
 'docs/planning/reconciliation-packets/2026-10-11-finish-20-b1-r3-audit-reallocation.md',
 'docs/planning/reconciliation-packets/2026-10-10-finish-04.md',
 'docs/planning/reviews/2026-10-10-finish-00-r2.md',
 'docs/planning/reviews/2026-10-10-finish-00-r2/decision.json',
 'docs/planning/production-prompts/corrections-2026-10-10/02-GEMINI2-B1-R3.md',
 'docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md',
 'docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json',
 'docs/planning/reconciliation-packets/finish-contracts-r2/input-hashes.json',
 'docs/planning/reviews/2026-10-11-finish-04-reaudit.md',
]
candidate_paths=[
 'deliveries/FINISH-B1-R3/report.md','deliveries/FINISH-B1-R3/output-hashes.json','deliveries/FINISH-B1-R3/source.patch',
 'deliveries/FINISH-B1-R3/scripts/run-r3-verification.mjs','deliveries/FINISH-B1-R3/scripts/measure-draw-attribution.mjs',
 'deliveries/FINISH-B1-R3/scripts/assert-draw-budgets.mjs','deliveries/FINISH-B1-R3/scripts/validate-glb.mjs',
 'deliveries/FINISH-B1-R3/scripts/verify-final-exports-blender.py','deliveries/FINISH-B1-R3/scripts/inspect-exports.py',
 'deliveries/FINISH-B1-R3/scripts/run-motion-diagnostics.mjs','deliveries/FINISH-B1-R3/scripts/test-browser-playback.mjs',
 'deliveries/FINISH-B1-R3/scripts/finalize-artifacts.mjs',
 'deliveries/FINISH-B1-R3/validator-logs/manifest-verification.json',
 'deliveries/FINISH-B1-R3/validator-logs/gltf-validation.json',
 'deliveries/FINISH-B1-R3/validator-logs/geometry-checks.json',
 'deliveries/FINISH-B1-R3/validator-logs/glb-inventory.json',
 'deliveries/FINISH-B1-R3/validator-logs/ownership-checks.json',
 'deliveries/FINISH-B1-R3/validator-logs/blender-checks.json',
 'deliveries/FINISH-B1-R3/validator-logs/blender-measurements.json',
 'deliveries/FINISH-B1-R3/validator-logs/final-export-blender-import.json',
 'deliveries/FINISH-B1-R3/validator-logs/final-export-blender-import.log',
 'deliveries/FINISH-B1-R3/validator-logs/browser-deformation-results.json',
 'deliveries/FINISH-B1-R3/validator-logs/browser-console.json',
 'deliveries/FINISH-B1-R3/validator-logs/browser-frame-diagnostic.json',
 'deliveries/FINISH-B1-R3/validator-logs/draw-call-attribution.json',
 'deliveries/FINISH-B1-R3/validator-logs/draw-budget-assertion-final.log',
 'deliveries/FINISH-B1-R3/validator-logs/draw-attribution-final-hash-bound-run.log',
 'deliveries/FINISH-B1-R3/validator-logs/gltf-validator-final-hash-bound-run.log',
 'deliveries/FINISH-B1-R3/validator-logs/final-browser-hash-bound-run.log',
 'deliveries/FINISH-B1-R3/validator-logs/door-negative-concurrent-baseline.json',
 'deliveries/FINISH-B1-R3/validator-logs/door-positive-sweep-baseline.json',
 'deliveries/FINISH-B1-R3/validator-logs/historical-proxy-failure-reconciliation.json',
 'deliveries/FINISH-B1-R3/validator-logs/path-guard-and-baseline-restoration.json',
 'deliveries/FINISH-B1-R3/validator-logs/static-batch-report.json',
 'deliveries/FINISH-B1-R3/validator-logs/fixture-static-batch-report.json',
 'deliveries/FINISH-B1-R3/validator-logs/capture-exposure-check.json',
 'deliveries/FINISH-B1-R3/validator-logs/input-hashes.json',
 'deliveries/FINISH-B1-R3/validator-logs/resident-manifest.json',
 'deliveries/FINISH-B1-R3/validator-logs/skeleton-comparison.json',
 'deliveries/FINISH-B1-R3/captures/index.json','deliveries/FINISH-B1-R3/captures/native/index.json',
]
# Governance inputs are hashed from the committed FINISH-20 source.
inputs=[]
for p in gov_paths:
    data=blob(GOV,p); oid=git('rev-parse',f'{GOV}:{p}').decode().strip()
    inputs.append({'sourceCommit':GOV,'path':p,'bytes':len(data),'sha256':sha(data),'gitBlobOid':oid})
# Candidate evidence is copied byte-for-byte into an explicitly inherited evidence subdirectory.
for p in candidate_paths:
    data=blob(CAND,p); oid=git('rev-parse',f'{CAND}:{p}').decode().strip()
    rel=p.replace('deliveries/FINISH-B1-R3/','',1)
    dest=ROOT/'inherited-evidence'/'candidate' / rel
    dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(data)
    inputs.append({'sourceCommit':CAND,'path':p,'bytes':len(data),'sha256':sha(data),'gitBlobOid':oid,'copyPath':str(dest.relative_to(ROOT)).replace('\\','/')})
# Stage the exact exports and all candidate scripts required for independent reruns.
listing=git('ls-tree','-r','-z','--name-only',CAND,'--','deliveries/FINISH-B1-R3/assets/','deliveries/FINISH-B1-R3/scripts/','deliveries/FINISH-B1-R3/source/harness/')
staged=[]
for raw in listing.split(b'\0'):
    if not raw: continue
    p=raw.decode('utf-8','surrogateescape'); data=blob(CAND,p)
    rel=p
    dest=put(rel,data)
    staged.append({'path':p,'stagePath':str(dest.relative_to(STAGE)).replace('\\','/'),'bytes':len(data),'sha256':sha(data),'gitBlobOid':git('rev-parse',f'{CAND}:{p}').decode().strip()})
# Stage immutable design reference and exact base runtime sources needed to examine ownership.
extra=[(GOV,'references/images/main-reference.png','references/images/main-reference.png'),
       (BASE,'app/src/features/world/EntranceCoordinator.ts','app/src/features/world/EntranceCoordinator.ts'),
       (BASE,'app/src/features/world/CharacterDirector.ts','app/src/features/world/CharacterDirector.ts'),
       (BASE,'app/src/features/world/CameraDirector.ts','app/src/features/world/CameraDirector.ts'),
       (BASE,'app/package.json','app/package.json'),
       (R2,'deliveries/FINISH-B1-R2/source/blender/scripts/build-environment.py','r2-baseline/source/blender/scripts/build-environment.py'),
       (R2,'deliveries/FINISH-B1-R2/source/blender/scripts/build-resident-fixture.py','r2-baseline/source/blender/scripts/build-resident-fixture.py')]
for commit,p,destrel in extra:
    data=blob(commit,p); dest=put(destrel,data)
    inputs.append({'sourceCommit':commit,'path':p,'bytes':len(data),'sha256':sha(data),'gitBlobOid':git('rev-parse',f'{commit}:{p}').decode().strip(),'stagePath':str(dest.relative_to(STAGE)).replace('\\','/')})
receipt={
 'generatedAtUtc':datetime.now(timezone.utc).isoformat(),
 'candidate':{'commit':CAND,'tree':git('show','-s','--format=%T',CAND).decode().strip(),'parent':git('show','-s','--format=%P',CAND).decode().strip(),'deliveryTree':git('rev-parse',f'{CAND}:deliveries/FINISH-B1-R3').decode().strip(),'workingHead':git('rev-parse','HEAD').decode().strip(),'workingDeliveryTree':git('rev-parse','HEAD:deliveries/FINISH-B1-R3').decode().strip(),'workingCandidatePathClean':not bool(git('status','--porcelain','--','deliveries/FINISH-B1-R3').strip())},
 'acceptedBase':{'commit':BASE,'appTree':git('rev-parse',f'{BASE}:app').decode().strip()},
 'candidateAppDiffFromBase':git('diff','--name-status',BASE,CAND,'--','app').decode().splitlines(),
 'candidateFinalCommitDiffFromParent':git('diff','--name-status',receipt_parent:=git('show','-s','--format=%P',CAND).decode().strip(),CAND,'--','deliveries/FINISH-B1-R3').decode().splitlines(),
 'candidatePackage':{'trackedFiles':len(git('ls-tree','-r','--name-only',CAND,'--','deliveries/FINISH-B1-R3/').decode().splitlines()),'treeOid':git('rev-parse',f'{CAND}:deliveries/FINISH-B1-R3').decode().strip()},
 'governanceCommit':GOV,
 'inputFiles':inputs,
 'stagedCandidateFiles':staged,
}
(ROOT/'input-hashes.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'candidate':receipt['candidate'],'appDiffCount':len(receipt['candidateAppDiffFromBase']),'candidateFinalCommitDiff':receipt['candidateFinalCommitDiffFromParent'],'governanceInputs':len(gov_paths),'inheritedEvidenceFiles':len(candidate_paths),'stagedCandidateFiles':len(staged),'stagedBytes':sum(x['bytes'] for x in staged),'inputHashRecords':len(inputs)},indent=2))


