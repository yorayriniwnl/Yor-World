import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(evidenceRoot,'../../../../../');
const inventoryPath=path.join(evidenceRoot,'evidence-inventory.json');
const extraPaths=[
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-37-shader-extension-capability-probe.md',
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-36-shader-prewarm-runtime-capture.md',
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-35-async-shader-prewarm.md',
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-26-nonblocking-optional-assets.md',
 'docs/planning/delegation-and-work-orders.md',
 'deliveries/G7/preparation/maker-evidence/pre-g7-36/REPORT.md',
 'deliveries/G7/preparation/maker-evidence/pre-g7-36/evidence-inventory.json',
 'deliveries/G7/preparation/maker-evidence/pre-g7-35/REPORT.md',
 'deliveries/G7/preparation/maker-evidence/pre-g7-35/build-id.json',
 'deliveries/G7/preparation/maker-evidence/pre-g7-35/commands/production-build.json',
 'yorayriniwnl.in/README.md',
 'yorayriniwnl.in/source-delivery-manifest.json',
 'app/src/features/world/WorldRuntime.ts',
 'yorayriniwnl.in/src/features/world/WorldRuntime.ts',
];
const git=(args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();

if(process.argv.includes('--verify-tree')){
 const inventory=JSON.parse(fs.readFileSync(inventoryPath,'utf8'));
 const mismatches=[];
 for(const file of inventory.files){
  const bytes=fs.readFileSync(path.join(root,file.path));
  const rawSha256=createHash('sha256').update(bytes).digest('hex');
  const worktreeBlobId=git(['hash-object','--',file.path]);
  const committedBlobId=git(['rev-parse','HEAD:'+file.path]);
  if(bytes.byteLength!==file.byteLength||rawSha256!==file.rawSha256||worktreeBlobId!==file.gitBlobId||committedBlobId!==file.gitBlobId){
   mismatches.push({path:file.path,expectedBytes:file.byteLength,actualBytes:bytes.byteLength,expectedSha256:file.rawSha256,actualSha256:rawSha256,expectedGitBlobId:file.gitBlobId,worktreeBlobId,committedBlobId});
  }
 }
 const result={status:mismatches.length?'FAIL':'PASS',verifiedFiles:inventory.files.length,artifactBytes:inventory.totals.artifactBytes,mismatches};
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(mismatches.length)process.exitCode=1;
}else{
 function listFiles(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const filePath=path.join(dir,entry.name);
   if(entry.isDirectory())files.push(...listFiles(filePath));
   else if(entry.isFile()&&filePath!==inventoryPath)files.push(filePath);
  }
  return files;
 }
 const all=[...listFiles(evidenceRoot).map(p=>path.relative(root,p)),...extraPaths].sort();
 const paths=[...new Set(all)];
 const files=paths.map(relativePath=>{
  const bytes=fs.readFileSync(path.join(root,relativePath));
  return{path:relativePath.replaceAll(path.sep,'/'),byteLength:bytes.byteLength,rawSha256:createHash('sha256').update(bytes).digest('hex'),gitBlobId:git(['hash-object','--',relativePath])};
 });
 const diagnostic=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'diagnostic-run/webgl-capability-diagnostic.json'),'utf8'));
 const receipt=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'commands/webgl-probe.receipt.json'),'utf8'));
 const inventory={
  packet:'PRE-G7-37',
  sourceCommit:'5c1e6aedb71d89d46ffc0ada8de522526290131c',
  sourceAppTree:'62a08db251ef15254523bfb08b926ce7c6954ebc',
  sourceCommitDomainTree:'89ca7d46f790f062e63fcae2368c24ae557e03ab',
  inheritedCandidateDomainTree:'1310ab56ca105b28fe3fb10957bfe5875085b7fd',
  p35EvidenceCommit:'24e15b7f7513170c4df56ea930ac8e37b149f98a',
  p36EvidenceCommit:'8c34561352f21be6cea347682013c157293ba600',
  p37PacketCommit:'fa6fabfdb6d2814863c21f238da01bdd2c92767e',
  p37HarnessCommit:git(['rev-parse','HEAD']),
  evidenceCommitParent:git(['rev-parse','HEAD']),
  buildId:diagnostic.reusedBuildId,
  browserVersion:diagnostic.browserVersion,
  captureExitCode:receipt.exitCode,
  captureCount:1,
  inventoryExclusion:'All PRE-G7-37 evidence files and governing packets, delegation index, P35/P36 reports and build receipts, source/mirror runtime files, and domain metadata are listed. This inventory excludes only itself to avoid a self-referential hash.',
  totals:{artifactFiles:files.length,artifactBytes:files.reduce((n,file)=>n+file.byteLength,0)},
  files
 };
 fs.writeFileSync(inventoryPath,JSON.stringify(inventory,null,2)+'\n','utf8');
 process.stdout.write(JSON.stringify(inventory.totals)+'\n');
}
