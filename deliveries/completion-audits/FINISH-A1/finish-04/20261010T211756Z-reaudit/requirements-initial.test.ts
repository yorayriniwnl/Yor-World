import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {approvedPublication} from '@/content/approved-publication';
import {setPlatformDbForTests} from '@/server/database';
import {setTestAuthRegistry} from '@/server/auth/require-owner';
import {setTestDraftRegistry,getProjectDraft,saveProjectDraft,RevisionConflictError} from '@/server/content/revisions';
import {setTestMediaRegistry,validateUpload} from '@/server/media/validate-upload';
import {generateDraftReview,computeReviewHash} from '@/server/content/preview';
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
const actor:OwnerContext={userId:'11111111-1111-1111-1111-111111111111',email:'owner@fixture.test',role:'owner',active:true,assurance:'aal2'};
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
    setTestAuthRegistry(new Map(['owner','nonowner','aal1','revoked'].map(token=>[token,{user:{id:actor.userId,email:actor.email,aal:token==='aal1'?'aal1':'aal2'},adminRecord:token==='nonowner'?null:{id:actor.userId,role:'owner',active:token!=='revoked'}}])));
  });
  afterAll(async()=>{setPlatformDbForTests(null);delete process.env.MEDIA_PRIVATE_BUCKET;await db.close();await writeFile(new URL('./observations.json',import.meta.url),JSON.stringify({scope:'PGlite embedded SQL, synthetic auth registry and mocked Storage; no browser/native/provider execution',observations},null,2)+'\n');});
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
    const summary=await generateDraftReview(actor);note('durable current revision 7 / local baseline 1',summary.review);
    expect(summary.review.expectedPublicationRevision).toBe(7);
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
    try{publication=await publishRevision({expectedRevision:1,review:summary.review},actor);}catch(e){error=e;}
    note('same-ID '+change,{before,afterMutation,error:String(error),publication,afterPublish:await counts(),storageReads:storage.downloads});
    expect(error).toBeInstanceOf(RevisionConflictError);expect(await counts()).toEqual(afterMutation);
  });
  it('review verifies actual Storage bytes against recorded hash',async()=>{
    await approvedImage();storage.objects.set('approved/a.png',new Blob([Buffer.from('tampered bytes')],{type:'image/png'}));
    const summary=await generateDraftReview(actor);note('tampered bytes review',{summary,storageReads:storage.downloads});
    expect(summary.checks.some((c:any)=>c.kind==='approved-media'&&c.status==='failed')).toBe(true);
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
  it('private preview honors genuine CandidateX projectId and keeps public CandidateX absent',async()=>{
    const project={...approvedPublication.projects[0],id:'candidatex' as const,slug:'candidatex' as const,title:'Synthetic genuine private CandidateX draft',sections:[{id:'private',heading:'Private',blocks:[{type:'paragraph' as const,text:'PRIVATE_SENTINEL'}]}]};
    await saveProjectDraft({projectId:'candidatex',expectedRevision:0,project},actor);
    const res=await previewGET(request('/api/admin/preview?projectId=candidatex'));const body=await res.json();note('CandidateX filtered private request',body);
    expect(JSON.stringify(body)).toContain('PRIVATE_SENTINEL');expect((await readPublicPublication())?.projects.some(p=>p.id==='candidatex')).toBe(false);
  });
  it('rollback rejects omitted expectedRevision/reason with 422',async()=>{
    const summary=await generateDraftReview(actor);await publishRevision({expectedRevision:1,review:summary.review},actor);
    const res=await rollbackPOST(request('/api/admin/rollback',{targetRevision:1}));note('rollback missing concurrency/reason',{status:res.status,body:await res.json(),counts:await counts()});expect(res.status).toBe(422);
  });
  it('published rendering rejects a private proxy URL with traversal/query suffix',()=>{
    const project={...approvedPublication.projects[0],sections:[{id:'image',heading:'Image',blocks:[{type:'image' as const,mediaId:id,alt:'Fixture',caption:''}]}]};
    const html=renderToStaticMarkup(React.createElement(CaseStudy,{project,approvedMediaUrls:{[id]:'/api/admin/preview/media/../secret?token=sentinel'}}));note('published render unsafe private URL',html);expect(html).not.toContain('src="/api/admin/preview/media/../secret?token=sentinel"');
  });
  it('review hash ignores equivalent JSON object insertion order',async()=>{
    const first=approvedPublication.projects[0];const reordered=Object.fromEntries(Object.entries(first).reverse()) as typeof first;
    const one=computeReviewHash(1,[{projectId:first.id,draftRevision:first.revision}],[],[first]);const two=computeReviewHash(1,[{projectId:first.id,draftRevision:first.revision}],[],[reordered]);note('equivalent object key order',{one,two});expect(two).toBe(one);
  });
  it('media list supplies assets and the approved fixture is valid',async()=>{
    await approvedImage();const res=await mediaGET(request('/api/admin/media'));const body=await res.json();note('actual media list API shape',body);expect(res.status).toBe(200);expect(body.assets.some((a:any)=>a.id===id&&a.approvalStatus==='approved')).toBe(true);expect(body.media).toBeUndefined();
  });
  it.each(['nonowner','aal1','revoked'])('denies %s across private preview/publish/project/rollback/media routes',async(token)=>{
    const responses=await Promise.all([previewGET(request('/api/admin/preview',undefined,token)),publishPOST(request('/api/admin/publish',{expectedRevision:1},token)),projectsPOST(request('/api/admin/projects',{},token)),rollbackPOST(request('/api/admin/rollback',{targetRevision:1},token)),mediaGET(request('/api/admin/media',undefined,token)),proxyGET(request('/api/admin/preview/media/'+id,undefined,token),{params:Promise.resolve({id})})]);
    note('synthetic auth '+token,responses.map(r=>({status:r.status,cache:r.headers.get('cache-control'),vary:r.headers.get('vary')})));expect(responses.map(r=>r.status)).toEqual(Array(6).fill(403));expect(responses.every(r=>r.headers.get('cache-control')?.includes('no-store'))).toBe(true);
  });
  it('denies anonymous private preview with 401 and no-store',async()=>{const res=await previewGET(new Request('http://localhost/api/admin/preview'));expect(res.status).toBe(401);expect(res.headers.get('cache-control')).toContain('no-store');});
});
