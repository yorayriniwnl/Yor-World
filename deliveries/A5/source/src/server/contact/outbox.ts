/**
 * YOR WORLD Milestone A5: Transactional Persistence & Outbox
 *
 * Implements atomic transactional database persistence for:
 * 1. contact_messages (durable private record)
 * 2. email_outbox (asynchronous delivery queue)
 * 3. contact_idempotency (24-hour replay record)
 *
 * CRITICAL INVARIANT: Never claim "received" unless persistence succeeds in full!
 */

import { randomUUID } from "node:crypto";
import type { QueryableDb } from "./quota";

export interface PersistContactParams {
  receiptId: string;
  name: string;
  email: string;
  message: string;
  keyHash: string;
  payloadHash: string;
  expiresAt: Date;
  receivedAt?: Date;
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
}

/**
 * Atomically writes contact message, outbox row, and idempotency row in one transaction.
 * If ANY step fails, rolls back completely and throws PersistenceError.
 */
export async function persistContactTransaction(
  db: QueryableDb,
  params: PersistContactParams
): Promise<PersistedContactResult> {
  const messageId = randomUUID();
  const outboxId = randomUUID();
  const receivedAt = params.receivedAt || new Date();

  try {
    await db.query("BEGIN;");

    // 1. Insert contact message
    const msgSql = `
      INSERT INTO public.contact_messages (id, receipt_id, name, email, body, received_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'received')
      RETURNING id, receipt_id, received_at;
    `;
    await db.query(msgSql, [
      messageId,
      params.receiptId,
      params.name,
      params.email,
      params.message,
      receivedAt.toISOString(),
    ]);

    // 2. Insert outbox row
    const outboxSql = `
      INSERT INTO public.email_outbox (id, message_id, status, attempts, next_attempt_at, lease_until, provider_id)
      VALUES ($1, $2, 'pending', 0, $3, NULL, NULL)
      RETURNING id;
    `;
    await db.query(outboxSql, [
      outboxId,
      messageId,
      receivedAt.toISOString(),
    ]);

    // 3. Insert idempotency record
    const idempSql = `
      INSERT INTO public.contact_idempotency (key_hash, payload_hash, receipt_id, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key_hash) DO UPDATE
      SET payload_hash = EXCLUDED.payload_hash,
          receipt_id = EXCLUDED.receipt_id,
          expires_at = EXCLUDED.expires_at;
    `;
    await db.query(idempSql, [
      params.keyHash,
      params.payloadHash,
      params.receiptId,
      params.expiresAt.toISOString(),
    ]);

    await db.query("COMMIT;");

    return {
      messageId,
      receiptId: params.receiptId,
      outboxId,
      receivedAt,
    };
  } catch (error) {
    try {
      await db.query("ROLLBACK;");
    } catch {
      // rollback error suppressed
    }
    throw new PersistenceError("Durable persistence failed. Contact was not accepted.", error);
  }
}
