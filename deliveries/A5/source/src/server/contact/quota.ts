/**
 * YOR WORLD Milestone A5: Atomic Quota Enforcement
 *
 * Enforces atomic quotas:
 * - 3 attempts per 10 minutes per network key
 * - 10 attempts per day per email key
 * - Global abuse ceiling: 100 attempts per hour
 *
 * Uses atomic PostgreSQL upsert to prevent concurrency race conditions.
 */

import { hashQuotaKey } from "./schema";

export interface QuotaConfig {
  networkWindowSeconds: number; // 600s = 10 min
  networkMaxAttempts: number;   // 3 attempts
  emailWindowSeconds: number;   // 86400s = 24 hours (1 day)
  emailMaxAttempts: number;     // 10 attempts
  globalWindowSeconds: number;  // 3600s = 1 hour
  globalMaxAttempts: number;    // 100 attempts
}

export const DEFAULT_QUOTA_CONFIG: Readonly<QuotaConfig> = Object.freeze({
  networkWindowSeconds: 600,
  networkMaxAttempts: 3,
  emailWindowSeconds: 86400,
  emailMaxAttempts: 10,
  globalWindowSeconds: 3600,
  globalMaxAttempts: 100,
});

export interface QuotaCheckResult {
  allowed: boolean;
  type?: "network" | "email" | "global";
  remaining: number;
  retryAfterSeconds: number;
}

export class QuotaExceededError extends Error {
  public readonly statusCode = 429;
  public readonly retryAfter: number;
  public readonly quotaType: "network" | "email" | "global";

  constructor(message: string, retryAfter: number, quotaType: "network" | "email" | "global") {
    super(message);
    this.name = "QuotaExceededError";
    this.retryAfter = retryAfter;
    this.quotaType = quotaType;
  }
}

export interface QueryableDb {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

/**
 * Executes atomic upsert into public.request_quotas for a specific key and window.
 */
export async function enforceAtomicQuota(
  db: QueryableDb,
  keyHash: string,
  windowSeconds: number,
  maxAllowed: number,
  now: Date = new Date()
): Promise<{ allowed: boolean; count: number; retryAfterSeconds: number }> {
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const upsertSql = `
    INSERT INTO public.request_quotas (key_hash, bucket_start, count, expires_at)
    VALUES ($1, $2, 1, $3)
    ON CONFLICT (key_hash) DO UPDATE
    SET
      count = CASE
        WHEN public.request_quotas.expires_at <= $2 THEN 1
        ELSE public.request_quotas.count + 1
      END,
      bucket_start = CASE
        WHEN public.request_quotas.expires_at <= $2 THEN $2
        ELSE public.request_quotas.bucket_start
      END,
      expires_at = CASE
        WHEN public.request_quotas.expires_at <= $2 THEN $3
        ELSE public.request_quotas.expires_at
      END
    RETURNING key_hash, count, expires_at;
  `;

  const result = await db.query(upsertSql, [
    keyHash,
    now.toISOString(),
    expiresAt.toISOString(),
  ]);

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to insert or update request quota.");
  }
  const count = Number(row["count"]);
  const rowExpiresAt = new Date(String(row["expires_at"])).getTime();
  const retryAfterSeconds = Math.max(1, Math.ceil((rowExpiresAt - now.getTime()) / 1000));

  if (count > maxAllowed) {
    return {
      allowed: false,
      count,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    count,
    retryAfterSeconds: 0,
  };
}

/**
 * Checks all 3 quotas (network, email, global) in order.
 * Throws QuotaExceededError if any quota limit is exceeded.
 */
export async function checkContactQuotas(
  db: QueryableDb,
  networkKey: string,
  email: string,
  now: Date = new Date(),
  config: QuotaConfig = DEFAULT_QUOTA_CONFIG
): Promise<void> {
  // 1. Network Key Quota (3 per 10 min)
  const networkHash = hashQuotaKey(`net:${networkKey}`);
  const netResult = await enforceAtomicQuota(
    db,
    networkHash,
    config.networkWindowSeconds,
    config.networkMaxAttempts,
    now
  );

  if (!netResult.allowed) {
    throw new QuotaExceededError(
      "Too many contact submissions from your network. Please wait before retrying.",
      netResult.retryAfterSeconds,
      "network"
    );
  }

  // 2. Email Key Quota (10 per day)
  const emailHash = hashQuotaKey(`email:${email.trim().toLowerCase()}`);
  const emailResult = await enforceAtomicQuota(
    db,
    emailHash,
    config.emailWindowSeconds,
    config.emailMaxAttempts,
    now
  );

  if (!emailResult.allowed) {
    throw new QuotaExceededError(
      "Daily contact limit for this email address reached. Please try again tomorrow.",
      emailResult.retryAfterSeconds,
      "email"
    );
  }

  // 3. Global Ceiling (100 per hour)
  const globalHour = Math.floor(now.getTime() / (config.globalWindowSeconds * 1000));
  const globalHash = hashQuotaKey(`global:${globalHour}`);
  const globalResult = await enforceAtomicQuota(
    db,
    globalHash,
    config.globalWindowSeconds,
    config.globalMaxAttempts,
    now
  );

  if (!globalResult.allowed) {
    throw new QuotaExceededError(
      "Contact system is temporarily experiencing heavy traffic. Please try again later.",
      globalResult.retryAfterSeconds,
      "global"
    );
  }
}
