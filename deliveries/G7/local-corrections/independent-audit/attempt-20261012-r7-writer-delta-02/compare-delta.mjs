import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const audit=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(audit,"../../../../..");
const prior=JSON.parse(fs.readFileSync(path.join(root,"deliveries/G7/local-corrections/independent-audit/attempt-20261012-r7-writer-isolation-01/input-hashes.json"),"utf8"));
const current=JSON.parse(fs.readFileSync(path.join(audit,"input-hashes.json"),"utf8")); const priorMap=new Map(prior.files.map(x=>[x.path,x.sha256]));
const rows=current.files.map(x=>({path:x.path,currentSha256:x.sha256,priorSha256:priorMap.get(x.path)??null,identical:priorMap.get(x.path)===x.sha256}));
const result={priorAudit:"attempt-20261012-r7-writer-isolation-01",currentHead:current.sourceIdentity.head,rows,allIdentical:rows.every(x=>x.identical)};
fs.writeFileSync(path.join(audit,"delta-comparison.json"),JSON.stringify(result,null,2)+"\n"); console.log(JSON.stringify({allIdentical:result.allIdentical,rows:rows.length,differences:rows.filter(x=>!x.identical)}));