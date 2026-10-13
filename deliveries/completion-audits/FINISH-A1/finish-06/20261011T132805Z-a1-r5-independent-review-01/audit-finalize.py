from pathlib import Path
import json,hashlib,re,os
ROOT=Path(__file__).resolve().parent; REPO=Path.cwd(); D='deliveries/FINISH-A1/r5-05/'
def sha(raw): return hashlib.sha256(raw).hexdigest()
def dump(name,value): (ROOT/name).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
def load(name): return json.loads((ROOT/name).read_text())
inputs=load('input-verification.json')
for p in ['docs/planning/production-prompts/repairs-2026-10-11/01-GEMINI1-PLATFORM.md','docs/planning/production-prompts/repairs-2026-10-11/07-GEMINI1-A1-R4.md','docs/planning/reconciliation-packets/2026-10-11-finish-05.md','docs/planning/reviews/2026-10-11-finish-04-reaudit.md','references/images/main-reference.png']:
    raw=(REPO/p).read_bytes(); inputs.append({'path':p,'bytes':len(raw),'sha256':sha(raw),'status':'PASS','purpose':'Additional directly inspected governing input or visual reference'})
inputs=list({row['path']:row for row in inputs}.values())
dump('input-verification.json',inputs)
# Distinguish external dependency junctions from actual build-output files.
buildroot=Path('C:/yw-r5c/app/.next'); physical=[]; links=[]
for current,dirs,files in os.walk(buildroot):
    for d in list(dirs):
        p=Path(current)/d
        if p.is_junction() or p.is_symlink():
            links.append({'path':str(p.relative_to(buildroot)).replace('\\','/'),'target':str(p.resolve())}); dirs.remove(d)
    physical += [str((Path(current)/f).relative_to(buildroot)).replace('\\','/') for f in files]
build=load('build-verification.json'); manifestpaths={r['path'] for r in build['rows']}
build['dependencyJunctionsExcludedFromOutputFiles']=links
build['extraActualFilesIncludingTraversedJunctionDependencies']=build.pop('extraActualFiles',build.get('extraActualFilesIncludingTraversedJunctionDependencies',[]))
build['actualPhysicalFileCount']=len(physical); build['extraPhysicalOutputFiles']=sorted(set(physical)-manifestpaths)
build['physicalOutputInventoryStatus']='PASS' if set(physical)==manifestpaths else 'FAIL'
build['scope']='All 630 physical build-output files and bytes verified. Six external package junctions are dependency inputs, excluded from physical output inventory. Installed dependency versions are maker receipts, not full package-content verification.'
dump('build-verification.json',build)
findings=[
 {'id':'A1R5-01','severity':'P2','status':'FAIL','title':'Strict DTO shapes diverge from the frozen accepted API contract','locations':[D+'source/app/src/server/media/manifest.ts:26',D+'source/app/src/server/content/preview.ts:37',D+'source/app/src/server/content/preview.ts:80'],
  'contract':['docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md:81','docs/planning/production-prompts/repairs-2026-10-11/01-GEMINI1-PLATFORM.md:46'],
  'reproduction':'The first three independent probes reject valid frozen objects: approvalAudit {eventId,createdAt} is replaced by {id,action,createdAt}; PrivateDraftReview requires an unallocated previewProjectId; ReviewCheck rejects the explicitly allocated site scope/generic id. The current schema is internally coherent for its own output, but that does not satisfy exact DTO ownership.',
  'impact':'Downstream consumers of the accepted DTO cannot parse/submit the prescribed shapes. No publish authorization bypass is claimed.',
  'evidence':['audit-contract-probes.test.ts','independent-contract-probes-final.log'],'clauses':['A3-02','FINISH-12-03']},
 {'id':'A1R5-02','severity':'P2','status':'FAIL','title':'Healthy publication refresh always fails because client and API response keys disagree','locations':[D+'source/app/src/features/admin/publish-review.tsx:79',D+'source/app/src/features/admin/publish-review.tsx:100',D+'source/app/src/app/api/admin/publish/route.ts:34'],
  'contract':['docs/planning/production-prompts/repairs-2026-10-11/01-GEMINI1-PLATFORM.md:90'],
  'reproduction':'Actual owner GET /api/admin/publish returns200 with currentRevision,activePublication,history,authorizedActor. Both refreshReview and refreshAfterCommit require publicationResponse.publication, which is absent. The corresponding independent API probe fails. The supplied rollback screenshot already shows active r3, reviewed expected r1, incomplete refresh feedback, and a stale-review prompt.',
  'impact':'Refresh review cannot recover stale publication identity. After successful publish/rollback the in-page review remains stale and publishing is disabled until page reload. The browser test forces one failed refresh and checks only committed feedback thereafter, allowing this real failure to pass.',
  'evidence':['audit-contract-probes.test.ts','independent-contract-probes-final.log',D+'evidence/publish-rollback-review.png',D+'source/app/tests/e2e/platform/completion-authoring-workflow.spec.ts:177'],'clauses':['A3-05-REFRESH','A3-06-BROWSER']},
 {'id':'A1R5-03','severity':'P2','status':'FAIL','title':'Missing genuine private draft throws before the intended not-found branches','locations':[D+'source/app/src/server/content/preview.ts:98',D+'source/app/src/app/api/admin/preview/route.ts:24',D+'source/app/src/app/admin/preview/[slug]/page.tsx:17'],
  'contract':['docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md:108'],
  'reproduction':'An authenticated owner requesting the known CandidateX ID with an empty explicit draft registry receives503. A requested-project review requires exactly one draft; with none it throws before the API404 check and before page notFound(). The API result is directly reproduced; the page exception path is source inspection, not an independent browser run.',
  'impact':'Ordinary absence is reported as temporary backend failure; the page cannot reach its not-found path. Denial and privacy headers still pass.',
  'evidence':['audit-contract-probes.test.ts','independent-contract-probes-final.log'],'clauses':['A3-04-NOTFOUND']},
 {'id':'A1R5-04','severity':'P2','status':'FAIL','title':'Authorized stale-save conflicts omit the required current draft identity and content','locations':[D+'source/app/src/app/api/admin/projects/route.ts:71',D+'source/app/src/server/content/revisions.ts:18'],
  'contract':['docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md:114'],
  'reproduction':'Save a fixture with current revision2 using expectedRevision1. The owner receives409 with only error and code; no current project/title or current draft/review identity is returned. The independent test logs the entire response and fails the current-content assertion.',
  'impact':'The documented authorized conflict handoff is missing even though the unsaved buffer remains intact and durable writes reject. No unauthorized content exposure is claimed.',
  'evidence':['audit-contract-probes.test.ts','independent-contract-probes-final.log'],'clauses':['A3-04-CONFLICT']},
 {'id':'A1R5-05','severity':'P2','status':'FAIL','title':'Draft image renderer accepts absolute and traversal-containing URLs','locations':[D+'source/app/src/features/portfolio/case-study.tsx:36'],
  'contract':['docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md:110'],
  'reproduction':'Independent React server rendering emits img for both http://yor-world.local/api/admin/preview/media/fixture and /discard/../api/admin/preview/media/fixture. The helper validates normalized origin/path but renders the original string; neither is the exact allowed relative URL.',
  'impact':'The required narrow renderer boundary is not enforced. Current server media resolver supplies the safe relative path, so no route-auth bypass, XSS or attacker-controlled production URL exploit was reproduced.',
  'evidence':['audit-contract-probes.test.ts','independent-contract-probes-final.log'],'clauses':['A3-04-RENDERER']},
 {'id':'A1R5-06','severity':'P2','status':'FAIL','title':'New authoring inputs still invent valid nonempty content and link check dates','locations':[D+'source/app/src/features/admin/project-editor.tsx:59',D+'source/app/src/features/admin/project-editor.tsx:90',D+'source/app/src/features/admin/structured-block-editor.tsx:40',D+'source/app/src/features/admin/structured-block-editor.tsx:95'],
  'contract':['docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md:114','docs/planning/production-prompts/corrections-2026-10-10/01-GEMINI1-A1-R3.md:25'],
  'reproduction':'Source directly inserts New Section/New section content., New paragraph., and New list item as valid nonempty project content. Add link also inserts Documentation + https://example.com/docs + checkedAt=now without asking for a real record. New evidence correctly uses unknown/null, but the other defaults do not follow the accepted instruction to request real content.',
  'impact':'These invented values can be saved and reviewed as ordinary authored content without being replaced; existing checks validate structure/record syntax and do not distinguish these generated values. This is a source finding; no independent additional browser execution is claimed.',
  'evidence':[D+'source/app/src/features/admin/project-editor.tsx',D+'source/app/src/features/admin/structured-block-editor.tsx'],'clauses':['A3-04-REAL-INPUTS']}
]
# Attach source snippets using exact line numbers, rather than estimated anchors.
lineNeedles={
 'A1R5-01': [('app/src/server/media/manifest.ts','approvalAudit: z.strictObject'),('app/src/server/content/preview.ts','scope: z.literal("project")'),('app/src/server/content/preview.ts','previewProjectId: ProjectIdSchema.nullable()')],
 'A1R5-02': [('app/src/features/admin/publish-review.tsx','async function refreshAfterCommit'),('app/src/features/admin/publish-review.tsx','async function refreshReview'),('app/src/app/api/admin/publish/route.ts','activePublication: active')],
 'A1R5-03': [('app/src/server/content/preview.ts','A private project preview must contain'),('app/src/app/api/admin/preview/route.ts','const review = await generateDraftReview'),('app/src/app/admin/preview/[slug]/page.tsx','const review = await generateDraftReview')],
 'A1R5-04': [('app/src/app/api/admin/projects/route.ts','return privateResponse({ error: err.message, code: err.code }, err.status)'),('app/src/server/content/revisions.ts','export class RevisionConflictError')],
 'A1R5-05': [('app/src/features/portfolio/case-study.tsx','const parsed = new URL(approvedUrl')],
 'A1R5-06': [('app/src/features/admin/project-editor.tsx','New section content.'),('app/src/features/admin/project-editor.tsx','https://example.com/docs'),('app/src/features/admin/structured-block-editor.tsx','New paragraph.'),('app/src/features/admin/structured-block-editor.tsx','New list item')]
}
sourceInspection=[]
for f in findings:
    locations=[]
    for path,needle in lineNeedles[f['id']]:
        lines=(REPO/D/'source'/path).read_text('utf-8').splitlines()
        line=next(i for i,value in enumerate(lines,1) if needle in value)
        locations.append(D+'source/'+path+':'+str(line))
        sourceInspection.append({'finding':f['id'],'path':D+'source/'+path,'line':line,'snippet':lines[line-1]})
    f['locations']=locations
dump('source-inspection.json',sourceInspection)
dump('findings.json',{'format':'YOR-WORLD-FINISH-24-INDEPENDENT-FINDINGS-v1','advice':'REWORK','overallStatus':'FAIL','reviewer':'local Codex independent reviewer; external GPT Plus #2 NOT RUN','candidateCommit':'8f3aa566f36c92bb98658090ef91f9bfa96e8a79','implementationAcceptance':False,'canonicalIntegrationAuthorized':False,'findings':findings})
maker=json.loads((REPO/(D+'requirement-matrix.json')).read_bytes())
byClause={}
for f in findings:
    for clause in f['clauses']: byClause.setdefault(clause,[]).append(f['id'])
reviewRows=[]
for row in maker['rows']:
    clause=row['clause']; refs=byClause.get(clause,[])
    status='FAIL' if refs else row['status']
    sourceExists=[]; evidenceExists=[]
    for path in row['sourcePaths']:
        target=ROOT/'.work/replay'/path if path.startswith('app/') else REPO/D/path
        sourceExists.append({'path':path,'status':'PASS' if target.exists() else 'FAIL','resolvedScope':'Exact-base replay for canonical app paths; maker package otherwise'})
    for path in row['evidencePaths']:
        evidenceExists.append({'path':D+path,'status':'PASS' if (REPO/D/path).exists() else 'FAIL'})
    reviewerEvidence=['candidate-binding.json','replacement-verification.json','output-verification.json']
    if any(t in clause for t in ['HASH','FINISH-12-01','A1-03']): reviewerEvidence+=['independent-unit.log','independent-integration.log']
    if any(t in clause for t in ['MEDIA','STREAM','DURABLE','A1-05','API','FINISH-12-02']): reviewerEvidence+=['independent-integration.log']
    if any(t in clause for t in ['BROWSER','FINISH-12-04']): reviewerEvidence+=['browser-verification.json','build-verification.json']
    if refs: reviewerEvidence+=['findings.json','audit-contract-probes.test.ts','independent-contract-probes-final.log']
    notes='Independent source inspection and maker artifact verification; exact unchanged local suites reproduced. '+row['limits']
    if clause in ['FINISH-12-03','A3-02']: notes+=' Malformed DTO probes are rejected and positive candidate-shape parsing passes, but accepted wire-shape compatibility fails A1R5-01.'
    if clause in ['A3-06-LOCAL']: notes+=' Reviewer reproduced only unit/integration suites. Maker lint/typecheck/build raw exit0 receipts are verified; reviewer did not rerun these commands. Available exact build bytes independently matched all630 output rows.'
    if clause in ['A3-06-BROWSER','A3-04-BROWSER','FINISH-12-04']: notes+=' Maker6/6 result integrity passes. Reviewer browser rerun NOT RUN. Real synthetic picker/save/reopen/private PNG rendering is established; complete workflow clearance is limited by refresh/default-content findings where mapped.'
    if clause=='FINISH-12-05': notes+=' Standalone matrix exists and its links resolve; the unsupported PASS conclusions are superseded by this independent matrix.'
    if clause in ['A3-03-STREAM','FINISH-12-02']: notes+=' Source requests reader.cancel on overflow/error. Maker tests explicitly observe overflow cancellation and streaming AbortSignal; stream-error test observes failure but not cancel-call count. Signed-URL creation is timed out by a promise race; cancellation of the underlying provider request was not demonstrated.'
    reviewRows.append({'clause':clause,'requirement':row['requirement'],'makerStatus':row['status'],'status':status,'findings':refs,'sourcePaths':row['sourcePaths'],'makerEvidencePaths':[D+p for p in row['evidencePaths']],'reviewerEvidence':reviewerEvidence,'resolvedSourcePaths':sourceExists,'resolvedEvidencePaths':evidenceExists,'scope':notes})
for clause,requirement,refs in [
 ('A3-05-REFRESH','A successful server review/publication refresh is consumed correctly and restores the current review identity.',['A1R5-02']),
 ('A3-04-NOTFOUND','Known private project without a genuine saved draft returns the intended not-found state.',['A1R5-03']),
 ('A3-04-CONFLICT','Authorized stale-save conflict returns current draft identity and content.',['A1R5-04']),
 ('A3-04-RENDERER','Draft images accept only the exact relative private route without traversal/query/fragment.',['A1R5-05']),
 ('A3-04-REAL-INPUTS','New section/block/link inputs request real content and record data.',['A1R5-06'])
]: reviewRows.append({'clause':clause,'requirement':requirement,'status':'FAIL','findings':refs,'scope':'Explicit inherited subrequirement missing from the maker matrix narrow row text. Preserve narrow passing results; complete A3 clause fails.','reviewerEvidence':['findings.json','source-inspection.json','audit-contract-probes.test.ts','independent-contract-probes-final.log']})
# Explicit grouped original A3 rows in addition to the maker's detailed split rows.
for clause, refs, text in [('A3-02',['A1R5-01'],'Mandatory review boundary passes; exact DTO compatibility fails.'),('A3-03',[],'Canonical full-content hash, local durable review/revalidation/media identity and byte checks pass; native-provider concurrency NOT RUN.'),('A3-04',['A1R5-03','A1R5-04','A1R5-06'],'Synthetic picker/preview is exercised; missing-draft, authorized conflict response, and invented authoring defaults fail.'),('A3-05',['A1R5-02','A1R5-05'],'Transactional publish/rollback and selected privacy cases pass; healthy refresh and exact draft-image URL constraints fail.'),('A3-06',['A1R5-02'],'Maker check receipts and reproduced suites pass; broad browser workflow PASS is insufficient to close the missed refresh behavior.')]:
    if not any(r['clause']==clause for r in reviewRows): reviewRows.append({'clause':clause,'status':'FAIL' if refs else 'PASS','findings':refs,'scope':text,'reviewerEvidence':['findings.json','independent-unit.log','independent-integration.log','browser-verification.json']})
for clause,text in [('REVIEWER-BROWSER-RERUN','Reviewer inspected maker Chromium JSON/log/screenshots and exact build bytes; did not launch a fresh browser.'),('REVIEWER-LINT-TYPECHECK-BUILD','Maker raw logs/exits are verified; no fresh reviewer lint/typecheck/build command.'),('EXTERNAL-GPT-PLUS-2','No external GPT Plus #2 account connected or run.'),('PARENT-ACCEPTANCE','Parent alone adjudicates; no acceptance issued.'),('G7','No G7 execution or acceptance.'),('NATIVE-MULTIPROCESS-RACES','PGlite/synthetic/mock evidence does not prove native PostgreSQL/Auth/Storage races or network cancellation.')]: reviewRows.append({'clause':clause,'status':'NOT RUN','scope':text,'findings':[]})
dump('requirement-matrix.json',{'format':'YOR-WORLD-FINISH-24-INDEPENDENT-REQUIREMENT-MATRIX-v1','candidateCommit':'8f3aa566f36c92bb98658090ef91f9bfa96e8a79','candidateAppTree':'cb42202d3be7f4f10c460d2e1b43db853910b87f','rows':reviewRows})
dump('prior-defect-reconciliation.json',{'rows':[
 {'priorFinding':'A1R4-01','FINISH12Correction':'FINISH-12-01','status':'PASS','reason':'Full publishable project bodies are hashed. Sorted code-point IDs, recursive object keys, preserved section/block arrays, body sensitivity, key-order invariance, CandidateX exclusion, site=null and full media preimage verified by source and independently reproduced unit tests.'},
 {'priorFinding':'A1R4-02','FINISH12Correction':'FINISH-12-02','status':'PASS','reason':'No download.arrayBuffer call remains at this helper. Declared oversize rejected before reads; streamed cap and overflow cancel; EOF-length mismatch; error fail-closed; shared10s signed-creation and streaming timeout are covered by reproduced integration suite. Native/provider request cancellation remains NOT RUN.'},
 {'priorFinding':'A1R4-03','FINISH12Correction':'FINISH-12-03','status':'PASS','correctionOverallStatus':'FAIL','remainingFindings':['A1R5-01'],'reason':'Original malformed drafts/duplicates/timestamps/actors/unsafe revisions/check coherence/canPublish inputs are now rejected. Positive candidate DTOs parse. The frozen accepted DTO shapes are nevertheless replaced; A1R5-01 is a different remaining defect.'},
 {'priorFinding':'A1R4-04','FINISH12Correction':'FINISH-12-05','status':'PASS','reason':'Complete standalone matrix returned with resolvable paths and local/native limits. Overbroad PASS claims are reconciled in the independent matrix rather than accepted.'},
 {'priorFinding':'A1R4-05','FINISH12Correction':'FINISH-12-04','status':'PASS','reason':'Actual Chromium selects synthetic101-byte16x12 PNG in the real picker, saves/reopens CandidateX and displays guarded proxy bytes. Source/result JSON/raw log/screenshots/exact build binding verified. Fixture remains not provider-approved; independent reviewer browser execution NOT RUN.'}
]})
dump('preflight.json',{'status':'PASS','auditRoot':str(ROOT),'allocationRecheck':'Exact Test-Path check was false immediately before New-Item .work; directory created successfully. No collision occurred.','writeBoundary':'All reviewer files and scratch created only beneath this root. Dependencies are accessed through a scratch junction using cache=false and configLoader=runner. Existing candidate/build only read.','independentLocalSuites':{'unit':{'status':'PASS','files':24,'tests':316,'exitCode':0},'integration':{'status':'PASS','files':28,'tests':306,'exitCode':0}},'independentContractProbes':{'status':'FAIL','assertions':8,'failed':8,'exitCode':1},'exploratoryFailures':['Initial unquoted PowerShell revision expression was interpreted as encodedCommand; failed lookup was not used for binding. Python subprocess-array lookup succeeded.','Initial source reads omitted source/app prefix and returned missing-path errors; corrected literal source/app paths were directly inspected.','Initial probe wrapper encountered a cp1252 console-print error after storing the actual Vitest exit/log. The final UTF-8 wrapper and final eight-probe run succeeded as an orchestrator with Vitest exit1; both raw probe logs remain.'],'committedOrPushed':False,'productionFixed':False})
report='''# FINISH-24 independent A1-R5 audit

Recommendation: **REWORK**. Local source/contract and workflow checks **FAIL** for six findings. This is a local Codex independent review; external GPT Plus #2 execution is **NOT RUN**. Parent acceptance and canonical integration remain **NOT RUN** and are not authorized by this report.

The reviewed delivery is exact commit `8f3aa566f36c92bb98658090ef91f9bfa96e8a79`, full tree `4b0f51f7462af578422cca05c3e30c9bfc0b4c8f`, parent `29400979676c1005e18cead5d1457924a2394963`. Its assembled app tree is `cb42202d3be7f4f10c460d2e1b43db853910b87f`. The commit itself preserves canonical app tree `42ea29ec235225046a75959eb19eb386ac2f821d`; the assembly tree is derived from the delivery patch, not the commit's canonical app directory. Immutable base is `f62a43c5e71c00dcb89e28275ea81d842167db80`.

Patch SHA-256: `945bee3ccf793d56f6ffc2319cf3d6ede52a9f8bec665ac3d568272f1a179b41`. Maker output-manifest SHA-256: `a54f2796bd8cee902b4b0f70266545d4130698914bede71fedd00b85f19f24f1`. Accepted design output manifest: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.

The remote branch had advanced to `618ac109ae949019c327b8ec6c524809f4b6f23f` through later governance commits when inspected. Literal equality of branch head to candidate is **FAIL**, while exact candidate ancestry/reachability is **PASS**. This is reported explicitly; the later head was not substituted as the audit candidate. See `candidate-binding.json` and raw `git ls-remote`/ancestry command receipts.

## Findings

1. **A1R5-01 / FAIL:** frozen DTO compatibility fails. The approved `approvalAudit.eventId` becomes `id` plus required `action`; PrivateDraftReview requires an extra `previewProjectId`; the accepted generic site ReviewCheck seam is narrowed away. Three positive frozen-contract objects fail actual candidate schemas. Current candidate-shape validation is internally coherent, but is a substituted API contract.
2. **A1R5-02 / FAIL:** both healthy publication refresh paths expect `publication`, whereas GET /api/admin/publish returns `activePublication`. Refresh always reports an incomplete response, leaving the page's review stale after commit. The maker rollback screenshot already shows active r3 versus reviewed expected r1 and this exact failure. Its passing browser test misses recovery because it asserts committed feedback and deliberately injects one failed refresh.
3. **A1R5-03 / FAIL:** a known project with no genuine draft throws during strict review construction before intended not-found handling. The owner API returns503 instead of404; the private page's later notFound branch is also unreachable for this case by source inspection. Privacy headers are preserved.
4. **A1R5-04 / FAIL:** authorized stale saves return409 with only error/code, omitting the required current draft identity/content handoff. Rejection preserves the unsaved buffer and prevents writes; those passing properties do not supply the missing response data.
5. **A1R5-05 / FAIL:** draft rendering accepts an absolute `http://yor-world.local/...` URL and a traversal-containing relative URL because it validates a normalized path then renders the original URL. Independent React rendering reproduced both img outputs. The production resolver currently returns safe relative paths; no auth bypass or XSS exploit is claimed.
6. **A1R5-06 / FAIL:** new sections, paragraphs and list items still insert valid nonempty invented content; Add link invents example.com record data and a current check date. New evidence correctly defaults unknown/null. Direct source inspection establishes the remaining default-content violation; no additional browser execution is claimed for it.

`findings.json` gives exact candidate locations, contracts, reproductions, impacts and evidence. `audit-contract-probes.test.ts` is reviewer code executed only in scratch. Eight final assertions fail across findings01–05; these expected red reproductions are separate from the candidate's unchanged passing suites.

## Passing evidence and remaining scope

| Check | Status | Evidence and scope |
| --- | --- | --- |
| Exact package and input identity | PASS | 88 commit paths, all under r5-05; 87/87 raw Git output rows match local bytes. Accepted contract-manifest digest matches. All25 maker input receipts match the appropriate raw candidate Git or received local audit inputs. |
| Exact-base replay and ownership | PASS | Strict UTF-8 without BOM/NUL; apply/check/whitespace exit0; 25/25 replacements exact; only25 of26 allocated paths. Dependencies/content/auth/migrations/public pages/other lanes and published-media.test.ts unchanged. |
| Full candidate source versus available maker worktree | PASS | All251 candidate tracked app blobs match C:/yw-r5c/app raw bytes. This authenticates currently available source content, not historical authorship. |
| Unchanged unit suite | PASS | Reviewer24 files /316 tests, exit0; `independent-unit.log/.exit`. Includes full-body/order/key-order hash and strict malformed/positive candidate DTO cases. |
| Unchanged integration suite | PASS | Reviewer28 files /306 tests, exit0; `independent-integration.log/.exit`. PGlite, synthetic auth, mocked Storage. Stale-review/media mutation/no-partial-writes, durable revision, saves, byte checks, private proxy denial/headers and rollback in this local scope. |
| Available exact build bytes | PASS | All630 physical output files /116,591,312 bytes match the maker manifest; build ID rLA3QF1UjefZlpylb6Izw. Six external dependency junctions are recorded separately and excluded from the physical output inventory. |
| Maker Chromium result/binding inspection | PASS | Exact6/6 expected outcomes, zero unexpected/flaky/errors; raw logs/exits and all binding-linked hashes verify. Actual synthetic picker/save/reopen/guarded16x12 PNG source and screenshot inspected. The fixture is not provider-approved. |
| Maker lint/typecheck/build receipts | PASS | Final source-bound raw logs and exit0 receipts match package/binding. Fresh reviewer execution of these commands is NOT RUN. |
| Named static sentinel scan | PASS | Reviewer rechecked five exact local sentinels in the available bound build, no matches. This does not prove deployed/cache-wide privacy. |
| Fresh reviewer Chromium execution | NOT RUN | Maker browser evidence was inspected; no new browser/server was launched by reviewer. |
| Native/provider/deployed/device/recovery/manual gates | NOT RUN | No native PostgreSQL/Auth/Storage sessions, multiple-process races, real approval, deployment/CDN, physical devices/assistive technology, backup/recovery or manual operations were executed. |
| External GPT Plus #2, Parent acceptance, canonical integration, G7 | NOT RUN | No external account execution, acceptance, integration or production gate is claimed. |

Review hashing includes full publishable PublishedProject documents, sorted project IDs, recursive object-key canonicalization with ordered arrays preserved, A1 site=null, the actual asset-manifest revision and complete reviewed-media vector. CandidateX is excluded and remains nonpublishable. The original FINISH-10 hash omission and unbounded arrayBuffer findings no longer reproduce. Malformed DTOs now reject correctly; frozen DTO compatibility remains a distinct failure. Standalone matrix and actual synthetic image selection/preview evidence have been supplied. `prior-defect-reconciliation.json` resolves each prior finding to FINISH-12 and this candidate.

The media reader rejects oversized declared lengths before reading, accumulates at most5MiB, requests cancellation on overflow/error, checks EOF declared length, and bounds waiting for URL creation plus streaming with a shared10-second timer. The repeated integration suite explicitly observes overflow cancellation and streaming AbortSignal. Its stream-error case checks failure without observing cancel-call count. URL creation is abandoned through a timeout race; aborting the underlying provider signing request is not demonstrated and remains NOT RUN. No signed URL is returned in the review identity or private HTML.

Input receipts distinguish25 rows:21 bind exact raw candidate Git blobs, and four bind received local FINISH-10 audit files absent from that commit. Current START_HERE/work-order copies have legitimately evolved after the pinned candidate; their candidate blobs still match the receipts. No EOL or hash mismatch is inferred from these later governance changes. R4's historical writer/preservation uncertainty remains unresolved; it was not converted into R5 authorship proof. Occupied prior R5 roots and C:/yw-r5b were not used as candidate source or evidence.

The complete reviewer matrix independently resolves every maker FINISH-04/A1, split A3 and FINISH-12 row, plus explicit grouped A3-01 through06 and limits. Broad workflow/API/DTO PASS claims are FAIL where these findings apply. Passing maker receipts remain valid for the executed tests; they do not cover the missed assertions or accept the candidate.

## Artifact boundary

The exact audit root was absent immediately before creation. All reviewer writes, scripts, logs and disposable scratch remain beneath it. Canonical app, candidate, packets, accepted contracts and prior delivery roots were not edited. No fix, acceptance, integration, commit or push occurred. Parent must inspect this stable audit and issue any correction/acceptance decision separately.

Stable outputs: report.md, findings.json, requirement-matrix.json, candidate-binding.json, input/output/replacement/source/build/browser verification receipts, prior-defect-reconciliation.json, static-sentinel-verification.json, preflight.json, raw commands.json and test logs/exits, tool-versions.json, reviewer probes and reproducible audit scripts. output-hashes.json excludes itself and .work/. An early console encoding error is disclosed in preflight.json and does not alter the recorded subprocess exits; final probes use the corrected wrapper.
'''
for before,after in [('all25','all 25'),('all630','all 630'),('at most5MiB','at most 5 MiB'),('shared10-second','shared 10-second'),('synthetic101-byte16x12','synthetic 101-byte 16 × 12'),('10-second','10-second'),('6/6 expected','6/6 expected')]: report=report.replace(before,after)
(ROOT/'report.md').write_text(report,encoding='utf-8')
outputs=[]
# Avoid traversing disposable scratch and external dependency junctions.
stablePaths=[]
for current,dirs,files in os.walk(ROOT):
    dirs[:]=[d for d in dirs if d!='.work']
    stablePaths += [Path(current)/f for f in files]
for p in sorted(stablePaths):
    rel=p.relative_to(ROOT)
    if '.work' in rel.parts or str(rel)=='output-hashes.json' or not p.is_file(): continue
    raw=p.read_bytes(); outputs.append({'path':str(rel).replace('\\','/'),'bytes':len(raw),'sha256':sha(raw)})
dump('output-hashes.json',{'format':'YOR-WORLD-FINISH-24-INDEPENDENT-OUTPUT-HASHES-v1','hashPolicy':'SHA-256 raw bytes; excludes self and .work','files':outputs})
print(json.dumps({'advice':'REWORK','findings':len(findings),'matrixRows':len(reviewRows),'stableOutputs':len(outputs),'bytes':sum(r['bytes'] for r in outputs),'physicalBuildFiles':len(physical),'physicalBuildInventoryStatus':build['physicalOutputInventoryStatus']},indent=2))
