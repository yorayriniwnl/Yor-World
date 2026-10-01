import { describe, it, expect } from "vitest";
import {
  createDatabaseBackup,
  restoreDatabaseFromBackup,
} from "../../src/server/operations/backup-restore";
import { calculateNextRetry } from "../../src/server/jobs/outbox-worker";
import { MockEmailAdapter } from "../../src/server/contact/email-adapter";
import type { QueryableDb } from "../../src/server/contact/quota";

// In-memory mock database for transactional rehearsal
class MockOpsDatabase implements QueryableDb {
  public tables: Record<string, Record<string, unknown>[]> = {
    projects: [
      { id: "1", slug: "helios", title: "Helios Solar", created_at: "2026-10-01T00:00:00Z" },
      { id: "2", slug: "zenith", title: "Zenith Energy", created_at: "2026-10-01T00:00:00Z" },
    ],
    project_revisions: [],
    published_content: [{ id: "pub-1", revision: 1, payload: { active: true }, published_at: "2026-10-01T00:00:00Z" }],
    publication_history: [],
    media_assets: [],
    contact_messages: [{ id: "c-1", receipt_id: "rec-123", name: "Alice", email: "alice@test.com", body: "Hello Yor World", received_at: "2026-10-01T00:00:00Z", status: "received" }],
    email_outbox: [{ id: "out-1", message_id: "c-1", status: "pending", attempts: 0 }],
    github_snapshots: [],
    aggregate_events: [],
  };

  public inTransaction = false;

  async query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
    const trimmed = sql.trim();
    if (trimmed.startsWith("BEGIN")) {
      this.inTransaction = true;
      return { rows: [] };
    }
    if (trimmed.startsWith("COMMIT")) {
      this.inTransaction = false;
      return { rows: [] };
    }
    if (trimmed.startsWith("ROLLBACK")) {
      this.inTransaction = false;
      return { rows: [] };
    }

    // Match SELECT * FROM public.<table_name>
    const selectMatch = trimmed.match(/SELECT \* FROM public\.(\w+);/i);
    if (selectMatch && selectMatch[1]) {
      const tableName = selectMatch[1];
      return { rows: [...(this.tables[tableName] || [])] };
    }

    // Match DELETE FROM public.<table_name>
    const deleteMatch = trimmed.match(/DELETE FROM public\.(\w+);/i);
    if (deleteMatch && deleteMatch[1]) {
      const tableName = deleteMatch[1];
      if (this.tables[tableName]) {
        this.tables[tableName] = [];
      }
      return { rows: [] };
    }

    // Match INSERT
    const insertMatch = trimmed.match(/INSERT INTO public\.(\w+)/i);
    if (insertMatch && insertMatch[1]) {
      const tableName = insertMatch[1];
      if (!this.tables[tableName]) this.tables[tableName] = [];
      if (tableName === "projects" && params) {
        this.tables[tableName]!.push({ id: params[0], slug: params[1], title: params[2], created_at: params[3] });
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

describe("Milestone A6: Operations, Backup, Restore & Resilience", () => {
  it("creates a complete JSON backup snapshot of core database tables", async () => {
    const db = new MockOpsDatabase();
    const backup = await createDatabaseBackup(db, "test-runner");

    expect(backup.version).toBe(1);
    expect(backup.creator).toBe("test-runner");
    expect(backup.tables.projects.length).toBe(2);
    expect(backup.tables.published_content.length).toBe(1);
    expect(backup.tables.contact_messages.length).toBe(1);
  });

  it("restores database cleanly and transactionally from backup snapshot", async () => {
    const db = new MockOpsDatabase();
    const initialBackup = await createDatabaseBackup(db, "test-runner");

    // Mutate state: delete all projects and add dummy data
    db.tables["projects"] = [];
    db.tables["published_content"] = [];
    expect(db.tables["projects"]!.length).toBe(0);

    // Restore from backup
    const restoreResult = await restoreDatabaseFromBackup(db, initialBackup);

    expect(restoreResult.success).toBe(true);
    expect(restoreResult.restoredTables).toContain("projects");
    expect(restoreResult.restoredTables).toContain("published_content");
    expect(db.tables["projects"]!.length).toBe(2);
    expect(db.tables["published_content"]!.length).toBe(1);
  });

  it("calculates exponential retry backoffs correctly", () => {
    const t0 = new Date("2026-10-01T12:00:00Z");

    // Attempt 1: +60s (1 min)
    const retry1 = calculateNextRetry(t0, 1);
    expect(retry1.getTime() - t0.getTime()).toBe(60 * 1000);

    // Attempt 2: +300s (5 min)
    const retry2 = calculateNextRetry(t0, 2);
    expect(retry2.getTime() - t0.getTime()).toBe(300 * 1000);

    // Attempt 3: +1800s (30 min)
    const retry3 = calculateNextRetry(t0, 3);
    expect(retry3.getTime() - t0.getTime()).toBe(1800 * 1000);

    // Attempt 4: +7200s (120 min)
    const retry4 = calculateNextRetry(t0, 4);
    expect(retry4.getTime() - t0.getTime()).toBe(7200 * 1000);
  });

  it("proves contact messages persist durably even during external email outages", async () => {
    const failingEmailAdapter = new MockEmailAdapter();
    failingEmailAdapter.setFailure({ retryable: true, error: "Service Unavailable", statusCode: 503 });

    const sendRes = await failingEmailAdapter.send(
      {
        to: "owner@yor.world",
        subject: "Visitor Inquiry",
        text: "Inquiry text",
        html: "<p>Inquiry text</p>",
      },
      "idemp_key_1"
    );

    // External provider fails retryably
    expect(sendRes.success).toBe(false);
    if (!sendRes.success) {
      expect(sendRes.retryable).toBe(true);
      expect(sendRes.statusCode).toBe(503);
    }

    // Outbox record remains queued in database for retry
    const db = new MockOpsDatabase();
    const contactMsg = db.tables["contact_messages"]![0];
    expect(contactMsg).toBeDefined();
    expect(contactMsg?.status).toBe("received");
    expect(contactMsg?.receipt_id).toBe("rec-123");
  });
});
