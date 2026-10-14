import { describe, expect, it } from "vitest";
import { contactNetworkKey } from "../../src/server/contact/client-network";

describe("contact network quota key trust boundary", () => {
  it("uses Vercel-provided edge identity rather than spoofable forwarded chains", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.17",
      "x-forwarded-for": "198.51.100.1",
      "x-real-ip": "198.51.100.2",
    });
    expect(contactNetworkKey(headers, { VERCEL: "1", NODE_ENV: "production" })).toBe("203.0.113.17");
  });

  it("fails closed when the trusted edge header is missing", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.17" });
    expect(contactNetworkKey(headers, { VERCEL: "1", NODE_ENV: "production" })).toBe("unattributed");
  });

  it("does not trust arbitrary proxy headers on unknown production hosts", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.17" });
    expect(contactNetworkKey(headers, { NODE_ENV: "production" })).toBe("unattributed");
  });

  it("allows deterministic isolated development/CI quota partitions", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.17, 198.51.100.9" });
    expect(contactNetworkKey(headers, { NODE_ENV: "test" })).toBe("203.0.113.17");
    expect(contactNetworkKey(headers, { NODE_ENV: "production", YOR_E2E_FIXTURE: "1" })).toBe("203.0.113.17");
  });

  it("rejects invalid and unbounded header strings", () => {
    const headers = new Headers({ "x-vercel-forwarded-for": "bogus arbitrary quota token" });
    expect(contactNetworkKey(headers, { VERCEL: "1", NODE_ENV: "production" })).toBe("unattributed");
  });
});
