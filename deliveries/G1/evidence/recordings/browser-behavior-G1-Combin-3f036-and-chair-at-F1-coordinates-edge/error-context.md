# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-behavior.spec.ts >> G1 Combined World Integration & Browser Behavior >> 2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates
- Location: tests\e2e\browser-behavior.spec.ts:93:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/?studio=enter
Call log:
  - navigating to "http://127.0.0.1:3147/?studio=enter", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e6]:
      - heading "Hmmm… can't reach this page" [level=1] [ref=e7]
      - paragraph [ref=e8]:
        - strong [ref=e9]: 127.0.0.1
        - text: refused to connect.
      - generic [ref=e10]:
        - paragraph [ref=e11]: "Try:"
        - list [ref=e12]:
          - listitem [ref=e13]: •Checking the connection
          - listitem [ref=e14]:
            - text: •
            - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
              - /url: "#buttons"
      - generic [ref=e16]: ERR_CONNECTION_REFUSED
    - button "Refresh" [ref=e19] [cursor=pointer]
  - generic [ref=e20]: Microsoft Edge
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import path from "node:path";
  3   | import fs from "node:fs";
  4   | 
  5   | const evidenceDir = process.env.G1_EVIDENCE_DIR || process.env.W3_EVIDENCE_DIR || "";
  6   | const screenshotDir = evidenceDir
  7   |   ? path.join(evidenceDir, "screenshots")
  8   |   : path.resolve(__dirname, "../../evidence/screenshots");
  9   | const logsDir = evidenceDir
  10  |   ? path.join(evidenceDir, "logs")
  11  |   : path.resolve(__dirname, "../../evidence/logs");
  12  | 
  13  | function setupPageLogging(page: Page) {
  14  |   if (logsDir) {
  15  |     if (!fs.existsSync(logsDir)) {
  16  |       fs.mkdirSync(logsDir, { recursive: true });
  17  |     }
  18  |     const consoleLog = path.join(logsDir, "console.log");
  19  |     const networkLog = path.join(logsDir, "network.log");
  20  | 
  21  |     page.on("console", (msg) => {
  22  |       try {
  23  |         fs.appendFileSync(consoleLog, `[CONSOLE ${msg.type()}] ${msg.text()}\n`, "utf8");
  24  |       } catch {
  25  |         // ignore write error
  26  |       }
  27  |     });
  28  |     page.on("pageerror", (err) => {
  29  |       try {
  30  |         fs.appendFileSync(consoleLog, `[PAGEERROR] ${err.message}\n`, "utf8");
  31  |       } catch {
  32  |         // ignore write error
  33  |       }
  34  |     });
  35  |     page.on("request", (req) => {
  36  |       try {
  37  |         fs.appendFileSync(networkLog, `[REQ] ${req.method()} ${req.url()}\n`, "utf8");
  38  |       } catch {
  39  |         // ignore write error
  40  |       }
  41  |     });
  42  |     page.on("response", (res) => {
  43  |       try {
  44  |         fs.appendFileSync(
  45  |           networkLog,
  46  |           `[RES] ${res.status()} ${res.url()} (${res.headers()["content-type"] || ""})\n`,
  47  |           "utf8"
  48  |         );
  49  |       } catch {
  50  |         // ignore write error
  51  |       }
  52  |     });
  53  |   }
  54  | }
  55  | 
  56  | async function captureScreenshot(page: Page, filename: string) {
  57  |   if (screenshotDir) {
  58  |     if (!fs.existsSync(screenshotDir)) {
  59  |       fs.mkdirSync(screenshotDir, { recursive: true });
  60  |     }
  61  |     await page.screenshot({
  62  |       path: path.join(screenshotDir, `${filename}.png`),
  63  |       fullPage: false,
  64  |     });
  65  |   }
  66  | }
  67  | 
  68  | test.describe("G1 Combined World Integration & Browser Behavior", () => {
  69  |   test.beforeEach(async ({ page }) => {
  70  |     setupPageLogging(page);
  71  |   });
  72  | 
  73  |   test("1. Load: public page loads with zero 3D world scripts or models pre-entry", async ({ page }) => {
  74  |     const glbRequests: string[] = [];
  75  |     page.on("request", (req) => {
  76  |       if (req.url().endsWith(".glb")) {
  77  |         glbRequests.push(req.url());
  78  |       }
  79  |     });
  80  | 
  81  |     await page.goto("/");
  82  |     await expect(page.locator("h1")).toContainText("A little world");
  83  |     await captureScreenshot(page, "01-load-landing");
  84  | 
  85  |     await page.locator('[data-testid="studio-disclosure"] summary').click();
  86  |     await expect(page.locator('[data-testid="enter-studio-btn"]')).toBeVisible();
  87  | 
  88  |     // Verify ZERO .glb files were loaded prior to explicit entry
  89  |     expect(glbRequests).toEqual([]);
  90  |     await expect(page.locator('[data-testid="world-canvas"]')).toHaveCount(0);
  91  |   });
  92  | 
  93  |   test("2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates", async ({ page }) => {
> 94  |     await page.goto("/?studio=enter");
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/?studio=enter
  95  | 
  96  |     // Wait for world canvas and status badge
  97  |     const canvas = page.locator('[data-testid="world-canvas"]');
  98  |     await expect(canvas).toBeVisible({ timeout: 15000 });
  99  | 
  100 |     const badge = page.locator('[data-testid="status-badge"]');
  101 |     await expect(badge).toBeVisible({ timeout: 15000 });
  102 |     await expect(badge).toContainText("coding_idle");
  103 | 
  104 |     await captureScreenshot(page, "02-entry-home-desktop");
  105 | 
  106 |     // Open diagnostics drawer
  107 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  108 |     const diagPre = page.locator('[data-testid="world-diagnostics"]');
  109 |     await expect(diagPre).toBeVisible();
  110 | 
  111 |     const text = await diagPre.textContent();
  112 |     expect(text).not.toBeNull();
  113 |     const diag = JSON.parse(text!);
  114 | 
  115 |     // Verify G1 Invariants: exactly 1 resident, 1 moving chair, 1 desk, 0 fixture-static
  116 |     expect(diag.residentCount).toBe(1);
  117 |     expect(diag.chairCount).toBe(1);
  118 |     expect(diag.movingChairCount).toBe(1);
  119 |     expect(diag.deskCount).toBe(1);
  120 |     expect(diag.fixtureStaticDiscarded).toBe(true);
  121 | 
  122 |     // Verify F1 Placement coordinates: (0.30, 0, -0.36)
  123 |     expect(diag.residentPosition[0]).toBeCloseTo(0.3, 1);
  124 |     expect(diag.residentPosition[1]).toBeCloseTo(0, 1);
  125 |     expect(diag.residentPosition[2]).toBeCloseTo(-0.36, 1);
  126 | 
  127 |     expect(diag.chairPosition[0]).toBeCloseTo(0.3, 1);
  128 |     expect(diag.chairPosition[2]).toBeCloseTo(-0.36, 1);
  129 | 
  130 |     // Verify Home Camera Preset
  131 |     expect(diag.cameraPreset).toBe("home-desktop");
  132 |     expect(diag.activeClip).toBe("coding_idle");
  133 |     expect(diag.soundEnabled).toBe(false);
  134 |   });
  135 | 
  136 |   test("4. Greeting & 5. Return: resident acknowledges visitor with chair turn and returns to work", async ({ page }) => {
  137 |     await page.goto("/?studio=enter");
  138 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  139 | 
  140 |     // Open diagnostics
  141 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  142 | 
  143 |     // Trigger Greet
  144 |     await page.click('[data-testid="greet-resident-btn"]');
  145 | 
  146 |     // Verify sequence transitions into notice / turn
  147 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  148 | 
  149 |     // Wait for turn to visitor
  150 |     await page.waitForTimeout(700);
  151 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("turn_to_visitor");
  152 | 
  153 |     await captureScreenshot(page, "03-greeting-turn");
  154 | 
  155 |     // Check diagnostics during turn: chair yaw must increase towards 125 degrees
  156 |     const diagText = await page.locator('[data-testid="world-diagnostics"]').textContent();
  157 |     const diag = JSON.parse(diagText!);
  158 |     expect(diag.mode).toBe("sequence");
  159 | 
  160 |     // Wait for greeting nod and return sequence to finish (total sequence ~4.0s)
  161 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 8000 });
  162 |     await captureScreenshot(page, "04-return-to-work");
  163 |   });
  164 | 
  165 |   test("6. Repeat: safe repeated greeting interactions without state corruption", async ({ page }) => {
  166 |     await page.goto("/?studio=enter");
  167 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  168 | 
  169 |     // First greeting
  170 |     await page.click('[data-testid="greet-resident-btn"]');
  171 |     await page.waitForTimeout(600);
  172 |     await page.click('[data-testid="skip-motion-btn"]');
  173 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  174 | 
  175 |     // Second greeting (repeat)
  176 |     await page.click('[data-testid="greet-resident-btn"]');
  177 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  178 | 
  179 |     // Third greeting after instant skip
  180 |     await page.click('[data-testid="skip-motion-btn"]');
  181 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  182 |   });
  183 | 
  184 |   test("7. Cancel: safe cancellation reverses along collision-checked path back to rest", async ({ page }) => {
  185 |     await page.goto("/?studio=enter");
  186 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  187 | 
  188 |     // Start greeting
  189 |     await page.click('[data-testid="greet-resident-btn"]');
  190 |     await page.waitForTimeout(800); // Wait until turn_to_visitor
  191 | 
  192 |     // Click cancel
  193 |     await page.click('[data-testid="cancel-motion-btn"]');
  194 | 
```