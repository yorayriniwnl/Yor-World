import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const evidenceRoot=path.join(root,'deliveries/G7/preparation/maker-evidence/pre-g7-40');
const commandRoot=path.join(evidenceRoot,'commands');
fs.mkdirSync(commandRoot,{recursive:true});
const appRoot=path.join(root,'app');
const node24=process.execPath;
const corepack='C:/Program Files/nodejs/node_modules/corepack/dist/corepack.js';
const baseEnv={...process.env};
const cleared=[];
for(const key of ['CI','NODE_OPTIONS','NEXT_PUBLIC_PRE_G7_13_EVIDENCE','C3_EVIDENCE_DIR','PRE_G7_13_EVIDENCE_MODE','PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE','PRE_G7_13_EVIDENCE_DIR','PRE_G7_13_EXPECTED_EVIDENCE_DIR']){
 if(Object.hasOwn(baseEnv,key)){cleared.push(key);delete baseEnv[key];}
}
baseEnv.COREPACK_ENABLE_NETWORK='0';
baseEnv.COREPACK_DEFAULT_TO_LATEST='0';
baseEnv.PATH=path.dirname(node24)+path.delimiter+(baseEnv.PATH??'');
const pnpm=spawnSync(node24,[corepack,'pnpm','--version'],{cwd:appRoot,env:baseEnv,encoding:'utf8'});
if(pnpm.status!==0)throw new Error('Pinned pnpm preflight failed: '+JSON.stringify({status:pnpm.status,error:pnpm.error,stderr:pnpm.stderr}));
const checks=[];
for(const name of ['lint','typecheck','build']){
 const env={...baseEnv};
 if(name==='build'){
  env.NEXT_PUBLIC_PRE_G7_13_EVIDENCE='1';
  env.NEXT_TELEMETRY_DISABLED='1';
 }
 const args=['pnpm','run',name];
 const startedAt=new Date().toISOString();
 const started=Date.now();
 const stdout=[];
 const stderr=[];
 const child=spawn(node24,[corepack,...args],{cwd:appRoot,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>stdout.push(Buffer.from(chunk)));
 child.stderr.on('data',chunk=>stderr.push(Buffer.from(chunk)));
 const result=await new Promise(resolve=>{
  child.on('error',error=>resolve({exitCode:null,error:String(error)}));
  child.on('close',code=>resolve({exitCode:code,error:null}));
 });
 const out=Buffer.concat(stdout),err=Buffer.concat(stderr);
 fs.writeFileSync(path.join(commandRoot,name+'.stdout.bin'),out);
 fs.writeFileSync(path.join(commandRoot,name+'.stderr.bin'),err);
 const receipt={packet:'PRE-G7-40',name,command:args,nodePath:node24,nodeVersion:process.version,corepackPath:corepack,pnpmVersion:pnpm.stdout.trim(),cwd:appRoot,environment:{COREPACK_ENABLE_NETWORK:'0',COREPACK_DEFAULT_TO_LATEST:'0',...(name==='build'?{NEXT_PUBLIC_PRE_G7_13_EVIDENCE:'1',NEXT_TELEMETRY_DISABLED:'1'}:{})},clearedFromEnvironment:cleared,startedAt,endedAt:new Date().toISOString(),elapsedMs:Date.now()-started,exitCode:result.exitCode,spawnError:result.error,stdoutBytes:out.length,stderrBytes:err.length,stdoutSha256:createHash('sha256').update(out).digest('hex'),stderrSha256:createHash('sha256').update(err).digest('hex')};
 fs.writeFileSync(path.join(commandRoot,name+'.receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 checks.push({name,exitCode:result.exitCode,elapsedMs:receipt.elapsedMs,stdoutBytes:out.length,stderrBytes:err.length,spawnError:result.error});
}
const summary={packet:'PRE-G7-40',nodeVersion:process.version,pnpmVersion:pnpm.stdout.trim(),checks};
fs.writeFileSync(path.join(evidenceRoot,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');
process.stdout.write(JSON.stringify(summary,null,2)+'\n');
if(checks.some(check=>check.exitCode!==0))process.exitCode=1;
