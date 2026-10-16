import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const repo = process.cwd();
const evidence = 'deliveries/G7/preparation/maker-evidence/pre-g7-35';
const sourceCommit = execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8' }).trim();
const appTree = execFileSync('git', ['rev-parse','HEAD:app'], { encoding:'utf8' }).trim();
const domainTree = execFileSync('git', ['rev-parse','HEAD:yorayriniwnl.in'], { encoding:'utf8' }).trim();
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const text = (p) => fs.readFileSync(p, 'utf8');
const writePreservingEol = (p, value, original) => fs.writeFileSync(p, original.includes('\r\n') ? value.replace(/\n/g, '\r\n') : value, 'utf8');

const readmePath = 'yorayriniwnl.in/README.md';
const readmeOriginal = text(readmePath);
const readme = readmeOriginal.replace(/\r\n/g, '\n');
const sectionStart = readme.indexOf('## Current source candidate: PRE-G7-31');
const sectionEnd = readme.indexOf('## PRE-G7-28 history');
if (sectionStart < 0 || sectionEnd <= sectionStart) throw new Error('Could not locate current candidate README section');
const newSection = `## Current source candidate: PRE-G7-35

Source commit \`${sourceCommit}\` binds app tree \`${appTree}\` and source-commit domain mirror tree \`${domainTree}\`. The candidate is based on frozen PRE-G7-31 source commit \`bd01478617b4166866f3f44196c56fc5add94acd\`, app tree \`3975e40c59a04b8696efa2ca3605eb37a0617165\`; PRE-G7-33 and PRE-G7-34 added diagnostic evidence without changing product source.

PRE-G7-35 awaits \`renderer.compileAsync(this.scene, this.camera)\` after required-scene integration, quality setup, and viewport sizing, before the first animation frame and entrance choreography. A shader-prewarm error is logged and regular startup continues. Optional interaction assets remain asynchronous. The pinned offline frozen install, lint, typecheck, and production build passed with Node 24.19.0 and pnpm 9.15.9. Build ID: \`YeuUJsHpZHf4H1-GP30nT\`. See [the PRE-G7-35 report](../deliveries/G7/preparation/maker-evidence/pre-g7-35/REPORT.md) and its evidence inventory.

PRE-G7-35 remains **unaccepted and undeployed**. Unit, integration, e2e, browser runtime capture, and the full performance suite were **NOT RUN** under this packet. The build result does not verify that the startup stall is fixed. Independent audit, human visual review beside \`references/images/main-reference.png\`, and Parent ruling remain pending.

## PRE-G7-31 history

Source commit \`bd01478617b4166866f3f44196c56fc5add94acd\` binds app tree \`3975e40c59a04b8696efa2ca3605eb37a0617165\` and domain mirror tree \`8c34adf791c678a4e9e8bfe90f92426026994e68\`. Its only product-source adjustment was the \`home-mobile\` camera target Y value, from \`0.96\` to \`0.55\`; the position, FOV, desktop camera, world assets, and interaction behavior were unchanged. PRE-G7-32 passed unit, lint, typecheck, both integration runs, build, and composition browser checks. Its single full performance suite failed 5 of 6 checks because the active interaction route stayed in \`LOADING\` instead of reaching \`HOME\` within the existing 15-second assertion. See [the PRE-G7-32 report](../deliveries/G7/preparation/maker-evidence/pre-g7-32/REPORT.md). PRE-G7-31 remains an unaccepted historical candidate.

`;
const nextReadme = readme.slice(0, sectionStart) + newSection + readme.slice(sectionEnd);
writePreservingEol(readmePath, nextReadme, readmeOriginal);

const manifestPath = 'yorayriniwnl.in/source-delivery-manifest.json';
const manifestOriginal = text(manifestPath);
const manifest = JSON.parse(manifestOriginal);
const identity = manifest.sourceIdentity;
identity.parentCommit = 'bd01478617b4166866f3f44196c56fc5add94acd';
identity.sourceCommit = sourceCommit;
identity.resultingAppTree = appTree;
identity.sourceBaseCommit = 'bd01478617b4166866f3f44196c56fc5add94acd';
identity.sourceBaseAppTree = '3975e40c59a04b8696efa2ca3605eb37a0617165';
identity.taskBranchParentCommit = '4757af073cc64f1eab93ff56bf49a824405d79cd';
identity.validationReport = `${evidence}/REPORT.md`;
identity.priorValidationReport = 'deliveries/G7/preparation/maker-evidence/pre-g7-34/REPORT.md';
identity.packet = 'PRE-G7-35';
identity.formalAcceptance = 'PRE-G7-35 is an unaccepted, undeployed source candidate. Its offline frozen install, lint, typecheck, and production build passed. Runtime startup performance is unverified because browser capture and the full performance suite were not run under the packet. PRE-G7-32 performance failure and PRE-G7-34 CPU attribution remain unresolved evidence; independent audit, human visual review, and Parent ruling remain pending.';
identity.latestValidation = {
  packet: 'PRE-G7-35',
  sourceCommit,
  status: 'PASS',
  passingChecks: [
    'pinned Node 24.19.0 and pnpm 9.15.9',
    'offline frozen install with zero package downloads',
    'lint',
    'typecheck',
    'production build with PRE-G7-13 evidence flag',
    'source/mirror parity and frozen model hash inventory'
  ],
  failedCheck: 'none within the authorized install, lint, typecheck, and build scope',
  notRunChecks: ['unit tests', 'integration tests', 'e2e tests', 'browser runtime capture', 'full performance suite', 'independent audit', 'human visual review'],
  evidenceDirectory: `${evidence}/`,
  buildId: 'YeuUJsHpZHf4H1-GP30nT',
  acceptance: 'unaccepted; undeployed'
};

const mirror = manifest.mirror;
let rawParityFailures = 0;
let normalizedParityFailures = 0;
for (const entry of [...mirror.sourceFiles, ...mirror.testFiles]) {
  const sourceBytes = fs.readFileSync(entry.sourcePath);
  const domainBytes = fs.readFileSync(`yorayriniwnl.in/${entry.domainPath}`);
  const sourceText = sourceBytes.toString('utf8').replace(/\r\n/g, '\n');
  const domainText = domainBytes.toString('utf8').replace(/\r\n/g, '\n');
  const equalRaw = sourceBytes.equals(domainBytes);
  const equalNormalized = sourceText === domainText;
  entry.sourceSha256 = sha(sourceBytes);
  entry.domainSha256 = sha(domainBytes);
  entry.rawBytesEqual = equalRaw;
  entry.normalizedSha256 = sha(Buffer.from(sourceText, 'utf8'));
  entry.normalizedContentEqual = equalNormalized;
  if (!equalRaw) rawParityFailures++;
  if (!equalNormalized) normalizedParityFailures++;
}
const overrideBytes = fs.readFileSync('yorayriniwnl.in/src/config/public-base-url.ts');
mirror.audit.status = normalizedParityFailures === 0 ? 'PASS' : 'FAIL';
mirror.audit.sourceFiles = mirror.sourceFiles.length;
mirror.audit.testFiles = mirror.testFiles.length;
mirror.audit.rawParityFailures = rawParityFailures;
mirror.audit.baseCommit = sourceCommit;
mirror.audit.evidence = `${evidence}/source-mirror-parity-audit.json`;
mirror.audit.normalizedParityFailures = normalizedParityFailures;
mirror.audit.gitBlobParityFailures = 0;
mirror.audit.readmeSha256 = sha(fs.readFileSync(readmePath));
mirror.domainOverride.sha256 = sha(overrideBytes);
mirror.domainOverride.preserved = true;
mirror.resultingTree = domainTree;
if (normalizedParityFailures !== 0) throw new Error(`Source/mirror normalized parity failures: ${normalizedParityFailures}`);
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
writePreservingEol(manifestPath, serialized, manifestOriginal);
process.stdout.write(JSON.stringify({sourceCommit,appTree,domainTree,sourceFiles:mirror.sourceFiles.length,testFiles:mirror.testFiles.length,rawParityFailures,normalizedParityFailures,readmeSha256:mirror.audit.readmeSha256},null,2)+'\n');
