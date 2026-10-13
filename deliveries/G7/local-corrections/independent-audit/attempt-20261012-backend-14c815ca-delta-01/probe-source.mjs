import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const audit=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(audit,'../../../../..');
const require=createRequire(path.join(root,'app/package.json'));
const ts=require('typescript');
const filename=path.join(root,'app/tests/native/backend-native.test.ts');
const raw=fs.readFileSync(filename);
const source=ts.createSourceFile(filename,raw.toString('utf8'),ts.ScriptTarget.Latest,true);
let implementation,cleanup;
function visit(node){
 if(ts.isCallExpression(node)){
  if(ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='mockImplementation')implementation=node.arguments[0];
  if(ts.isIdentifier(node.expression)&&node.expression.text==='afterAll')cleanup=node.arguments[0];
 }
 ts.forEachChild(node,visit);
}
visit(source);
assert.ok(implementation&&cleanup,'actual mock implementation and cleanup AST nodes must exist');
function evaluate(node,names,values){
 const js=ts.transpileModule('const auditExtracted = '+node.getText(source)+';', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return new Function(...names,js+'\nreturn auditExtracted;')(...values);
}
const png=fs.readFileSync(path.join(root,'app/tests/fixtures/scp-media/valid-rgba-16x12.png'));
const objects=new Map([['audit-private/approved.png',png]]);
let enteredCount=0;
const factory=evaluate(implementation,['entered','pause','objects','ReadableStream','Response'],[{resolve(){enteredCount++;}},null,objects,ReadableStream,Response]);
const probes=[];
for(const [bucket,key,present] of [['audit-private','approved.png',true],['wrong-bucket','approved.png',false],['audit-private','missing.png',false]]){
 const responses=[];
 const provider=factory(undefined,response=>responses.push(response));
 const result=await provider.storage.from(bucket).download(key).asStream();
 assert.equal(responses.length,1);
 assert.equal(responses[0].status,present?200:404);
 assert.equal(responses[0].headers.get('content-type'),present?'image/png':null);
 if(present){assert.equal(result.error,null);assert.deepEqual(Buffer.from(await new Response(result.data).arrayBuffer()),png);}
 else{assert.equal(result.data,null);assert.equal(result.error.statusCode,'404');}
 probes.push({kind:'actual native mock AST extraction',bucket,key,present,status:responses[0].status,contentType:responses[0].headers.get('content-type'),statusChecked:'PASS'});
}
for(const connected of [false,true]){
 const logs=[];let ended=0;
 const after=evaluate(cleanup,['pool','adminConnected','database','console','admin'],[undefined,connected,undefined,{log:message=>logs.push(message)},{async end(){ended++;}}]);
 await after();
 assert.equal(logs.length,0,'no database identity may be claimed when undefined');
 assert.equal(ended,connected?1:0);
 probes.push({kind:'actual afterAll AST extraction',adminConnected:connected,database:'undefined',logs,adminEndCalls:ended,statusChecked:'PASS'});
}
const identity={path:'app/tests/native/backend-native.test.ts',bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
const output={scope:'Synthetic JavaScript execution of AST-extracted current native mock/cleanup only; zero database queries; not native PostgreSQL or hosted-provider proof',identity,enteredCount,probes};
fs.writeFileSync(path.join(audit,'source-probes.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({passed:probes.length,scope:output.scope,identity}));
