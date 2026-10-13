"""Bind audit instructions, execution observations and stable output inventory."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parent
REPO=next(p for p in ROOT.parents if (p/'.git').exists())
def sha(data): return {'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
def write(path,value): path.write_bytes((json.dumps(value,indent=2)+'\n').encode())
def git(*args):
    p=subprocess.run(['git',*args],cwd=REPO,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    assert p.returncode==0,p.stderr
    return p.stdout
head=git('rev-parse','HEAD').decode().strip()
names=[
    'AGENTS.md',
    'START_HERE.md',
    'docs/planning/delegation-and-work-orders.md',
    'docs/planning/reconciliation-packets/2026-10-11-finish-26-c1-r7-audit-root-reallocation.md',
    'docs/planning/reconciliation-packets/2026-10-11-finish-23-c1-r7-delta-audit.md',
    'docs/planning/reconciliation-packets/2026-10-11-finish-21-c1-r6-receipt-correction.md',
    'docs/planning/reconciliation-packets/2026-10-11-finish-21-r1-candidate-input-provenance.md',
    'docs/planning/reconciliation-packets/2026-10-11-finish-16-c1-r6-audit-reallocation.md',
    'deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/report.md',
    'deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/findings.json',
]
rows=[]
for name in names:
    data=(REPO/name).read_bytes()
    oid=git('rev-parse',head+':'+name).decode().strip()
    raw=git('cat-file','blob',oid)
    rows.append({'path':name,'observedWorkingFile':sha(data),'observedHeadGitBlob':{'commit':head,'blobOid':oid,**sha(raw)},'workingBytesEqualRawGitBytes':data==raw,'gitHashSource':'raw cat-file stdout; local working digest separately labelled'})
write(ROOT/'evidence/audit-input-binding.json',{'observedHead':head,'instructionsAndNamedPriorAuditInputs':rows,'candidateReceiptsReadFromPinnedRawGitObjects':'See evidence/commands.json and independent receipt files. This instruction receipt does not substitute current HEAD for any candidate pin.','occupiedFinish23Root':'Not inspected or hashed; expressly excluded'})
tools=json.loads((ROOT/'evidence/tool-versions.json').read_bytes())
negative=json.loads((ROOT/'evidence/negative-probes.json').read_bytes())
package=json.loads((ROOT/'evidence/package-negative-probes.json').read_bytes())
cli=json.loads((ROOT/'evidence/cli-negative-false-pass.json').read_bytes())
assert negative['passed']==23 and negative['failed']==3
assert package['passed']==7 and package['failed']==2
assert cli['actualExit']==0 and cli['status']=='FAIL'
assert len(negative['cases'])+len(package['cases'])+1==36
candidate=json.loads((ROOT/'evidence/candidate-binding.json').read_bytes())
assert candidate['candidateCommit']=='e2670d4152c461005da86b392dbcea12cec740bf'
assert git('rev-parse',head+':app').decode().strip()==candidate['candidateAppTree']
for record in candidate['outputs']:
    current=(REPO/record['path']).read_bytes()
    assert sha(current)=={k:record[k] for k in ('sha256','bytes')}
receipt={
    'schemaVersion':1,'audit':'FINISH-26','reviewer':'local Codex independent reviewer; external GPT Plus #2 NOT RUN',
    'candidateCommit':candidate['candidateCommit'],'stableFinalizationUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'rootAllocation':{'path':ROOT.relative_to(REPO).as_posix(),'recheckedAbsentImmediatelyBeforeCreation':True,'creationMethod':'PowerShell Test-Path -LiteralPath followed by New-Item only for owned root/.work and root/evidence','occupiedPreviousRootContentsInspected':False,'directoryCreationTimeUtc':datetime.datetime.fromtimestamp(ROOT.stat().st_ctime,datetime.timezone.utc).isoformat()},
    'commands':[
        {'command':'python -B audit-recompute.py','exitCode':1,'attempt':'initial','classification':'Auditor harness expected the maker JSON payload at root instead of its result envelope. Assertion corrected in audit helper; candidate unchanged.'},
        {'command':'python -B audit-recompute.py','exitCode':0,'attempt':'intermediate after envelope correction','utcStart':'2026-10-11T13:44:46.995080+00:00','utcEnd':'2026-10-11T13:45:22.672028+00:00','classification':'Raw receipts and primary negative cases passed reconstruction; three ignored metadata probes failed. Expanded declaration agreement checks were added before final rerun.'},
        {'command':'python -B audit-recompute.py','exitCode':0,'attempt':'final expanded reconstruction and fail-closed probes','utcStart':tools['auditBeganUtc'],'utcEnd':tools['auditEndedUtc'],'rawGitCommands':'evidence/commands.json','positiveVerifierResult':'evidence/verifier-rerun.log'},
        {'command':'python -B audit-package-negatives.py','exitCode':0,'result':'Seven correct rejections and two false PASS metadata cases; real installed files unchanged','evidence':'evidence/package-negative-probes.json'},
        {'command':'python -B audit-cli-negative.py','exitCode':0,'classification':'Probe harness completed; inner exact verifier CLI unexpectedly exits 0 with corrupted duplicated sourceManifest hash','evidence':'evidence/cli-negative-false-pass.log'},
        {'command':'python -B finalize-audit.py','exitCode':1,'attempt':'initial','classification':'Auditor LF-only assertion rejected preserved raw stdout CRLF in log; log was kept unchanged and log Git attribute changed to -text.'},
        {'command':'python -B finalize-audit.py','exitCode':0,'attempt':'final','classification':'Stable manifest written and every row reread byte-for-byte; authored text LF and raw logs preserved.'}
    ],
    'negativeChecks':{'total':36,'correctRejections':30,'falsePassChecks':6,'distinctIgnoredMetadataCases':5},
    'toolVersions':tools,
    'setupObservation':'The absence check and owned-root creation succeeded. A later Get-Date -AsUTC convenience command was unsupported by this PowerShell; UTC observations use Python datetime and explicit raw command timestamps. No candidate verification depended on it.',
    'boundaries':{'candidateEdits':False,'historicalCandidateOrAuditEdits':False,'canonicalAppEdits':False,'productionDependencyEdits':False,'gitIndexEdits':False,'commitOrPush':False,'fixOrAcceptance':False},
    'runtimeAndExternalChecks':'NOT RUN by this evidence-only delta audit; FINISH-16 runtime advice is inherited within original scope. Parent acceptance and E-01 adjudication pending.'
}
write(ROOT/'evidence/execution-receipt.json',receipt)
outputs=[]
for path in sorted(ROOT.rglob('*')):
    if not path.is_file(): continue
    relative=path.relative_to(ROOT).as_posix()
    if relative=='output-hashes.json' or relative.startswith('.work/'): continue
    data=path.read_bytes()
    data.decode('utf-8')
    assert not data.startswith(b'\xef\xbb\xbf'),relative
    if not relative.endswith('.log'): assert b'\r' not in data,relative
    outputs.append({'path':relative,**sha(data)})
manifest={'schemaVersion':1,'audit':'FINISH-26 C1-R7 exact-candidate delta review','candidateCommit':candidate['candidateCommit'],'fileCount':len(outputs),'totalBytes':sum(r['bytes'] for r in outputs),'excluded':['output-hashes.json','.work/'],'outputs':outputs}
write(ROOT/'output-hashes.json',manifest)
for row in outputs: assert sha((ROOT/row['path']).read_bytes())=={k:row[k] for k in ('sha256','bytes')}
print(json.dumps({'manifest':sha((ROOT/'output-hashes.json').read_bytes()),'fileCount':manifest['fileCount'],'totalBytes':manifest['totalBytes'],'paths':[r['path'] for r in outputs]},indent=2))
