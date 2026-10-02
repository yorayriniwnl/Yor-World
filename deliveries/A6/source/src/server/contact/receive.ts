/**
 * YOR WORLD Milestone A5: Contact Receiver & Idempotency Pipeline
 *
 * Implements the core business logic for processing incoming contact inquiries:
 * 1. Honeypot check
 * 2. Schema validation
 * 3. 24-hour idempotency lookup & conflict detection
 * 4. Atomic quota enforcement (network, email, global)
 * 5. Atomic transactional persistence (message + outbox + idempotency)
 * 6. Honest receipts: status "received" is returned ONLY after durable persistence.
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
import { checkContactQuotas, type QueryableDb, type QuotaConfig } from "./quota";
import {
  findIdempotencyRecord,
  persistContactTransaction,
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
}

/**
 * Processes incoming contact inquiry with strict guarantees.
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

  const releaseLock = await contactKeyMutex.acquire(keyHash);
  try {
    // 3. 24-hour Idempotency Check
    const existingRecord = await findIdempotencyRecord(db, keyHash, now);
    if (existingRecord) {
      if (existingRecord.payloadHash === payloadHash) {
        // Replay of identical request: return original receipt with honest status
        return {
          id: existingRecord.receiptId,
          status: "received",
        };
      } else {
        // Replay of same idempotency key with different payload: 409 Conflict
        throw new IdempotencyConflictError(
          "Conflicting idempotency key: a different contact payload was already accepted with this key."
        );
      }
    }

    // 4. Atomic Quota Enforcement
    await checkContactQuotas(db, networkKey, normalized.email, now, options.quotaConfig);

    // 5. Durable Transactional Persistence (Message + Outbox + Idempotency)
    const receiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const expiresAt = new Date(now.getTime() + IDEMPOTENCY_EXPIRY_HOURS * 3600 * 1000);

    const persisted = await persistContactTransaction(db, {
      receiptId,
      name: normalized.name,
      email: normalized.email,
      message: normalized.message,
      keyHash,
      payloadHash,
      expiresAt,
      receivedAt: now,
    });

    // 6. Honest Receipt Return
    return {
      id: persisted.receiptId,
      status: "received",
    };
  } finally {
    releaseLock();
  }
}
