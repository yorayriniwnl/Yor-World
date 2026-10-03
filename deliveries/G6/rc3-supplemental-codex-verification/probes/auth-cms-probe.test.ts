import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { validateUpload } from "@/server/media/validate-upload";

it("reproduces owner table bypass and truncated-image acceptance (PASS means defect reproduced)", async () => {
  const workspace=resolve(process.cwd(), "..");
  const candidate="261c483646f68692a3fe8e184d48d25b8264a6d7";
  const source="6129ad7a870f9f391455eb8a0582733a5ccccd11";
  const tree=(ref:string) => execFileSync("git",["rev-parse",`${ref}:app`],{cwd:workspace,encoding:"utf8"}).trim();
  const trees={head:tree("HEAD"),candidate:tree(candidate),source:tree(source)};
  expect(trees.head).toBe(trees.candidate); expect(trees.source).toBe(trees.candidate);
  expect(execFileSync("git",["diff","--name-only","HEAD","--","app"],{cwd:workspace,encoding:"utf8"}).trim()).toBe("");
  const db=new PGlite();
  const sqlInputs=[];
  const actor="11111111-1111-1111-1111-111111111111";
  let observations;
  try {
    for(const path of ["supabase/migrations/20261001000000_a3_owner_auth_rls.sql","supabase/migrations/20261001000001_a4_publication_media.sql","supabase/operations/harden-publication-grants.sql"]){
      const sql=await readFile(path,"utf8");
      sqlInputs.push({path,sha256:createHash("sha256").update(sql).digest("hex")}); await db.exec(sql);
    }
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,'synthetic-owner@fixture.test')",[actor]);
    await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true)",[actor]);
    await db.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES(1,$1,$2)",[JSON.stringify({synthetic:"original history"}),actor]);
    await db.exec("SET ROLE authenticated");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[actor,JSON.stringify({sub:actor,aal:"aal2",role:"authenticated"})]);
    const ownerPredicate=(await db.query("SELECT current_user,public.is_active_owner_with_aal2() AS authorized")).rows;
    expect(ownerPredicate[0]?.authorized).toBe(true);
    const rpc=(await db.query("SELECT has_function_privilege(current_user,'public.publish_new_revision(integer,jsonb,uuid)','EXECUTE') AS permitted")).rows;
    expect(rpc).toEqual([{permitted:false}]);
    await db.query("INSERT INTO public.published_content(revision,payload) VALUES(999,$1)",[JSON.stringify({synthetic:"unvalidated arbitrary public payload",candidatex:true})]);
    await db.query("UPDATE public.published_content SET payload=$1 WHERE revision=999",[JSON.stringify({synthetic:"modified directly without expected revision"})]);
    await db.query("UPDATE public.publication_history SET snapshot=$1 WHERE revision=1",[JSON.stringify({synthetic:"rewritten history"})]);
    const published=(await db.query("SELECT revision,payload FROM public.published_content")).rows;
    const history=(await db.query("SELECT revision,snapshot FROM public.publication_history")).rows;
    const audit=(await db.query("SELECT COUNT(*)::int AS count FROM public.audit_events")).rows;
    expect(published).toEqual([{revision:999,payload:{synthetic:"modified directly without expected revision"}}]);
    expect(history).toEqual([{revision:1,snapshot:{synthetic:"rewritten history"}}]);
    expect(audit).toEqual([{count:0}]);
    observations={ownerPredicate,rpc,published,history,audit};
  } finally { await db.close(); }
  const images=[{mime:"image/png",bytes:[137,80,78,71,13,10,26,10]},{mime:"image/jpeg",bytes:[255,216,255]},{mime:"image/webp",bytes:[82,73,70,70,0,0,0,0,87,69,66,80]}].map(input => {
    const validated=validateUpload({mime:input.mime,filename:"synthetic-truncated",buffer:new Uint8Array(input.bytes)});
    expect(validated.bytes).toBe(input.bytes.length);
    return {mime:input.mime,syntheticInputHex:Buffer.from(input.bytes).toString("hex"),accepted:true,bytes:validated.bytes,dimensions:validated.dimensions,hash:validated.hash};
  });
  const result={candidate,implementationSource:source,trees,sqlInputs,node:process.version,cwd:process.cwd(),boundary:"actual local embedded PGlite SQL and role claims; actual canonical validateUpload; no hosted Auth, Storage, REST or external services",status:"PASS: observed defects reproduced, not product acceptance",observations,images,impact:"Current active owner AAL2 can bypass server validation/revision/audit gates and rewrite immutable history. No non-owner escalation demonstrated."};
  await writeFile(resolve(workspace,"deliveries/G6/rc3-supplemental-codex-verification/evidence/auth-cms-result.json"),JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result,null,2));
},90_000);
