import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const delivery=path.resolve(scriptDir,'..');
const manifestPath=path.join(delivery,'output-hashes.json');
const verificationPath=path.join(delivery,'validator-logs','manifest-verification.json');
const selfExcluded=new Set(['output-hashes.json','validator-logs/manifest-verification.json']);

function listFiles(dir=delivery,rows=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==='node_modules')continue;
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())listFiles(file,rows);
    else if(entry.isFile()){
      const relative=path.relative(delivery,file).replaceAll('\\','/');
      if(!selfExcluded.has(relative))rows.push([relative,file]);
    }
  }
  return rows;
}

const files={};
for(const [relative,file]of listFiles().sort((a,b)=>a[0].localeCompare(b[0]))){
  const bytes=fs.readFileSync(file);
  files[relative]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
const manifest={scope:'SHA-256 and byte size for every R3 file except the self-referential output-hashes.json and the post-generation manifest-verification record. node_modules is excluded.',algorithm:'SHA-256',generatedAtUtc:new Date().toISOString(),fileCount:Object.keys(files).length,files};
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');

const written=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const checked=[];
for(const [relative,expected]of Object.entries(written.files)){
  const file=path.join(delivery,...relative.split('/'));
  const present=fs.existsSync(file);
  const bytes=present?fs.readFileSync(file):Buffer.alloc(0);
  const actual={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  checked.push({path:relative,expected,actual,status:present&&actual.bytes===expected.bytes&&actual.sha256===expected.sha256?'PASS':'FAIL'});
}
const result={scope:'Post-write read-back verification of every output-hashes.json row. This record is excluded from that file to avoid a hash cycle.',manifest:'output-hashes.json',manifestSha256:crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'),fileCount:checked.length,passed:checked.filter(x=>x.status==='PASS').length,failed:checked.filter(x=>x.status==='FAIL').length,checks:checked};
fs.writeFileSync(verificationPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({manifestSha256:result.manifestSha256,fileCount:result.fileCount,passed:result.passed,failed:result.failed},null,2));
if(result.failed)process.exitCode=1;
