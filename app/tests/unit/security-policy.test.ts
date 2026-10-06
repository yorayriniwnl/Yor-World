import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { contentSecurityPolicy, isDocumentPath, transportPolicy } from "@/security/policy";

const nonce = "YXV0aG9yaXRhdGl2ZS1zeW50aGV0aWMtbm9uY2U=";
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth-project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://portfolio.example");
});
afterEach(() => vi.unstubAllEnvs());

describe("Production CSP and transport policy", () => {
  it("strict script policy permits only nonce-authorized scripts and explicitly scopes inline styles", () => {
    const policy = contentSecurityPolicy({ nonce, development: false, upgrade: false });
    const scripts = policy.split(";").find((rule) => rule.trim().startsWith("script-src "))!;
    expect(scripts).toContain(`'nonce-${nonce}'`);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval|https:|blob:|data:/);
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy).toContain(`style-src 'self' 'nonce-${nonce}'`);
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("img-src 'self' blob: data:");
    expect(policy).toContain("worker-src 'self' blob:");
  });

  it("allowlists only the exact validated Supabase HTTPS and WSS origins", () => {
    const policy = contentSecurityPolicy({ nonce, development: false, supabaseUrl: "https://auth-project.supabase.co/", upgrade: false });
    expect(policy).toContain("connect-src 'self' blob: data: https://auth-project.supabase.co wss://auth-project.supabase.co");
    expect(policy).not.toContain("*.supabase.co");
    expect(policy).not.toMatch(/connect-src[^;]*\shttps:(?:\s|;)/);
  });

  it.each(["https://user:secret@auth.example", "https://auth.example/path", "https://auth.example?secret=value",
    "https://auth.example#token", "http://auth.example", "https://*.supabase.co", "https://localhost", "malformed-secret-value"])(
    "invalid public Auth configuration %s cannot inject a connect policy", (supabaseUrl) => {
      const policy = contentSecurityPolicy({ nonce, development: false, supabaseUrl, upgrade: false });
      expect(policy).toContain("connect-src 'self' blob: data:;");
      expect(policy).not.toMatch(/secret|token|auth\.example|supabase\.co|malformed/);
    },
  );

  it("rejects nonce syntax injection", () => {
    expect(() => contentSecurityPolicy({ nonce: "injected'; script-src *", development: false, upgrade: false })).toThrow();
  });

  it("only development permits eval and local HMR sockets", () => {
    expect(contentSecurityPolicy({ nonce, development: true, upgrade: false })).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy({ nonce, development: false, upgrade: false })).not.toContain("'unsafe-eval'");
    expect(contentSecurityPolicy({ nonce, development: false, upgrade: false })).not.toContain(" ws:");
  });

  it("HTTPS public origins get HSTS while loopback stays usable regardless of configured domain", () => {
    expect(transportPolicy(new URL("https://portfolio.example"), undefined)).toEqual({ hsts: true, upgrade: true });
    expect(transportPolicy(new URL("http://portfolio.example"), "https://portfolio.example")).toEqual({ hsts: false, upgrade: true });
    for (const url of ["http://localhost:3133", "http://127.0.0.1:3133", "https://127.0.0.1:3133", "http://[::1]:3133"]) {
      expect(transportPolicy(new URL(url), "https://portfolio.example")).toEqual({ hsts: false, upgrade: false });
    }
    expect(transportPolicy(new URL("http://other.example"), "https://portfolio.example")).toEqual({ hsts: false, upgrade: false });
  });

  it("proxy replaces adversarial nonce/CSP with a fresh request and matching response policy", () => {
    const request = new NextRequest("https://portfolio.example/about", { headers: {
      "x-nonce": "attacker-value", "Content-Security-Policy": "script-src * 'unsafe-inline'", "Content-Security-Policy-Report-Only": "script-src *",
      "x-middleware-request-x-nonce": "attacker-value", "x-middleware-override-headers": "x-nonce",
    } });
    const first = proxy(request);
    const second = proxy(request);
    const freshNonce = first.headers.get("x-middleware-request-x-nonce");
    expect(freshNonce).toBeTruthy();
    expect(freshNonce).not.toBe("attacker-value");
    expect(second.headers.get("x-middleware-request-x-nonce")).not.toBe(freshNonce);
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(first.headers.get("content-security-policy"));
    expect(first.headers.get("content-security-policy")).toContain(`'nonce-${freshNonce}'`);
    expect(first.headers.get("x-middleware-request-content-security-policy-report-only")).toBeNull();
    expect(first.headers.get("cache-control")).toContain("no-store");
    expect(first.headers.get("strict-transport-security")).toBe("max-age=31536000");
    expect(first.headers.get("strict-transport-security")).not.toMatch(/includeSubDomains|preload/);
  });

  it("forwarded transport headers cannot force loopback HTTPS or HSTS", () => {
    const result = proxy(new NextRequest("http://127.0.0.1:3133/", { headers: { "x-forwarded-proto": "https" } }));
    expect(result.headers.get("strict-transport-security")).toBeNull();
    expect(result.headers.get("content-security-policy")).not.toContain("upgrade-insecure-requests");
  });

  it("API and static paths preserve their existing cache handling", () => {
    for (const path of ["/api/github", "/api/health", "/models/group-a-essential.glb", "/_next/static/chunk.js"]) {
      expect(isDocumentPath(path)).toBe(false);
      const response = proxy(new NextRequest("https://portfolio.example" + path));
      expect(response.headers.get("cache-control")).toBeNull();
      if (path.startsWith("/api/")) {
        expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
        expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      } else expect(response.headers.get("content-security-policy")).toBeNull();
      expect(response.headers.get("strict-transport-security")).toBe("max-age=31536000");
    }
  });
});
