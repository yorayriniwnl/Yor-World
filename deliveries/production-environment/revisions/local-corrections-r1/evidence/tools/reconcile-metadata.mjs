import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const repo=path.resolve(root,"../../../..");
const require=createRequire(path.join(repo,"app/package.json"));
const validator=require("gltf-validator");
const revision="world-art-local-corrections-20261009-r1";
const names={"group-a-essential":"group-a-essential","group-b-props":"group-b-props","on-demand-projects":"on-demand-projects","production-room-full":"production-room-full","mobile-room-lod":"mobile-room-lod","fixture-chair-production":"fixture-production"};
const sha=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const record=file=>({path:path.relative(repo,file).replaceAll("\\","/"),bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))});
const generatedAt=new Date().toISOString();
const proofName=process.argv[2] || "export-inspection-attempt-03.json";
const receiptName=process.argv[3] || "current-assets-verification.json";
if(path.basename(proofName)!==proofName || path.basename(receiptName)!==receiptName) throw Error("Evidence filenames only");
if(fs.existsSync(path.join(root,"evidence",receiptName))) throw Error(`Preserve existing ${receiptName}; choose a new receipt`);
for(const name of ["manifest.json","provenance.json"]){
  const file=path.join(root,name);
  if(fs.existsSync(file)){
    const current=JSON.parse(fs.readFileSync(file,"utf8"));
    if(current.revision!==revision || current.groups?.some(g=>names?.[g.id] && g.approved)) throw Error("Refuse to change another or admitted revision");
    const checkpoint=path.join(root,"evidence",`${receiptName}.${name}.previous.json`);
    fs.copyFileSync(file,checkpoint,fs.constants.COPYFILE_EXCL);
  }
}
const exportProof=JSON.parse(fs.readFileSync(path.join(root,"evidence",proofName),"utf8"));
if(exportProof.results.length!==6 || exportProof.results.some(x=>x.status!=="PASS")) throw Error("Current six export proof must all pass");
const byName=new Map(exportProof.results.map(x=>[x.logicalName,x]));
const manifestPath=path.join(repo,"app/public/asset-manifest.json");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const publicRoot=path.join(repo,"app/public");
const publicRevision=path.join(publicRoot,"models",revision);
const verifications=[];
function metrics(bytes){
  const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString("utf8"));
  const bin=bytes.subarray(20+jsonLength+8);
  const imageViews=new Set((json.images||[]).map(x=>x.bufferView));
  let gpu=(json.bufferViews||[]).reduce((total,v,i)=>total+(imageViews.has(i)?0:v.byteLength),0);
  for(const image of json.images||[]){
    if(image.bufferView===undefined) throw Error("External GLB image requires explicit inventory");
    const view=json.bufferViews[image.bufferView],offset=view.byteOffset||0;
    if(bin.readUInt32BE(offset)!==0x89504e47) throw Error("Non-PNG image requires measured decoder inventory");
    gpu+=Math.ceil(bin.readUInt32BE(offset+16)*bin.readUInt32BE(offset+20)*4*4/3);
  }
  return {triangles:(json.meshes||[]).flatMap(x=>x.primitives).reduce((total,p)=>total+(p.indices!==undefined?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count)/3,0),materials:json.materials?.length||0,estimatedGpuBytes:gpu,
    clips:(json.animations||[]).map(a=>a.name)};
}
for(const group of manifest.groups){
  const existing=path.resolve(publicRoot,"."+group.url);
  let bytes=fs.readFileSync(existing);
  if(sha(bytes)!==group.sha256 || bytes.length!==group.bytes) throw Error(`Current manifest bytes mismatch ${group.id}`);
  const oldUrl=group.url;
  let actual;
  if(names[group.id]){
    const proof=byName.get(names[group.id]);
    bytes=fs.readFileSync(path.join(repo,proof.path));
    actual=metrics(bytes);
    if(proof.sha256!==sha(bytes) || proof.bytes!==bytes.length || proof.triangles!==actual.triangles || proof.estimatedGpuBytes!==actual.estimatedGpuBytes) throw Error(`Export proof identity mismatch ${group.id}`);
    group.sha256=proof.sha256;group.bytes=proof.bytes;
    const filename=`${names[group.id]}.${group.sha256}.glb`;
    const target=path.join(publicRevision,filename);
    if(fs.existsSync(target)) {if(!fs.readFileSync(target).equals(bytes))throw Error(`Existing immutable target differs: ${target}`);}
    else fs.writeFileSync(target,bytes,{flag:"wx"});
    group.url=`/models/${revision}/${filename}`;
    group.approved=false;group.status="candidate";
    group.provenanceId=`prov-yor-${revision}-${group.id}`;
  }
  else actual=metrics(bytes);
  Object.assign(group,actual);
  const gltf=await validator.validateBytes(new Uint8Array(bytes),{uri:path.basename(group.url),maxIssues:1000});
  if(gltf.issues.numErrors) throw Error(`GLB errors: ${group.id}`);
  verifications.push({id:group.id,revision,oldUrl,url:group.url,sha256:group.sha256,bytes:bytes.length,...actual,
    changed:!!names[group.id],approved:group.approved,validator:{tool:"Khronos glTF-Validator",version:validator.version(),numErrors:gltf.issues.numErrors,numWarnings:gltf.issues.numWarnings,messages:gltf.issues.messages}});
}
manifest.revision=revision;manifest.schemaVersion=1;manifest.lane="Actual local Codex art maker /root/remediation_art_maker";
manifest.notice="Successor candidate art assets pending independent visual/provenance review and Parent admission; historical asset bytes retained. Derived metrics were freshly read from exact GLBs.";
manifest.generatedAt=generatedAt;
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
const historical=[];
for(const name of fs.readdirSync(path.join(publicRoot,"models")).filter(x=>x.endsWith(".glb"))){
  const relative=`app/public/models/${name}`,actual=fs.readFileSync(path.join(repo,relative));
  const accepted=execFileSync("git",["show",`8e5b954e147a87e36a6869d9940c40f3d4c123f0:${relative}`],{cwd:repo,maxBuffer:10*1024*1024});
  historical.push({path:relative,sha256:sha(actual),bytes:actual.length,acceptedSource:"8e5b954e147a87e36a6869d9940c40f3d4c123f0",matchesAccepted:actual.equals(accepted)});
}
if(historical.length!==9 || historical.some(x=>!x.matchesAccepted)) throw Error("Nine historical public GLBs must stay exact");
const sourceFiles=["source/prepare-authoring.py","source/art_refinements.py","source/environment/build-environment.py","source/resident-fixture/build-resident-production.py"];
const sourceFingerprints=sourceFiles.map(name=>record(path.join(root,name)));
const inputRegister=JSON.parse(fs.readFileSync(path.join(root,"input-register.json"),"utf8"));
const currentInputs=["docs/planning/reconciliation-packets/2026-10-09-local-corrections-03.md","docs/planning/handoffs/local-corrections-03/02-art-assets.md","references/images/main-reference.png","references/manifest.json","deliveries/production-environment/source-register.json","deliveries/production-environment/source/generate-textures.py"].map(name=>record(path.join(repo,name)));
const gpuEstimateMethod="Exact GLB geometry/animation bufferView bytes plus unique embedded PNG decoded RGBA8 dimensions with 4/3 mip overhead; conservative asset-derived estimate, not measured total GPU allocation.";
const proof={revision,generatedAt,executor:"local Codex /root/remediation_art_maker",candidateApproved:false,sourceAtReconciliation:execFileSync("git",["rev-parse","HEAD"],{cwd:repo,encoding:"utf8"}).trim(),gpuEstimateMethod,assets:verifications,historicalPublicAssets:historical,sourceFingerprints,currentInputFingerprints:currentInputs,exportProof:record(path.join(root,"evidence",proofName)),physicalEvidence:record(path.join(root,"evidence/fixture-attempt-03/blender-checks.json")),limits:{visualAcceptance:"PENDING independent review and Parent",combinedPerformance:"Owned by runtime maker; this asset receipt does not certify it",heapGpuLeakAbsence:"UNKNOWN",productionCdn:"NOT RUN"}};
fs.writeFileSync(path.join(root,"manifest.json"),JSON.stringify({...manifest,gpuEstimateMethod,evidence:`evidence/${receiptName}`},null,2)+"\n");
fs.writeFileSync(path.join(root,"provenance.json"),JSON.stringify({revision,generatedAt,executor:proof.executor,approvalStatus:"candidate; not self-approved",historicalInputRegister:inputRegister,currentInputFingerprints:currentInputs,sourceFingerprints,referenceUse:"Main reference is visual direction only. Its rights remain unknown; no reference pixels or downloaded production models were added.",geometryMethod:"Procedural Blender geometry from preserved environment/B4 authoring inputs, with explicit world-parent repair and retained intentional chair/rig-local coordinates.",textureMethod:"Seven existing procedural texture PNGs copied byte-identically; historical generator/source-register retained as provenance inputs, not re-executed or independently licensed here.",unchangedResident:"Original b15000feb4738d14aa1d41a43f01ba377f7011dbe1c95b3478c1200d12f4411d retained; no successor resident export used.",artCommitObserved:"012f164e56886d06f8cca631960a1cd7dafd0ebb was produced by a separate local continuation. Its exact chat/account executor is not inferred; current agent verifies its files.",assets:verifications.map(({validator,...asset})=>asset),historicalPublicAssets:historical},null,2)+"\n");
fs.writeFileSync(path.join(root,"evidence",receiptName),JSON.stringify(proof,null,2)+"\n",{flag:"wx"});
for(const asset of verifications) console.log(`${asset.id}: ${asset.triangles} triangles; ${asset.materials} materials; ${asset.estimatedGpuBytes} GPU-estimate bytes; ${asset.url}`);
console.log(`Historical exact bytes: ${historical.length}/${historical.length} PASS. Candidate approvals remain false.`);
