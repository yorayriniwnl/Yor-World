import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const app=path.resolve(here,'../../../../../app');
export default {root:here,resolve:{alias:{'@':path.join(app,'src'),'three':path.join(app,'node_modules/three'),'server-only':path.join(app,'tests/fixtures/server-only.ts')}},test:{include:['delta-probe.test.ts'],environment:'node'}};
