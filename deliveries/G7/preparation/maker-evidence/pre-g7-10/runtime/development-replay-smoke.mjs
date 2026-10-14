import { chromium } from "../../../../../../app/node_modules/@playwright/test/index.mjs";

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  await page.goto("http://127.0.0.1:3180/?studio=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => Number(document.querySelector('[data-testid="world-canvas"]')?.dataset.renderedFrames ?? 0) >= 5,
    { timeout: 60_000 },
  ).catch(() => {});
  await page.waitForTimeout(1_000);
  const observed = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const rendererInfo = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      title: document.title,
      pageText: document.body.innerText.slice(0, 500),
      stage: Boolean(document.querySelector('[data-testid="world-stage-container"]')),
      fallback: Boolean(document.querySelector('[data-testid="world-failure-container"]')),
      canvasConnected: canvas?.isConnected ?? false,
      renderedFrames: Number(canvas?.dataset.renderedFrames ?? 0),
      webglRenderer: gl && rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : null,
      webglContextLost: gl?.isContextLost() ?? null,
      hydrationInjectedAttributes: {
        darkReader: document.documentElement.hasAttribute("data-darkreader-proxy-injected"),
        grammarly: document.body.hasAttribute("data-gr-ext-installed"),
      },
    };
  });
  const result = {
    browserVersion: browser.version(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    browserProfile: "fresh Playwright context; no extensions",
    launchFlags: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    observed,
    errors,
    pass: observed.stage && !observed.fallback && observed.canvasConnected && observed.renderedFrames >= 5
      && observed.webglContextLost === false
      && !errors.some((message) => /WebGL context creation failed|WebGL graphics context was lost|hydration/i.test(message)),
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
  await context.close();
} finally {
  await browser.close();
}
