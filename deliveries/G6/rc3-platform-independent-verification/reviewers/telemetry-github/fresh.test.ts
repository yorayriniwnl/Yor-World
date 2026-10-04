import {it,expect,vi,afterEach} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,writeFileSync} from 'node:fs';
import * as database from '@/server/database';
import * as tel from '@/server/telemetry/events';
import * as gh from '@/server/integrations/github';
import {POST} from '@/app/api/events/route';
import {NextRequest} from 'next/server';
import {createServer} from 'node:http';
const root='C:/Users/yoray/Projects/Yor World/deliveries/G6/rc3-platform-independent-verification/reviewers/telemetry-github';
const app='C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186/app';
const evidence:any={}; const repo='yorayriniwnl/zenith'; const zero=new Date('2026-10-04T12:00:00Z');
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();tel.clearAggregateEvents();gh.clearSnapshotCache();writeFileSync(root+'/observations.json',JSON.stringify(evidence,null,2));});
it('fresh SQL matrix including every historical nullable ID',async()=>{
 const db=new PGlite(); await db.exec(readFileSync(app+'/supabase/migrations/20261001000000_a3_owner_auth_rls.sql','utf8'));
 database.setPlatformDbForTests(db);vi.spyOn(database,'isTestRuntime').mockReturnValue(false);
 const today=new Date().toISOString().slice(0,10); const observations=[];
 for(const [projectId,tier] of [['zenith','high'],['zenith',undefined],[undefined,'high'],[undefined,undefined]]){
  await db.exec('TRUNCATE aggregate_events');
  const oldKey=`${today}_renderer_failed_${projectId||'none'}_${tier||'none'}_legacy`;
  await db.query('INSERT INTO aggregate_events(id,date,event,project_id,tier,count) VALUES(md5($1)::uuid,$2,$3,$4,$5,7)',[oldKey,today,'renderer_failed',projectId??null,tier??null]);
  const statuses=[];for(const code of ['legacy','legacy','changed',undefined])statuses.push((await tel.recordTelemetryEvent({event:'renderer_failed',projectId,tier,code},100)).status);
  expect(statuses).toEqual([202,202,202,202]);const rows=(await db.query('SELECT id,project_id,tier,count FROM aggregate_events ORDER BY count')).rows;
  expect(rows.reduce((n:any,r:any)=>n+r.count,0)).toBe(11); observations.push({projectId,tier,statuses,rows});
 }
 evidence.sql=observations; vi.restoreAllMocks();database.setPlatformDbForTests(null);await db.close();
});
it('fresh UTF8 exact limits, headers and malformed bodies before aggregation',async()=>{
const result=[];for(const char of ['a','😀'])for(const bytes of [4096,4097])for(const header of [undefined,'1','9999']){
 const p='{"event":"studio_ready","ignored":"',s='"}';const n=bytes-Buffer.byteLength(p+s);const body=p+char.repeat(Math.floor(n/Buffer.byteLength(char)))+'x'.repeat(n%Buffer.byteLength(char))+s;
 tel.clearAggregateEvents();const response=await POST(new NextRequest('http://localhost/api/events',{method:'POST',body,headers:header?{'content-length':header}:{}}));
 expect(response.status).toBe(header==='9999'||bytes>4096?413:202);if(response.status===413)expect(tel.getAggregateEvents()).toHaveLength(0);result.push({char,bytes,header,status:response.status});
}
for(const body of ['{',JSON.stringify({event:'studio_ready',ignored:'界'.repeat(2000)})]){tel.clearAggregateEvents();const r=await POST(new NextRequest('http://localhost/api/events',{method:'POST',body}));expect(r.status).toBe(body==='{'?400:413);expect(tel.getAggregateEvents()).toHaveLength(0);result.push({bytes:Buffer.byteLength(body),status:r.status});}evidence.utf8=result;
});
it('durable last-good timestamp survives failure and cache reset',async()=>{
const db=new PGlite();await db.exec(readFileSync(app+'/supabase/migrations/20261001000000_a3_owner_auth_rls.sql','utf8'));database.setPlatformDbForTests(db);vi.spyOn(database,'isTestRuntime').mockReturnValue(false);
try{await gh.getRepositoryMetadata(repo,{now:zero,customFetch:(async()=>new Response('{"name":"SQL-last-good"}')) as any});const before=(await db.query('SELECT payload,fetched_at FROM github_snapshots')).rows;
gh.clearSnapshotCache();const failed=vi.fn(async()=>new Response('{}',{status:403}));const now=new Date(zero.getTime()+90000000);const values=await Promise.all(Array.from({length:3},()=>gh.getRepositoryMetadata(repo,{now,customFetch:failed as any})));expect(failed).toHaveBeenCalledTimes(1);expect(values.every(v=>v.data?.stale&&v.data?.fetchedAt===zero.toISOString()&&v.data?.name==='SQL-last-good')).toBe(true);const after=(await db.query('SELECT payload,fetched_at FROM github_snapshots')).rows;expect(after).toEqual(before);evidence.durableGithub={before,after,calls:failed.mock.calls.length,values};}finally{vi.restoreAllMocks();database.setPlatformDbForTests(null);await db.close();}
});
it('fresh memory bound, repeated updates, code collapse and idle expiration',async()=>{
vi.useFakeTimers();vi.setSystemTime(zero);for(const event of tel.ALLOWLISTED_EVENTS)for(const projectId of tel.ALLOWLISTED_PROJECT_IDS)for(const tier of tel.QUALITY_TIERS)await tel.recordTelemetryEvent({event,projectId,tier},100);
expect(tel.getAggregateEvents()).toHaveLength(128);for(let i=0;i<1000;i++)await tel.recordTelemetryEvent({event:'renderer_failed',code:'code_'+i},100);
expect(tel.getAggregateEvents()).toHaveLength(128);expect(tel.getAggregateEvents().find(r=>r.projectId===null&&r.event==='renderer_failed')?.count).toBe(1000);
vi.setSystemTime(zero.getTime()+86400000-1);await tel.recordTelemetryEvent({event:'renderer_failed'},100);vi.setSystemTime(zero.getTime()+86400000);expect(tel.getAggregateEvents()).toHaveLength(1);vi.setSystemTime(zero.getTime()+172800000-1);expect(tel.getAggregateEvents()).toHaveLength(0);evidence.memory={distinct:160,cap:128,codes:1000,updatedTTL:true};
});
it.each([403,429,503,'network','timeout'])('fresh cold/last-good failures %s, concurrency, hourly recovery',async(kind)=>{
vi.useFakeTimers();const failure=vi.fn(async(_url:any,opts:any)=>{if(kind==='network')throw Error('SECRET');if(kind==='timeout')await new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('SECRET'))));return new Response('{}',{status:typeof kind==='number'?kind:503});});
const failures=[];for(const warm of [false,true]){gh.clearSnapshotCache();if(warm)await gh.getRepositoryMetadata(repo,{now:new Date(zero.getTime()-90000000),customFetch:vi.fn(async()=>new Response('{"name":"old"}')) as any});
failure.mockClear();const tasks=Array.from({length:3},()=>gh.getRepositoryMetadata(repo,{now:zero,customFetch:failure as any,githubToken:'SECRET'}));await vi.advanceTimersByTimeAsync(4001);const values=await Promise.all(tasks);expect(failure).toHaveBeenCalledTimes(1);
for(let m=1;m<60;m++)await gh.getRepositoryMetadata(repo,{now:new Date(zero.getTime()+m*60000),customFetch:failure as any});expect(failure).toHaveBeenCalledTimes(1);expect(JSON.stringify(values)).not.toContain('SECRET');if(warm){expect(values[0].data?.stale).toBe(true);expect(values[0].data?.fetchedAt).toBe(new Date(zero.getTime()-90000000).toISOString());}
const recovery=vi.fn(async()=>new Response('{"name":"back"}'));const recovered=await Promise.all(Array.from({length:3},()=>gh.getRepositoryMetadata(repo,{now:new Date(zero.getTime()+3600000),customFetch:recovery as any})));expect(recovery).toHaveBeenCalledTimes(1);expect(recovered[0].data?.name).toBe('back');failures.push({warm,calls:failure.mock.calls.length,values,recovered});}evidence['github_'+kind]=failures;
});
it('module reset duplicates failed refresh within same hour (restart equivalent)',async()=>{
const fn=vi.fn(async()=>new Response('{}',{status:503}));await gh.getRepositoryMetadata(repo,{now:zero,customFetch:fn as any});vi.resetModules();const fresh=await import('@/server/integrations/github');await fresh.getRepositoryMetadata(repo,{now:zero,customFetch:fn as any});expect(fn).toHaveBeenCalledTimes(2);evidence.restart={sameHourCalls:2};fresh.clearSnapshotCache();
});
it('native Response stalled body abort settles timeout and frees single flight',async()=>{
vi.useFakeTimers();const nativeFetch=globalThis.fetch;let cancelled=false;
const synthetic=vi.fn(async(_url:any,opts:any)=>{const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));opts.signal.addEventListener('abort',()=>controller.error(new DOMException('aborted','AbortError')));},cancel(){cancelled=true;}});return new Response(stream);});
const p=gh.getRepositoryMetadata(repo,{now:zero,customFetch:synthetic as any});await vi.advanceTimersByTimeAsync(4001);expect((await p).status).toBe(504);evidence.bodyRead={abortAwareSettles:true,cancelled};
});
it('actual native fetch stalls on local HTTP body and releases flight after four seconds',async()=>{
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.write('{');});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address() as any;
try{const started=Date.now();const call=gh.getRepositoryMetadata(repo,{now:zero,customFetch:((_url:any,opts:any)=>fetch(`http://127.0.0.1:${addr.port}`,opts)) as any});const r=await call;const elapsed=Date.now()-started;expect(r.status).toBe(504);expect(elapsed).toBeLessThan(6000);const next=await gh.getRepositoryMetadata(repo,{now:new Date(zero.getTime()+3600000),customFetch:(async()=>new Response('{"name":"after-timeout"}')) as any});expect(next.data?.name).toBe('after-timeout');evidence.nativeBodyTimeout={elapsed,status:r.status,nextStatus:next.status};}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
