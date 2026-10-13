import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {approvedPublication} from '@/content/approved-publication';
import {setPlatformDbForTests} from '@/server/database';
import {setTestAuthRegistry} from '@/server/auth/require-owner';
import {setTestDraftRegistry,getProjectDraft,saveProjectDraft,RevisionConflictError} from '@/server/content/revisions';
import {setTestMediaRegistry,validateUpload,MAX_UPLOAD_BYTES,MediaValidationError} from '@/server/media/validate-upload';
import {generateDraftReview,computeReviewHash,PrivateDraftReviewSchema} from '@/server/content/preview';
import {readBoundedResponse,readReviewedMedia,listE2EApprovedMediaFixtures,setTestStorageTransportForTests,withPrivateMediaReadDeadline} from '@/server/media/manifest';
import {publishRevision,resetPublicationState,readPublicPublication} from '@/server/content/publish';
import {POST as publishPOST} from '@/app/api/admin/publish/route';
import {POST as projectsPOST} from '@/app/api/admin/projects/route';
import {POST as rollbackPOST} from '@/app/api/admin/rollback/route';
import {GET as previewGET} from '@/app/api/admin/preview/route';
import {GET as mediaGET} from '@/app/api/admin/media/route';
import {GET as proxyGET} from '@/app/api/admin/preview/media/[id]/route';
import {CaseStudy} from '@/features/portfolio/case-study';
import type {QueryableDb} from '@/server/contact/quota';
import type {OwnerContext} from '@/server/auth/types';

const storage=vi.hoisted(()=>({objects:new Map<string,Blob>(),downloads:[] as string[]}));
vi.mock('@/server/auth/clients',()=>({createAdminServiceRoleClient:()=>({storage:{from:()=>({download:async(key:string)=>{storage.downloads.push(key);return {data:storage.objects.get(key),error:null};}})}})}));
const actor:OwnerContext={userId:'11111111-1111-4111-8111-111111111111',email:'owner@fixture.test',role:'owner',active:true,assurance:'aal2'};
const id='22222222-2222-2222-2222-222222222222';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const observations:unknown[]=[];
function note(trigger:string,observed:unknown){observations.push({trigger,observed});}
function request(route:string,body?:unknown,token='owner'){return new Request('http://localhost'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,Origin:'http://localhost','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
let db:PGlite;
const queries:string[]=[];
let transactions=0;
let fixture:QueryableDb;
async function counts(){return (await db.query('SELECT (SELECT count(*)::int FROM public.published_content) AS content,(SELECT count(*)::int FROM public.publication_history) AS history,(SELECT count(*)::int FROM public.audit_events) AS audit')).rows;}
async function approvedImage(){
  const validated=await validateUpload({buffer:png,mime:'image/png',filename:'fixture.png'});
  const hash=createHash('sha256').update(png).digest('hex');
  expect(validated.hash).toBe(hash);
  storage.objects.set('approved/a.png',new Blob([png],{type:'image/png'}));
  storage.objects.set('approved/b.png',new Blob([png],{type:'image/png'}));
  await db.query("INSERT INTO public.media_assets(id,object_key,hash,mime,bytes,dimensions,provenance,approval_status,created_at) VALUES($1,$2,$3,'image/png',$4,$5,$6,'approved','2026-10-10T12:00:00Z')",[id,'approved/a.png',hash,png.length,JSON.stringify(validated.dimensions),JSON.stringify({source:'synthetic byte-validated fixture',a:1,b:2})]);
  await db.query("INSERT INTO public.audit_events(id,actor,action,entity_type,entity_id,payload,created_at) VALUES('33333333-3333-3333-3333-333333333333',$1,'media_approved','media',$2,'{}','2026-10-10T12:00:00Z')",[actor.userId,id]);
  const draft=(await getProjectDraft('helios',actor))!;
  await saveProjectDraft({projectId:'helios',expectedRevision:draft.draftRevision,project:{...draft.project,sections:[...draft.project.sections,{id:'fixture-image',heading:'Fixture image',blocks:[{type:'image',mediaId:id,alt:'Fixture',caption:''}]}]}},actor);
}
describe('FINISH-04 required outcomes; isolated replacement diagnostic only',()=>{
  beforeAll(async()=>{
    db=new PGlite();
    for(const name of ['20261001000000_a3_owner_auth_rls.sql','20261001000001_a4_publication_media.sql','20261005000000_github_refresh_state.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
    await db.exec(await readFile('supabase/operations/harden-publication-grants.sql','utf8'));
    await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[actor.userId,actor.email]);
    await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true)",[actor.userId]);
    fixture={query:async(sql,params)=>{queries.push(sql);return db.query(sql,params);},transaction:async(run)=>{transactions++;return db.transaction(async(tx)=>run({query:async(sql,params)=>{queries.push(sql);return tx.query(sql,params);}}));}};
  });
  beforeEach(async()=>{
    setPlatformDbForTests(null);resetPublicationState();setTestDraftRegistry(null);setTestMediaRegistry(null);
    await db.exec('TRUNCATE public.audit_events,public.projects,public.project_revisions,public.published_content,public.publication_history,public.media_assets CASCADE');
    setPlatformDbForTests(fixture);queries.length=0;transactions=0;storage.objects.clear();storage.downloads.length=0;process.env.MEDIA_PRIVATE_BUCKET='synthetic-private-bucket';
    setTestStorageTransportForTests(async(_bucket,key,signal)=>{
      if(signal.aborted)throw new MediaValidationError('Synthetic Storage read was aborted.');
      const blob=storage.objects.get(key);
      return blob?new Response(blob.stream(),{headers:{'content-type':blob.type,'content-length':String(blob.size)}}):new Response(null,{status:404});
    });
    setTestAuthRegistry(new Map(['owner','nonowner','aal1','revoked'].map(token=>[token,{user:{id:actor.userId,email:actor.email,aal:token==='aal1'?'aal1':'aal2'},...(token==='nonowner'?{}:{adminRecord:{id:actor.userId,role:'owner' as const,active:token!=='revoked'}})}])));
  });
  afterAll(async()=>{setPlatformDbForTests(null);setTestStorageTransportForTests(null);delete process.env.MEDIA_PRIVATE_BUCKET;await db.close();const evidenceDir=process.env.A1_EVIDENCE_DIR;if(evidenceDir)await writeFile(resolve(evidenceDir,'a3-initial-observations.json'),JSON.stringify({scope:'PGlite embedded SQL, synthetic auth registry and bounded-stream Storage fixture; no browser/native/provider execution',observations},null,2)+'\n');});
  it('service rejects omitted review with no durable writes',async()=>{
    let error:unknown;try{await publishRevision({expectedRevision:1},actor);}catch(e){error=e;}
    note('publishRevision({expectedRevision:1})', {error:String(error),counts:await counts()});
    expect(error,'complete review must be required at durable service boundary').toBeDefined();expect(await counts()).toEqual([{content:0,history:0,audit:0}]);
  });
  it('API rejects omitted review with 422 and no durable writes',async()=>{
    const res=await publishPOST(request('/api/admin/publish',{expectedRevision:1}));
    note('POST publish omitted review',{status:res.status,cacheControl:res.headers.get('cache-control'),vary:res.headers.get('vary'),counts:await counts()});
    expect(res.status).toBe(422);expect(await counts()).toEqual([{content:0,history:0,audit:0}]);
  });
  it('review uses durable current publication rather than process-local revision',async()=>{
    await db.query('INSERT INTO public.published_content(revision,payload) VALUES(7,$1)',[JSON.stringify({...approvedPublication,revision:7})]);
    const summary=await generateDraftReview(actor);note('durable current revision 7 / local baseline 1',summary.identity);
    expect(summary.identity.expectedPublicationRevision).toBe(7);
  });
  it('review takes one consistent transaction and ordered publication/project locks',async()=>{
    await generateDraftReview(actor);note('generateDraftReview transaction/lock trace',{transactions,queries});
    expect(transactions).toBe(1);expect(queries.some(q=>q.includes('yor-publication'))).toBe(true);expect(queries.some(q=>q.includes('yor-draft-'))).toBe(true);
  });
  it('review returns exact DTO checks, site identity, draft vector and canPublish',async()=>{
    const summary=await generateDraftReview(actor);note('review DTO',summary);
    expect(summary).toHaveProperty('identity.siteDraftRevision',null);expect(summary).toHaveProperty('drafts');expect(summary).toHaveProperty('canPublish');expect(summary.checks[0]).toHaveProperty('checkedAt');
  });
  it.each(['object-key-only','provenance','createdAt','approvalAudit'])('old review rejects valid approved same-ID %s change with 409 and no writes',async(change)=>{
    await approvedImage();const summary=await generateDraftReview(actor);const before=await counts();
    if(change==='object-key-only')await db.query('UPDATE public.media_assets SET object_key=$1 WHERE id=$2',['approved/b.png',id]);
    if(change==='provenance')await db.query('UPDATE public.media_assets SET provenance=$1 WHERE id=$2',[JSON.stringify({source:'another genuine synthetic approval record',a:1,b:2}),id]);
    if(change==='createdAt')await db.query("UPDATE public.media_assets SET created_at='2026-10-10T12:00:01Z' WHERE id=$1",[id]);
    if(change==='approvalAudit')await db.query("INSERT INTO public.audit_events(id,actor,action,entity_type,entity_id,payload,created_at) VALUES('44444444-4444-4444-4444-444444444444',$1,'media_approved','media',$2,'{}','2026-10-10T12:00:01Z')",[actor.userId,id]);
    const afterMutation=await counts();let error:unknown;let publication:unknown;
    try{publication=await publishRevision({expectedRevision:1,review:summary.identity},actor);}catch(e){error=e;}
    note('same-ID '+change,{before,afterMutation,error:String(error),publication,afterPublish:await counts(),storageReads:storage.downloads});
    expect(error).toBeInstanceOf(RevisionConflictError);expect(await counts()).toEqual(afterMutation);
  });
  it('review verifies actual Storage bytes against recorded hash',async()=>{
    await approvedImage();storage.objects.set('approved/a.png',new Blob([Buffer.from('tampered bytes')],{type:'image/png'}));
    const summary=await generateDraftReview(actor);note('tampered bytes review',{summary,storageReads:storage.downloads});
    expect(summary.checks.some((check)=>check.kind==='approved-media'&&check.status==='failed')).toBe(true);
  });
  it('private image proxy rejects tampered Storage bytes',async()=>{
    await approvedImage();storage.objects.set('approved/a.png',new Blob([Buffer.from('tampered bytes')],{type:'image/png'}));
    const res=await proxyGET(request('/api/admin/preview/media/'+id),{params:Promise.resolve({id})});
    note('tampered bytes private proxy',{status:res.status,body:await res.text(),reads:storage.downloads});expect(res.status).toBe(422);
  });
  it('draft save rejects a missing/unapproved image with 422 and unchanged pointer',async()=>{
    const draft=(await getProjectDraft('helios',actor))!;const project={...draft.project,sections:[...draft.project.sections,{id:'missing-new-image',heading:'Missing',blocks:[{type:'image',mediaId:id,alt:'Missing',caption:''}]}]};
    const res=await projectsPOST(request('/api/admin/projects',{projectId:'helios',expectedRevision:draft.draftRevision,project}));note('save missing image',{status:res.status,body:await res.json(),after:(await getProjectDraft('helios',actor))?.draftRevision});
    expect(res.status).toBe(422);expect((await getProjectDraft('helios',actor))?.draftRevision).toBe(draft.draftRevision);
  });
  it('authorized stale-save conflict returns current draft identity and content with private headers',async()=>{
    const draft=(await getProjectDraft('helios',actor))!;
    const res=await projectsPOST(request('/api/admin/projects',{projectId:'helios',expectedRevision:draft.draftRevision-1,project:draft.project}));
    const body=await res.json();
    note('authorized stale draft conflict',{status:res.status,body,cache:res.headers.get('cache-control'),vary:res.headers.get('vary')});
    expect(res.status).toBe(409);expect(body.currentDraft.project.title).toBe(draft.project.title);expect(body.currentDraft.draftRevision).toBe(draft.draftRevision);expect(body.currentReview.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(res.headers.get('cache-control')).toContain('no-store');expect(res.headers.get('vary')?.toLowerCase()).toContain('cookie');expect(res.headers.get('vary')?.toLowerCase()).toContain('authorization');
  });
  it('accepts the legacy placeholder only at its pinned project/section/block position',async()=>{
    const draft=(await getProjectDraft('helios',actor))!;
    const legacyImage=draft.project.sections.flatMap((section)=>section.blocks).find((block)=>block.type==='image');
    expect(legacyImage?.type).toBe('image');
    const project={...draft.project,sections:[...draft.project.sections,{id:'relocated-placeholder',heading:'Relocated placeholder',blocks:[legacyImage!]}]};
    const res=await projectsPOST(request('/api/admin/projects',{projectId:'helios',expectedRevision:draft.draftRevision,project}));
    note('accepted placeholder copied to new block index',{status:res.status,body:await res.json(),draftRevision:(await getProjectDraft('helios',actor))?.draftRevision});
    expect(res.status).toBe(422);expect((await getProjectDraft('helios',actor))?.draftRevision).toBe(draft.draftRevision);
  });
  it('private preview honors genuine CandidateX projectId and keeps public CandidateX absent',async()=>{
    const project={...approvedPublication.projects[0]!,id:'candidatex' as const,slug:'candidatex' as const,title:'Synthetic genuine private CandidateX draft',sections:[{id:'private',heading:'Private',blocks:[{type:'paragraph' as const,text:'PRIVATE_SENTINEL'}]}]};
    await saveProjectDraft({projectId:'candidatex',expectedRevision:0,project},actor);
    const res=await previewGET(request('/api/admin/preview?projectId=candidatex'));const body=await res.json();note('CandidateX filtered private request',body);
    expect(JSON.stringify(body)).toContain('PRIVATE_SENTINEL');expect(body.canPublish).toBe(false);expect((await readPublicPublication())?.projects.some(p=>p.id==='candidatex')).toBe(false);
  });
  it('rollback rejects omitted expectedRevision/reason with 422',async()=>{
    const summary=await generateDraftReview(actor);await publishRevision({expectedRevision:1,review:summary.identity},actor);
    const res=await rollbackPOST(request('/api/admin/rollback',{targetRevision:1}));note('rollback missing concurrency/reason',{status:res.status,body:await res.json(),counts:await counts()});expect(res.status).toBe(422);
  });
  it('published rendering rejects a private proxy URL with traversal/query suffix',()=>{
    const project={...approvedPublication.projects[0]!,sections:[{id:'image',heading:'Image',blocks:[{type:'image' as const,mediaId:id,alt:'Fixture',caption:''}]}]};
    const html=renderToStaticMarkup(React.createElement(CaseStudy,{project,approvedMediaUrls:{[id]:'/api/admin/preview/media/../secret?token=sentinel'}}));note('published render unsafe private URL',html);expect(html).not.toContain('src="/api/admin/preview/media/../secret?token=sentinel"');
  });
  it('review hash ignores object insertion order and sorts full project documents',()=>{
    const projects=approvedPublication.projects.filter((project)=>project.id!=='candidatex');
    const media=[{kind:'asset' as const,mediaId:id,objectKey:'private/a.png',sha256:'a'.repeat(64),mime:'image/png',bytes:12,dimensions:{width:1,height:1},provenance:{b:2,a:1},approvalStatus:'approved' as const,createdAt:'2026-10-10T12:00:00.000Z',approvalAudit:{eventId:'audit',createdAt:'2026-10-10T12:00:00.000Z'}}];
    const base={projects,siteDraftRevision:null as null,assetManifestRevision:'manifest-1',media};
    const reorderedMedia=[{...media[0]!,provenance:Object.fromEntries(Object.entries(media[0]!.provenance).reverse())}];
    const one=computeReviewHash(base);const two=computeReviewHash({...base,media:reorderedMedia});note('equivalent object key order',{one,two});expect(two).toBe(one);
    expect(computeReviewHash({...base,projects:[...projects].reverse()})).toBe(one);
  });
  it('review hash binds project body, section order, and block order',()=>{
    const original=approvedPublication.projects.find((project)=>project.id!=='candidatex')!;
    const candidate={...original,sections:[
      {id:'hash-section-a',heading:'A',blocks:[{type:'paragraph' as const,text:'alpha'},{type:'paragraph' as const,text:'beta'}]},
      {id:'hash-section-b',heading:'B',blocks:[{type:'paragraph' as const,text:'gamma'}]},
    ]};
    const base={projects:[candidate],siteDraftRevision:null as null,assetManifestRevision:'manifest-1',media:[]};
    const bodyChanged={...candidate,summary:candidate.summary+' changed'};
    const sectionsChanged={...candidate,sections:[...candidate.sections].reverse()};
    const blocksChanged={...candidate,sections:[{...candidate.sections[0]!,blocks:[...candidate.sections[0]!.blocks].reverse()},candidate.sections[1]!]};
    const initial=computeReviewHash(base);
    expect(computeReviewHash({...base,projects:[bodyChanged]})).not.toBe(initial);
    expect(computeReviewHash({...base,projects:[sectionsChanged]})).not.toBe(initial);
    expect(computeReviewHash({...base,projects:[blocksChanged]})).not.toBe(initial);
  });
  it('private review schema rejects malformed drafts, identity vectors, checks, and publish state',async()=>{
    const summary=await generateDraftReview(actor);
    const valid={identity:summary.identity,drafts:summary.drafts,checks:summary.checks,previewProjectId:null,canPublish:summary.canPublish};
    const malformedDraft={...valid,drafts:summary.drafts.map((draft,index)=>index===0?{...draft,updatedAt:'not-a-timestamp'}:draft)};
    const duplicateProjects=[...summary.identity.projects,summary.identity.projects[0]!].sort((a,b)=>a.projectId.localeCompare(b.projectId));
    const duplicateVector={...valid,identity:{...summary.identity,projects:duplicateProjects}};
    const badCheck={...valid,checks:summary.checks.map((check,index)=>index===0?{...check,checkedAt:'not-a-timestamp'}:check)};
    const reasonMismatch={...valid,checks:summary.checks.map((check,index)=>index===0?{...check,status:'failed' as const,reasons:[]}:check),canPublish:false};
    const publishMismatch={...valid,canPublish:!summary.canPublish};
    const privateCandidate={...valid,previewProjectId:'candidatex' as const,canPublish:false};
    note('strict review DTO probes',{valid:PrivateDraftReviewSchema.safeParse(valid).success,malformedDraft:PrivateDraftReviewSchema.safeParse(malformedDraft).success,duplicateVector:PrivateDraftReviewSchema.safeParse(duplicateVector).success,badCheck:PrivateDraftReviewSchema.safeParse(badCheck).success,reasonMismatch:PrivateDraftReviewSchema.safeParse(reasonMismatch).success,publishMismatch:PrivateDraftReviewSchema.safeParse(publishMismatch).success,candidatePreview:PrivateDraftReviewSchema.safeParse(privateCandidate).success});
    const parsedValid=PrivateDraftReviewSchema.safeParse(valid);
    expect(parsedValid.success,parsedValid.success?"":JSON.stringify(parsedValid.error.issues)).toBe(true);
    expect(PrivateDraftReviewSchema.safeParse(malformedDraft).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse(duplicateVector).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse(badCheck).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse(reasonMismatch).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse(publishMismatch).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse(privateCandidate).success).toBe(true);
    expect(PrivateDraftReviewSchema.safeParse({...privateCandidate,canPublish:true}).success).toBe(false);
  });
  it('bounded Storage reader cancels a stream at the 5 MiB limit',async()=>{
    let chunks=0;let cancelled=false;
    const body=new ReadableStream<Uint8Array>({
      pull(controller){chunks++;if(chunks<=5)controller.enqueue(new Uint8Array(1024*1024));else controller.enqueue(Uint8Array.of(1));},
      cancel(){cancelled=true;},
    },{highWaterMark:0});
    await expect(readBoundedResponse(new Response(body),new AbortController().signal)).rejects.toThrow(/5 MiB/);
    expect(5*1024*1024+1).toBe(MAX_UPLOAD_BYTES+1);expect(chunks).toBe(6);expect(cancelled).toBe(true);
  });
  it('bounded Storage reader rejects declared-size mismatch at EOF',async()=>{
    const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(Uint8Array.of(1,2,3));controller.close();}});
    await expect(readBoundedResponse(new Response(body,{headers:{'content-length':'4'}}),new AbortController().signal)).rejects.toThrow(/content-length/);
  });
  it('bounded Storage reader rejects oversized declared length before pulling bytes',async()=>{
    let pulls=0;let cancelled=false;
    const body=new ReadableStream<Uint8Array>({pull(){pulls++;},cancel(){cancelled=true;}},{highWaterMark:0});
    const response=new Response(body,{headers:{'content-length':String(MAX_UPLOAD_BYTES+1)}});
    await expect(readBoundedResponse(response,new AbortController().signal)).rejects.toThrow(/5 MiB/);
    expect(pulls).toBe(0);expect(cancelled).toBe(true);
  });
  it('bounded Storage reader rejects an aborted read and requests cancellation',async()=>{
    let cancelled=false;
    const body=new ReadableStream<Uint8Array>({pull(){return new Promise<void>((resolve)=>setTimeout(resolve,20));},cancel(){cancelled=true;}});
    const controller=new AbortController();
    const reading=readBoundedResponse(new Response(body),controller.signal);
    setTimeout(()=>controller.abort(),1);
    await expect(reading).rejects.toBeInstanceOf(MediaValidationError);
    await new Promise((resolve)=>setTimeout(resolve,30));
    expect(cancelled).toBe(true);
  });
  it('media deadline helper aborts stalled storage work (5 ms test bound; production default 10 s)',async()=>{
    let observedAbort=false;
    const work=(signal:AbortSignal)=>new Promise<never>((_resolve,reject)=>signal.addEventListener('abort',()=>{observedAbort=true;reject(new Error('transport aborted'));},{once:true}));
    await expect(withPrivateMediaReadDeadline(work,5)).rejects.toBeInstanceOf(MediaValidationError);
    expect(observedAbort).toBe(true);
  });
  it('media list supplies assets and the approved fixture is valid',async()=>{
    await approvedImage();const res=await mediaGET(request('/api/admin/media'));const body=await res.json();note('actual media list API shape',body);const assets=body.assets as Array<{id:string;approvalStatus:string}>;expect(res.status).toBe(200);expect(assets.some((asset)=>asset.id===id&&asset.approvalStatus==='approved')).toBe(true);expect(body.media).toBeUndefined();
  });
  it('explicit E2E media fixture resolves verified private bytes only in the local fixture mode',async()=>{
    const priorFixture=process.env.YOR_E2E_FIXTURE;const priorPath=process.env.YOR_TEST_DATABASE_PATH;
    process.env.YOR_E2E_FIXTURE='1';process.env.YOR_TEST_DATABASE_PATH='explicit-synthetic-test-only';
    try{
      const asset=listE2EApprovedMediaFixtures()[0]!;
      const result=await readReviewedMedia([asset.id],fixture);
      note('local E2E synthetic media byte identity',{asset,result:{items:result.items,issues:[...result.issues],byteLength:result.bytesById.get(asset.id)?.byteLength}});
      expect([...result.issues],JSON.stringify({items:result.items,byteLength:result.bytesById.get(asset.id)?.byteLength})).toEqual([]);
      expect(result.bytesById.get(asset.id)?.byteLength).toBe(asset.bytes);
    }finally{
      if(priorFixture===undefined)delete process.env.YOR_E2E_FIXTURE;else process.env.YOR_E2E_FIXTURE=priorFixture;
      if(priorPath===undefined)delete process.env.YOR_TEST_DATABASE_PATH;else process.env.YOR_TEST_DATABASE_PATH=priorPath;
    }
  });
  it.each(['nonowner','aal1','revoked'])('denies %s across private preview/publish/project/rollback/media routes',async(token)=>{
    const responses=await Promise.all([previewGET(request('/api/admin/preview',undefined,token)),publishPOST(request('/api/admin/publish',{expectedRevision:1},token)),projectsPOST(request('/api/admin/projects',{},token)),rollbackPOST(request('/api/admin/rollback',{targetRevision:1},token)),mediaGET(request('/api/admin/media',undefined,token)),proxyGET(request('/api/admin/preview/media/'+id,undefined,token),{params:Promise.resolve({id})})]);
    note('synthetic auth '+token,responses.map(r=>({status:r.status,cache:r.headers.get('cache-control'),vary:r.headers.get('vary')})));expect(responses.map(r=>r.status)).toEqual(Array(6).fill(403));
    expect(responses.every(r=>r.headers.get('cache-control')?.includes('no-store'))).toBe(true);
    expect(responses.every(r=>r.headers.get('vary')?.toLowerCase().includes('cookie')&&r.headers.get('vary')?.toLowerCase().includes('authorization'))).toBe(true);
  });
  it('denies anonymous private preview with 401 and private cache isolation',async()=>{const res=await previewGET(new Request('http://localhost/api/admin/preview'));expect(res.status).toBe(401);expect(res.headers.get('cache-control')).toContain('no-store');expect(res.headers.get('vary')?.toLowerCase()).toContain('cookie');expect(res.headers.get('vary')?.toLowerCase()).toContain('authorization');});
  it('returns no-store and Vary headers on private preview validation and not-found branches',async()=>{
    const invalid=await previewGET(request('/api/admin/preview?projectId=not-a-project'));
    const missingMedia=await proxyGET(request('/api/admin/preview/media/'+id),{params:Promise.resolve({id})});
    for(const response of [invalid,missingMedia]){note('private response headers/status',{status:response.status,cache:response.headers.get('cache-control'),vary:response.headers.get('vary')});expect([422,404]).toContain(response.status);expect(response.headers.get('cache-control')).toContain('no-store');expect(response.headers.get('vary')?.toLowerCase()).toContain('cookie');expect(response.headers.get('vary')?.toLowerCase()).toContain('authorization');}
  });
  it('API rejects disagreed review publication revision with 422',async()=>{
    const summary=await generateDraftReview(actor);const res=await publishPOST(request('/api/admin/publish',{expectedRevision:1,review:{...summary.identity,expectedPublicationRevision:7}}));
    note('review expectedPublicationRevision 7 versus body expectedRevision 1',{status:res.status,counts:await counts()});expect(res.status).toBe(422);
  });
  it('publication rechecks unchanged-row tampered Storage bytes before writes',async()=>{
    await approvedImage();const summary=await generateDraftReview(actor);const before=await counts();storage.objects.set('approved/a.png',new Blob([Buffer.from('tampered bytes')],{type:'image/png'}));
    let error:unknown;try{await publishRevision({expectedRevision:1,review:summary.identity},actor);}catch(e){error=e;}
    note('tampered bytes publication',{error:String(error),before,after:await counts(),reads:storage.downloads});expect(error).toBeDefined();expect(await counts()).toEqual(before);
  });
  it('changed draft after review rejects with 409 and no snapshot/history/audit writes',async()=>{
    const summary=await generateDraftReview(actor);const draft=(await getProjectDraft('helios',actor))!;await saveProjectDraft({projectId:'helios',expectedRevision:draft.draftRevision,project:{...draft.project,title:'Changed after review'}},actor);const before=await counts();
    await expect(publishRevision({expectedRevision:1,review:summary.identity},actor)).rejects.toBeInstanceOf(RevisionConflictError);expect(await counts()).toEqual(before);note('changed draft rejected with no publication writes',{before,after:await counts()});
  });
});
