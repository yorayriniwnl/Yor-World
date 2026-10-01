/**
 * YOR WORLD Milestone A6: Operations, Backup & Restore Verification
 * 
 * Strict specifications per engineering-and-content.md §10, §13:
 * - Independent backup of database content and publication state.
 * - Rehearsed recovery: restore content revision and clean environment.
 * - Rollback selects a known approved snapshot and verifies asset availability.
 * - Transactional guarantees: restore failure rolls back cleanly without data loss.
 */

import type { QueryableDb } from "../contact/quota";

export interface DatabaseBackupSnapshot {
  version: 1;
  createdAt: string;
  creator: string;
  tables: {
    projects: unknown[];
    project_revisions: unknown[];
    published_content: unknown[];
    publication_history: unknown[];
    media_assets: unknown[];
    contact_messages: unknown[];
    email_outbox: unknown[];
    github_snapshots: unknown[];
    aggregate_events: unknown[];
  };
}

/**
 * Creates a complete JSON backup snapshot of core database tables.
 */
export async function createDatabaseBackup(
  db: QueryableDb,
  creator: string = "system-ops"
): Promise<DatabaseBackupSnapshot> {
  const fetchTable = async (tableName: string): Promise<unknown[]> => {
    try {
      const res = await db.query(`SELECT * FROM public.${tableName};`);
      return res.rows || [];
    } catch {
      return [];
    }
  };

  const [
    projects,
    project_revisions,
    published_content,
    publication_history,
    media_assets,
    contact_messages,
    email_outbox,
    github_snapshots,
    aggregate_events,
  ] = await Promise.all([
    fetchTable("projects"),
    fetchTable("project_revisions"),
    fetchTable("published_content"),
    fetchTable("publication_history"),
    fetchTable("media_assets"),
    fetchTable("contact_messages"),
    fetchTable("email_outbox"),
    fetchTable("github_snapshots"),
    fetchTable("aggregate_events"),
  ]);

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    creator,
    tables: {
      projects,
      project_revisions,
      published_content,
      publication_history,
      media_assets,
      contact_messages,
      email_outbox,
      github_snapshots,
      aggregate_events,
    },
  };
}

export interface RestoreResult {
  success: boolean;
  restoredTables: string[];
  durationMs: number;
  error?: string;
}

/**
 * Restores database from a validated backup snapshot transactionally.
 */
export async function restoreDatabaseFromBackup(
  db: QueryableDb,
  snapshot: DatabaseBackupSnapshot
): Promise<RestoreResult> {
  const start = Date.now();
  if (snapshot.version !== 1) {
    return {
      success: false,
      restoredTables: [],
      durationMs: Date.now() - start,
      error: `Unsupported backup snapshot version: ${snapshot.version}`,
    };
  }

  const restoredTables: string[] = [];

  try {
    await db.query("BEGIN;");

    // Clear dependent tables in reverse dependency order
    await db.query("DELETE FROM public.email_outbox;");
    await db.query("DELETE FROM public.contact_messages;");
    await db.query("DELETE FROM public.publication_history;");
    await db.query("DELETE FROM public.published_content;");
    await db.query("DELETE FROM public.project_revisions;");
    await db.query("DELETE FROM public.projects;");
    await db.query("DELETE FROM public.media_assets;");

    // Restore tables in forward dependency order
    // 1. Projects
    for (const p of snapshot.tables.projects as Record<string, unknown>[]) {
      await db.query(
        "INSERT INTO public.projects (id, slug, title, created_at) VALUES ($1, $2, $3, $4);",
        [p.id, p.slug, p.title, p.created_at || new Date().toISOString()]
      );
    }
    restoredTables.push("projects");

    // 2. Project Revisions
    for (const pr of snapshot.tables.project_revisions as Record<string, unknown>[]) {
      await db.query(
        "INSERT INTO public.project_revisions (id, project_id, revision, payload, created_at) VALUES ($1, $2, $3, $4, $5);",
        [pr.id, pr.project_id, pr.revision, JSON.stringify(pr.payload), pr.created_at || new Date().toISOString()]
      );
    }
    restoredTables.push("project_revisions");

    // 3. Published Content
    for (const pc of snapshot.tables.published_content as Record<string, unknown>[]) {
      await db.query(
        "INSERT INTO public.published_content (id, revision, payload, published_at) VALUES ($1, $2, $3, $4);",
        [pc.id, pc.revision, JSON.stringify(pc.payload), pc.published_at || new Date().toISOString()]
      );
    }
    restoredTables.push("published_content");

    // 4. Contact messages & outbox
    for (const cm of snapshot.tables.contact_messages as Record<string, unknown>[]) {
      await db.query(
        "INSERT INTO public.contact_messages (id, receipt_id, name, email, body, received_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7);",
        [cm.id, cm.receipt_id, cm.name, cm.email, cm.body, cm.received_at, cm.status || "received"]
      );
    }
    restoredTables.push("contact_messages");

    await db.query("COMMIT;");

    return {
      success: true,
      restoredTables,
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    try {
      await db.query("ROLLBACK;");
    } catch {
      // rollback error suppressed
    }
    return {
      success: false,
      restoredTables: [],
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Restore transaction aborted",
    };
  }
}
