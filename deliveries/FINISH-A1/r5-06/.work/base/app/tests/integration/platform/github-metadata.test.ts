import { describe, it, expect, beforeEach } from "vitest";
import {
  getRepositoryMetadata,
  isAllowlistedRepository,
  clearSnapshotCache,
  setCachedSnapshot,
} from "../../../src/server/integrations/github";

describe("Milestone A6: GitHub Metadata Integration", () => {
  beforeEach(() => {
    clearSnapshotCache();
  });

  it("permits only explicitly allowlisted repositories", () => {
    expect(isAllowlistedRepository("yorayriniwnl/Yor-World")).toBe(true);
    expect(isAllowlistedRepository("yorayriniwnl/helios")).toBe(true);
    expect(isAllowlistedRepository("yorayriniwnl/zenith")).toBe(true);
    expect(isAllowlistedRepository("yorayriniwnl/ai-vs-real")).toBe(true);
    expect(isAllowlistedRepository("yorayriniwnl/talks")).toBe(true);

    // Disallowed repositories
    expect(isAllowlistedRepository("malicious/exploit")).toBe(false);
    expect(isAllowlistedRepository("facebook/react")).toBe(false);
    expect(isAllowlistedRepository("yorayriniwnl/secret-project")).toBe(false);
  });

  it("rejects non-allowlisted repositories with 403 Forbidden", async () => {
    const res = await getRepositoryMetadata("malicious/unauthorized-repo");
    expect(res.success).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain("not permitted by allowlist");
  });

  it("fetches and caches metadata successfully for allowlisted repository", async () => {
    const mockUpstreamResponse = {
      name: "Yor-World",
      description: "Interactive 3D Creator Portfolio",
      stargazers_count: 42,
      forks_count: 5,
      open_issues_count: 0,
      license: { spdx_id: "MIT" },
      language: "TypeScript",
      updated_at: "2026-10-01T12:00:00Z",
      pushed_at: "2026-10-01T12:30:00Z",
    };

    const mockFetch = async () =>
      new Response(JSON.stringify(mockUpstreamResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const res = await getRepositoryMetadata("yorayriniwnl/Yor-World", {
      customFetch: mockFetch as unknown as typeof fetch,
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data?.name).toBe("Yor-World");
    expect(res.data?.stars).toBe(42);
    expect(res.data?.license).toBe("MIT");
    expect(res.data?.stale).toBe(false);
  });

  it("serves cached metadata within 1 hour without hitting upstream", async () => {
    let fetchCalls = 0;
    const mockFetch = async () => {
      fetchCalls++;
      return new Response(JSON.stringify({ name: "helios", stargazers_count: 10 }), {
        status: 200,
      });
    };

    const t0 = new Date("2026-10-01T10:00:00Z");
    await getRepositoryMetadata("yorayriniwnl/helios", {
      customFetch: mockFetch as unknown as typeof fetch,
      now: t0,
    });
    expect(fetchCalls).toBe(1);

    // Call 30 minutes later: should return from cache
    const t1 = new Date("2026-10-01T10:30:00Z");
    const cachedRes = await getRepositoryMetadata("yorayriniwnl/helios", {
      customFetch: mockFetch as unknown as typeof fetch,
      now: t1,
    });
    expect(fetchCalls).toBe(1);
    expect(cachedRes.success).toBe(true);
    expect(cachedRes.data?.stale).toBe(false);
  });

  it("preserves last good response and marks stale when upstream rate limited or fails", async () => {
    // Prime the cache with existing data from 25 hours ago
    const cachedAt = new Date("2026-10-01T00:00:00Z");
    setCachedSnapshot("yorayriniwnl/zenith", {
      repo: "yorayriniwnl/zenith",
      payload: {
        repo: "yorayriniwnl/zenith",
        name: "zenith",
        description: "Solar tracker system",
        stars: 100,
        forks: 12,
        openIssues: 1,
        license: "Apache-2.0",
        language: "Rust",
        updatedAt: cachedAt.toISOString(),
        pushedAt: cachedAt.toISOString(),
        fetchedAt: cachedAt.toISOString(),
        stale: false,
      },
      fetchedAt: cachedAt,
      isStale: false,
    });

    // Upstream returns 403 Rate Limit
    const failingFetch = async () =>
      new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 403,
      });

    const now = new Date("2026-10-02T02:00:00Z"); // 26 hours later
    const fallbackRes = await getRepositoryMetadata("yorayriniwnl/zenith", {
      customFetch: failingFetch as unknown as typeof fetch,
      now,
    });

    expect(fallbackRes.success).toBe(true);
    expect(fallbackRes.status).toBe(200);
    expect(fallbackRes.data?.name).toBe("zenith");
    expect(fallbackRes.data?.stars).toBe(100);
    expect(fallbackRes.data?.stale).toBe(true);
    expect(fallbackRes.data?.rateLimited).toBe(true);
  });
});
