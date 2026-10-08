import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { frozenModelPaths } from "@/security/policy";

test.describe("Actual production CSP and immutable asset behavior", () => {
  test("fresh matching framework nonces replace attacker headers on each HTML response", async ({ request }) => {
    const nonces: string[] = [];
    for (let index = 0; index < 2; index++) {
      const response = await request.get("/about", { headers: { "x-nonce": "attacker-value",
        "Content-Security-Policy": "script-src * 'unsafe-inline'", "Content-Security-Policy-Report-Only": "script-src *" } });
      expect(response.status()).toBe(200);
      const policy = response.headers()["content-security-policy"]!;
      const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
      expect(nonce).toBeTruthy();
      expect(nonce).not.toBe("attacker-value");
      nonces.push(nonce!);
      const html = await response.text();
      const scripts = [...html.matchAll(/<script\b([^>]*)>/g)];
      expect(scripts.length).toBeGreaterThan(0);
      for (const script of scripts) expect(script[1]).toContain(`nonce="${nonce}"`);
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(policy.split(";").find((rule) => rule.trim().startsWith("script-src "))).not.toMatch(/unsafe-inline|unsafe-eval/);
      expect(policy).not.toContain("upgrade-insecure-requests");
      expect(response.headers()["strict-transport-security"]).toBeUndefined();
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["x-frame-options"]).toBe("DENY");
    }
    expect(nonces[0]).not.toBe(nonces[1]);
    const api = await request.get("/api/health?probe=liveness");
    expect(api.status()).toBe(200);
    expect(api.headers()["content-security-policy"]).toContain("default-src 'none'");
    expect(api.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  test("original server policy blocks a parser-inserted unnonced attack through controlled response delivery", async ({ page, request }, info) => {
    info.annotations.push({ type: "transport", description: "Actual Node-fetched server HTML/CSP delivered unchanged except one unnonced attack payload. Controlled response delivery; direct unmodified-browser transport is separate." });
    const source = await request.get("/about");
    expect(source.status()).toBe(200);
    const originalPolicy = source.headers()["content-security-policy"];
    expect(originalPolicy).toBeTruthy();
    const originalHtml = await source.text();
    expect(originalHtml).toContain("</body>");
    const attack = "<script>window.untrustedInlineExecuted = true</script>";
    const injected = originalHtml.replace("</body>", attack + "</body>");
    expect(injected.split(attack).length - 1).toBe(1);
    await page.addInitScript(() => {
      const state = window as Window & { untrustedInlineExecuted?: boolean; violations?: string[] };
      state.untrustedInlineExecuted = false;
      state.violations = [];
      document.addEventListener("securitypolicyviolation", (event) => { state.violations!.push(event.effectiveDirective); });
    });
    await page.route("**/about", (route) => route.fulfill({ response: source, body: injected }));
    const delivered = await page.goto("/about");
    expect(delivered!.headers()["content-security-policy"]).toBe(originalPolicy);
    await expect.poll(() => page.evaluate(() => (window as Window & { violations?: string[] }).violations?.length ?? 0)).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as Window & { untrustedInlineExecuted?: boolean }).untrustedInlineExecuted)).toBe(false);
  });

  test("nonce hydration supports real LOW world rendering and SPA navigation", async ({ page }) => {
    const blocked: string[] = [];
    page.on("console", (message) => { if (/violat.*Content Security Policy|Refused to/i.test(message.text())) blocked.push(message.text()); });
    await page.goto("/?studio=1");
    await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
    await page.getByTestId("quality-tier-select").selectOption("low");
    const canvas = page.getByTestId("world-canvas");
    await expect(canvas).toBeVisible();
    const before = Number(await canvas.getAttribute("data-rendered-frames"));
    await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(before + 2);
    await page.getByTestId("greet-resident-btn").click();
    // Modal top layer makes the underlying header intentionally inert.
    await page.getByTestId("studio-contact-link").click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator("#contact-name")).toBeVisible();
    expect(blocked).toEqual([]);
  });

  test("contact and owner login hydrate and retain real API/fail-closed behavior", async ({ page }) => {
    // Isolate this synthetic inquiry from other full-suite contact quota fixtures.
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.241" });
    await page.goto("/contact");
    await page.locator("#contact-name").fill("Synthetic CSP Visitor");
    await page.locator("#contact-email").fill("csp-health@example.test");
    await page.locator("#contact-message").fill("Synthetic CSP integration inquiry verifies the hydrated contact form and real local fixture API.");
    const submission = page.waitForResponse((response) => response.url().endsWith("/api/contact") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Send Message", exact: true }).click();
    expect((await submission).status()).toBe(202);
    await page.goto("/admin/login");
    await page.getByLabel("Owner Email").fill("owner@synthetic.example");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-invalid-password");
    await page.getByLabel("TOTP Security Code (AAL2 MFA)").fill("123456");
    await page.getByRole("button", { name: "Authenticate with MFA (AAL2)" }).click();
    await expect(page.locator("form [role='alert']")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("all nine frozen model responses are immutable and match the existing source bytes", async ({ request }) => {
    for (const url of frozenModelPaths) {
      const response = await request.get(url);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toMatch(/max-age=31536000/);
      expect(response.headers()["cache-control"]).toContain("immutable");
      const expected = await readFile("public" + url);
      const actual = await response.body();
      expect(createHash("sha256").update(actual).digest("hex")).toBe(createHash("sha256").update(expected).digest("hex"));
    }
  });
});
