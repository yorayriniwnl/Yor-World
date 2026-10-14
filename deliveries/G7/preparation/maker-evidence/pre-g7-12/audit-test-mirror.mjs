import { createHash } from 'node:crypto'; import { readdirSync, readFileSync } from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../../');
const files=(base,current=base)=>readdirSync(current,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(base,path.join(current,e.name)):[path.relative(base,path.join(current,e.name)).replaceAll('\\','/')]).sort();
const hash=p=>createHash('sha256').update(readFileSync(p).toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
const a=files(path.join(root,'app/tests')),d=files(path.join(root,'yorayriniwnl.in/tests'));
const missing=a.filter(x=>!d.includes(x)),extra=d.filter(x=>!a.includes(x));const mismatches=a.filter(x=>d.includes(x)&&hash(path.join(root,'app/tests',x))!==hash(path.join(root,'yorayriniwnl.in/tests',x)));
console.log(JSON.stringify({canonicalAppTests:a.length,deliveryTests:d.length,missing,extra,mismatches},null,2));
