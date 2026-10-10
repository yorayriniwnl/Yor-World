import { defineConfig } from 'vitest/config';
import path from 'node:path';
const candidate=path.resolve(import.meta.dirname,'candidate/app');
export default defineConfig({root:candidate,resolve:{alias:{'@':path.join(candidate,'src'),'server-only':path.join(candidate,'tests/fixtures/server-only.ts')}},test:{include:[path.resolve(import.meta.dirname,'requirements.test.tsx')],environment:'node',testTimeout:60000,hookTimeout:90000}});
