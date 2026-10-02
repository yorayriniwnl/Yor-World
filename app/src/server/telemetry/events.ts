/**
 * YOR WORLD Milestone A6: Telemetry & Event Ingestion
 * 
 * Strict specifications per engineering-and-content.md §12:
 * - Event allowlist:
 *   studio_entry_requested, studio_ready, intro_completed, intro_skipped,
 *   project_opened, fallback_used, contact_received, renderer_failed.
 * - Max body size: 4096 bytes.
 * - Record project ID, coarse quality tier, and bounded error code only.
 * - Strictly forbidden: contact text, keystrokes, full referrers, raw GPU strings, visitor profiles.
 * - Non-blocking: analytics failure never blocks user actions.
 */

import { z } from "zod";
import { getPlatformDb,hasPlatformDatabase,isTestRuntime } from "../database";

export const ALLOWLISTED_EVENTS = [
  "studio_entry_requested",
  "studio_ready",
  "intro_completed",
  "intro_skipped",
  "project_opened",
  "fallback_used",
  "contact_received",
  "renderer_failed",
] as const;

export type AllowlistedEvent = (typeof ALLOWLISTED_EVENTS)[number];

export const ALLOWLISTED_PROJECT_IDS = [
  "candidatex",
  "helios",
  "zenith",
  "ai-vs-real",
  "talks",
] as const;

export type AllowlistedProjectId = (typeof ALLOWLISTED_PROJECT_IDS)[number];

export const QUALITY_TIERS = ["high", "medium", "low", "static"] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];

export const TelemetryEventSchema = z.object({
  event: z.enum(ALLOWLISTED_EVENTS),
  projectId: z.enum(ALLOWLISTED_PROJECT_IDS).optional(),
  tier: z.enum(QUALITY_TIERS).optional(),
  code: z
    .string()
    .max(64, "Error code must not exceed 64 characters")
    .regex(/^[a-zA-Z0-9_\-.:]*$/, "Error code must be alphanumeric or standard delimiter")
    .optional(),
  timestamp: z.string().datetime().optional(),
});

export type TelemetryPayload = z.infer<typeof TelemetryEventSchema>;

export interface AggregateEventRecord {
  id: string;
  date: string; // YYYY-MM-DD
  event: AllowlistedEvent;
  projectId: AllowlistedProjectId | null;
  tier: QualityTier | null;
  code: string | null;
  count: number;
}

// Memory aggregate store for resilience & test verification
const inMemoryAggregates = new Map<string, AggregateEventRecord>();

/**
 * Ingests a telemetry event, enforcing allowlist validation, field redaction, and bounded aggregation.
 */
export async function recordTelemetryEvent(
  rawPayload: unknown,
  contentLength: number
): Promise<{ success: boolean; error?: string; status: number }> {
  // 1. Enforce payload size limit (max 4 KiB)
  if (contentLength > 4096) {
    return {
      success: false,
      error: "Payload too large (maximum 4096 bytes)",
      status: 413,
    };
  }

  // 2. Validate against strict allowlist schema
  const parsed = TelemetryEventSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid telemetry payload or disallowed event type",
      status: 400,
    };
  }

  const validEvent = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  const aggKey = `${today}_${validEvent.event}_${validEvent.projectId || "none"}_${validEvent.tier || "none"}_${validEvent.code || "none"}`;

  // Production counters contain only allowlisted aggregate fields, never visitor identifiers.
  if (!isTestRuntime() && hasPlatformDatabase()) {
    try {
      const db=await getPlatformDb();
      await db.query(`INSERT INTO public.aggregate_events(id,date,event,project_id,tier,count)
        VALUES(md5($1)::uuid,$2,$3,$4,$5,1) ON CONFLICT(id) DO UPDATE SET count=public.aggregate_events.count+1`,
        [aggKey,today,validEvent.event,validEvent.projectId ?? null,validEvent.tier ?? null]);
    } catch { return { success: false,status: 503,error: "Telemetry storage is temporarily unavailable." }; }
  }

  // 3. Aggregate safely (counters only, zero visitor profiling)
  const existing = inMemoryAggregates.get(aggKey);
  if (existing) {
    existing.count += 1;
  } else {
    inMemoryAggregates.set(aggKey, {
      id: aggKey,
      date: today,
      event: validEvent.event,
      projectId: validEvent.projectId || null,
      tier: validEvent.tier || null,
      code: validEvent.code || null,
      count: 1,
    });
  }

  return {
    success: true,
    status: 202,
  };
}

/**
 * Returns current aggregate counts for testing / ops inspection.
 */
export function getAggregateEvents(): AggregateEventRecord[] {
  return Array.from(inMemoryAggregates.values());
}

/**
 * Clears aggregate event records (for test isolation).
 */
export function clearAggregateEvents(): void {
  inMemoryAggregates.clear();
}
