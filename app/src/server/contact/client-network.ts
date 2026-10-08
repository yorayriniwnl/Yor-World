import { isIP } from "node:net";

/**
 * The network key is a quota partition, never a visitor identity.
 *
 * On Vercel the edge injects x-vercel-forwarded-for. Unlike a caller-provided
 * X-Forwarded-For chain it is not replaced by an optional upstream proxy.
 * We must not fall back to caller-controlled forwarding headers in production.
 *
 * Local development and isolated CI fixtures can use forwarded headers so
 * deterministic test clients have independent rate-limit buckets.
 */
export function contactNetworkKey(
  headers: Pick<Headers, "get">,
  environment: { VERCEL?: string; NODE_ENV?: string; YOR_E2E_FIXTURE?: string } = process.env,
): string {
  const vercel = environment.VERCEL === "1";
  const fixture = environment.YOR_E2E_FIXTURE === "1";
  const local = environment.NODE_ENV !== "production";
  const forwarded = vercel
    ? headers.get("x-vercel-forwarded-for")
    : fixture || local
      ? headers.get("x-forwarded-for") || headers.get("x-real-ip")
      : null;

  const candidate = forwarded?.split(",")[0]?.trim() ?? "";
  // Reject arbitrary header strings and force unidentified production traffic
  // into one conservative quota bucket instead of allowing spoofed free keys.
  return isIP(candidate) ? candidate : "unattributed";
}
