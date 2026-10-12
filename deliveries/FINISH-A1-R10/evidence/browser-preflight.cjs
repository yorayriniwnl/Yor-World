const fs = require("node:fs");
const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const playwright = JSON.parse(fs.readFileSync("F:\\A1-R10-Replay-f5978b91\\app\\node_modules\\.pnpm\\playwright@1.63.0\\node_modules\\playwright\\package.json", "utf8"));
  console.log(JSON.stringify({ playwrightVersion: playwright.version, browserVersion: browser.version(), executablePath: chromium.executablePath() }, null, 2));
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });