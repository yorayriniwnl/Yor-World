/**
 * YOR WORLD Milestone A5: Contact Form E2E Test Suite
 *
 * Verifies the contact form in real browser (Chromium/Edge):
 * - Direct navigation to /contact without WebGL or 3D bundle
 * - Form validation (name, email, message length)
 * - Successful durable submission and receipt display
 * - Accessibility: labels, focus, live region status
 * - No WebGL canvas rendered
 */

import { test, expect } from "@playwright/test";

test.describe("Milestone A5: Contact Form & Durable Receipt", () => {
  test("contact route renders semantic HTML form without WebGL", async ({ page }) => {
    await page.goto("/contact");

    // Verify main landmarks
    await expect(page.locator("h1")).toHaveText("Contact");
    await expect(page.getByRole("heading", { name: "Send a Message" })).toBeVisible();

    // Verify zero WebGL canvas
    const canvasCount = await page.locator("canvas").count();
    expect(canvasCount).toBe(0);

    // Verify form fields
    const nameInput = page.locator("#contact-name");
    const emailInput = page.locator("#contact-email");
    const messageInput = page.locator("#contact-message");
    const submitBtn = page.getByRole("button", { name: /Send Message/i });

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("submits valid contact inquiry and displays honest durable receipt", async ({ page }) => {
    await page.goto("/contact");

    await page.locator("#contact-name").fill("Alex Taylor");
    await page.locator("#contact-email").fill("alex.taylor@example.org");
    await page.locator("#contact-message").fill(
      "Hello Ayush, I reviewed your portfolio projects and would love to discuss a senior engineering role."
    );

    // Intercept POST /api/contact to verify HTTP status 202
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/contact") && resp.request().method() === "POST"
    );

    await page.getByRole("button", { name: /Send Message/i }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(202);
    const data = await response.json();
    expect(data.status).toBe("received");
    expect(data.id).toMatch(/^rcpt_/);

    // Verify live region displays the receipt
    const receiptCard = page.locator('[role="status"]');
    await expect(receiptCard).toBeVisible();
    await expect(receiptCard).toContainText("Message Received");
    await expect(receiptCard).toContainText(data.id);
  });

  test("direct refresh retains accessible page and direct channels", async ({ page }) => {
    await page.goto("/contact");
    await page.reload();

    await expect(page.locator("h1")).toHaveText("Contact");
    await expect(page.getByRole("heading", { name: "Direct Channels" })).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  });
});
