import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceRoot, '../../../../../');
const inventoryPath = path.join(evidenceRoot, 'evidence-inventory.json');
const extraPaths = [
  'docs/planning/reconciliation-packets/2026-10-16-pre-g7-35-async-shader-prewarm.md',
  'docs/planning/reconciliation-packets/2026-10-16-pre-g7-34-startup-cpu-attribution.md',
  'docs/planning/reconciliation-packets/2026-10-16-pre-g7-26-nonblocking-optional-assets.md',
  'docs/planning/delegation-and-work-orders.md',
  'yorayriniwnl.in/README.md',
  'yorayriniwnl.in/source-delivery-manifest.json',
  'app/src/features/world/WorldRuntime.ts',
  'yorayriniwnl.in/src/features/world/WorldRuntime.ts',
];
function gitText(args) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim();
}
if (process.argv.includes('--verify-tree')) {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const mismatches = [];
  for (const file of inventory.files) {
    const bytes = fs.readFileSync(path.join(repositoryRoot, file.path));
    const rawSha256 = createHash('sha256').update(bytes).digest('hex');
    const worktreeBlobId = gitText(['hash-object', '--', file.path]);
    const committedBlobId = gitText(['rev-parse', `HEAD:${file.path}`]);
    if (bytes.byteLength !== file.byteLength || rawSha256 !== file.rawSha256
      || worktreeBlobId !== file.gitBlobId || committedBlobId !== file.gitBlobId) {
      mismatches.push({ path: file.path, expectedBytes: file.byteLength, actualBytes: bytes.byteLength, expectedSha256: file.rawSha256, actualSha256: rawSha256, expectedGitBlobId: file.gitBlobId, worktreeBlobId, committedBlobId });
    }
  }
  const result = { status: mismatches.length ? 'FAIL' : 'PASS', verifiedFiles: inventory.files.length, artifactBytes: inventory.totals.artifactBytes, mismatches };
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  if (mismatches.length) process.exitCode=1;
} else {
  function listFiles(directory) {
    const files=[];
    for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      const absolute=path.join(directory,entry.name);
      if (entry.isDirectory()) files.push(...listFiles(absolute));
      else if (entry.isFile() && absolute!==inventoryPath) files.push(absolute);
    }
    return files;
  }
  const paths=[...listFiles(evidenceRoot).map((p)=>path.relative(repositoryRoot,p)),...extraPaths].sort();
  const uniquePaths=[...new Set(paths)];
  const files=uniquePaths.map((relativePath)=>{
    const bytes=fs.readFileSync(path.join(repositoryRoot,relativePath));
    return { path:relativePath.replaceAll(path.sep,'/'), byteLength:bytes.byteLength, rawSha256:createHash('sha256').update(bytes).digest('hex'), gitBlobId:gitText(['hash-object','--',relativePath]) };
  });
  const sourceCommit='5c1e6aedb71d89d46ffc0ada8de522526290131c';
  const inventory={
    packet:'PRE-G7-35', sourceCommit,
    sourceAppTree:gitText(['rev-parse',`${sourceCommit}:app`]),
    sourceCommitDomainMirrorTree:gitText(['rev-parse',`${sourceCommit}:yorayriniwnl.in`]),
    evidenceCommitParent:sourceCommit,
    buildId:JSON.parse(fs.readFileSync(path.join(evidenceRoot,'build-id.json'),'utf8')).buildId,
    inventoryExclusion:'All PRE-G7-35 evidence files and the governing packets, delegation index, source/mirror files, and mirror metadata are listed. This file excludes only itself to avoid a self-referential hash.',
    totals:{artifactFiles:files.length,artifactBytes:files.reduce((total,file)=>total+file.byteLength,0)},
    files,
  };
  fs.writeFileSync(inventoryPath,`${JSON.stringify(inventory,null,2)}\n`,'utf8');
  process.stdout.write(`${JSON.stringify(inventory.totals)}\n`);
}
