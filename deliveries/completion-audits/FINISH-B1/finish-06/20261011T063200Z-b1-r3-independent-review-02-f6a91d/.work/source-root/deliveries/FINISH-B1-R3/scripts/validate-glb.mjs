import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const delivery=path.resolve(scriptDir,'..');
const root=path.resolve(delivery,'../..');
const output=path.join(delivery,'validator-logs','gltf-validation.json');
const require=createRequire(path.join(root,'app','package.json'));
const validator=require('gltf-validator');
const version=require('gltf-validator/package.json').version;
const files=fs.readdirSync(path.join(delivery,'assets')).filter(x=>x.toLowerCase().endsWith('.glb')).sort();
const results=[];
for(const name of files){
  const file=path.join(delivery,'assets',name);
  const bytes=fs.readFileSync(file);
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:name,externalResourceFunction:async()=>new Uint8Array()});
  const messages=report.issues.messages.map(m=>({code:m.code,severity:m.severity,message:m.message,documentPointer:m.pointer,range:m.offset===undefined?undefined:{offset:m.offset,length:m.length}}));
  results.push({file:`assets/${name}`,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),issues:report.issues,errors:messages.filter(x=>x.severity===0),warnings:messages.filter(x=>x.severity===1),infos:messages.filter(x=>x.severity>=2),messages});
}
const result={tool:{name:'gltf-validator',version,package:'app/node_modules/gltf-validator'},scope:'All final R3 GLB exports, including byte-preserved room/props and regenerated resident/fixture; syntax/spec validation is separate from geometric and runtime acceptance.',files:results,summary:{files:results.length,filesWithErrors:results.filter(x=>x.errors.length).length,filesWithWarnings:results.filter(x=>x.warnings.length).length,errorCount:results.reduce((n,x)=>n+x.errors.length,0),warningCount:results.reduce((n,x)=>n+x.warnings.length,0)}};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
if(result.summary.errorCount>0)process.exitCode=1;
