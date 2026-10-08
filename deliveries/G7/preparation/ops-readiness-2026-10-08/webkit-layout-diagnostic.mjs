import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd();
const require = createRequire(path.join(root, 'app/package.json'));
const { webkit } = require('@playwright/test');
const playwrightRequire = createRequire(createRequire(require.resolve('@playwright/test/package.json')).resolve('playwright/package.json'));
const coreRoot = path.dirname(playwrightRequire.resolve('playwright-core/package.json'));
const bundlePath = path.join(coreRoot, 'lib/coreBundle.js');
const lines = readFileSync(bundlePath, 'utf8').split('\n');
const windowsValidationLine = lines.findIndex((line) => line.startsWith('async function validateDependenciesWindows('));
const missingDependencyLine = lines.findIndex((line) => line.startsWith('async function missingFileDependenciesWindows('));
const executablePath = webkit.executablePath();
const cacheRoot = path.dirname(executablePath);
const files = ['Playwright.exe', 'ngtcp2.dll', 'ngtcp2_crypto_quictls.dll', 'libcurl.dll'].map((name) => {
  const filename = path.join(cacheRoot, name);
  return { filename, exists: existsSync(filename), ...(existsSync(filename) ? { bytes: statSync(filename).size, sha256: createHash('sha256').update(readFileSync(filename)).digest('hex') } : {}) };
});
const receipt = { category: 'LOCAL PREPARATION ONLY', authorization: 'Parent bounded exact-pinned WebKit layout investigation', executedAt: new Date().toISOString(), playwrightVersion: require('@playwright/test/package.json').version, executablePath, cacheRoot, files, sourceInspection: { bundlePath, sha256: createHash('sha256').update(readFileSync(bundlePath)).digest('hex'), windowsValidationLine: windowsValidationLine + 1, validationExcerpt: lines.slice(windowsValidationLine, windowsValidationLine + 15).join('\n'), missingDependencyLine: missingDependencyLine + 1, dependencyExcerpt: lines.slice(missingDependencyLine, missingDependencyLine + 25).join('\n') }, adjustment: 'Prefix exact existing pinned WebKit cache directory to PATH in this process only; no validation bypass, DLL download, system env change or cache rewrite', launch: 'NOT RUN', acceptanceClaim: false };
if (receipt.playwrightVersion !== '1.63.0' || !cacheRoot.endsWith('webkit-2359') || files.some((file) => !file.exists)) throw new Error('Unexpected pinned version/cache or missing distribution file');
const priorPath = process.env.PATH;
try {
  process.env.PATH = cacheRoot + path.delimiter + (priorPath ?? '');
  const browser = await webkit.launch({ headless: true });
  receipt.actualVersion = browser.version();
  await browser.close();
  receipt.launch = 'PASS';
} catch (error) { receipt.launch = 'FAIL'; receipt.error = String(error.message); }
finally { process.env.PATH = priorPath; }
receipt.completedAt = new Date().toISOString();
writeFileSync(path.join(root, 'deliveries/G7/preparation/ops-readiness-2026-10-08/webkit-layout-diagnostic.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ launch: receipt.launch, actualVersion: receipt.actualVersion, error: receipt.error, cacheRoot: receipt.cacheRoot, files }, null, 2));
if (receipt.launch !== 'PASS') process.exitCode = 1;
