import type { QueryableDb } from "../contact/quota";

const COLUMNS = {
  admin_users: ["id","role","active","created_at","updated_at"],
  projects: ["id","slug","title","draft_revision","archived_at"],
  project_revisions: ["id","project_id","revision","payload","created_by","created_at"],
  evidence_records: ["id","project_id","kind","source_url","checked_at","status","notes"],
  media_assets: ["id","object_key","hash","mime","bytes","dimensions","provenance","approval_status","created_at","storage_bucket","integrity_verified_at"],
  site_revisions: ["id","revision","payload","created_by","created_at"],
  published_content: ["id","revision","payload","published_at"],
  publication_history: ["id","revision","snapshot","actor","created_at"],
  contact_messages: ["id","receipt_id","name","email","body","received_at","status"],
  contact_idempotency: ["key_hash","payload_hash","receipt_id","expires_at"],
  email_outbox: ["id","message_id","status","attempts","next_attempt_at","lease_until","provider_id"],
  request_quotas: ["key_hash","bucket_start","count","expires_at"],
  github_snapshots: ["repository_id","payload","fetched_at","status"],
  aggregate_events: ["id","date","event","project_id","tier","count"],
  audit_events: ["id","actor","action","entity_type","entity_id","payload","created_at"],
} as const;
type Table = keyof typeof COLUMNS;
type LegacyTable = "projects" | "project_revisions" | "published_content" | "publication_history" | "media_assets" | "contact_messages" | "email_outbox" | "github_snapshots" | "aggregate_events";
export interface DatabaseBackupSnapshot {
  version: 1; createdAt: string; creator: string;
  tables: Record<LegacyTable,unknown[]> & Partial<Record<Table,unknown[]>>;
}
export interface RestoreResult { success: boolean; restoredTables: string[]; durationMs: number; error?: string }

async function transaction<T>(db: QueryableDb,run: (tx: QueryableDb) => Promise<T>): Promise<T> {
  if (db.transaction) return db.transaction(run);
  await db.query("BEGIN;");
  try { const result=await run(db); await db.query("COMMIT;"); return result; }
  catch (error) { try { await db.query("ROLLBACK;"); } catch { /* Preserve original failure. */ } throw error; }
}

/** Fails if any table cannot be read; a partial snapshot is never reported as a successful backup. */
export async function createDatabaseBackup(db: QueryableDb,creator="system-ops"): Promise<DatabaseBackupSnapshot> {
  return transaction(db,async (tx) => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables={} as DatabaseBackupSnapshot["tables"];
    for (const name of Object.keys(COLUMNS) as Table[]) tables[name]=(await tx.query(`SELECT * FROM public.${name};`)).rows;
    return { version: 1,createdAt: new Date().toISOString(),creator,tables };
  });
}

/** Restores the accepted schema; old v1 snapshots retain compatibility for their recorded tables. */
export async function restoreDatabaseFromBackup(db: QueryableDb,snapshot: DatabaseBackupSnapshot): Promise<RestoreResult> {
  const start=Date.now();
  if (snapshot.version !== 1) return { success: false,restoredTables: [],durationMs: Date.now()-start,error: "Unsupported backup snapshot version." };
  const present=(Object.keys(COLUMNS) as Table[]).filter((name) => Array.isArray(snapshot.tables[name]));
  try {
    await transaction(db,async (tx) => {
      for (const name of [...present].reverse()) await tx.query(`DELETE FROM public.${name};`);
      for (const name of present) {
        for (const value of snapshot.tables[name]!) {
          if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid backup row.");
          const row=value as Record<string,unknown>;
          const columns=(COLUMNS[name] as readonly string[]).filter((column) => column in row);
          if (!columns.length) throw new Error("Backup row contains no schema columns.");
          const params=columns.map((column) => {
            const cell=row[column];
            return cell !== null && typeof cell === "object" && !(cell instanceof Date) ? JSON.stringify(cell) : cell;
          });
          await tx.query(`INSERT INTO public.${name} (${columns.join(",")}) VALUES (${columns.map((_,index) => `$${index+1}`).join(",")});`,params);
        }
      }
    });
    return { success: true,restoredTables: present,durationMs: Date.now()-start };
  } catch {
    return { success: false,restoredTables: [],durationMs: Date.now()-start,error: "Restore transaction aborted; no partial restore committed." };
  }
}
