import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const evidenceRoot=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(evidenceRoot,'../../../../../');
const inventoryPath=path.join(evidenceRoot,'evidence-inventory.json');
const extraPaths=[
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-36-shader-prewarm-runtime-capture.md',
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-35-async-shader-prewarm.md',
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-34-startup-cpu-attribution.md',
 'docs/planning/reconciliation-packets/2026-10-16-pre-g7-26-nonblocking-optional-assets.md',
 'docs/planning/delegation-and-work-orders.md',
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
 const inventory=JSON.parse(fs.readFileSync(inventoryPath,'utf8'));const mismatches=[];
 for(const file of inventory.files){const bytes=fs.readFileSync(path.join(root,file.path));const rawSha256=createHash('sha256').update(bytes).digest('hex');const worktreeBlobId=git(['hash-object','--',file.path]);const committedBlobId=git(['rev-parse',`HEAD:${file.path}`]);if(bytes.byteLength!==file.byteLength||rawSha256!==file.rawSha256||worktreeBlobId!==file.gitBlobId||committedBlobId!==file.gitBlobId)mismatches.push({path:file.path,expectedBytes:file.byteLength,actualBytes:bytes.byteLength,expectedSha256:file.rawSha256,actualSha256:rawSha256,expectedGitBlobId:file.gitBlobId,worktreeBlobId,committedBlobId});}
 const result={status:mismatches.length?'FAIL':'PASS',verifiedFiles:inventory.files.length,artifactBytes:inventory.totals.artifactBytes,mismatches};process.stdout.write(`${JSON.stringify(result,null,2)}\n`);if(mismatches.length)process.exitCode=1;
}else{
 function listFiles(dir){const files=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())files.push(...listFiles(p));else if(entry.isFile()&&p!==inventoryPath)files.push(p);}return files;}
 const all=[...listFiles(evidenceRoot).map(p=>path.relative(root,p)),...extraPaths].sort();const paths=[...new Set(all)];
 const files=paths.map(relativePath=>{const bytes=fs.readFileSync(path.join(root,relativePath));return{path:relativePath.replaceAll(path.sep,'/'),byteLength:bytes.byteLength,rawSha256:createHash('sha256').update(bytes).digest('hex'),gitBlobId:git(['hash-object','--',relativePath])};});
 const diagnostic=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'diagnostic-run/startup-cpu-profile-diagnostic.json'),'utf8'));
 const inventory={packet:'PRE-G7-36',sourceCommit:'5c1e6aedb71d89d46ffc0ada8de522526290131c',sourceAppTree:'62a08db251ef15254523bfb08b926ce7c6954ebc',sourceCommitDomainTree:'89ca7d46f790f062e63fcae2368c24ae557e03ab',inheritedCandidateDomainTree:'0c1fb3220ac8e2a192d309e6bc551c916678e5b1',p35EvidenceCommit:'24e15b7f7513170c4df56ea930ac8e37b149f98a',p36PacketCommit:'f25fbbfd50aa13cdc506458840fda5c9c05f3629',p36HarnessCommit:'a0848991da0f3667ded9444192727c358c819e06',evidenceCommitParent:git(['rev-parse','HEAD']),buildId:diagnostic.reusedBuildId,browserVersion:diagnostic.browserVersion,captureExitCode:JSON.parse(fs.readFileSync(path.join(evidenceRoot,'commands/cpu-profile.receipt.json'),'utf8')).exitCode,captureCount:1,inventoryExclusion:'All PRE-G7-36 evidence files and governing packets, the delegation index, P35 report/build receipt, source/mirror files, and mirror metadata are listed. This inventory excludes only itself to avoid a self-referential hash.',totals:{artifactFiles:files.length,artifactBytes:files.reduce((n,f)=>n+f.byteLength,0)},files};
 fs.writeFileSync(inventoryPath,`${JSON.stringify(inventory,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify(inventory.totals)}\n`);
}
