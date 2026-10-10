// Independent compiler diagnostic; all generated files stay in this audit root.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../../../../');
const require=createRequire(path.join(root,'app/package.json'));
const ts=require('typescript');
const fixture=fs.readFileSync(path.join(root,'app/tests/fixtures/engineering-section-4.ts'),'utf8');
const worldTypes=fs.readFileSync(path.join(root,'app/src/features/world/types.ts'),'utf8');
const camera=worldTypes.match(/export type CameraPreset =[\s\S]*?;/)[0];
const members=[...camera.matchAll(/"([^"]+)"/g)].map(x=>x[1]);
const source=`${fixture}\n${camera}\n
type Exact<A,B> = (<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2) ? true : false;
type SuccessorPublication = {revision:Publication['revision'];publishedAt:Publication['publishedAt'];projects:Publication['projects'];assetManifestRevision:Publication['assetManifestRevision'];site?:{owner:string}};
type SuccessorIntent = ExperienceIntent | {type:'ACTIVATE_OBJECT';objectId:'plant-leaves';source:'room'|'control'};
const requiredPublicationEquality: Exact<SuccessorPublication,Publication> = true;
const requiredIntentEquality: Exact<SuccessorIntent,ExperienceIntent> = true;
const cameraPresetAdditions: {[K in CameraPreset]:number} = {${members.map(x=>`${JSON.stringify(x)}:1`).join(',')},reveal:1,greeting:1};\n`;
const file=path.join(out,'type-seam-probe.ts'); fs.writeFileSync(file,source);
const program=ts.createProgram([file],{strict:true,noEmit:true,skipLibCheck:true,types:[]});
const diagnostics=program.getSemanticDiagnostics().filter(x=>x.file && path.resolve(x.file.fileName)===path.resolve(file)).map(x=>({code:x.code,line:x.file.getLineAndCharacterOfPosition(x.start).line+1,message:ts.flattenDiagnosticMessageText(x.messageText,'\n')}));
const result={scope:'Compiler checks of proposed contract deltas against real canonical type snapshots; failures reproduce ownership seams, not production behavior',typescript:ts.version,node:process.version,timestampUTC:new Date().toISOString(),diagnostics,defectsReproduced:diagnostics.length===3 && diagnostics.every(x=>[2322,2353].includes(x.code))};
fs.writeFileSync(path.join(out,'type-seam-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
process.exitCode=result.defectsReproduced?0:1;
