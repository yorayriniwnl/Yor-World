const fs=require('node:fs'); const crypto=require('node:crypto'); const cp=require('node:child_process');
const root=process.cwd();
const pairs=[['app/tests/unit/boundaries.test.ts','yorayriniwnl.in/tests/unit/boundaries.test.ts']];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const out={};
for(const [a,b] of pairs){const ar=fs.readFileSync(a),br=fs.readFileSync(b);const an=Buffer.from(ar.toString('utf8').replace(/\r\n/g,'\n'),'utf8');const bn=Buffer.from(br.toString('utf8').replace(/\r\n/g,'\n'),'utf8');const ab=cp.execFileSync('git',['hash-object',a],{encoding:'utf8'}).trim();const bb=cp.execFileSync('git',['hash-object',b],{encoding:'utf8'}).trim();out[a]={bytes:ar.length,rawSha256:hash(ar),normalizedSha256:hash(an),gitBlob:ab};out[b]={bytes:br.length,rawSha256:hash(br),normalizedSha256:hash(bn),gitBlob:bb};out.parity={normalizedBytesEqual:an.equals(bn),gitBlobsEqual:ab===bb};}
const text=JSON.stringify(out,null,2)+'\n';fs.writeFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-04/mirror-parity.json',text);console.log(text);if(!out.parity.normalizedBytesEqual||!out.parity.gitBlobsEqual)process.exit(2);
