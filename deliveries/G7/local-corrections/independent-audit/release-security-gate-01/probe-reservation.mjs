import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reserveAttempt } from '../../../preparation/tools/reserve-attempt.mjs';

const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(out, 'fixtures/reservation-alias');
fs.mkdirSync(root, {recursive:true});
const protectedRoot=path.join(root,'deliveries/G7/rc6-candidate-r6');
fs.mkdirSync(protectedRoot,{recursive:true});
fs.symlinkSync(protectedRoot,path.join(root,'deliveries/G7/evidence'),process.platform==='win32'?'junction':'dir');
let error=null;
try {
  const attempt=reserveAttempt(root,'deliveries/G7/evidence/probe.json');
  attempt.writeArtifact('fixture.txt','isolated raw artifact');
  attempt.writeReceipt({isolated:true});
} catch(e) {error=e.message;}
const result={error,preservedFixtureEntries:fs.readdirSync(protectedRoot)};
fs.writeFileSync(path.join(out,'reservation-probe.json'),JSON.stringify(result,null,2)+'\n');
console.log(result);
