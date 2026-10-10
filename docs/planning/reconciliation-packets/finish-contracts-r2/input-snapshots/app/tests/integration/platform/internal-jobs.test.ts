import { describe, it, expect } from "vitest";
import { executeJob, verifyJobAuth } from "../../../src/server/jobs/runner";

describe("Milestone A6: Internal Jobs & Authentication", () => {
  it("enforces secret authentication for job execution", () => {
    process.env.CRON_SECRET = "secret-token-xyz-123";

    // Valid bearer token
    expect(verifyJobAuth("Bearer secret-token-xyz-123", null)).toBe(true);

    // Valid header key
    expect(verifyJobAuth(null, "secret-token-xyz-123")).toBe(true);

    // Invalid / missing credentials
    expect(verifyJobAuth("Bearer wrong-token", null)).toBe(false);
    expect(verifyJobAuth(null, "wrong-key")).toBe(false);
    expect(verifyJobAuth(null, null)).toBe(false);
  });

  it("executes refresh-github job across allowlisted repositories", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ name: "mock-repo", stargazers_count: 5 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const result = await executeJob("refresh-github", { customFetch: mockFetch as unknown as typeof fetch });
    expect(result.success).toBe(true);
    expect(result.job).toBe("refresh-github");
    expect(result.details.totalAllowlisted).toBe(5);
    expect(typeof result.durationMs).toBe("number");
  });

  it("handles cleanup-stale job safely in mock mode", async () => {
    const result = await executeJob("cleanup-stale");
    expect(result.success).toBe(true);
    expect(result.job).toBe("cleanup-stale");
    expect(result.details.cleanedIdempotency).toBe(0);
  });

  it("returns 404 error semantics on unknown job name", async () => {
    const result = await executeJob("unsupported-speculative-job");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown job");
  });
});
