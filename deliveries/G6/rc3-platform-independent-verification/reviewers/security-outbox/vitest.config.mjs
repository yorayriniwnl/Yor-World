const app = 'C:/Users/yoray/AppData/Local/Temp/yw-iv-2a186/app';
const own = 'C:/Users/yoray/Projects/Yor World/deliveries/G6/rc3-platform-independent-verification/reviewers/security-outbox';
export default {
 resolve: { alias: { '@': app+'/src', 'server-only': app+'/tests/fixtures/server-only.ts', 'vitest': app+'/node_modules/vitest/dist/index.js', '@electric-sql/pglite': app+'/node_modules/@electric-sql/pglite/dist/index.js' } },
 test: { include: [own+'/fresh.test.ts'], environment: 'node', testTimeout: 30000, hookTimeout: 90000, maxWorkers: 1 },
};
