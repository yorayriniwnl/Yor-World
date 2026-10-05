import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
const require=createRequire('C:/Users/yoray/AppData/Local/Temp/yw-res-2af509/app/package.json');
const {Client}=require('pg');
const connectionString='postgresql://yw_residual@127.0.0.1:55437/yw_residual_review';
const repo='yorayriniwnl/helios';let admin:any;let clients:any[]=[];const observations:any[]=[];
beforeAll(async()=>{admin=new Client({connectionString});await admin.connect();for(const name of ['20261001000000_a3_owner_auth_rls.sql','20261001000001_a4_publication_media.sql','20261005000000_github_refresh_state.sql'])await admin.query(readFileSync(`supabase/migrations/${name}`,'utf8'));});
beforeEach(async()=>{await admin.query('TRUNCATE public.github_refresh_state,public.github_snapshots');});
afterEach(async()=>{vi.unstubAllEnvs();await Promise.all(clients.map(c=>c.end()));clients=[];});
afterAll(async()=>{await admin.end();writeFileSync('../deliveries/G6/rc3-platform-residual-corrections/review/delta/native-observations.json',JSON.stringify(observations,null,2));});
async function instances(){const modules=[];const pids=[];for(let i=0;i<10;i++){const c=new Client({connectionString});await c.connect();clients.push(c);pids.push((await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);vi.resetModules();const database=await import('@/server/database');database.setPlatformDbForTests({query:(sql:string,params:unknown[]=[])=>c.query(sql,params)});modules.push(await import('@/server/integrations/github'));}expect(new Set(pids).size).toBe(10);return {modules,pids};}
it.each([403,429,503,'network','json','timeout'] as const)('ten real backend sessions enforce cold herd/restart/hour for %s',async(failure)=>{
const {modules,pids}=await instances();const t0=new Date('2026-10-05T00:00:00Z');
const upstream=vi.fn(async(_url:unknown,options:any)=>{if(failure==='network')throw new Error('TOP_SECRET');if(failure==='timeout')return await new Promise<Response>((_r,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('TOP_SECRET'))));return new Response(failure==='json'?'TOP_SECRET':'{}',{status:failure==='json'?200:failure});});
const results=await Promise.all(modules.map(m=>m.getRepositoryMetadata(repo,{now:t0,customFetch:upstream as typeof fetch,githubToken:'TOP_SECRET'})));
expect(upstream).toHaveBeenCalledTimes(1);for(const m of modules)m.clearSnapshotCache();
await Promise.all(modules.map(m=>m.getRepositoryMetadata(repo,{now:new Date(+t0+3599000),customFetch:upstream as typeof fetch})));expect(upstream).toHaveBeenCalledTimes(1);
for(const m of modules)m.clearSnapshotCache();const success=vi.fn(async()=>new Response('{"name":"last-good"}',{status:200}));
await Promise.all(modules.map(m=>m.getRepositoryMetadata(repo,{now:new Date(+t0+3600000),customFetch:success as typeof fetch})));expect(success).toHaveBeenCalledTimes(1);
const snapshot=(await admin.query('SELECT payload,fetched_at FROM public.github_snapshots')).rows;expect(snapshot).toHaveLength(1);
for(const m of modules)m.clearSnapshotCache();const nextFail=vi.fn(async()=>new Response('{}',{status:403}));
await Promise.all(modules.map(m=>m.getRepositoryMetadata(repo,{now:new Date(+t0+7200000),customFetch:nextFail as typeof fetch})));expect(nextFail).toHaveBeenCalledTimes(1);
expect((await admin.query('SELECT payload,fetched_at FROM public.github_snapshots')).rows).toEqual(snapshot);expect(JSON.stringify(results)).not.toContain('TOP_SECRET');
const state=(await admin.query('SELECT * FROM public.github_refresh_state')).rows;expect(state[0].last_status).toBe('rate_limited');expect(JSON.stringify(state)).not.toContain('TOP_SECRET');observations.push({failure,pids,coldCalls:upstream.mock.calls.length,exactHourCalls:success.mock.calls.length,nextHourFailureCalls:nextFail.mock.calls.length,snapshot,state});
});
it('production DB statement clock serializes independent sessions and hostile app clock',async()=>{const {modules,pids}=await instances();vi.stubEnv('VITEST','false');vi.stubEnv('NODE_ENV','production');const upstream=vi.fn(async()=>new Response('{}',{status:403}));await Promise.all(modules.map((m,i)=>m.getRepositoryMetadata(repo,{now:new Date(`${2099+i}-01-01`),customFetch:upstream as typeof fetch})));expect(upstream).toHaveBeenCalledTimes(1);const state=(await admin.query('SELECT last_attempt_at,abs(extract(epoch from(statement_timestamp()-last_attempt_at)))::float8 AS age FROM public.github_refresh_state')).rows[0];expect(state.age).toBeLessThan(10);observations.push({case:'production-clock',pids,state,calls:upstream.mock.calls.length});});
it('PUBLIC anon authenticated and owner cannot read or mutate operational state',async()=>{for(const role of ['anon','authenticated']){await admin.query(`SET ROLE ${role}`);for(const sql of ['SELECT * FROM public.github_refresh_state',"INSERT INTO public.github_refresh_state VALUES('yorayriniwnl/helios',now(),'pending',now())",'UPDATE public.github_refresh_state SET last_status=\'ok\'','DELETE FROM public.github_refresh_state'])await expect(admin.query(sql)).rejects.toMatchObject({code:'42501'});await admin.query('RESET ROLE');}const grants=(await admin.query("SELECT grantee,privilege_type FROM information_schema.role_table_grants WHERE table_name='github_refresh_state' ORDER BY grantee,privilege_type")).rows;expect(grants.some((r:any)=>['PUBLIC','anon','authenticated'].includes(r.grantee))).toBe(false);observations.push({case:'table-grants',grants});});
