import { beforeAll, afterAll, beforeEach, afterEach, test, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { processOutbox } from '@/server/jobs/outbox-worker';
import { setPlatformDbForTests } from '@/server/database';
import { publishRevision, rollbackPublication } from '@/server/content/publish';
import { setTestDraftRegistry, saveProjectDraft } from '@/server/content/revisions';
import { approvedPublication } from '@/content/approved-publication';
import { setTestAuthRegistry } from '@/server/auth/require-owner';
import { POST as rollbackPOST } from '@/app/api/admin/rollback/route';

const APP='C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186/app';
const OWN='C:/Users/yoray/Projects/Yor World/deliveries/G6/rc3-platform-independent-verification/reviewers/security-outbox';
const base=new Date('2026-10-04T00:00:00Z');
const actor={userId:'11111111-1111-1111-1111-111111111111',email:'owner@fixture.test',assurance:'aal2',role:'owner',active:true} as const;
const identities=[['PUBLIC inheritance','iv_public_probe','',false,'aal1'],['anon','anon','',false,'aal1'],['non-owner','authenticated','22222222-2222-2222-2222-222222222222',false,'aal2'],['owner AAL1','authenticated','33333333-3333-3333-3333-333333333333',true,'aal1'],['revoked','authenticated','44444444-4444-4444-4444-444444444444',false,'aal2'],['active AAL2','authenticated',actor.userId,true,'aal2']] as const;
let db:PGlite; let elapsed=0;
const observations:any[]=[];
const good={success:true,providerId:'current'} as const;
const retry={success:false,retryable:true,error:'synthetic'} as const;
const terminal={success:false,retryable:false,error:'synthetic'} as const;
beforeAll(async()=>{
 db=new PGlite();
 for(const name of ['20261001000000_a3_owner_auth_rls.sql','20261001000001_a4_publication_media.sql']) await db.exec(readFileSync(APP+'/supabase/migrations/'+name,'utf8'));
 await db.exec('CREATE ROLE iv_public_probe NOLOGIN; ALTER ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO iv_public_probe; GRANT INSERT,UPDATE,DELETE ON public.published_content,public.publication_history TO PUBLIC; GRANT EXECUTE ON FUNCTION public.publish_new_revision(integer,jsonb,uuid) TO PUBLIC');
 await db.exec(readFileSync(APP+'/supabase/operations/harden-publication-grants.sql','utf8'));
 for(const [name,,id,active] of identities) if(id){ await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,name+'@fixture.test']); if(name!=='non-owner') await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',$2)",[id,active]); }
});
beforeEach(async()=>{ elapsed=0; vi.spyOn(Date,'now').mockImplementation(()=>base.getTime()+elapsed); await db.exec('RESET ROLE; TRUNCATE public.published_content,public.publication_history,public.projects,public.audit_events,public.email_outbox,public.contact_messages CASCADE'); setTestDraftRegistry(null); setPlatformDbForTests(null); });
afterEach(async()=>{vi.restoreAllMocks(); await db.exec('RESET ROLE'); setPlatformDbForTests(null);setTestAuthRegistry(null);});
afterAll(async()=>{writeFileSync(OWN+'/observations.json',JSON.stringify(observations,null,2));await db.close();});

for(const [name,role,id,,aal] of identities) test('SCP-01 full DML and RPC denial: '+name,async()=>{
 await db.query("INSERT INTO public.published_content(revision,payload) VALUES(1,'{}')");
 await db.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES(1,'{}',$1)",[actor.userId]);
 await db.query("INSERT INTO public.projects(slug,title) VALUES('private','draft')");
 await db.exec('SET ROLE '+role);
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,aal})]);
 const errors=[];
 for(const table of ['published_content','publication_history']){
 const col=table==='published_content'?'payload':'snapshot';
 for(const sql of [`INSERT INTO public.${table}(revision,${col}) VALUES(2,'{}')`,`UPDATE public.${table} SET ${col}='{"forged":true}'`,`DELETE FROM public.${table}`]) {
 try {await db.query(sql);throw new Error('BYPASS');} catch(e:any){expect(e.message).toMatch(/permission denied/); errors.push(e.code);}
 }
 }
 await expect(db.query("SELECT public.publish_new_revision(999,'{}',$1)",[actor.userId])).rejects.toThrow(/permission denied/);
 if(role==='anon'||role==='authenticated') expect((await db.query('SELECT * FROM public.published_content')).rows).toHaveLength(1);
 if(role==='authenticated') expect((await db.query('SELECT * FROM public.projects')).rows).toHaveLength(name==='active AAL2'?1:0);
 observations.push({case:name,sqlstates:errors});
});

test('SCP-01 canonical service publication rollback audit drafts and public SELECT',async()=>{
 await db.exec('SET ROLE service_role');
 const handle={query:async(sql:string,p:any[]=[])=>db.query(sql,p),transaction:async(run:any)=>{await db.exec('BEGIN');try{const v=await run({query:async(sql:string,p:any[]=[])=>db.query(sql,p)});await db.exec('COMMIT');return v;}catch(e){await db.exec('ROLLBACK');throw e;}}};
 setPlatformDbForTests(handle);
 const draft=await saveProjectDraft({projectId:approvedPublication.projects[0].id,expectedRevision:approvedPublication.projects[0].revision,project:approvedPublication.projects[0]},actor);
 expect(draft.project.id).toBe(approvedPublication.projects[0].id);
 const pub=await publishRevision({expectedRevision:approvedPublication.revision,customProjects:approvedPublication.projects},actor);
 expect(pub.revision).toBe(approvedPublication.revision+1);
 await expect(publishRevision({expectedRevision:approvedPublication.revision,customProjects:approvedPublication.projects},actor)).rejects.toThrow(/changed/);
 const before=(await db.query('SELECT * FROM public.publication_history')).rows.length;
 await expect(rollbackPublication(9999,actor)).rejects.toThrow(/does not exist/);
 expect((await db.query('SELECT * FROM public.publication_history')).rows).toHaveLength(before);
 const rolled=await rollbackPublication(approvedPublication.revision,actor);
 expect(rolled.revision).toBe(pub.revision+1);
 expect((await db.query('SELECT * FROM public.publication_history')).rows).toHaveLength(3);
 expect((await db.query("SELECT action FROM public.audit_events WHERE entity_type='publication' ORDER BY created_at")).rows.map((x:any)=>x.action)).toEqual(['publication_published','publication_rollback']);
 await db.exec('SET ROLE anon'); expect((await db.query('SELECT * FROM public.published_content')).rows).toHaveLength(2);
 observations.push({case:'canonical-service-publication',revision:rolled.revision,history:3,audit:2});
});

async function seed(attempts=0){const id=randomUUID(),mid=randomUUID();await db.query("INSERT INTO public.contact_messages(id,receipt_id,name,email,body,received_at) VALUES($1,$2,'A','a@fixture.test','Inquiry',$3)",[mid,id,base.toISOString()]);await db.query('INSERT INTO public.email_outbox(id,message_id,attempts,next_attempt_at) VALUES($1,$2,$3,$4)',[id,mid,attempts,base.toISOString()]);return id;}
const row=async()=>(await db.query('SELECT id,status,attempts,provider_id,lease_until,next_attempt_at,xmin::text AS version FROM public.email_outbox ORDER BY id')).rows;
function gate(){let release!:()=>void;const wait=new Promise<void>(r=>release=r);return {wait,release};}
const modes=['success','retry','terminal','throw','read-error','completion-error','missing'] as const;
for(const state of ['SENT','PROCESSING']) for(const mode of modes) test(`SCP-02 stale ${mode} vs reclaimed ${state}`,async()=>{
 const id=await seed(),entered=gate(),resume=gate();
 const wrap={query:async(sql:string,p:any[])=>{
 if(sql.includes('FROM public.contact_messages')&&(mode==='read-error'||mode==='missing')){entered.release();await resume.wait;if(mode==='read-error')throw Error('read');return {rows:[]};}
 if(sql.includes("SET status = 'sent'")&&mode==='completion-error')throw Error('completion');return db.query(sql,p);
 }};
 const a=processOutbox(base,1,{db:wrap,emailAdapter:{send:async(_,key)=>{expect(key).toBe('outbox_'+id);entered.release();await resume.wait;if(mode==='throw')throw Error('adapter');return mode==='retry'?retry:mode==='terminal'?terminal:good;}}});
 await entered.wait;
 // No advancement of A's clock: this isolates xmin and current status rather than expiry.
 const bEntered=gate(),bResume=gate();
 const b=processOutbox(new Date(base.getTime()+301000),1,{db,emailAdapter:{send:async()=>{bEntered.release();if(state==='PROCESSING')await bResume.wait;return good;}}});
 await bEntered.wait;if(state==='SENT')await b;
 const authoritative=await row();resume.release();expect(await a).toEqual({sent:0,retried:0,failed:0});expect(await row()).toEqual(authoritative);
 if(state==='PROCESSING'){bResume.release();expect(await b).toEqual({sent:1,retried:0,failed:0});}
 observations.push({case:`stale-${mode}-${state}`,authoritative});
});
for(const mode of ['retry','throw','read-error','completion-error','missing','terminal']) for(const attempt of [0,1,2,3,4]) test(`SCP-03 ${mode} attempt ${attempt+1}`,async()=>{
 await seed(attempt);let injected=false;
 const handle={query:async(sql:string,p:any[])=>{if(!injected&&((mode==='read-error'&&sql.includes('FROM public.contact_messages'))||(mode==='completion-error'&&sql.includes("SET status = 'sent'")))){injected=true;throw Error('db');}if(mode==='missing'&&sql.includes('FROM public.contact_messages'))return {rows:[]};return db.query(sql,p);}};
 const res=await processOutbox(base,1,{db:handle,emailAdapter:{send:async()=>{if(mode==='throw')throw Error('provider');return mode==='retry'?retry:mode==='terminal'?terminal:good;}}});
 const terminalExpected=attempt===4||mode==='missing'||mode==='terminal';
 expect(res).toEqual({sent:0,retried:terminalExpected?0:1,failed:terminalExpected?1:0});
 const r:any=(await row())[0];expect(r.attempts).toBe(attempt+1);expect(r.status).toBe(terminalExpected?'failed':'retrying');
 if(!terminalExpected) expect(new Date(r.next_attempt_at).getTime()-base.getTime()).toBe([60000,300000,1800000,7200000][attempt]);
});
test('SCP-02 no-reclaim expiry and queued batch prevent later provider sends',async()=>{await seed();await seed();let calls=0;const result=await processOutbox(base,2,{db,emailAdapter:{send:async()=>{calls++;elapsed=300000;return good;}}});expect(result).toEqual({sent:0,retried:0,failed:0});expect(calls).toBe(1);expect((await row()).every((r:any)=>r.status==='processing')).toBe(true);});
test('SCP-02 long lookup prevents provider start',async()=>{await seed();let calls=0;const handle={query:async(sql:string,p:any[])=>{const r=await db.query(sql,p);if(sql.includes('FROM public.contact_messages'))elapsed=300001;return r;}};await processOutbox(base,1,{db:handle,emailAdapter:{send:async()=>{calls++;return good;}}});expect(calls).toBe(0);});
test('SCP-02 final-check/send TOCTOU is residual external-send risk, DB remains fenced',async()=>{
 await seed();let checks=0,sends=0;const handle={query:async(sql:string,p:any[])=>{const r=await db.query(sql,p);if(sql.startsWith('SELECT id FROM public.email_outbox')&&++checks===2){elapsed=301000;await processOutbox(new Date(base.getTime()+elapsed),1,{db,emailAdapter:{send:async()=>good}});}return r;}};
 const res=await processOutbox(base,1,{db:handle,emailAdapter:{send:async()=>{sends++;return {success:true,providerId:'stale-send'};}}});
 expect(sends).toBe(1);expect(res).toEqual({sent:0,retried:0,failed:0});expect((await row())[0].provider_id).toBe('current');observations.push({case:'final-check-send-race',staleProviderCalls:sends,dbResult:res});
});
test('xmin same-transaction updates have same version; prohibited wrapper boundary demonstrated',async()=>{
 const id=await seed();await db.exec('BEGIN');const a=await db.query("UPDATE public.email_outbox SET status='processing',lease_until=$2 WHERE id=$1 RETURNING xmin::text AS v",[id,new Date(base.getTime()+300000).toISOString()]);const b=await db.query("UPDATE public.email_outbox SET lease_until=$2 WHERE id=$1 RETURNING xmin::text AS v",[id,new Date(base.getTime()+900000).toISOString()]);expect(a.rows[0].v).toBe(b.rows[0].v);await db.exec('ROLLBACK');observations.push({case:'xmin-transaction',sameVersion:true,contract:'each statement independently committed; canonical Pool.query does this'});
});
test('SCP-02 reclaimed queued batch sends only first stale item',async()=>{
 await seed();await seed();const entered=gate(),resume=gate();let sends=0;
 const a=processOutbox(base,2,{db,emailAdapter:{send:async()=>{sends++;entered.release();await resume.wait;return retry;}}});await entered.wait;
 elapsed=301000;expect(await processOutbox(new Date(base.getTime()+elapsed),2,{db,emailAdapter:{send:async()=>good}})).toEqual({sent:2,retried:0,failed:0});
 resume.release();expect(await a).toEqual({sent:0,retried:0,failed:0});expect(sends).toBe(1);expect((await row()).every((r:any)=>r.status==='sent')).toBe(true);
});
test('SCP-03 persistent completion outage propagates and does not fabricate failed outcome',async()=>{
 await seed(4);const handle={query:async(sql:string,p:any[])=>{if(sql.startsWith('UPDATE public.email_outbox SET'))throw Error('persistent db outage');return db.query(sql,p);}};
 await expect(processOutbox(base,1,{db:handle,emailAdapter:{send:async()=>retry}})).rejects.toThrow(/persistent db/);
 expect((await row())[0].status).toBe('processing');expect((await row())[0].attempts).toBe(4);
});
for(const [name,,id,active,aal] of identities.filter(x=>x[0]!=='PUBLIC inheritance')) test('Rollback accepted route guard: '+name,async()=>{
 const registry=new Map(); if(id)registry.set('fixture-token',{user:{id,email:name+'@fixture.test',aal},...(name==='non-owner'?{}:{adminRecord:{id,role:'owner',active}})});
 setTestAuthRegistry(registry);setPlatformDbForTests({query:async(sql,p)=>db.query(sql,p),transaction:async(run)=>{await db.exec('BEGIN');try{const r=await run({query:async(sql,p)=>db.query(sql,p)});await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}});
 const response=await rollbackPOST(new Request('http://localhost/api/admin/rollback',{method:'POST',headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer fixture-token'}:{})},body:JSON.stringify({targetRevision:approvedPublication.revision})}));
 expect(response.status).toBe(name==='active AAL2'?200:id?403:401);
 expect((await db.query('SELECT * FROM public.audit_events')).rows).toHaveLength(name==='active AAL2'?1:0);
});
test('Canonical invalid publication and invalid rollback preserve atomic history/audit',async()=>{
 setPlatformDbForTests({query:async(sql,p)=>db.query(sql,p),transaction:async(run)=>{await db.exec('BEGIN');try{const r=await run({query:async(sql,p)=>db.query(sql,p)});await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}});
 await expect(publishRevision({expectedRevision:approvedPublication.revision,customProjects:[approvedPublication.projects[0],approvedPublication.projects[0]]},actor)).rejects.toThrow(/Duplicate/);
 expect((await db.query('SELECT * FROM public.audit_events')).rows).toHaveLength(0);
 expect((await db.query('SELECT * FROM public.publication_history')).rows).toHaveLength(0);
 const invalid=structuredClone(approvedPublication);invalid.revision=99;invalid.projects[0].evidence.forEach(e=>e.status='unknown');
 await db.query('INSERT INTO public.publication_history(revision,snapshot,actor) VALUES(99,$1,$2)',[JSON.stringify(invalid),actor.userId]);
 await expect(rollbackPublication(99,actor)).rejects.toThrow(/verified evidence|unverified claim/);
 expect((await db.query('SELECT * FROM public.audit_events')).rows).toHaveLength(0);
 expect((await db.query('SELECT * FROM public.published_content')).rows).toHaveLength(0);
});
