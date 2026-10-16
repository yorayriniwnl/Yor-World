import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../../../../');
const manifestPath = path.join(repoRoot, 'yorayriniwnl.in/source-delivery-manifest.json');
const raw = fs.readFileSync(manifestPath, 'utf8');
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
const manifest = JSON.parse(raw);
const identity = manifest.sourceIdentity;

identity.priorValidationReport = identity.validationReport;
identity.validationReport = 'deliveries/G7/preparation/maker-evidence/pre-g7-32/REPORT.md';
identity.latestValidation = {
  packet: 'PRE-G7-32',
  sourceCommit: 'bd01478617b4166866f3f44196c56fc5add94acd',
  status: 'FAIL',
  passingChecks: [
    'pinned toolchain and source/mirror preflight',
    'offline frozen install',
    'unit',
    'lint',
    'typecheck',
    'integration run 1',
    'integration run 2',
    'build',
    'composition browser suite'
  ],
  failedCheck: 'full performance suite: 5 of 6 checks passed; active route remained LOADING instead of reaching HOME within the existing 15-second assertion',
  evidenceDirectory: 'deliveries/G7/preparation/maker-evidence/pre-g7-32/',
  acceptance: 'unaccepted; undeployed'
};
identity.formalAcceptance = 'PRE-G7-31 remains an unaccepted mobile-camera candidate. PRE-G7-32 passed unit, lint, typecheck, both integration runs, build, and composition browser checks; its single performance-suite invocation failed when the active route remained LOADING instead of reaching HOME within the existing 15-second assertion. Independent audit, read-only human visual review, and Parent ruling remain pending.';

const output = JSON.stringify(manifest, null, 2).replace(/\n/g, newline) + newline;
fs.writeFileSync(manifestPath, output, 'utf8');
console.log(JSON.stringify({ updated: path.relative(repoRoot, manifestPath), validationReport: identity.validationReport, status: identity.latestValidation.status }));
