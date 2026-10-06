import { NextRequest, NextResponse } from "next/server";
import { apiContentSecurityPolicy, contentSecurityPolicy, isDocumentPath, transportPolicy } from "./security/policy";

export function proxy(request: NextRequest) {
  const development = process.env.NODE_ENV === "development";
  const requestHeaders = new Headers(request.headers);
  // Only this server generates nonce/CSP. Inbound copies and override machinery are untrusted.
  for (const name of ["x-nonce", "content-security-policy", "content-security-policy-report-only", "x-middleware-override-headers",
    "x-middleware-request-x-nonce", "x-middleware-request-content-security-policy", "x-middleware-request-content-security-policy-report-only"]) {
    requestHeaders.delete(name);
  }
  const transport = transportPolicy(new URL(request.url), process.env.NEXT_PUBLIC_BASE_URL);
  let policy: string | undefined;
  if (isDocumentPath(request.nextUrl.pathname)) {
    const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
    policy = contentSecurityPolicy({ nonce, development, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      upgrade: !development && transport.upgrade });
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", policy);
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (policy) {
    response.headers.set("Content-Security-Policy", policy);
    response.headers.set("Cache-Control", "no-store, max-age=0");
  } else if (/^\/api(?:\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("Content-Security-Policy", apiContentSecurityPolicy);
  }
  if (!development && transport.hsts) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}
