import { test, expect } from "@playwright/test";

test.describe("Health production HTTP contract without configured live dependencies", () => {
  test("explicit liveness is a noncacheable process-only response", async ({ request }) => {
    const response = await request.get("/api/health?probe=liveness");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toMatchObject({ probe: "liveness", liveness: "alive", readiness: "not_checked",
      checks: { database: "not_checked", authentication: "not_checked" } });
  });

  test("default readiness rejects test fixtures or missing production configuration", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ probe: "readiness", liveness: "alive", readiness: "not_ready" });
    for (const status of Object.values(body.checks)) {
      expect(["fixture_rejected", "missing_configuration", "invalid_configuration", "unavailable", "timed_out"]).toContain(status);
    }
    expect(JSON.stringify(body)).not.toMatch(/postgres(?:ql)?:\/\/|service.role.key|synthetic|stack|token|YOR_TEST_DATABASE_PATH/);
  });

  test("invalid probe is generic and liveness HEAD contains no response body", async ({ request }) => {
    const invalid = await request.get("/api/health?probe=unsupported-secret-marker");
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toEqual({ error: "invalid_probe" });
    const head = await request.head("/api/health?probe=liveness");
    expect(head.status()).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers()["cache-control"]).toContain("no-store");
  });
});
