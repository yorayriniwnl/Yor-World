import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const evidenceRoot=path.join(root,'deliveries/G7/preparation/maker-evidence/pre-g7-38');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sourceCommit='ae0412fb4bfcf81b807ecd492a96cbd773c5005c';
const appTree='7572fd8d082659251762ddb81416219a37800680';
const domainTree='58721ce1ae7e8c3c84c0b959566c975932871f8c';
const buildId='ZU5S4uDGagmUivvV4xDKh';
const buildBytes=fs.readFileSync(path.join(root,'app/.next/BUILD_ID'));
const install=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'commands/post-patch-install.receipt.json'),'utf8'));
const validation=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'validation-summary.json'),'utf8'));
const branch='codex/pre-g7-38-first-use-shader-log-fast-path-20261016';
const remoteTip=git(['ls-remote','--heads','origin',branch]).split(/\s+/)[0]??'';
const status=git(['status','--porcelain=v1','--untracked-files=normal']).split(/\r?\n/).filter(Boolean);
const disallowedStatus=status.filter(line=>!line.includes('deliveries/G7/preparation/maker-evidence/pre-g7-38/'));
const packagePaths=['package.json','pnpm-lock.yaml','patches/three@0.180.0.patch'];
const packageParity=packagePaths.map(relative=>{
 const app=fs.readFileSync(path.join(root,'app',relative));
 const mirror=fs.readFileSync(path.join(root,'yorayriniwnl.in',relative));
 return{path:relative,byteEqual:app.equals(mirror),appBytes:app.length,mirrorBytes:mirror.length,sha256:sha(app)};
});
const checks={
 sourceCommit:git(['rev-parse','HEAD'])===sourceCommit,
 appTree:git(['rev-parse','HEAD:app'])===appTree,
 domainTree:git(['rev-parse','HEAD:yorayriniwnl.in'])===domainTree,
 remoteTip:remoteTip===sourceCommit,
 buildId:buildBytes.toString('utf8').trim()===buildId,
 buildIdSha256:sha(buildBytes)==='9a2f517f64d3d460f4d800276ea7a46bb9bb63740c5ea85ca0b77d1b74432240',
 offlinePostPatchInstall:install.exitCode===0&&install.offline===true&&install.fetchProgressEventCount===0,
 validation:validation.checks.length===3&&validation.checks.every(check=>check.exitCode===0),
 packageParity:packageParity.every(item=>item.byteEqual),
 noUnrelatedChanges:disallowedStatus.length===0,
 nodeVersion:process.version==='v24.19.0'
};
const result={packet:'PRE-G7-38',status:Object.values(checks).every(Boolean)?'PASS':'FAIL',sourceCommit,appTree,sourceCommitDomainTree:domainTree,buildId,buildIdSha256:sha(buildBytes),nodeVersion:process.version,pnpmVersion:install.pnpmVersion,remoteTip,installReceipt:'deliveries/G7/preparation/maker-evidence/pre-g7-38/commands/post-patch-install.receipt.json',packageParity,validation,checks,disallowedStatus,browserCaptureStarted:false};
fs.writeFileSync(path.join(evidenceRoot,'preflight.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(result.status!=='PASS')process.exitCode=1;
