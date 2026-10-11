import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true, channel: "chromium" });
console.log(`Chromium ${browser.version()}`);
await browser.close();