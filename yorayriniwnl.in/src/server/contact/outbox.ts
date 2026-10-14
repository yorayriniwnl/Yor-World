/**
 * YOR WORLD Milestone A5/A6: Transactional Persistence & Outbox
 * Amendment: A5/A6-CONTACT-IDEMPOTENCY-R2
 *
 * Implements atomic transactional database persistence for:
 * 1. contact_idempotency (authoritative database-level race claim)
 * 2. contact_messages (durable private record)
 * 3. email_outbox (asynchronous delivery queue)
 *
 * CRITICAL INVARIANTS:
 * - The database owns the idempotency guarantee.
 * - Key must be atomically claimed before message or outbox rows are inserted.
 * - Quotas are enforced within the transaction boundary for the winning claim.
 * - Never claim "received" unless persistence succeeds in full!
 */

import { randomUUID } from "node:crypto";
import { checkContactQuotas, type QueryableDb, type QuotaConfig } from "./quota";

export interface PersistContactParams {
  receiptId: string;
  name: string;
  email: string;
  message: string;
  keyHash: string;
  payloadHash: string;
  expiresAt: Date;
  receivedAt?: Date | undefined;
  networkKey?: string | undefined;
  quotaConfig?: QuotaConfig | undefined;
}

export interface PersistedContactResult {
  messageId: string;
  receiptId: string;
  outboxId: string;
  receivedAt: Date;
}

export class PersistenceError extends Error {
  public readonly statusCode = 503;
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PersistenceError";
  }
}

export class IdempotencyClaimFailedError extends Error {
  public readonly statusCode = 409;
  constructor(message = "Idempotency key claim was not acquired.") {
    super(message);
    this.name = "IdempotencyClaimFailedError";
  }
}

/**
 * Looks up an existing idempotency record by key hash.
 */
export async function findIdempotencyRecord(
  db: QueryableDb,
  keyHash: string,
  now: Date = new Date()
): Promise<{ receiptId: string; payloadHash: string; expiresAt: Date } | null> {
  const sql = `
    SELECT receipt_id, payload_hash, expires_at
    FROM public.contact_idempotency
    WHERE key_hash = $1
    LIMIT 1;
  `;
  try {
    const result = await db.query(sql, [keyHash]);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    const expiresAt = new Date(String(row["expires_at"]));
    if (expiresAt.getTime() <= now.getTime()) {
      return null; // Expired
    }
    return {
      receiptId: String(row["receipt_id"]),
      payloadHash: String(row["payload_hash"]),
      expiresAt,
    };
  } catch (error) {
    if (error instanceof PersistenceError) {
      throw error;
    }
    throw new PersistenceError("Database lookup failed during idempotency check.", error);
  }
}

/**
 * Atomically claims the idempotency key at the database level.
 * Uses PostgreSQL transactional row-level semantics:
 * - If key does not exist, inserts and claims key.
 * - If key exists but is expired (expires_at <= $5), updates and claims key.
 * - If key exists and is active (expires_at > $5), ON CONFLICT DO UPDATE WHERE condition
 *   evaluates to FALSE; 0 rows are returned, proving claim loss.
 */
export async function claimIdempotencyKey(
  db: QueryableDb,
  keyHash: string,
  payloadHash: string,
  receiptId: string,
  expiresAt: Date,
  now: Date = new Date()
): Promise<boolean> {
  const sql = `
    INSERT INTO public.contact_idempotency (key_hash, payload_hash, receipt_id, expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (key_hash) DO UPDATE
    SET payload_hash = EXCLUDED.payload_hash,
        receipt_id = EXCLUDED.receipt_id,
        expires_at = EXCLUDED.expires_at
    WHERE public.contact_idempotency.expires_at <= $5
    RETURNING key_hash, payload_hash, receipt_id;
  `;
  const result = await db.query(sql, [
    keyHash,
    payloadHash,
    receiptId,
    expiresAt.toISOString(),
    now.toISOString(),
  ]);
  return !!(result.rows && result.rows.length > 0);
}

/**
 * Atomically claims idempotency key, verifies quota inside the transaction boundary,
 * and writes contact message + outbox row in one transaction.
 * If claim fails, rolls back and throws IdempotencyClaimFailedError.
 * If any persistence step fails, rolls back completely and throws PersistenceError.
 */
export async function persistContactTransaction(
  db: QueryableDb,
  params: PersistContactParams
): Promise<PersistedContactResult> {
  const messageId = randomUUID();
  const outboxId = randomUUID();
  const receivedAt = params.receivedAt || new Date();

  const runTx = async (tx: QueryableDb): Promise<PersistedContactResult> => {
    // 1. Atomically claim key FIRST at database level
    const isClaimed = await claimIdempotencyKey(
      tx,
      params.keyHash,
      params.payloadHash,
      params.receiptId,
      params.expiresAt,
      receivedAt
    );

    if (!isClaimed) {
      throw new IdempotencyClaimFailedError("Idempotency key claim lost to concurrent or existing submission.");
    }

    // 2. Validate quota inside the correct transaction boundary
    if (params.networkKey) {
      await checkContactQuotas(tx, params.networkKey, params.email, receivedAt, params.quotaConfig);
    }

    // 3. Insert contact message
    const msgSql = `
      INSERT INTO public.contact_messages (id, receipt_id, name, email, body, received_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'received')
      RETURNING id, receipt_id, received_at;
    `;
    await tx.query(msgSql, [
      messageId,
      params.receiptId,
      params.name,
      params.email,
      params.message,
      receivedAt.toISOString(),
    ]);

    // 4. Insert outbox row
    const outboxSql = `
      INSERT INTO public.email_outbox (id, message_id, status, attempts, next_attempt_at, lease_until, provider_id)
      VALUES ($1, $2, 'pending', 0, $3, NULL, NULL)
      RETURNING id;
    `;
    await tx.query(outboxSql, [
      outboxId,
      messageId,
      receivedAt.toISOString(),
    ]);

    return {
      messageId,
      receiptId: params.receiptId,
      outboxId,
      receivedAt,
    };
  };

  try {
    if (typeof db.transaction === "function") {
      return await db.transaction(runTx);
    } else {
      await db.query("BEGIN;");
      try {
        const result = await runTx(db);
        await db.query("COMMIT;");
        return result;
      } catch (err) {
        try {
          await db.query("ROLLBACK;");
        } catch {
          // rollback error suppressed
        }
        throw err;
      }
    }
  } catch (error) {
    if (error instanceof IdempotencyClaimFailedError) {
      throw error;
    }
    if (error && typeof error === "object" && (error as { name?: string }).name === "QuotaExceededError") {
      throw error;
    }
    if (error instanceof PersistenceError) {
      throw error;
    }
    throw new PersistenceError("Durable persistence failed. Contact was not accepted.", error);
  }
}
