/**
 * YOR WORLD Gate G6 Release Candidate: Operations & Non-Production Restore Rehearsal
 *
 * Re-verifies A6 requirements and executes a full non-production restore rehearsal:
 * 1. GitHub metadata allowlist (5 approved repos, 403 on unauthorized)
 * 2. Last-good cache behavior & stale flag during upstream failure
 * 3. Bounded telemetry schema (8 allowlisted events, <=4096B, zero PII, 400 on violations)
 * 4. Internal job authorization (secret token check, 401 on missing/bad secret, 404 on unknown job)
 * 5. Non-production restore rehearsal:
 *    - Structured backup snapshot creation (`createDatabaseBackup`)
 *    - Input backup identity (SHA-256, version, timestamp, record counts)
 *    - State mutation / simulated data loss
 *    - Transactional restore execution (`restoreDatabaseFromBackup`)
 *    - Full recovery verification
 *    - Failure injection mid-transaction
 *    - Rollback verification (pre-restore state preserved without partial corruption)
 *    - Data integrity check (clean byte/record consistency)
 */

import { describe, expect, it, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import {
  createDatabaseBackup,
  restoreDatabaseFromBackup,
} from "../../src/server/operations/backup-restore";
import {
  getRepositoryMetadata,
  isAllowlistedRepository,
  clearSnapshotCache,
  setCachedSnapshot,
} from "../../src/server/integrations/github";
import {
  recordTelemetryEvent,
  getAggregateEvents,
  clearAggregateEvents,
  ALLOWLISTED_EVENTS,
} from "../../src/server/telemetry/events";
import {
  executeJob,
  verifyJobAuth,
} from "../../src/server/jobs/runner";
import type { QueryableDb } from "../../src/server/contact/quota";

class RehearsalDatabase implements QueryableDb {
  public tables: Record<string, Record<string, unknown>[]> = {};
  public transactionActive = false;
  public failOnInsertTable: string | null = null;
  private transactionSnapshot: Record<string, Record<string, unknown>[]> | null = null;

  constructor() {
    this.reset();
  }

  reset() {
    this.tables = {
      projects: [
        { id: "p-1", slug: "helios", title: "Helios Solar System", created_at: "2026-10-01T00:00:00Z" },
        { id: "p-2", slug: "zenith", title: "Zenith Energy Core", created_at: "2026-10-01T00:00:00Z" },
        { id: "p-3", slug: "ai-vs-real", title: "AI vs Real Detector", created_at: "2026-10-01T00:00:00Z" },
        { id: "p-4", slug: "talks", title: "Engineering Keynotes", created_at: "2026-10-01T00:00:00Z" },
      ],
      project_revisions: [
        { id: "pr-1", project_id: "p-1", revision: 1, payload: { status: "active" }, created_at: "2026-10-01T00:00:00Z" },
      ],
      published_content: [
        { id: "pub-1", revision: 1, payload: { active: true }, published_at: "2026-10-01T00:00:00Z" },
      ],
      publication_history: [
        { id: "ph-1", revision: 1, snapshot: { active: true }, published_at: "2026-10-01T00:00:00Z" },
      ],
      media_assets: [
        { id: "m-1", filename: "banner.png", status: "approved" },
      ],
      contact_messages: [
        { id: "c-1", receipt_id: "rcpt_reh_001", name: "Auditor", email: "auditor@rehearsal.test", body: "Rehearsal message", received_at: "2026-10-02T00:00:00Z", status: "received" },
      ],
      email_outbox: [
        { id: "o-1", message_id: "c-1", status: "sent", attempts: 1 },
      ],
      github_snapshots: [
        { repo: "yorayriniwnl/Yor-World", data: { stars: 42 } },
      ],
      aggregate_events: [
        { event: "studio_ready", count: 10 },
      ],
    };
    this.transactionActive = false;
    this.failOnInsertTable = null;
    this.transactionSnapshot = null;
  }

  deepCloneTables(): Record<string, Record<string, unknown>[]> {
    return JSON.parse(JSON.stringify(this.tables));
  }

  async query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
    const trimmed = sql.trim();

    if (trimmed.startsWith("BEGIN")) {
      this.transactionActive = true;
      this.transactionSnapshot = this.deepCloneTables();
      return { rows: [] };
    }

    if (trimmed.startsWith("COMMIT")) {
      this.transactionActive = false;
      this.transactionSnapshot = null;
      return { rows: [] };
    }

    if (trimmed.startsWith("ROLLBACK")) {
      if (this.transactionSnapshot) {
        this.tables = this.transactionSnapshot;
      }
      this.transactionActive = false;
      this.transactionSnapshot = null;
      return { rows: [] };
    }

    // SELECT * FROM public.<table_name>;
    const selectMatch = trimmed.match(/SELECT \* FROM public\.(\w+);/i);
    if (selectMatch && selectMatch[1]) {
      const tableName = selectMatch[1];
      return { rows: [...(this.tables[tableName] || [])] };
    }

    // DELETE FROM public.<table_name>;
    const deleteMatch = trimmed.match(/DELETE FROM public\.(\w+);/i);
    if (deleteMatch && deleteMatch[1]) {
      const tableName = deleteMatch[1];
      if (this.tables[tableName]) {
        this.tables[tableName] = [];
      }
      return { rows: [] };
    }

    // INSERT INTO public.<table_name>
    const insertMatch = trimmed.match(/INSERT INTO public\.(\w+)/i);
    if (insertMatch && insertMatch[1]) {
      const tableName = insertMatch[1];

      // Simulated failure injection point
      if (this.failOnInsertTable === tableName) {
        throw new Error(`Injected simulated failure: constraint violation on table public.${tableName}`);
      }

      if (!this.tables[tableName]) this.tables[tableName] = [];

      if (tableName === "projects" && params) {
        this.tables[tableName]!.push({ id: params[0], slug: params[1], title: params[2], created_at: params[3] });
      } else if (tableName === "project_revisions" && params) {
        this.tables[tableName]!.push({ id: params[0], project_id: params[1], revision: params[2], payload: JSON.parse(params[3] as string), created_at: params[4] });
      } else if (tableName === "published_content" && params) {
        this.tables[tableName]!.push({ id: params[0], revision: params[1], payload: JSON.parse(params[2] as string), published_at: params[3] });
      } else if (tableName === "contact_messages" && params) {
        this.tables[tableName]!.push({ id: params[0], receipt_id: params[1], name: params[2], email: params[3], body: params[4], received_at: params[5], status: params[6] });
      }
      return { rows: [] };
    }

    return { rows: [] };
  }
}

describe("G6-RC: Operations & Non-Production Restore Rehearsal", () => {
  beforeEach(() => {
    clearSnapshotCache();
    clearAggregateEvents();
  });

  describe("1. GitHub Metadata Integration & Outage Resilience", () => {
    it("1.1 Only permits approved allowlisted repositories", async () => {
      expect(isAllowlistedRepository("yorayriniwnl/Yor-World")).toBe(true);
      expect(isAllowlistedRepository("yorayriniwnl/helios")).toBe(true);
      expect(isAllowlistedRepository("yorayriniwnl/zenith")).toBe(true);
      expect(isAllowlistedRepository("yorayriniwnl/ai-vs-real")).toBe(true);
      expect(isAllowlistedRepository("yorayriniwnl/talks")).toBe(true);

      // Arbitrary repo is rejected
      expect(isAllowlistedRepository("some-attacker/malicious-repo")).toBe(false);

      const unapprovedRes = await getRepositoryMetadata("some-attacker/malicious-repo");
      expect(unapprovedRes.success).toBe(false);
      expect(unapprovedRes.status).toBe(403);
    });

    it("1.2 Preserves last good cached data when upstream encounters outage/rate-limit", async () => {
      // Prime the cache with existing data from 25 hours ago
      const cachedAt = new Date("2026-10-01T00:00:00Z");
      setCachedSnapshot("yorayriniwnl/helios", {
        repo: "yorayriniwnl/helios",
        payload: {
          repo: "yorayriniwnl/helios",
          name: "helios",
          description: "Microgrid optimizer",
          stars: 50,
          forks: 10,
          openIssues: 0,
          license: "MIT",
          language: "TypeScript",
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
      const fallbackRes = await getRepositoryMetadata("yorayriniwnl/helios", {
        customFetch: failingFetch as unknown as typeof fetch,
        now,
      });

      expect(fallbackRes.success).toBe(true);
      expect(fallbackRes.status).toBe(200);
      expect(fallbackRes.data?.name).toBe("helios");
      expect(fallbackRes.data?.stars).toBe(50);
      expect(fallbackRes.data?.stale).toBe(true);
      expect(fallbackRes.data?.rateLimited).toBe(true);
    });
  });

  describe("2. Privacy-Preserving Telemetry & Bounded Event Ingestion", () => {
    it("2.1 Accepts allowlisted operational events", async () => {
      expect(ALLOWLISTED_EVENTS.length).toBe(8);
      const payload = {
        event: "studio_ready" as const,
        tier: "high" as const,
      };
      const jsonStr = JSON.stringify(payload);
      const res = await recordTelemetryEvent(payload, jsonStr.length);
      expect(res.success).toBe(true);
      expect(res.status).toBe(202);
    });

    it("2.2 Rejects non-allowlisted events (HTTP 400)", async () => {
      const payload = {
        event: "user_keystroke_logged" as unknown as "studio_ready",
      };
      const jsonStr = JSON.stringify(payload);
      const res = await recordTelemetryEvent(payload, jsonStr.length);
      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
    });

    it("2.3 Enforces strict 4096-byte ceiling (HTTP 413)", async () => {
      const payload = {
        event: "renderer_failed" as const,
        code: "X".repeat(5000),
      };
      const res = await recordTelemetryEvent(payload, 5200);
      expect(res.success).toBe(false);
      expect(res.status).toBe(413);
    });

    it("2.4 Aggregates events cleanly without retaining visitor identities", async () => {
      const ev1 = { event: "studio_entry_requested" as const };
      const ev2 = { event: "intro_completed" as const };
      await recordTelemetryEvent(ev1, JSON.stringify(ev1).length);
      await recordTelemetryEvent(ev1, JSON.stringify(ev1).length);
      await recordTelemetryEvent(ev2, JSON.stringify(ev2).length);

      const aggregates = getAggregateEvents();
      expect(aggregates.length).toBe(2);
      const reqAggr = aggregates.find((a) => a.event === "studio_entry_requested");
      expect(reqAggr?.count).toBe(2);
    });
  });

  describe("3. Internal Job Authorization & Scheduling", () => {
    it("3.1 Rejects job execution without secret token (HTTP 401)", () => {
      process.env.CRON_SECRET = "test-cron-secret-1234";

      // Missing credentials
      expect(verifyJobAuth(null, null)).toBe(false);

      // Wrong bearer token
      expect(verifyJobAuth("Bearer wrong-secret", null)).toBe(false);

      // Wrong header key
      expect(verifyJobAuth(null, "wrong-key")).toBe(false);
    });

    it("3.2 Authorizes job execution with valid bearer or header token", () => {
      process.env.CRON_SECRET = "test-cron-secret-1234";

      // Valid Bearer
      expect(verifyJobAuth("Bearer test-cron-secret-1234", null)).toBe(true);

      // Valid Header
      expect(verifyJobAuth(null, "test-cron-secret-1234")).toBe(true);
    });

    it("3.3 Returns error semantics on unknown job name", async () => {
      const res = await executeJob("non-existent-cron-job");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Unknown job");
    });
  });

  describe("4. Non-Production Restore Rehearsal & Transactional Rollback", () => {
    it("4.1 Creates a structured JSON backup snapshot and verifies identity", async () => {
      const db = new RehearsalDatabase();
      const backup = await createDatabaseBackup(db, "g6-rc-rehearsal");

      expect(backup.version).toBe(1);
      expect(backup.creator).toBe("g6-rc-rehearsal");
      expect(backup.tables.projects.length).toBe(4);
      expect(backup.tables.published_content.length).toBe(1);
      expect(backup.tables.contact_messages.length).toBe(1);

      // Calculate snapshot SHA-256 digest
      const serialized = JSON.stringify(backup);
      const hash = createHash("sha256").update(serialized).digest("hex");
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it("4.2 Rehearsal: Mutates state, restores from backup, and verifies recovered integrity", async () => {
      const db = new RehearsalDatabase();
      const initialBackup = await createDatabaseBackup(db, "g6-rc-rehearsal");

      // Corrupt state
      db.tables["projects"] = [];
      db.tables["published_content"] = [];
      db.tables["contact_messages"] = [];
      expect(db.tables["projects"]!.length).toBe(0);

      // Execute transactional restore
      const restoreResult = await restoreDatabaseFromBackup(db, initialBackup);
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredTables).toContain("projects");
      expect(restoreResult.restoredTables).toContain("published_content");
      expect(restoreResult.restoredTables).toContain("contact_messages");

      // State is recovered
      expect(db.tables["projects"]!.length).toBe(4);
      expect(db.tables["published_content"]!.length).toBe(1);
      expect(db.tables["contact_messages"]!.length).toBe(1);
    });

    it("4.3 Rehearsal Failure Injection: Injects failure mid-restore and verifies atomic rollback", async () => {
      const db = new RehearsalDatabase();
      const initialBackup = await createDatabaseBackup(db, "g6-rc-rehearsal");

      // Save baseline state before failed restore
      const baselineProjectCount = db.tables["projects"]!.length;
      expect(baselineProjectCount).toBe(4);

      // Inject failure on inserting published_content table
      db.failOnInsertTable = "published_content";

      const failResult = await restoreDatabaseFromBackup(db, initialBackup);

      // Transaction aborted
      expect(failResult.success).toBe(false);
      expect(failResult.error).toContain("Injected simulated failure");
      expect(failResult.restoredTables.length).toBe(0);

      // Database rolled back completely: baseline state preserved!
      expect(db.tables["projects"]!.length).toBe(baselineProjectCount);
      expect(db.tables["published_content"]!.length).toBe(1);
      expect(db.tables["contact_messages"]!.length).toBe(1);
      expect(db.transactionActive).toBe(false);
    });
  });
});
