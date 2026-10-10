/**
 * YOR WORLD Milestone A3: Server-side Owner Authorization & Verification
 *
 * Implements authoritative owner administration, MFA (AAL2) enforcement,
 * request-origin validation, and row-level security coordination.
 */

import {
  AuthFailureCode,
  AuthResult,
  OwnerAuthError,
  OwnerContext,
} from "./types";
import { createAdminServiceRoleClient, createPublicServerClient } from "./clients";
import { isTestRuntime, isE2EFixture,getPlatformDb } from "../database";

// Test hook / registry for mock users during integration and local test runs
export interface UserRecord {
  id: string;
  email: string;
  aal: "aal1" | "aal2";
}

export interface AdminUserRecord {
  id: string;
  role: "owner";
  active: boolean;
}

export interface TestAuthEntry {
  user: UserRecord;
  adminRecord?: AdminUserRecord | undefined;
}

// In-memory registry used for fast local integration test runs when external Supabase is not running
let testUserRegistry: Map<string, TestAuthEntry> | null = null;

export function setTestAuthRegistry(
  registry: Map<string, TestAuthEntry> | null
) {
  if (!isTestRuntime()) throw new Error("Auth registry is test-only.");
  testUserRegistry = registry;
}

/**
 * Validates request origin to protect mutating admin endpoints from CSRF and cross-site tampering.
 */
export function validateRequestOrigin(request: Request): { valid: boolean; reason?: string } {
  const method = request.method.toUpperCase();
  // Safe read methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { valid: true };
  }

  // Check Sec-Fetch-Site if provided
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite === "cross-site") {
    return { valid: false, reason: "Cross-site request blocked by Sec-Fetch-Site" };
  }

  // Check Origin header
  const origin = request.headers.get("origin");
  if (!origin) {
    // If origin is missing, check referer as fallback
    const referer = request.headers.get("referer");
    if (!referer) {
      // In non-browser API environments (like curl or unit tests), allow if host matches
      return { valid: true };
    }
    try {
      const refererUrl = new URL(referer);
      const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
      if (host && refererUrl.host !== host) {
        return { valid: false, reason: "Referer host mismatch" };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: "Invalid referer URL" };
    }
  }

  try {
    const originUrl = new URL(origin);
    const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
    if (host && originUrl.host !== host) {
      return { valid: false, reason: `Origin host '${originUrl.host}' does not match server host '${host}'` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Malformed origin header" };
  }
}

/**
 * Extracts session bearer token or cookie from request headers.
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    // Look for standard Supabase token cookies: sb-access-token or sb-<project>-auth-token
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, ...valParts] = cookie.split("=");
      const val = valParts.join("=");
      if (!name || !val) continue;

      if (name === "sb-access-token" || name === "yor-admin-token") {
        return decodeURIComponent(val);
      }
      if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
        try {
          const parsed = JSON.parse(decodeURIComponent(val));
          if (Array.isArray(parsed) && parsed[0]) {
            return parsed[0];
          }
          if (parsed && typeof parsed.access_token === "string") {
            return parsed.access_token;
          }
        } catch { /* Standard SSR base64/chunked cookies are handled by createServerClient. */ }
      }
    }
  }

  return null;
}

/**
 * Authoritatively verifies owner identity, MFA assurance, and active role.
 * Never leaks internal error or table details to caller.
 */
export async function verifyOwner(request: Request): Promise<AuthResult> {
  // 1. Request-origin protection for mutations
  const originCheck = validateRequestOrigin(request);
  if (!originCheck.valid) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN_ORIGIN",
      message: "Forbidden: Cross-origin request rejected",
    };
  }

  // 2. Token extraction
  const token = extractAuthToken(request);
  if (!token && !request.headers.get("cookie")?.includes("sb-")) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    };
  }

  // 3. Resolve user identity and MFA assurance
  let userId: string;
  let userEmail = "";
  let assurance: "aal1" | "aal2" = "aal1";

  // Check test registry first if configured
  const fixtureToken = isE2EFixture() && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(request.url).hostname) && token === "rc3-fixture-owner-aal2";
  if (fixtureToken) {
    userId = "11111111-1111-1111-1111-111111111111";
    userEmail = "owner@yorworld.test";
    assurance = "aal2";
  } else if (token && isTestRuntime() && testUserRegistry?.has(token)) {
    const record = testUserRegistry.get(token)!;
    userId = record.user.id;
    userEmail = record.user.email;
    assurance = record.user.aal;
  } else {
    // Check Supabase Auth
    try {
      const requestCookies = (request.headers.get("cookie") || "").split(";").flatMap((part) => {
        const at = part.indexOf("=");
        return at < 0 ? [] : [{ name: part.slice(0, at).trim(), value: part.slice(at + 1).trim() }];
      });
      const publicClient = createPublicServerClient({ getAll: () => requestCookies });
      const { data: authData, error: authError } = await publicClient.auth.getUser(token ?? undefined);

      if (authError || !authData?.user) {
        return {
          ok: false,
          status: 401,
          code: "UNAUTHENTICATED",
          message: "Invalid or expired authentication session",
        };
      }

      const user = authData.user;
      userId = user.id;
      userEmail = user.email || "";

      // Read AAL from cryptographically verified session claims, never user metadata.
      const { data: claimsData, error: claimsError } = await publicClient.auth.getClaims(token ?? undefined);
      if (claimsError || claimsData?.claims.sub !== userId) {
        return { ok: false, status: 401, code: "UNAUTHENTICATED", message: "Invalid authentication session" };
      }
      assurance = claimsData.claims.aal === "aal2" ? "aal2" : "aal1";
    } catch {
      return {
        ok: false,
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication verification failed",
      };
    }
  }

  // 4. Enforce MFA / AAL2 requirement
  // Per spec: MFA is not decorative. AAL2 is strictly required for owner administration.
  if (assurance !== "aal2") {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN_MFA_REQUIRED",
      message: "Multi-factor authentication (AAL2) required",
    };
  }

  // 5. Query authoritative owner record from admin_users table
  // Never trust client role claims or email string alone.
  let adminRecord: AdminUserRecord | null = null;

  if (fixtureToken) {
    const rows=await (await getPlatformDb()).query("SELECT id,role,active FROM public.admin_users WHERE id=$1",[userId]);
    adminRecord=(rows.rows[0] as unknown as AdminUserRecord) ?? null;
  } else if (token && isTestRuntime() && testUserRegistry?.has(token)) {
    const record = testUserRegistry.get(token)!;
    adminRecord = record.adminRecord || null;
  } else {
    try {
      const adminClient = createAdminServiceRoleClient();
      const { data, error } = await adminClient
        .from("admin_users")
        .select("id, role, active")
        .eq("id", userId)
        .single();

      if (!error && data) {
        adminRecord = data as AdminUserRecord;
      }
    } catch {
      adminRecord = null;
    }
  }

  // 6. Check owner role authorization
  if (!adminRecord || adminRecord.role !== "owner") {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN_NOT_OWNER",
      message: "Owner authorization required",
    };
  }

  // 7. Check immediate revocation
  // A revoked owner with a still-valid JWT must be denied immediately!
  if (!adminRecord.active) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN_REVOKED",
      message: "Owner authorization has been revoked",
    };
  }

  // Authorized active owner with AAL2
  return {
    ok: true,
    context: {
      userId,
      email: userEmail,
      assurance: "aal2",
      role: "owner",
      active: true,
    },
  };
}

/**
 * Enforces owner authorization on a request.
 * Throws OwnerAuthError on denial with typed status (401 or 403).
 */
export async function requireOwner(request: Request): Promise<OwnerContext> {
  const result = await verifyOwner(request);
  if (!result.ok) {
    throw new OwnerAuthError(result.status, result.code, result.message);
  }
  return result.context;
}

/**
 * Creates a sanitized JSON response for an authentication/authorization failure.
 * Ensures headers prevent private response caching.
 */
export function createAuthErrorResponse(failure: {
  status: 401 | 403;
  code: AuthFailureCode;
  message: string;
}): Response {
  return new Response(
    JSON.stringify({
      error: failure.message,
      code: failure.code,
    }),
    {
      status: failure.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Vary: "Authorization, Cookie",
      },
    }
  );
}
