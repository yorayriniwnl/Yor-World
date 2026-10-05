import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
let db:PGlite;
const repo='yorayriniwnl/helios';
async function instance(){vi.resetModules();const database=await import('@/server/database');database.setPlatformDbForTests(db);return import('@/server/integrations/github');}
beforeAll(async()=>{db=new PGlite();for(const name of ['20261001000000_a3_owner_auth_rls.sql','20261001000001_a4_publication_media.sql','20261005000000_github_refresh_state.sql'])await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));});
beforeEach(async()=>{await db.exec('TRUNCATE public.github_refresh_state,public.github_snapshots');});
afterEach(()=>{vi.unstubAllEnvs();});afterAll(async()=>{await db.close();});
it.each([403,429,503,'network','json','timeout'] as const)('DB attempt survives modules and secrets stay redacted for %s',async(failure)=>{
 const fetcher=vi.fn(async(_url:unknown,options:any)=>{if(failure==='network')throw new Error('TOP_SECRET Authorization');if(failure==='timeout')return await new Promise<Response>((_r,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('TOP_SECRET'))));return new Response(failure==='json'?'TOP_SECRET':'{}',{status:failure==='json'?200:failure});});
 const a=await instance();const b=await instance();
 const options={customFetch:fetcher as typeof fetch,githubToken:'TOP_SECRET'};
 const results=await Promise.all(Array.from({length:10},(_,i)=>(i%2?a:b).getRepositoryMetadata(repo,options)));
 expect(fetcher).toHaveBeenCalledTimes(1);a.clearSnapshotCache();b.clearSnapshotCache();
 const c=await instance();results.push(await c.getRepositoryMetadata(repo,options));expect(fetcher).toHaveBeenCalledTimes(1);
 expect(JSON.stringify(results)).not.toContain('TOP_SECRET');expect(JSON.stringify((await db.query('SELECT * FROM public.github_refresh_state')).rows)).not.toContain('TOP_SECRET');
 expect((await db.query('SELECT * FROM public.github_snapshots')).rows).toHaveLength(0);
});
it('late successful completion cannot replace newer claim or last good snapshot',async()=>{
 const t0=new Date('2026-10-05T00:00:00Z');const a=await instance();const b=await instance();
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
 const old=a.getRepositoryMetadata(repo,{now:t0,customFetch:(async()=>{await gate;return new Response('{"name":"old"}');}) as typeof fetch});
 for(let i=0;i<100;i++){if((await db.query('SELECT * FROM public.github_refresh_state')).rows.length)break;await new Promise(r=>setTimeout(r,1));}
 const next=await b.getRepositoryMetadata(repo,{now:new Date(+t0+3600000),customFetch:(async()=>new Response('{"name":"new"}')) as typeof fetch});expect(next.data?.name).toBe('new');release();
 expect((await old).data?.name).toBe('new');const row=(await db.query<{payload:{name:string},fetched_at:Date}>('SELECT payload,fetched_at FROM public.github_snapshots')).rows[0];expect(row?.payload.name).toBe('new');expect(new Date(row!.fetched_at).toISOString()).toBe('2026-10-05T01:00:00.000Z');
});
it('production ignores injected future app clock, and configured broken DB cannot fetch',async()=>{
 const a=await instance();vi.stubEnv('VITEST','false');vi.stubEnv('NODE_ENV','production');
 const fetcher=vi.fn(async()=>new Response('{}',{status:403}));
 await a.getRepositoryMetadata(repo,{customFetch:fetcher as typeof fetch,now:new Date('2099-01-01')});a.clearSnapshotCache();
 await a.getRepositoryMetadata(repo,{customFetch:fetcher as typeof fetch,now:new Date('2199-01-01')});expect(fetcher).toHaveBeenCalledTimes(1);
 const row=(await db.query<{delta:number}>('SELECT EXTRACT(EPOCH FROM (last_attempt_at-statement_timestamp()))::float8 AS delta FROM public.github_refresh_state')).rows[0];expect(Math.abs(row!.delta)).toBeLessThan(10);
 a.clearSnapshotCache();await db.exec('DROP TABLE public.github_refresh_state');
 const result=await a.getRepositoryMetadata(repo,{customFetch:fetcher as typeof fetch});expect(result.status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1);
 await db.exec(readFileSync('supabase/migrations/20261005000000_github_refresh_state.sql','utf8'));
});
it('exact SQL boundary rejects 59:59 and permits one claim at inclusive hour',async()=>{
 const t0=new Date('2026-10-05T00:00:00Z');const a=await instance();const fetcher=vi.fn(async()=>new Response('{}',{status:403}));
 await a.getRepositoryMetadata(repo,{now:t0,customFetch:fetcher as typeof fetch});
 a.clearSnapshotCache();await a.getRepositoryMetadata(repo,{now:new Date(+t0+3599000),customFetch:fetcher as typeof fetch});expect(fetcher).toHaveBeenCalledTimes(1);
 const b=await instance();a.clearSnapshotCache();await Promise.all([a,b].map(m=>m.getRepositoryMetadata(repo,{now:new Date(+t0+3600000),customFetch:fetcher as typeof fetch})));expect(fetcher).toHaveBeenCalledTimes(2);
});
it('public anonymous and authenticated roles have no operational-table rights',async()=>{
 for(const role of ['anon','authenticated']){
  await db.exec(`SET ROLE ${role}`);
  try{for(const sql of ['SELECT * FROM public.github_refresh_state',"INSERT INTO public.github_refresh_state VALUES('yorayriniwnl/helios',now(),'pending',now())","UPDATE public.github_refresh_state SET last_status='ok'",'DELETE FROM public.github_refresh_state'])await expect(db.query(sql)).rejects.toMatchObject({code:'42501'});}
  finally{await db.exec('RESET ROLE');}
 }
 const grants=(await db.query<{grantee:string}>("SELECT grantee FROM information_schema.role_table_grants WHERE table_name='github_refresh_state'")).rows;expect(grants.some(r=>['PUBLIC','anon','authenticated'].includes(r.grantee))).toBe(false);
 const policies=(await db.query("SELECT * FROM pg_policies WHERE tablename='github_refresh_state'")).rows;expect(policies).toHaveLength(0);
});
it('failed refresh preserves exact millisecond fetched time and stale marker across reset',async()=>{
 const t0=new Date('2026-10-05T00:00:00.123Z');const a=await instance();await a.getRepositoryMetadata(repo,{now:t0,customFetch:(async()=>new Response('{"name":"last-good"}')) as typeof fetch});
 const before=(await db.query('SELECT payload,fetched_at FROM public.github_snapshots')).rows;
 const b=await instance();const failure=vi.fn(async()=>new Response('{}',{status:429}));
 const result=await b.getRepositoryMetadata(repo,{now:new Date(+t0+86400001),customFetch:failure as typeof fetch});expect(result.data?.stale).toBe(true);expect(result.data?.fetchedAt).toBe(t0.toISOString());expect(result.data?.rateLimited).toBe(true);
 b.clearSnapshotCache();const c=await instance();expect((await c.getRepositoryMetadata(repo,{now:new Date(+t0+86400002),customFetch:failure as typeof fetch})).data?.fetchedAt).toBe(t0.toISOString());expect(failure).toHaveBeenCalledTimes(1);expect((await db.query('SELECT payload,fetched_at FROM public.github_snapshots')).rows).toEqual(before);
});
