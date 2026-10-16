# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p26-render-attribution.spec.ts >> P26 renderer item attribution across required viewports
- Location: tests\e2e\p26-render-attribution.spec.ts:17:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.setViewportSize: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Yor World home" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [aria-hidden] [ref=e6]: "Y"
        - generic [ref=e7]:
          - text: YOR WORLD
          - generic [ref=e8]: A studio in progress
      - navigation "Primary navigation" [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Projects" [ref=e12] [cursor=pointer]:
              - /url: /projects
          - listitem [ref=e13]:
            - link "About" [ref=e14] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e15]:
            - link "Contact" [ref=e16] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e17]:
            - link "Résumé" [ref=e18] [cursor=pointer]:
              - /url: /resume
    - main [ref=e19]:
      - region [ref=e20]:
        - generic [ref=e21]:
          - paragraph [ref=e22]: The door is taking shape
          - heading [level=1] [ref=e23]:
            - text: A little world.
            - emphasis [ref=e24]: A closer look.
          - paragraph [ref=e25]: A personal studio for exploring the work, the thinking, and the person behind it.
          - generic [ref=e26]:
            - paragraph [ref=e27]:
              - text: Ayush Roy
              - generic [ref=e28]: Verified identity
            - paragraph [ref=e29]: Full-Stack & Systems Developer
            - paragraph [ref=e30]: Building realtime systems, 3D product interfaces, and applied ML.
          - generic [ref=e31]:
            - link "View projects" [ref=e32] [cursor=pointer]:
              - /url: /projects
              - text: View projects
              - generic [aria-hidden] [ref=e33]: ↗
            - generic [ref=e34]:
              - group [ref=e35]:
                - generic "Enter studio" [ref=e36] [cursor=pointer]:
                  - text: Enter studio
                  - generic [aria-hidden] [ref=e37]: +
                - generic [ref=e38]:
                  - paragraph [ref=e39]: The studio is not yet available.
                  - paragraph [ref=e40]:
                    - text: Launch the
                    - strong [ref=e41]: G1 Interactive 3D Studio Feasibility Proof
                    - text: "to experience the integrated bright white workstation, blue moving chair, resident, and ambient lighting:"
                  - button "Launch 3D Studio" [ref=e43] [cursor=pointer]
              - dialog "YOR WORLD interactive studio" [ref=e44]:
                - generic [ref=e45]:
                  - region "Interactive 3D Studio" [ref=e46]:
                    - button "Open studio controls" [active] [ref=e47] [cursor=pointer]: Studio controls
                    - generic "3D Room view showing resident, workstation, and moving chair" [ref=e48]
                  - navigation "Portfolio destinations and studio exit" [ref=e49]:
                    - link "Projects" [ref=e50] [cursor=pointer]:
                      - /url: /projects
                    - link "About" [ref=e51] [cursor=pointer]:
                      - /url: /about
                    - link "Contact" [ref=e52] [cursor=pointer]:
                      - /url: /contact
                    - link "Résumé" [ref=e53] [cursor=pointer]:
                      - /url: /resume
                    - button "Exit Studio" [ref=e54] [cursor=pointer]
          - paragraph [ref=e55]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]: YOR / 01
            - generic [ref=e59]: In the making
          - generic [ref=e62]: "Y"
          - generic [ref=e66]:
            - paragraph [ref=e67]:
              - text: A space for
              - strong [ref=e68]: curiosity.
            - generic [ref=e69]: Interactive studioPortfolio pages below
      - region [ref=e70]:
        - generic [ref=e71]:
          - paragraph [ref=e72]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e73]
        - list [ref=e74]:
          - listitem [ref=e75]:
            - link "01 Projects Verified software case studies" [ref=e76] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e77]: "01"
              - generic [ref=e78]:
                - strong [ref=e79]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e80]: ↗
          - listitem [ref=e81]:
            - link "02 About Background, education, and technical skills" [ref=e82] [cursor=pointer]:
              - /url: /about
              - generic [ref=e83]: "02"
              - generic [ref=e84]:
                - strong [ref=e85]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e86]: ↗
          - listitem [ref=e87]:
            - link "03 Contact Send a message or use direct channels" [ref=e88] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e89]: "03"
              - generic [ref=e90]:
                - strong [ref=e91]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e92]: ↗
    - contentinfo [ref=e93]:
      - paragraph [ref=e94]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e95]: Sound off · Explore at your pace
  - button "Open Next.js Dev Tools" [ref=e102] [cursor=pointer]
  - alert [ref=e106]
```

# Test source

```ts
  1   | ﻿import { expect, test } from "@playwright/test";
  2   | import crypto from "node:crypto";
  3   | import fs from "node:fs";
  4   | import path from "node:path";
  5   | 
  6   | const outputRoot = path.resolve(process.env.P26_ATTRIBUTION_OUTPUT_DIR || "../deliveries/G7/preparation/maker-evidence/pre-g7-26/attempt-01/attribution");
  7   | const sourceLabel = process.env.P26_ATTRIBUTION_SOURCE || "unlabeled-source";
  8   | const viewports = [
  9   |   { label: "desktop-1440x900", width: 1440, height: 900 },
  10  |   { label: "mobile-390x844", width: 390, height: 844 },
  11  |   { label: "compact-320x600", width: 320, height: 600 },
  12  |   { label: "landscape-844x390", width: 844, height: 390 },
  13  | ];
  14  | 
  15  | fs.mkdirSync(outputRoot, { recursive: true });
  16  | 
  17  | test("P26 renderer item attribution across required viewports", async ({ page, browserName }) => {
  18  |   const browserErrors: string[] = [];
  19  |   page.on("console", (message) => {
  20  |     if (message.type() === "error") browserErrors.push("[console.error] " + message.text());
  21  |   });
  22  |   page.on("pageerror", (error) => browserErrors.push("[pageerror] " + (error.stack || error.message)));
  23  | 
  24  |   for (const viewport of viewports) {
> 25  |     await page.setViewportSize({ width: viewport.width, height: viewport.height });
      |                ^ Error: page.setViewportSize: Test timeout of 30000ms exceeded.
  26  |     await page.goto("/?studio=enter&pre-g7-evidence=1&p26-render-attribution=1");
  27  |     await expect(page.getByTestId("fullscreen-studio-dialog")).toHaveAttribute("open", "", { timeout: 15_000 });
  28  |     await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 45_000 });
  29  |     await expect(page.getByTestId("world-canvas")).toBeVisible({ timeout: 45_000 });
  30  |     await expect(page.getByTestId("world-loading-overlay")).toBeHidden({ timeout: 90_000 });
  31  |     const stage = page.getByTestId("world-stage-container");
  32  |     const toggle = page.getByTestId("studio-controls-toggle");
  33  |     await expect(stage).toHaveAttribute("data-studio-controls-open", "false");
  34  |     await toggle.click();
  35  |     await expect(page.getByTestId("quality-tier-select")).toBeFocused();
  36  |     await page.getByTestId("skip-motion-btn").click();
  37  |     await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15_000 });
  38  |     await toggle.click();
  39  |     await expect(toggle).toHaveAttribute("aria-expanded", "false");
  40  |     await page.waitForTimeout(500);
  41  | 
  42  |     const result = await page.evaluate(() => {
  43  |       const target = window as Window & {
  44  |         __P26_RENDER_ATTRIBUTION__?: {
  45  |           latestFrame?: Record<string, unknown> | null;
  46  |           rendererVersion?: string;
  47  |           multiDrawSupported?: boolean;
  48  |           warnings?: string[];
  49  |         };
  50  |       };
  51  |       const trace = target.__P26_RENDER_ATTRIBUTION__;
  52  |       const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
  53  |       const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
  54  |       const rendererInfo = gl?.getParameter(gl.RENDERER) ?? null;
  55  |       return {
  56  |         trace: trace?.latestFrame ?? null,
  57  |         rendererVersion: trace?.rendererVersion ?? null,
  58  |         multiDrawSupported: trace?.multiDrawSupported ?? null,
  59  |         instrumentationWarnings: trace?.warnings ?? [],
  60  |         rendererInfo,
  61  |         qualityTier: (trace?.latestFrame as { qualityTier?: string } | null)?.qualityTier ?? null,
  62  |       };
  63  |     });
  64  |     expect(result.trace, "instrumented renderer produced a frame").not.toBeNull();
  65  | 
  66  |     const browser = /Edg\//.test(await page.evaluate(() => navigator.userAgent)) ? "edge" : browserName;
  67  |     const captureDir = path.join(outputRoot, sourceLabel, browser);
  68  |     fs.mkdirSync(captureDir, { recursive: true });
  69  |     const baseName = viewport.label + "-" + browser;
  70  |     const screenshotPath = path.join(captureDir, baseName + ".png");
  71  |     await page.screenshot({ path: screenshotPath, fullPage: false });
  72  |     const screenshotBytes = fs.readFileSync(screenshotPath);
  73  |     const jsonPath = path.join(captureDir, baseName + "-attribution.json");
  74  |     const record = {
  75  |       schemaVersion: 1,
  76  |       source: {
  77  |         label: sourceLabel,
  78  |         commit: process.env.P26_ATTRIBUTION_COMMIT ?? null,
  79  |         appTree: process.env.P26_ATTRIBUTION_APP_TREE ?? null,
  80  |       },
  81  |       capture: {
  82  |         browser,
  83  |         browserName,
  84  |         userAgent: await page.evaluate(() => navigator.userAgent),
  85  |         viewport: { width: viewport.width, height: viewport.height },
  86  |         qualityTier: result.qualityTier,
  87  |         rendererVersion: result.rendererVersion,
  88  |         rendererInfo: result.rendererInfo,
  89  |         multiDrawSupported: result.multiDrawSupported,
  90  |         instrumentationWarnings: result.instrumentationWarnings,
  91  |         screenshot: {
  92  |           path: path.relative(outputRoot, screenshotPath).replaceAll("\\", "/"),
  93  |           bytes: screenshotBytes.length,
  94  |           sha256: crypto.createHash("sha256").update(screenshotBytes).digest("hex"),
  95  |         },
  96  |         browserErrors,
  97  |       },
  98  |       trace: result.trace,
  99  |     };
  100 |     fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2) + "\n");
  101 |   }
  102 | });
  103 | 
  104 | 
```