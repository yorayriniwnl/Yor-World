import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
const audit=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(audit,'../../../../..');
const fixture=path.join(audit,'.work/repo-02');
if(fs.existsSync(fixture))throw new Error('Diagnostic root collision; no fixture resumption');
const release=path.join(fixture,'scripts/release');fs.mkdirSync(release,{recursive:true});
for(const name of ['release-lib.mjs','rc6-policy.json'])fs.copyFileSync(path.join(root,'scripts/release',name),path.join(release,name));
const lib=await import(pathToFileURL(path.join(release,'release-lib.mjs')).href);
const p=lib.policy;
const destination=path.join(fixture,p.deliveryRoot);fs.mkdirSync(destination,{recursive:true});
const receiptName=p.deliveryRoot+'/bundle-receipt.json';const receipt=path.join(fixture,receiptName);
fs.writeFileSync(receipt,'existing immutable attempt receipt\n',{flag:'wx'});const original=fs.readFileSync(receipt);
const source=fs.readFileSync(path.join(root,'scripts/release/build-release-bundle.mjs'),'utf8');
const executable=source.slice(source.indexOf('try {'));
const messages=[];const processState={exitCode:0};const archiveBytes=Buffer.from('synthetic prevalidated bundle payload');
vm.runInNewContext(executable,{fs,path,policy:p,parseArgs:()=>({values:{'source-commit':'a'.repeat(40),output:p.bundle.path,receipt:receiptName}}),assertPolicyOutputs:lib.assertPolicyOutputs,assertPolicyOutput:lib.assertPolicyOutput,assertNoFileCollision:lib.assertNoFileCollision,buildBundle:()=>({archive:archiveBytes,fileCount:1,bytes:archiveBytes.length,sha256:crypto.createHash('sha256').update(archiveBytes).digest('hex'),files:[]}),git:()=> 'b'.repeat(40),writeJson:lib.writeJson,console:{log:x=>messages.push(x),error:x=>messages.push(x)},process:processState},{filename:'actual-build-release-bundle-entrypoint'});
const archive=path.join(fixture,p.bundle.path);
const rows=[{id:'R7-WRITER-01',expected:'Occupied receipt rejects before any archive write',observed:{exitCode:processState.exitCode,archiveCreated:fs.existsSync(archive),receiptUnchanged:fs.readFileSync(receipt).equals(original),messages},status:fs.existsSync(archive)?'FAIL':'PASS',scope:'Actual unmodified entrypoint body and copied release-lib guards; only nonwriting buildBundle/git computations replaced by synthetic known-good dependencies; isolated fixture only'}];
const preserved=path.join(fixture,'deliveries/G7/rc6-candidate-r6/sentinel.txt');fs.mkdirSync(path.dirname(preserved),{recursive:true});fs.writeFileSync(preserved,'preserved fixture sentinel',{flag:'wx'});const before=fs.readFileSync(preserved);
const hardlink=p.deliveryRoot+'/hardlink.json';fs.linkSync(preserved,path.join(fixture,hardlink));
let hardlinkError='';try{lib.writeJson(hardlink,{forbidden:true});}catch(error){hardlinkError=error.message;}
rows.push({id:'hardlink guard',status:hardlinkError.includes('Hard-linked')&&fs.readFileSync(preserved).equals(before)?'PASS':'FAIL',observed:{error:hardlinkError,sentinelUnchanged:fs.readFileSync(preserved).equals(before)}});
const alias=path.join(destination,'preserved-alias');fs.symlinkSync(path.dirname(preserved),alias,process.platform==='win32'?'junction':'dir');
let aliasError='';try{lib.writeJson(p.deliveryRoot+'/preserved-alias/new.json',{forbidden:true});}catch(error){aliasError=error.message;}
rows.push({id:'preserved alias guard',status:aliasError.includes('immutable')&&!fs.existsSync(path.join(path.dirname(preserved),'new.json'))?'PASS':'FAIL',observed:{error:aliasError,sentinelUnchanged:fs.readFileSync(preserved).equals(before)}});
const reserveSource=path.join(fixture,'reserve-attempt.mjs');fs.copyFileSync(path.join(root,'deliveries/G7/preparation/tools/reserve-attempt.mjs'),reserveSource);
const {reserveAttempt}=await import(pathToFileURL(reserveSource).href);
let firstReservationError='';
try{reserveAttempt(fixture,'deliveries/G7/evidence/attempt.json');}catch(error){firstReservationError=error.message;}
rows.push({id:'R7-WRITER-02',expected:'Create missing evidence parent under existing deliveries/G7 prefix',status:firstReservationError?'FAIL':'PASS',observed:{error:firstReservationError,requestedParentExists:fs.existsSync(path.join(fixture,'deliveries/G7/evidence')),unexpectedRootEvidenceCreated:fs.existsSync(path.join(fixture,'evidence'))}});
fs.mkdirSync(path.join(fixture,'deliveries/G7/evidence'),{recursive:true});
const reserved=reserveAttempt(fixture,'deliveries/G7/evidence/attempt.json');
let retryError='';try{reserveAttempt(fixture,'deliveries/G7/evidence/attempt.json');}catch(error){retryError=error.message;}
rows.push({id:'interrupted raw attempt reuse',status:retryError.includes('already exists')?'PASS':'FAIL',observed:{error:retryError,rawDirectoryRetained:fs.existsSync(reserved.artifactDir),receiptNotInvented:!fs.existsSync(reserved.output)}});
fs.writeFileSync(path.join(audit,'writer-probes.json'),JSON.stringify({scope:'Isolated synthetic filesystem probes. No candidate-driver execution, real R7 writes, browser/network/provider/deployment actions.',rows},null,2)+'\n');
console.log(JSON.stringify(rows));
process.exitCode=rows.some(row=>row.status==='FAIL')?1:0;
