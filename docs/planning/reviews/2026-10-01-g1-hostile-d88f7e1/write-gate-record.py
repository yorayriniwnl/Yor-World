"""Create the append-only parent decision after evidence and prose are finalized."""
from pathlib import Path
import hashlib,json,datetime,subprocess
out=Path(__file__).resolve().parent;root=out.parents[3]
sha=lambda b:hashlib.sha256(b).hexdigest()
identity=json.loads((out/'identity.json').read_text(encoding='utf-8'))
w2rel='docs/planning/acceptances/W2-F1-r2-fe1a40f-2026-10-01.json'
w2=json.loads((root/w2rel).read_text(encoding='utf-8'))
assert sha((root/w2rel).read_bytes())=='24136bf40fd93965844a8082cc666521dae33fb0bf8ab4bd9bfeda748c380155'
assert all(x['unchanged'] for x in identity['candidates'].values())
evidence={p.relative_to(root).as_posix():{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in out.rglob('*') if p.is_file() and p.name!='evidence-sha256.json'}
(out/'evidence-sha256.json').write_text(json.dumps({'policy':'Exact archived file bytes; this manifest excludes itself to avoid recursion. Git/checkout newline variants are explicitly bridged in identity.json.','files':evidence},indent=2),encoding='utf-8')
reviewPaths=['reviews/gemini-3/w2-review.md','reviews/claude-01/review.md','reviews/claude-13/review.md','reviews/claude-10/review.md','reviews/claude-13/G1.md','reviews/claude-15/review.md','docs/planning/reviews/2026-10-01-g1-adversarial-audit.md','docs/planning/reviews/2026-10-01-w1-w2-w3-gate-00d9d93.md','docs/planning/reviews/2026-10-01-proof-gate-closure-d88f7e1.md','docs/planning/reviews/2026-10-01-g1-hostile-d88f7e1.md']
reviews=[]
for p in reviewPaths:
    item={'path':p,'inspectedFileSha256':sha((root/p).read_bytes())}
    g=subprocess.run(['git','show',identity['candidate']+':'+p],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    if g.returncode==0:item.update(gitBlobSha256=sha(g.stdout),evidenceRevision=identity['candidate'])
    else:item.update(gitBlobSha256=item['inspectedFileSha256'],evidenceRevision='new or preserved file in decision commit; scoped -text attribute preserves canonical bytes')
    reviews.append(item)
record={
 'recordId':'PROOF-GATE-d88f7e1-2026-10-01','recordVersion':1,'date':'2026-10-01','recordedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'authority':'Parent Codex, sole technical acceptance authority under current user instruction',
 'immutabilityPolicy':'Append-only decision, exact-byte SHA-256 receipt and Git commit. No external signature, hardware immutability or provider authentication is claimed. Append a superseding decision rather than edit a published record.',
 'examinedLiveRevision':identity['candidate'],'remoteObservation':identity['remoteMainAtEnd'],
 'candidateIdentities':identity['candidates'],
 'decisions':{
  'W1':{'decision':'W1 REWORK','acceptedSourceRevision':None,'candidateSourceRevision':identity['candidates']['W1']['sourceRevision'],'openBlockers':['W1-02','W1-03','W1-04 / REV-01'],'knownNonBlockingLimitations':['Blockout art, final material/lighting and reference-rights approval outstanding','Sampling is not continuous collision certification','Production camera/device qualification downstream']},
  'W2':{'decision':'W2 ACCEPT','acceptedSourceRevision':w2['acceptedSourceRevision'],'acceptanceRecord':w2rel,'acceptanceRecordSha256':sha((root/w2rel).read_bytes()),'manifest':w2['manifest'],'archive':w2['canonicalArchive'],'evidenceRevision':w2['evidenceRevision'],'originalAcceptanceCommit':'0691981c6dc155fb001763281241d2408a120596','reviewIdentities':w2['reviewIdentities'],'knownNonBlockingLimitations':w2['knownNonBlockingLimitations']},
  'W3':{'decision':'W3 REWORK','acceptedSourceRevision':None,'candidateSourceRevision':identity['candidates']['W3']['sourceRevision'],'openBlockers':['W3-04 / I1-F3 / C02-03','W3-02 / REV-01'],'knownNonBlockingLimitations':['Provisional semantic content and no backend are intentional proof scope','Physical AT/device and full production controller verification downstream','Dated dependency/advisory evidence is not current release-security clearance; no new security audit claimed']}
 },
 'reviewSubstitutionDecision':{'packet':'W2 only','decision':'Parent explicitly accepts the functional contract/export review substitution already disclosed by the retained W2 record.','actualDeclaredProvider':'Google Gemini 3.8 Flash for the Claude-01 and Claude-13 lanes; Anthropic execution unverified','independenceBasis':'W2-specific hash-bound review findings plus separately executed parent native/export checks and independent Gemini-3 recording review. Current actual-GLB regression provides additional independently executed motion/placement checks. No maker self-approval is used as sole acceptance evidence.','limitations':'Provider/model labels are declarations, not authenticated execution attestations; unrelated W1/W3 hash mistakes are not relied upon.'},
 'supersedesAcceptanceClaimsIn':['docs/planning/reviews/2026-10-01-reconciliation-02.md','docs/planning/reviews/2026-10-01-reconciliation-03.md'],
 'priorParentDecisionCommit':'0691981c6dc155fb001763281241d2408a120596',
 'evidenceRevisionMeaning':'Candidate and pre-existing evidence are pinned to examinedLiveRevision; preserved earlier reviewer executions are pinned to priorParentDecisionCommit. New execution evidence is bound by the exact file-digest manifest committed alongside this record.',
 'currentEvidenceManifest':{'path':(out/'evidence-sha256.json').relative_to(root).as_posix(),'sha256':sha((out/'evidence-sha256.json').read_bytes())},
 'reviewedRecords':reviews,
 'g1':{'gate':'G1 LOCKED','existingCandidateAudit':'REWORK G1','sourceRevision':identity['candidate'],'sourceTree':identity['candidates']['G1']['tree'],'exactAcceptedInputs':{'W1':None,'W2':w2['acceptedSourceRevision'],'W3':None},'newImplementationPacketIssued':False,'integrationPerformed':False,'currentBlockingAuditFindings':['G1-H01','G1-H02','G1-H03','G1-H04','G1-H05','G1-H06','G1-H07','G1-H08','G1-H10'],'downstreamAuditLimitations':['G1-H09','G1-H11','G1-H12']},
 'remainingCorrectionScope':'docs/planning/reconciliation-packets/2026-10-01-proof-gate-close-01.md'
}
target=root/'docs/planning/acceptances/PROOF-GATE-d88f7e1-2026-10-01.json'
assert not target.exists(),'Append-only record already exists; do not overwrite.'
target.write_text(json.dumps(record,indent=2),encoding='utf-8')
(target.parent/(target.name+'.sha256')).write_text(sha(target.read_bytes())+'  '+target.name+'\n',encoding='utf-8')
print('Gate record SHA256',sha(target.read_bytes()));print('Evidence manifest SHA256',sha((out/'evidence-sha256.json').read_bytes()))
