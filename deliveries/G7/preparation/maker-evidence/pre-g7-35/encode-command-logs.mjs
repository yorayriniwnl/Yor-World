import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='deliveries/G7/preparation/maker-evidence/pre-g7-35/commands';
const attempt={name:'evidence-commit-preflight-attempt-01',requestedCommand:'git diff --cached --check',exitCode:2,classification:'Evidence-only whitespace check failed before commit. Report hard-line-break trailing spaces and terminal progress whitespace/newline details were detected; canonical and mirrored source files were not implicated. No commit or push was attempted.',findings:['REPORT.md lines 3-6 had Markdown hard-line-break trailing spaces.','lint/typecheck stdout had a final blank line.','production-build stdout had progress-line trailing spaces and a final blank line.'],followUp:'Report trailing spaces were removed. Captured command stdout/stderr are being preserved byte-for-byte as wrapped Base64 with raw byte length and SHA-256 recorded.'};
fs.writeFileSync(`${dir}/evidence-commit-preflight-attempt-01.json`,`${JSON.stringify(attempt,null,2)}\n`,'utf8');
const names=['offline-install','lint','typecheck','production-build'];
const converted=[];
for(const name of names){
 for(const stream of ['stdout','stderr']){
  const originalPath=`${dir}/${name}.${stream}.txt`;
  const raw=fs.readFileSync(originalPath);
  const b64=raw.toString('base64');
  const wrapped=(b64.match(/.{1,76}/g)||[]).join('\n')+'\n';
  const encodedPath=`${dir}/${name}.${stream}.base64.txt`;
  fs.writeFileSync(encodedPath,wrapped,'utf8');
  fs.rmSync(originalPath);
  const receiptPath=`${dir}/${name}.json`;
  const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  receipt[stream]=`commands/${name}.${stream}.base64.txt`;
  receipt[`${stream}Encoding`]='Base64, wrapped at 76 columns; remove line breaks before decoding';
  receipt[`${stream}RawByteLength`]=raw.byteLength;
  receipt[`${stream}RawSha256`]=crypto.createHash('sha256').update(raw).digest('hex');
  fs.writeFileSync(receiptPath,`${JSON.stringify(receipt,null,2)}\n`,'utf8');
  converted.push({name,stream,path:`commands/${name}.${stream}.base64.txt`,rawByteLength:raw.byteLength,rawSha256:crypto.createHash('sha256').update(raw).digest('hex'),base64ByteLength:Buffer.byteLength(wrapped)});
 }
}
fs.writeFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-35/log-encoding-conversion.json',`${JSON.stringify({status:'PASS',method:'Byte-for-byte Base64 encoding with 76-column wrapping',files:converted},null,2)}\n`,'utf8');
