# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-behavior.spec.ts >> G1 Combined World Integration & Browser Behavior >> 2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates
- Location: tests\e2e\browser-behavior.spec.ts:97:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="world-canvas"]')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-testid="world-canvas"]') with timeout 15000ms
  - waiting for locator('[data-testid="world-canvas"]')

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Yor World home":
    - /url: /
    - text: YOR WORLD A studio in progress
  - navigation "Primary navigation":
    - list:
      - listitem:
        - link "Projects":
          - /url: /projects
      - listitem:
        - link "About":
          - /url: /about
      - listitem:
        - link "Contact":
          - /url: /contact
      - listitem:
        - link "Résumé":
          - /url: /resume
- main:
  - region "A little world. A closer look.":
    - paragraph: The door is taking shape
    - heading "A little world. A closer look." [level=1]:
      - text: A little world.
      - emphasis: A closer look.
    - paragraph: A personal studio for exploring the work, the thinking, and the person behind it.
    - paragraph: Ayush Roy / YOR Draft identity
    - paragraph: Software engineer — proposed title
    - paragraph: Name and professional title await owner confirmation.
    - link "View projects":
      - /url: /projects
    - group: Enter studio
    - paragraph: Portfolio preview · Content is awaiting verification.
    - complementary "Studio status":
      - text: YOR / 01 In the making
      - paragraph:
        - text: A space for
        - strong: curiosity.
      - text: Studio coming later Portfolio pages below
  - region "Start anywhere.":
    - paragraph: Take a look around
    - heading "Start anywhere." [level=2]
    - list:
      - listitem:
        - link "01 Projects Case studies, as they are verified":
          - /url: /projects
          - text: "01"
          - strong: Projects
          - text: Case studies, as they are verified
      - listitem:
        - link "02 About Background and skills, in progress":
          - /url: /about
          - text: "02"
          - strong: About
          - text: Background and skills, in progress
      - listitem:
        - link "03 Contact Details awaiting confirmation":
          - /url: /contact
          - text: "03"
          - strong: Contact
          - text: Details awaiting confirmation
- contentinfo:
  - paragraph: YOR WORLD Portfolio preview
  - paragraph: Sound off Explore at your pace
```

# Test source

```ts
  2   | import path from "node:path";
  3   | import fs from "node:fs";
  4   | import { fileURLToPath } from "node:url";
  5   | 
  6   | const __filename = fileURLToPath(import.meta.url);
  7   | const __dirname = path.dirname(__filename);
  8   | 
  9   | const evidenceDir = process.env.G1_EVIDENCE_DIR || process.env.W3_EVIDENCE_DIR || "";
  10  | const screenshotDir = evidenceDir
  11  |   ? path.join(evidenceDir, "screenshots")
  12  |   : path.resolve(__dirname, "../../evidence/screenshots");
  13  | const logsDir = evidenceDir
  14  |   ? path.join(evidenceDir, "logs")
  15  |   : path.resolve(__dirname, "../../evidence/logs");
  16  | 
  17  | function setupPageLogging(page: Page) {
  18  |   if (logsDir) {
  19  |     if (!fs.existsSync(logsDir)) {
  20  |       fs.mkdirSync(logsDir, { recursive: true });
  21  |     }
  22  |     const consoleLog = path.join(logsDir, "console.log");
  23  |     const networkLog = path.join(logsDir, "network.log");
  24  | 
  25  |     page.on("console", (msg) => {
  26  |       try {
  27  |         fs.appendFileSync(consoleLog, `[CONSOLE ${msg.type()}] ${msg.text()}\n`, "utf8");
  28  |       } catch {
  29  |         // ignore write error
  30  |       }
  31  |     });
  32  |     page.on("pageerror", (err) => {
  33  |       try {
  34  |         fs.appendFileSync(consoleLog, `[PAGEERROR] ${err.message}\n`, "utf8");
  35  |       } catch {
  36  |         // ignore write error
  37  |       }
  38  |     });
  39  |     page.on("request", (req) => {
  40  |       try {
  41  |         fs.appendFileSync(networkLog, `[REQ] ${req.method()} ${req.url()}\n`, "utf8");
  42  |       } catch {
  43  |         // ignore write error
  44  |       }
  45  |     });
  46  |     page.on("response", (res) => {
  47  |       try {
  48  |         fs.appendFileSync(
  49  |           networkLog,
  50  |           `[RES] ${res.status()} ${res.url()} (${res.headers()["content-type"] || ""})\n`,
  51  |           "utf8"
  52  |         );
  53  |       } catch {
  54  |         // ignore write error
  55  |       }
  56  |     });
  57  |   }
  58  | }
  59  | 
  60  | async function captureScreenshot(page: Page, filename: string) {
  61  |   if (screenshotDir) {
  62  |     if (!fs.existsSync(screenshotDir)) {
  63  |       fs.mkdirSync(screenshotDir, { recursive: true });
  64  |     }
  65  |     await page.screenshot({
  66  |       path: path.join(screenshotDir, `${filename}.png`),
  67  |       fullPage: false,
  68  |     });
  69  |   }
  70  | }
  71  | 
  72  | test.describe("G1 Combined World Integration & Browser Behavior", () => {
  73  |   test.beforeEach(async ({ page }) => {
  74  |     setupPageLogging(page);
  75  |   });
  76  | 
  77  |   test("1. Load: public page loads with zero 3D world scripts or models pre-entry", async ({ page }) => {
  78  |     const glbRequests: string[] = [];
  79  |     page.on("request", (req) => {
  80  |       if (req.url().endsWith(".glb")) {
  81  |         glbRequests.push(req.url());
  82  |       }
  83  |     });
  84  | 
  85  |     await page.goto("/");
  86  |     await expect(page.locator("h1")).toContainText("A little world");
  87  |     await captureScreenshot(page, "01-load-landing");
  88  | 
  89  |     await page.locator('[data-testid="studio-disclosure"] summary').click();
  90  |     await expect(page.locator('[data-testid="enter-studio-btn"]')).toBeVisible();
  91  | 
  92  |     // Verify ZERO .glb files were loaded prior to explicit entry
  93  |     expect(glbRequests).toEqual([]);
  94  |     await expect(page.locator('[data-testid="world-canvas"]')).toHaveCount(0);
  95  |   });
  96  | 
  97  |   test("2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates", async ({ page }) => {
  98  |     await page.goto("/?studio=enter");
  99  | 
  100 |     // Wait for world canvas and status badge
  101 |     const canvas = page.locator('[data-testid="world-canvas"]');
> 102 |     await expect(canvas).toBeVisible({ timeout: 15000 });
      |                          ^ Error: expect(locator).toBeVisible() failed
  103 | 
  104 |     const badge = page.locator('[data-testid="status-badge"]');
  105 |     await expect(badge).toBeVisible({ timeout: 15000 });
  106 |     await expect(badge).toContainText("coding_idle");
  107 | 
  108 |     await captureScreenshot(page, "02-entry-home-desktop");
  109 | 
  110 |     // Open diagnostics drawer
  111 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  112 |     const diagPre = page.locator('[data-testid="world-diagnostics"]');
  113 |     await expect(diagPre).toBeVisible();
  114 | 
  115 |     const text = await diagPre.textContent();
  116 |     expect(text).not.toBeNull();
  117 |     const diag = JSON.parse(text!);
  118 | 
  119 |     // Verify G1 Invariants: exactly 1 resident, 1 moving chair, 1 desk, 0 fixture-static
  120 |     expect(diag.residentCount).toBe(1);
  121 |     expect(diag.chairCount).toBe(1);
  122 |     expect(diag.movingChairCount).toBe(1);
  123 |     expect(diag.deskCount).toBe(1);
  124 |     expect(diag.fixtureStaticDiscarded).toBe(true);
  125 | 
  126 |     // Verify F1 Placement coordinates: (0.30, 0, -0.36)
  127 |     expect(diag.residentPosition[0]).toBeCloseTo(0.3, 1);
  128 |     expect(diag.residentPosition[1]).toBeCloseTo(0, 1);
  129 |     expect(diag.residentPosition[2]).toBeCloseTo(-0.36, 1);
  130 | 
  131 |     expect(diag.chairPosition[0]).toBeCloseTo(0.3, 1);
  132 |     expect(diag.chairPosition[2]).toBeCloseTo(-0.36, 1);
  133 | 
  134 |     // Verify Home Camera Preset
  135 |     expect(diag.cameraPreset).toBe("home-desktop");
  136 |     expect(diag.activeClip).toBe("coding_idle");
  137 |     expect(diag.soundEnabled).toBe(false);
  138 |   });
  139 | 
  140 |   test("4. Greeting & 5. Return: resident acknowledges visitor with chair turn and returns to work", async ({ page }) => {
  141 |     await page.goto("/?studio=enter");
  142 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  143 | 
  144 |     // Open diagnostics
  145 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  146 | 
  147 |     // Trigger Greet
  148 |     await page.click('[data-testid="greet-resident-btn"]');
  149 | 
  150 |     // Verify sequence transitions into notice / turn
  151 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  152 | 
  153 |     // Wait for turn to visitor
  154 |     await page.waitForTimeout(700);
  155 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("turn_to_visitor");
  156 | 
  157 |     await captureScreenshot(page, "03-greeting-turn");
  158 | 
  159 |     // Check diagnostics during turn: chair yaw must increase towards 125 degrees
  160 |     const diagText = await page.locator('[data-testid="world-diagnostics"]').textContent();
  161 |     const diag = JSON.parse(diagText!);
  162 |     expect(diag.mode).toBe("sequence");
  163 | 
  164 |     // Wait for greeting nod and return sequence to finish (total sequence ~4.0s)
  165 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 8000 });
  166 |     await captureScreenshot(page, "04-return-coding");
  167 |   });
  168 | 
  169 |   test("6. Repeat: safe repeated greeting interactions without state corruption", async ({ page }) => {
  170 |     await page.goto("/?studio=enter");
  171 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  172 | 
  173 |     // First greeting
  174 |     await page.click('[data-testid="greet-resident-btn"]');
  175 |     await page.waitForTimeout(600);
  176 |     await page.click('[data-testid="skip-motion-btn"]');
  177 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  178 | 
  179 |     // Second greeting (repeat)
  180 |     await page.click('[data-testid="greet-resident-btn"]');
  181 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  182 | 
  183 |     // Third greeting after instant skip
  184 |     await page.click('[data-testid="skip-motion-btn"]');
  185 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  186 |     await captureScreenshot(page, "05-repeat-greeting");
  187 |   });
  188 | 
  189 |   test("7. Cancel: safe cancellation reverses along collision-checked path back to rest", async ({ page }) => {
  190 |     await page.goto("/?studio=enter");
  191 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  192 | 
  193 |     // Start greeting
  194 |     await page.click('[data-testid="greet-resident-btn"]');
  195 |     await page.waitForTimeout(800); // Wait until turn_to_visitor
  196 | 
  197 |     // Click cancel
  198 |     await page.click('[data-testid="cancel-motion-btn"]');
  199 | 
  200 |     // Should indicate safe-return
  201 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("safe-return");
  202 | 
```