/**
 * YOR WORLD Milestone A5: Contact Database Provider
 *
 * Provides resilient transactional database access for the contact API route and workers.
 * Production uses a configured PostgreSQL provider. MemoryContactDb is an explicit
 * test adapter only and is never selected because durable storage failed.
 */

import type { QueryableDb } from "./quota";
import { isTestRuntime } from "../database";

let singletonDb: QueryableDb | null = null;
let simulatePersistenceFailure = false;

export function setSimulatePersistenceFailure(fail: boolean): void {
  if (!isTestRuntime()) throw new Error("Failure injection is test-only.");
  simulatePersistenceFailure = fail;
}

export function getSimulatePersistenceFailure(): boolean {
  return simulatePersistenceFailure;
}

export function setContactDb(db: QueryableDb | null): void {
  if (!isTestRuntime()) throw new Error("Contact DB injection is test-only.");
  singletonDb = db;
}

interface ContactMessageRecord {
  id: string;
  receipt_id: string;
  name: string;
  email: string;
  body: string;
  received_at: string;
  status: string;
}

interface ContactIdempotencyRecord {
  key_hash: string;
  payload_hash: string;
  receipt_id: string;
  expires_at: string;
}

interface EmailOutboxRecord {
  id: string;
  message_id: string;
  status: string;
  attempts: number;
  next_attempt_at: string;
  lease_until: string | null;
  provider_id: string | null;
}

interface RequestQuotaRecord {
  key_hash: string;
  bucket_start: string;
  count: number;
  expires_at: string;
}

interface StateSnapshot {
  messages: Map<string, ContactMessageRecord>;
  idempotency: Map<string, ContactIdempotencyRecord>;
  outbox: Map<string, EmailOutboxRecord>;
  quotas: Map<string, RequestQuotaRecord>;
}

/**
 * Robust in-memory relational engine for environments without native WASM loader.
 */
export class MemoryContactDb implements QueryableDb {
  public messages = new Map<string, ContactMessageRecord>();
  public idempotency = new Map<string, ContactIdempotencyRecord>();
  public outbox = new Map<string, EmailOutboxRecord>();
  public quotas = new Map<string, RequestQuotaRecord>();
  private snapshots: StateSnapshot[] = [];

  private createSnapshot(): StateSnapshot {
    return {
      messages: new Map(Array.from(this.messages.entries()).map(([k, v]) => [k, { ...v }])),
      idempotency: new Map(Array.from(this.idempotency.entries()).map(([k, v]) => [k, { ...v }])),
      outbox: new Map(Array.from(this.outbox.entries()).map(([k, v]) => [k, { ...v }])),
      quotas: new Map(Array.from(this.quotas.entries()).map(([k, v]) => [k, { ...v }])),
    };
  }

  private restoreSnapshot(s: StateSnapshot): void {
    this.messages = s.messages;
    this.idempotency = s.idempotency;
    this.outbox = s.outbox;
    this.quotas = s.quotas;
  }

  async transaction<T>(cb: (tx: QueryableDb) => Promise<T>): Promise<T> {
    if (simulatePersistenceFailure) {
      throw new Error("Simulated database outage for failure resilience testing");
    }
    const snapshot = this.createSnapshot();
    try {
      const res = await cb(this);
      return res;
    } catch (err) {
      this.restoreSnapshot(snapshot);
      throw err;
    }
  }

  async exec(sql: string): Promise<void> {
    if (simulatePersistenceFailure) {
      throw new Error("Simulated database outage for failure resilience testing");
    }
    if (sql.includes("TRUNCATE")) {
      this.messages.clear();
      this.idempotency.clear();
      this.outbox.clear();
      this.quotas.clear();
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
    if (simulatePersistenceFailure) {
      throw new Error("Simulated database outage for failure resilience testing");
    }

    const trimmed = sql.trim();

    // 1. Transaction controls
    if (trimmed.startsWith("BEGIN")) {
      this.snapshots.push(this.createSnapshot());
      return { rows: [] };
    }
    if (trimmed.startsWith("COMMIT")) {
      this.snapshots.pop();
      return { rows: [] };
    }
    if (trimmed.startsWith("ROLLBACK")) {
      const snap = this.snapshots.pop();
      if (snap) {
        this.restoreSnapshot(snap);
      }
      return { rows: [] };
    }

    // 2. TRUNCATE
    if (trimmed.startsWith("TRUNCATE")) {
      this.messages.clear();
      this.idempotency.clear();
      this.outbox.clear();
      this.quotas.clear();
      return { rows: [] };
    }

    // 3. Count messages
    if (trimmed.includes("COUNT(*)") && trimmed.includes("public.contact_messages")) {
      return { rows: [{ count: this.messages.size }] };
    }

    // 4. Count outbox
    if (trimmed.includes("COUNT(*)") && trimmed.includes("public.email_outbox")) {
      return { rows: [{ count: this.outbox.size }] };
    }

    // 5. Select idempotency
    if (trimmed.includes("FROM public.contact_idempotency") && trimmed.includes("WHERE key_hash = $1")) {
      const keyHash = String(params[0]);
      const rec = this.idempotency.get(keyHash);
      if (rec) {
        return { rows: [{ ...rec }] };
      }
      return { rows: [] };
    }

    // 6. Quota upsert
    if (trimmed.includes("INSERT INTO public.request_quotas")) {
      const keyHash = String(params[0]);
      const nowStr = String(params[1]);
      const expiresAtStr = String(params[2]);
      const now = new Date(nowStr).getTime();

      let rec = this.quotas.get(keyHash);
      if (!rec || new Date(rec.expires_at).getTime() <= now) {
        rec = {
          key_hash: keyHash,
          bucket_start: nowStr,
          count: 1,
          expires_at: expiresAtStr,
        };
      } else {
        rec = {
          ...rec,
          count: rec.count + 1,
        };
      }
      this.quotas.set(keyHash, rec);
      return { rows: [{ ...rec }] };
    }

    // 7. Insert contact message
    if (trimmed.includes("INSERT INTO public.contact_messages")) {
      const id = String(params[0]);
      const receipt_id = String(params[1]);
      const name = String(params[2]);
      const email = String(params[3]);
      const body = String(params[4]);
      const received_at = String(params[5]);
      const rec: ContactMessageRecord = {
        id,
        receipt_id,
        name,
        email,
        body,
        received_at,
        status: "received",
      };
      this.messages.set(id, rec);
      return { rows: [{ ...rec }] };
    }

    // 8. Insert outbox
    if (trimmed.includes("INSERT INTO public.email_outbox")) {
      const id = String(params[0]);
      const message_id = String(params[1]);
      const next_attempt_at = String(params[2]);
      const rec: EmailOutboxRecord = {
        id,
        message_id,
        status: "pending",
        attempts: 0,
        next_attempt_at,
        lease_until: null,
        provider_id: null,
      };
      this.outbox.set(id, rec);
      return { rows: [{ ...rec }] };
    }

    // 9. Upsert / Claim idempotency
    if (trimmed.includes("INSERT INTO public.contact_idempotency")) {
      const key_hash = String(params[0]);
      const payload_hash = String(params[1]);
      const receipt_id = String(params[2]);
      const expires_at = String(params[3]);

      const existing = this.idempotency.get(key_hash);
      if (existing) {
        // Check for WHERE clause (e.g. contact_idempotency.expires_at <= $5)
        if (trimmed.includes("WHERE") && params.length >= 5) {
          const nowStr = String(params[4]);
          const isExpired = new Date(existing.expires_at).getTime() <= new Date(nowStr).getTime();
          if (!isExpired) {
            // Claim failed due to existing unexpired key! Return 0 rows.
            return { rows: [] };
          }
        } else if (trimmed.includes("DO NOTHING")) {
          return { rows: [] };
        }
      }

      const rec: ContactIdempotencyRecord = {
        key_hash,
        payload_hash,
        receipt_id,
        expires_at,
      };
      this.idempotency.set(key_hash, rec);
      return { rows: [{ receipt_id: rec.receipt_id }] };
    }

    // 10. Claim outbox items with atomic lease
    if (trimmed.includes("UPDATE public.email_outbox") && trimmed.includes("status = 'processing'")) {
      const leaseUntilStr = String(params[0]);
      const nowStr = String(params[1]);
      const limit = Number(params[2]);
      const now = new Date(nowStr).getTime();

      const candidateRows: EmailOutboxRecord[] = [];
      for (const row of this.outbox.values()) {
        const isPending = row.status === "pending" || row.status === "retrying";
        const isDue = new Date(row.next_attempt_at).getTime() <= now;
        const isUnleased = !row.lease_until || new Date(row.lease_until).getTime() < now;
        const attemptsOk = row.attempts < 5;

        if (isPending && isDue && isUnleased && attemptsOk) {
          candidateRows.push(row);
        }
      }

      candidateRows.sort((a, b) => new Date(a.next_attempt_at).getTime() - new Date(b.next_attempt_at).getTime());
      const toClaim = candidateRows.slice(0, limit);
      const claimed: Record<string, unknown>[] = [];

      for (const row of toClaim) {
        row.status = "processing";
        row.lease_until = leaseUntilStr;
        claimed.push({ id: row.id, message_id: row.message_id, attempts: row.attempts });
      }

      return { rows: claimed };
    }

    // 11. Select message by id
    if (trimmed.includes("FROM public.contact_messages WHERE id = $1")) {
      const id = String(params[0]);
      const rec = this.messages.get(id);
      if (rec) {
        return { rows: [{ ...rec }] };
      }
      return { rows: [] };
    }

    // 12. Update outbox status to sent
    if (trimmed.includes("UPDATE public.email_outbox SET status = 'sent'")) {
      const providerId = String(params[0]);
      const id = String(params[1]);
      const row = this.outbox.get(id);
      if (row) {
        row.status = "sent";
        row.provider_id = providerId;
        row.lease_until = null;
      }
      return { rows: [] };
    }

    // 13. Update outbox status to retrying
    if (trimmed.includes("UPDATE public.email_outbox SET status = 'retrying'")) {
      const attempts = Number(params[0]);
      const nextAttempt = String(params[1]);
      const id = String(params[2]);
      const row = this.outbox.get(id);
      if (row) {
        row.status = "retrying";
        row.attempts = attempts;
        row.next_attempt_at = nextAttempt;
        row.lease_until = null;
      }
      return { rows: [] };
    }

    // 14. Update outbox status to failed
    if (trimmed.includes("UPDATE public.email_outbox SET status = 'failed'")) {
      const attempts = Number(params[0]);
      const id = String(params[1]);
      const row = this.outbox.get(id);
      if (row) {
        row.status = "failed";
        row.attempts = attempts;
        row.lease_until = null;
      }
      return { rows: [] };
    }

    // 15. Select all outbox
    if (trimmed.includes("FROM public.email_outbox")) {
      return { rows: Array.from(this.outbox.values()).map((r) => ({ ...r })) };
    }

    return { rows: [] };
  }
}

/** Production contacts use the configured durable platform database. No memory fallback. */
export async function getContactDb(): Promise<QueryableDb> {
  if (simulatePersistenceFailure) throw new Error("Synthetic database outage");
  if (singletonDb) return singletonDb;
  const { getPlatformDb } = await import("../database");
  return getPlatformDb();
}
