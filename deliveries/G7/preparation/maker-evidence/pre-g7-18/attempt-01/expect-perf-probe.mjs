import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { expect } = await import(pathToFileURL(resolve(process.cwd(), "node_modules/@vitest/expect/dist/index.js")));
const started = performance.now();
for (let index = 0; index < 1000; index++) {
  expect("src/features/portfolio/navigation.tsx").not.toMatch(/src\/server\/|src\/content\/server-publication/);
  expect("export const value = 1;").not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY|DATABASE_URL|CONTACT_HASH_SECRET|RESEND_API_KEY|INTERNAL_JOB_KEY|CRON_SECRET/);
  expect("sharp").not.toMatch(/^sharp(?:\/|$)/);
}
process.stdout.write(JSON.stringify({diagnostic:"standalone @vitest/expect performance probe; not a test invocation",iterations:3000,milliseconds:performance.now()-started,cpu:process.cpuUsage()})+"\n");