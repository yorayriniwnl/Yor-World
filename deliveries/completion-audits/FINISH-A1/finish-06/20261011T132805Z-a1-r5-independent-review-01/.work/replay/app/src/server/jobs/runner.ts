import { timingSafeEqual } from "node:crypto";
import { isTestRuntime } from "../database";
/**
 * YOR WORLD Milestone A6: Internal Jobs & Cron Execution
 * 
 * Strict specifications per engineering-and-content.md §11, §12:
 * - Secret-authenticated internal endpoints.
 * - Leased workers prevent duplicate delivery.
 * - Bounded retries: ~1m, ~5m, ~30m, ~120m backoff.
 * - Automated catch-up for scheduled triggers.
 */

import { processOutbox, type OutboxProcessResult } from "./outbox-worker";
import { ALLOWLISTED_REPOSITORIES, getRepositoryMetadata } from "../integrations/github";
import type { QueryableDb } from "../contact/quota";

export interface JobContext {
  db?: QueryableDb;
  now?: Date;
  limit?: number;
  customFetch?: typeof fetch;
}

export interface JobExecutionResult {
  job: string;
  success: boolean;
  durationMs: number;
  details: Record<string, unknown>;
  error?: string;
}

/**
 * Validates internal job authentication key.
 */
export function verifyJobAuth(authHeader: string | null, keyHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET || process.env.INTERNAL_JOB_KEY;
  
  if (!secret) return false;
  const matches = (candidate: string) => {
    const value=Buffer.from(candidate); const expected=Buffer.from(secret);
    return value.length === expected.length && timingSafeEqual(value,expected);
  };
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (matches(token)) return true;
  }

  if (keyHeader && matches(keyHeader.trim())) {
    return true;
  }

  return false;
}

/**
 * Executes a specified internal job.
 */
export async function executeJob(
  jobName: string,
  context: JobContext = {}
): Promise<JobExecutionResult> {
  const startTime = Date.now();
  const now = context.now ?? new Date();

  switch (jobName) {
    case "process-outbox": {
      if (!context.db) {
        return {
          job: jobName,
          success: false,
          durationMs: Date.now() - startTime,
          details: {},
          error: "Durable database is required for outbox execution.",
        };
      }

      try {
        const outboxResult: OutboxProcessResult = await processOutbox(
          now,
          context.limit ?? 25,
          { db: context.db }
        );
        return {
          job: jobName,
          success: true,
          durationMs: Date.now() - startTime,
          details: { ...outboxResult },
        };
      } catch (err: unknown) {
        return {
          job: jobName,
          success: false,
          durationMs: Date.now() - startTime,
          details: {},
          error: err instanceof Error ? err.message : "Outbox processing failed",
        };
      }
    }

    case "refresh-github": {
      let updatedCount = 0;
      const errors: string[] = [];

      for (const repo of ALLOWLISTED_REPOSITORIES) {
        try {
          const fetchOpts: { now: Date; customFetch?: typeof fetch } = { now };
          if (context.customFetch) {
            fetchOpts.customFetch = context.customFetch;
          }
          const res = await getRepositoryMetadata(repo, fetchOpts);
          if (res.success) {
            updatedCount++;
          } else {
            errors.push(`${repo}: ${res.error}`);
          }
        } catch (err: unknown) {
          errors.push(`${repo}: ${err instanceof Error ? err.message : "Fetch failed"}`);
        }
      }

      return {
        job: jobName,
        success: errors.length === 0,
        durationMs: Date.now() - startTime,
        details: {
          updatedCount,
          totalAllowlisted: ALLOWLISTED_REPOSITORIES.length,
          errors,
        },
      };
    }

    case "cleanup-stale": {
      if (!context.db && !isTestRuntime()) return { job: jobName,success: false,durationMs: Date.now()-startTime,details: {},error: "Durable database is required." };
      let cleanedIdempotency = 0;
      let cleanedQuotas = 0;

      if (context.db) {
        try {
          const idempRes = await context.db.query(
            "DELETE FROM public.contact_idempotency WHERE expires_at < $1 RETURNING key_hash;",
            [now.toISOString()]
          );
          cleanedIdempotency = idempRes.rows ? idempRes.rows.length : 0;

          const quotaRes = await context.db.query(
            "DELETE FROM public.request_quotas WHERE expires_at < $1 RETURNING key_hash;",
            [now.toISOString()]
          );
          cleanedQuotas = quotaRes.rows ? quotaRes.rows.length : 0;
          await context.db.query("DELETE FROM public.contact_messages WHERE received_at < $1", [new Date(now.getTime()-90*86400*1000).toISOString()]);
        } catch {
          return { job: jobName,success: false,durationMs: Date.now()-startTime,details: {},error: "Database cleanup failed." };
        }
      }

      return {
        job: jobName,
        success: true,
        durationMs: Date.now() - startTime,
        details: {
          cleanedIdempotency,
          cleanedQuotas,
        },
      };
    }

    default:
      return {
        job: jobName,
        success: false,
        durationMs: Date.now() - startTime,
        details: {},
        error: `Unknown job '${jobName}'`,
      };
  }
}
