/**
 * YOR WORLD Milestone A5/A6: Contact Receiver & Idempotency Pipeline
 * Amendment: A5/A6-CONTACT-IDEMPOTENCY-R2
 *
 * Implements the core business logic for processing incoming contact inquiries:
 * 1. Honeypot check
 * 2. Schema validation
 * 3. Fast-path 24-hour idempotency lookup & conflict detection
 * 4. Database-level transactional claim & persistence (message + outbox + idempotency + quota)
 * 5. Honest receipts: status "received" is returned ONLY after durable persistence.
 *
 * NOTE: Correctness is 100% owned by PostgreSQL transactional semantics and
 * atomic key claiming in public.contact_idempotency. An in-memory mutex is optional
 * and NOT required for multi-process, container, or serverless correctness.
 */

import { randomUUID } from "node:crypto";
import {
  ContactInputSchema,
  type ContactInput,
  type Receipt,
  normalizePayload,
  hashPayload,
  hashIdempotencyKey,
  IDEMPOTENCY_EXPIRY_HOURS,
} from "./schema";
import { type QueryableDb, type QuotaConfig } from "./quota";
import {
  findIdempotencyRecord,
  persistContactTransaction,
  IdempotencyClaimFailedError,
} from "./outbox";

export class ContactValidationError extends Error {
  public readonly statusCode = 400;
  public readonly errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string> = {}) {
    super(message);
    this.name = "ContactValidationError";
    this.errors = errors;
  }
}

export class IdempotencyConflictError extends Error {
  public readonly statusCode = 409;
  constructor(message = "Idempotency key was already submitted with different payload.") {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

/**
 * Optional in-process event-loop mutex (optimization only; not required for correctness).
 */
class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async acquire(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let release!: () => void;
    const p = new Promise<void>((resolve) => {
      release = () => {
        this.locks.delete(key);
        resolve();
      };
    });
    this.locks.set(key, p);
    return release;
  }
}

const contactKeyMutex = new KeyedMutex();

export interface ReceiveContactOptions {
  db: QueryableDb;
  now?: Date;
  quotaConfig?: QuotaConfig;
  useInMemoryMutex?: boolean;
}

/**
 * Processes incoming contact inquiry with strict database-backed idempotency guarantees.
 */
export async function receiveContact(
  rawInput: unknown,
  networkKey: string,
  options: ReceiveContactOptions
): Promise<Receipt> {
  const now = options.now || new Date();
  const db = options.db;

  // 1. Honeypot detection
  if (
    rawInput &&
    typeof rawInput === "object" &&
    "website" in rawInput &&
    typeof (rawInput as Record<string, unknown>).website === "string" &&
    ((rawInput as Record<string, unknown>).website as string).trim().length > 0
  ) {
    throw new ContactValidationError("Spam protection triggered. Submission rejected.", {
      website: "Honeypot field must be empty.",
    });
  }

  // 2. Schema validation
  const parsed = ContactInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "body";
      errors[path] = issue.message;
    }
    throw new ContactValidationError("Invalid contact submission.", errors);
  }

  const input: ContactInput = parsed.data;
  const normalized = normalizePayload(input);
  const payloadHash = hashPayload(normalized);
  const keyHash = hashIdempotencyKey(input.idempotencyKey);

  // Optional in-memory coalescing optimization (disabled by default; database owns correctness)
  const useMutex = options.useInMemoryMutex ?? false;
  const releaseLock = useMutex ? await contactKeyMutex.acquire(keyHash) : () => {};

  try {
    // 3. Fast-path lookup for committed replays
    const fastRecord = await findIdempotencyRecord(db, keyHash, now);
    if (fastRecord) {
      if (fastRecord.payloadHash === payloadHash) {
        // Replay of identical request: return original receipt with honest status
        return {
          id: fastRecord.receiptId,
          status: "received",
        };
      } else {
        // Replay of same idempotency key with different payload: 409 Conflict
        throw new IdempotencyConflictError(
          "Conflicting idempotency key: a different contact payload was already accepted with this key."
        );
      }
    }

    // 4. Durable Transactional Persistence (Claim + Quota + Message + Outbox)
    const receiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const expiresAt = new Date(now.getTime() + IDEMPOTENCY_EXPIRY_HOURS * 3600 * 1000);

    try {
      const persisted = await persistContactTransaction(db, {
        receiptId,
        name: normalized.name,
        email: normalized.email,
        message: normalized.message,
        keyHash,
        payloadHash,
        expiresAt,
        receivedAt: now,
        networkKey,
        quotaConfig: options.quotaConfig,
      });

      // 5. Honest Receipt Return
      return {
        id: persisted.receiptId,
        status: "received",
      };
    } catch (persistErr) {
      if (persistErr instanceof IdempotencyClaimFailedError) {
        // Claim lost to concurrent transaction. Read authoritative committed record.
        let existingRecord = await findIdempotencyRecord(db, keyHash, now);
        let retries = 0;
        while (!existingRecord && retries < 25) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          existingRecord = await findIdempotencyRecord(db, keyHash, now);
          retries++;
        }

        if (existingRecord) {
          if (existingRecord.payloadHash === payloadHash) {
            return {
              id: existingRecord.receiptId,
              status: "received",
            };
          } else {
            throw new IdempotencyConflictError(
              "Conflicting idempotency key: a different contact payload was already accepted with this key."
            );
          }
        }

        // If winning transaction aborted/rolled back (leaving no committed row), retry submission
        return receiveContact(rawInput, networkKey, { ...options, useInMemoryMutex: false });
      }

      throw persistErr;
    }
  } finally {
    releaseLock();
  }
}
