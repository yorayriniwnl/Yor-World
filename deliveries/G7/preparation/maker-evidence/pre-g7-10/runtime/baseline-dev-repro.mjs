import { chromium } from "../../../../../../app/node_modules/@playwright/test/index.mjs";

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));

await page.goto("http://127.0.0.1:3180/?studio=1", { waitUntil: "domcontentloaded" });
await page.getByTestId("world-failure-container").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
await page.waitForTimeout(2_500);
console.log(JSON.stringify({
  browserVersion: browser.version(),
  userAgent: await page.evaluate(() => navigator.userAgent),
  fallback: await page.getByTestId("world-failure-container").count(),
  fallbackText: await page.getByTestId("world-fallback-banner").innerText().catch(() => null),
  canvas: await page.getByTestId("world-canvas").count(),
  errors,
}, null, 2));
await browser.close();
