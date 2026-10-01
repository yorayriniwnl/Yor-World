/**
 * YOR WORLD Milestone A3: Integration Test Suite for Owner Authentication & MFA
 *
 * Verifies the 5 required authorization identities against server verification,
 * request-origin validation, MFA (AAL2) enforcement, and instant revocation.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  verifyOwner,
  requireOwner,
  setTestAuthRegistry,
  validateRequestOrigin,
  type UserRecord,
  type AdminUserRecord,
  type TestAuthEntry,
} from "../../src/server/auth/require-owner";
import { OwnerAuthError } from "../../src/server/auth/types";
import { GET as handleVerifyGet } from "../../src/app/api/admin/verify/route";
import { GET as handleProjectsGet, POST as handleProjectsPost } from "../../src/app/api/admin/projects/route";
import { GET as handleAuditGet, POST as handleAuditPost } from "../../src/app/api/admin/audit/route";

const MOCK_IDENTITIES = {
  activeOwnerAal2: {
    token: "token-active-owner-aal2",
    user: { id: "11111111-1111-1111-1111-111111111111", email: "owner@yorworld.test", aal: "aal2" as const },
    adminRecord: { id: "11111111-1111-1111-1111-111111111111", role: "owner" as const, active: true },
  },
  ownerAal1NoMfa: {
    token: "token-owner-aal1-no-mfa",
    user: { id: "33333333-3333-3333-3333-333333333333", email: "owner-no-mfa@yorworld.test", aal: "aal1" as const },
    adminRecord: { id: "33333333-3333-3333-3333-333333333333", role: "owner" as const, active: true },
  },
  authenticatedNonOwner: {
    token: "token-authenticated-non-owner",
    user: { id: "44444444-4444-4444-4444-444444444444", email: "visitor@external.test", aal: "aal2" as const },
    adminRecord: undefined, // Not registered in admin_users
  },
  revokedOwnerAal2: {
    token: "token-revoked-owner-aal2",
    user: { id: "22222222-2222-2222-2222-222222222222", email: "ex-owner@yorworld.test", aal: "aal2" as const },
    adminRecord: { id: "22222222-2222-2222-2222-222222222222", role: "owner" as const, active: false }, // REVOKED!
  },
};

function createMockRequest(options: {
  method?: string;
  url?: string;
  token?: string | null;
  origin?: string;
  host?: string;
  body?: unknown;
}): Request {
  const method = options.method || "GET";
  const headers = new Headers();
  const host = options.host || "127.0.0.1:3000";
  headers.set("host", host);

  if (options.origin !== undefined) {
    headers.set("origin", options.origin);
  } else if (method === "POST" || method === "PUT" || method === "DELETE") {
    headers.set("origin", `http://${host}`);
  }

  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  const reqInit: RequestInit = {
    method,
    headers,
  };

  if (options.body) {
    headers.set("content-type", "application/json");
    reqInit.body = JSON.stringify(options.body);
  }

  return new Request(options.url || `http://${host}/api/admin/verify`, reqInit);
}

describe("Milestone A3: Owner Authentication & MFA Verification", () => {
  beforeEach(() => {
    const registry = new Map<string, TestAuthEntry>();
    for (const item of Object.values(MOCK_IDENTITIES)) {
      registry.set(item.token, { user: item.user, adminRecord: item.adminRecord });
    }
    setTestAuthRegistry(registry);
  });

  describe("Server Verification: verifyOwner() across 5 Required Identities", () => {
    it("1. Anonymous identity -> denied with HTTP 401 UNAUTHENTICATED", async () => {
      const req = createMockRequest({ token: null });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(401);
        expect(res.code).toBe("UNAUTHENTICATED");
        expect(res.message).toContain("Authentication required");
      }
    });

    it("2. Authenticated non-owner -> denied with HTTP 403 FORBIDDEN_NOT_OWNER", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.authenticatedNonOwner.token });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        expect(res.code).toBe("FORBIDDEN_NOT_OWNER");
        expect(res.message).toContain("Owner authorization required");
      }
    });

    it("3. Owner without MFA (AAL1) -> denied with HTTP 403 FORBIDDEN_MFA_REQUIRED", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.ownerAal1NoMfa.token });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        expect(res.code).toBe("FORBIDDEN_MFA_REQUIRED");
        expect(res.message).toContain("Multi-factor authentication (AAL2) required");
      }
    });

    it("4. Active owner with MFA (AAL2) -> ALLOWED with valid OwnerContext", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.activeOwnerAal2.token });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.context.userId).toBe(MOCK_IDENTITIES.activeOwnerAal2.user.id);
        expect(res.context.assurance).toBe("aal2");
        expect(res.context.role).toBe("owner");
        expect(res.context.active).toBe(true);
      }
    });

    it("5. Revoked owner with otherwise-valid AAL2 token -> denied IMMEDIATELY with HTTP 403 FORBIDDEN_REVOKED", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.revokedOwnerAal2.token });
      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        expect(res.code).toBe("FORBIDDEN_REVOKED");
        expect(res.message).toContain("Owner authorization has been revoked");
      }
    });
  });

  describe("requireOwner() Guard Interface", () => {
    it("throws OwnerAuthError on failure with accurate status codes", async () => {
      const unauthReq = createMockRequest({ token: null });
      await expect(requireOwner(unauthReq)).rejects.toThrow(OwnerAuthError);

      try {
        await requireOwner(unauthReq);
      } catch (err: unknown) {
        const error = err as OwnerAuthError;
        expect(error.status).toBe(401);
        expect(error.code).toBe("UNAUTHENTICATED");
      }

      const nonOwnerReq = createMockRequest({ token: MOCK_IDENTITIES.authenticatedNonOwner.token });
      try {
        await requireOwner(nonOwnerReq);
      } catch (err: unknown) {
        const error = err as OwnerAuthError;
        expect(error.status).toBe(403);
        expect(error.code).toBe("FORBIDDEN_NOT_OWNER");
      }
    });

    it("resolves context when valid owner with AAL2 is provided", async () => {
      const validReq = createMockRequest({ token: MOCK_IDENTITIES.activeOwnerAal2.token });
      const ctx = await requireOwner(validReq);
      expect(ctx.userId).toBe(MOCK_IDENTITIES.activeOwnerAal2.user.id);
      expect(ctx.assurance).toBe("aal2");
    });
  });

  describe("Request-Origin Protection (CSRF Defense)", () => {
    it("allows safe GET requests regardless of origin", () => {
      const req = createMockRequest({ method: "GET", origin: "http://malicious.test" });
      const check = validateRequestOrigin(req);
      expect(check.valid).toBe(true);
    });

    it("rejects mutating POST requests with mismatched cross-origin headers", async () => {
      const req = createMockRequest({
        method: "POST",
        origin: "http://attacker-site.com",
        host: "127.0.0.1:3000",
        token: MOCK_IDENTITIES.activeOwnerAal2.token,
      });

      const res = await verifyOwner(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        expect(res.code).toBe("FORBIDDEN_ORIGIN");
      }
    });

    it("allows mutating POST requests when origin matches server host", async () => {
      const req = createMockRequest({
        method: "POST",
        origin: "http://127.0.0.1:3000",
        host: "127.0.0.1:3000",
        token: MOCK_IDENTITIES.activeOwnerAal2.token,
      });

      const res = await verifyOwner(req);
      expect(res.ok).toBe(true);
    });
  });

  describe("Protected API Route Handlers: /api/admin/*", () => {
    it("/api/admin/verify returns 401 for anonymous caller without leaking internals", async () => {
      const req = createMockRequest({ token: null });
      const res = await handleVerifyGet(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Authentication required");
      expect(data.code).toBe("UNAUTHENTICATED");
      expect(data).not.toHaveProperty("stack");
      expect(data).not.toHaveProperty("table");
    });

    it("/api/admin/verify returns 403 for authenticated non-owner", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.authenticatedNonOwner.token });
      const res = await handleVerifyGet(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_NOT_OWNER");
    });

    it("/api/admin/verify returns 403 for owner without MFA", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.ownerAal1NoMfa.token });
      const res = await handleVerifyGet(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_MFA_REQUIRED");
    });

    it("/api/admin/verify returns 403 for revoked owner immediately", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.revokedOwnerAal2.token });
      const res = await handleVerifyGet(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_REVOKED");
    });

    it("/api/admin/verify returns 200 OK for active owner with MFA", async () => {
      const req = createMockRequest({ token: MOCK_IDENTITIES.activeOwnerAal2.token });
      const res = await handleVerifyGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.authenticated).toBe(true);
      expect(data.owner.assurance).toBe("aal2");
      expect(data.owner.active).toBe(true);
    });

    it("/api/admin/projects GET protects private project metadata", async () => {
      const anonReq = createMockRequest({ token: null });
      const anonRes = await handleProjectsGet(anonReq);
      expect(anonRes.status).toBe(401);

      const ownerReq = createMockRequest({ token: MOCK_IDENTITIES.activeOwnerAal2.token });
      const ownerRes = await handleProjectsGet(ownerReq);
      expect(ownerRes.status).toBe(200);
      const ownerData = await ownerRes.json();
      expect(ownerData.projects).toHaveLength(4);
    });

    it("/api/admin/projects POST verifies origin and mutates draft only for authorized owner", async () => {
      const spoofedReq = createMockRequest({
        method: "POST",
        origin: "http://evil-spoof.com",
        token: MOCK_IDENTITIES.activeOwnerAal2.token,
        body: { projectId: "ai-vs-real", title: "New Title" },
      });
      const spoofedRes = await handleProjectsPost(spoofedReq);
      expect(spoofedRes.status).toBe(403);

      const validReq = createMockRequest({
        method: "POST",
        origin: "http://127.0.0.1:3000",
        token: MOCK_IDENTITIES.activeOwnerAal2.token,
        body: { projectId: "ai-vs-real", title: "New Title" },
      });
      const validRes = await handleProjectsPost(validReq);
      expect(validRes.status).toBe(201);
      const validData = await validRes.json();
      expect(validData.action).toBe("draft_saved");
    });

    it("/api/admin/audit routes enforce read/write access", async () => {
      const nonOwnerReq = createMockRequest({ token: MOCK_IDENTITIES.authenticatedNonOwner.token });
      expect((await handleAuditGet(nonOwnerReq)).status).toBe(403);
      expect((await handleAuditPost(nonOwnerReq)).status).toBe(403);

      const ownerReq = createMockRequest({
        method: "POST",
        token: MOCK_IDENTITIES.activeOwnerAal2.token,
        body: { action: "verified_identity", entityType: "auth" },
      });
      const res = await handleAuditPost(ownerReq);
      expect(res.status).toBe(201);
    });
  });
});
