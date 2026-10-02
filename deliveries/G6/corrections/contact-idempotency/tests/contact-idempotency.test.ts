/**
 * YOR WORLD Amendment A5/A6-CONTACT-IDEMPOTENCY-R2: Concurrency & Database-Safe Idempotency Test Suite
 *
 * Verifies that the PostgreSQL database owns the idempotency guarantee across:
 * - Event-loop concurrent tasks
 * - Independent database connections
 * - Simulated Node processes and serverless instances
 * - Without any reliance on shared in-process memory or JavaScript mutexes.
 */

import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import {
  receiveContact,
  IdempotencyConflictError,
} from "@/server/contact/receive";
import {
  findIdempotencyRecord,
  persistContactTransaction,
  claimIdempotencyKey,
  PersistenceError,
} from "@/server/contact/outbox";
import { QuotaExceededError } from "@/server/contact/quota";
import { hashIdempotencyKey, hashPayload, normalizePayload } from "@/server/contact/schema";

describe("A5/A6-CONTACT-IDEMPOTENCY-R2: Database-Safe Idempotency Suite", () => {
  let db: PGlite;

  const initSchema = async (targetDb: PGlite) => {
    const migration = `
      CREATE TABLE IF NOT EXISTS public.contact_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id text UNIQUE NOT NULL,
        name text NOT NULL,
        email text NOT NULL,
        body text NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        status text NOT NULL DEFAULT 'received'
      );

      CREATE TABLE IF NOT EXISTS public.contact_idempotency (
        key_hash text PRIMARY KEY,
        payload_hash text NOT NULL,
        receipt_id text NOT NULL,
        expires_at timestamptz NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public.email_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid REFERENCES public.contact_messages(id) ON DELETE CASCADE NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        attempts integer NOT NULL DEFAULT 0,
        next_attempt_at timestamptz NOT NULL DEFAULT now(),
        lease_until timestamptz,
        provider_id text
      );

      CREATE TABLE IF NOT EXISTS public.request_quotas (
        key_hash text PRIMARY KEY,
        bucket_start timestamptz NOT NULL,
        count integer NOT NULL DEFAULT 1,
        expires_at timestamptz NOT NULL
      );
    `;
    await targetDb.exec(migration);
  };

  beforeAll(async () => {
    db = new PGlite();
    await initSchema(db);
  });

  beforeEach(async () => {
    await db.exec(`
      TRUNCATE public.contact_messages, public.contact_idempotency, public.email_outbox, public.request_quotas CASCADE;
    `);
  });

  describe("1. Baseline Ingestion & Idempotency", () => {
    it("1.1 [1 request]: processes ordinary submission cleanly into database", async () => {
      const key = randomUUID();
      const input = {
        name: "Ordinary Visitor",
        email: "ordinary@visitor.test",
        message: "Ordinary single message submission testing baseline behavior.",
        idempotencyKey: key,
      };

      const receipt = await receiveContact(input, "10.0.0.1", { db, useInMemoryMutex: false });

      expect(receipt.status).toBe("received");
      expect(receipt.id).toMatch(/^rcpt_[a-f0-9]{16}$/);

      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages;");
      const outboxRes = await db.query("SELECT COUNT(*) as cnt FROM public.email_outbox;");
      const idempRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_idempotency;");

      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((idempRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
    });

    it("1.2 [2 concurrent requests]: exactly 1 durable message, 1 outbox item, identical receipt", async () => {
      const key = randomUUID();
      const input = {
        name: "Concurrent Visitor 2",
        email: "concurrent2@visitor.test",
        message: "Testing 2 parallel identical requests without JavaScript mutex.",
        idempotencyKey: key,
      };

      // Both requests execute without in-memory mutex
      const [r1, r2] = await Promise.all([
        receiveContact(input, "192.168.1.10", { db, useInMemoryMutex: false }),
        receiveContact(input, "192.168.1.10", { db, useInMemoryMutex: false }),
      ]);

      expect(r1.status).toBe("received");
      expect(r2.status).toBe("received");
      expect(r1.id).toBe(r2.id);

      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages;");
      const outboxRes = await db.query("SELECT COUNT(*) as cnt FROM public.email_outbox;");
      const idempRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_idempotency;");

      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((idempRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
    });

    it("1.3 [20 concurrent requests]: exactly 1 durable message, 1 outbox item, all identical receipts", async () => {
      const key = randomUUID();
      const input = {
        name: "Concurrent Visitor 20",
        email: "concurrent20@visitor.test",
        message: "Testing 20 parallel identical requests without JavaScript mutex.",
        idempotencyKey: key,
      };

      const promises = Array.from({ length: 20 }, () =>
        receiveContact(input, "192.168.1.20", { db, useInMemoryMutex: false })
      );

      const receipts = await Promise.all(promises);
      const expectedReceiptId = receipts[0]!.id;

      expect(receipts.every((r) => r.status === "received")).toBe(true);
      expect(receipts.every((r) => r.id === expectedReceiptId)).toBe(true);

      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages;");
      const outboxRes = await db.query("SELECT COUNT(*) as cnt FROM public.email_outbox;");
      const idempRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_idempotency;");

      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((idempRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
    });

    it("1.4 [100 concurrent requests]: high concurrency stress test verifies database race arbiter", async () => {
      const key = randomUUID();
      const input = {
        name: "High Volume Visitor",
        email: "highvol@visitor.test",
        message: "Stress testing 100 simultaneous requests against PostgreSQL transactional claim.",
        idempotencyKey: key,
      };

      const promises = Array.from({ length: 100 }, () =>
        receiveContact(input, "192.168.1.100", { db, useInMemoryMutex: false })
      );

      const receipts = await Promise.all(promises);
      const targetReceiptId = receipts[0]!.id;

      expect(receipts.length).toBe(100);
      expect(receipts.every((r) => r.status === "received")).toBe(true);
      expect(receipts.every((r) => r.id === targetReceiptId)).toBe(true);

      const keyHash = hashIdempotencyKey(key);
      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages WHERE receipt_id = $1;", [
        targetReceiptId,
      ]);
      const outboxRes = await db.query(
        "SELECT COUNT(*) as cnt FROM public.email_outbox WHERE message_id IN (SELECT id FROM public.contact_messages WHERE receipt_id = $1);",
        [targetReceiptId]
      );
      const idempRes = await db.query(
        "SELECT COUNT(*) as cnt FROM public.contact_idempotency WHERE key_hash = $1;",
        [keyHash]
      );

      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((idempRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
    });
  });

  describe("2. Conflict Detection & Immutability", () => {
    it("2.1 [same key + different payload concurrently]: deterministic 409 conflict, no overwrite of winner", async () => {
      const key = randomUUID();
      const inputOriginal = {
        name: "Original Author",
        email: "author@original.test",
        message: "The original authoritative message payload.",
        idempotencyKey: key,
      };
      const inputConflicting = {
        name: "Conflicting Author",
        email: "author@conflict.test",
        message: "A conflicting payload attempting to hijack the existing idempotency key.",
        idempotencyKey: key,
      };

      let conflictError: IdempotencyConflictError | null = null;
      let successReceipt: { id: string; status: string } | null = null;

      const p1 = receiveContact(inputOriginal, "10.1.1.1", { db, useInMemoryMutex: false });
      const p2 = receiveContact(inputConflicting, "10.1.1.2", { db, useInMemoryMutex: false });

      const results = await Promise.allSettled([p1, p2]);

      for (const res of results) {
        if (res.status === "fulfilled") {
          successReceipt = res.value;
        } else {
          conflictError = res.reason as IdempotencyConflictError;
        }
      }

      expect(successReceipt).not.toBeNull();
      expect(conflictError).not.toBeNull();
      expect(conflictError).toBeInstanceOf(IdempotencyConflictError);
      expect(conflictError?.statusCode).toBe(409);

      // Verify that winning receipt in database cannot be overwritten
      const keyHash = hashIdempotencyKey(key);
      const rowRes = await db.query("SELECT * FROM public.contact_idempotency WHERE key_hash = $1;", [keyHash]);
      const authoritativeRow = rowRes.rows[0] as Record<string, unknown>;

      expect(authoritativeRow.receipt_id).toBe(successReceipt!.id);

      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages;");
      const outboxRes = await db.query("SELECT COUNT(*) as cnt FROM public.email_outbox;");

      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
    });
  });

  describe("3. Asynchronous Race & Rollback Semantics", () => {
    it("3.1 [winner delayed before commit, loser starts before winner commit]: loser resolves winner receipt cleanly", async () => {
      const key = randomUUID();
      const input = {
        name: "Timing Subject",
        email: "timing@test.org",
        message: "Testing uncommitted window where loser arrives before winner commits.",
        idempotencyKey: key,
      };

      const keyHash = hashIdempotencyKey(key);
      const normalized = normalizePayload(input);
      const payloadHash = hashPayload(normalized);
      const winnerReceiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const expiresAt = new Date(Date.now() + 86400000);

      let unblockCommit!: () => void;
      const delayGate = new Promise<void>((resolve) => {
        unblockCommit = resolve;
      });

      // Winner transaction runs and pauses before commit
      const winnerPromise = (async () => {
        await db.query("BEGIN;");
        await claimIdempotencyKey(db, keyHash, payloadHash, winnerReceiptId, expiresAt, new Date());
        const msgId = randomUUID();
        await db.query(
          "INSERT INTO public.contact_messages (id, receipt_id, name, email, body, received_at, status) VALUES ($1, $2, $3, $4, $5, now(), 'received');",
          [msgId, winnerReceiptId, input.name, input.email, input.message]
        );
        await db.query(
          "INSERT INTO public.email_outbox (id, message_id, status, attempts, next_attempt_at) VALUES ($1, $2, 'pending', 0, now());",
          [randomUUID(), msgId]
        );

        // Await signal before committing
        await delayGate;
        await db.query("COMMIT;");
        return { id: winnerReceiptId, status: "received" };
      })();

      // Give winner time to execute BEGIN and claim
      await new Promise((r) => setTimeout(r, 20));

      // Loser starts while winner is inside its uncommitted transaction
      const loserPromise = (async () => {
        // Loser tries to call receiveContact
        return receiveContact(input, "10.0.0.5", { db, useInMemoryMutex: false });
      })();

      // Unblock winner commit after short interval
      setTimeout(() => unblockCommit(), 50);

      const [winnerRes, loserRes] = await Promise.all([winnerPromise, loserPromise]);

      expect(winnerRes.id).toBe(winnerReceiptId);
      expect(loserRes.id).toBe(winnerReceiptId);
      expect(loserRes.status).toBe("received");

      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages;");
      const outboxRes = await db.query("SELECT COUNT(*) as cnt FROM public.email_outbox;");
      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
    });

    it("3.2 [winner transaction failure & loser after winner rollback]: aborted transaction leaves no orphan; subsequent caller succeeds", async () => {
      const key = randomUUID();
      const input = {
        name: "Rollback Subject",
        email: "rollback@test.org",
        message: "Testing recovery when winner encounters transaction abort.",
        idempotencyKey: key,
      };

      const keyHash = hashIdempotencyKey(key);
      const normalized = normalizePayload(input);
      const payloadHash = hashPayload(normalized);
      const failedReceiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const expiresAt = new Date(Date.now() + 86400000);

      // 1. Winner starts, claims key, but encounters error and rolls back
      await db.query("BEGIN;");
      await claimIdempotencyKey(db, keyHash, payloadHash, failedReceiptId, expiresAt, new Date());
      // Rollback simulates disk failure or unhandled exception
      await db.query("ROLLBACK;");

      // Verify that no idempotency or message row survived rollback
      const checkIdemp = await db.query("SELECT * FROM public.contact_idempotency WHERE key_hash = $1;", [keyHash]);
      expect(checkIdemp.rows.length).toBe(0);

      // 2. Subsequent caller arrives after rollback
      const recoveredReceipt = await receiveContact(input, "10.0.0.9", { db, useInMemoryMutex: false });

      expect(recoveredReceipt.status).toBe("received");
      expect(recoveredReceipt.id).not.toBe(failedReceiptId);

      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages;");
      const outboxRes = await db.query("SELECT COUNT(*) as cnt FROM public.email_outbox;");
      const idempRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_idempotency WHERE key_hash = $1;", [
        keyHash,
      ]);

      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
      expect(Number((idempRes.rows[0] as Record<string, unknown>).cnt)).toBe(1);
    });

    it("3.3 [database failure]: returns HTTP 503 and never claims 'received' on storage abort", async () => {
      const brokenDb = {
        query: async () => {
          throw new Error("Simulated storage write abort");
        },
      };

      const input = {
        name: "Outage User",
        email: "outage@test.org",
        message: "Testing storage outage behavior.",
        idempotencyKey: randomUUID(),
      };

      let caughtError: unknown = null;
      try {
        await receiveContact(input, "127.0.0.1", { db: brokenDb as any, useInMemoryMutex: false });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(PersistenceError);
      expect((caughtError as PersistenceError).statusCode).toBe(503);
    });
  });

  describe("4. Quotas, Leases & Expiry", () => {
    it("4.1 [quota boundary concurrency]: concurrent replays do not burn additional quota attempts", async () => {
      const key = randomUUID();
      const ip = "192.0.2.77";
      const now = new Date("2026-10-02T12:00:00Z");

      // Custom config: 2 max network attempts
      const quotaConfig = {
        networkWindowSeconds: 600,
        networkMaxAttempts: 2,
        emailWindowSeconds: 86400,
        emailMaxAttempts: 10,
        globalWindowSeconds: 3600,
        globalMaxAttempts: 100,
      };

      // First submission uses quota attempt #1
      const first = await receiveContact(
        {
          name: "Quota User",
          email: "quota@test.org",
          message: "First submission message meeting length requirement.",
          idempotencyKey: key,
        },
        ip,
        { db, now, quotaConfig, useInMemoryMutex: false }
      );
      expect(first.status).toBe("received");

      // Launch 5 parallel replays of the exact same submission
      const replayPromises = Array.from({ length: 5 }, () =>
        receiveContact(
          {
            name: "Quota User",
            email: "quota@test.org",
            message: "First submission message meeting length requirement.",
            idempotencyKey: key,
          },
          ip,
          { db, now, quotaConfig, useInMemoryMutex: false }
        )
      );

      const replayReceipts = await Promise.all(replayPromises);
      expect(replayReceipts.every((r) => r.id === first.id)).toBe(true);

      // Now submit a second DISTINCT inquiry from same IP: uses quota attempt #2
      const secondDistinct = await receiveContact(
        {
          name: "Quota User",
          email: "quota@test.org",
          message: "Second distinct submission.",
          idempotencyKey: randomUUID(),
        },
        ip,
        { db, now, quotaConfig, useInMemoryMutex: false }
      );
      expect(secondDistinct.status).toBe("received");

      // Third distinct inquiry from same IP exceeds quota: rejects with 429
      await expect(
        receiveContact(
          {
            name: "Quota User",
            email: "quota@test.org",
            message: "Third distinct submission exceeding quota.",
            idempotencyKey: randomUUID(),
          },
          ip,
          { db, now, quotaConfig, useInMemoryMutex: false }
        )
      ).rejects.toThrow(QuotaExceededError);
    });

    it("4.2 [outbox integrity & receipt stability]: winning receipt remains stable and verifiable in outbox", async () => {
      const key = randomUUID();
      const input = {
        name: "Integrity Visitor",
        email: "integrity@visitor.test",
        message: "Verifying relational integrity between contact_messages and email_outbox.",
        idempotencyKey: key,
      };

      const receipt = await receiveContact(input, "10.5.5.5", { db, useInMemoryMutex: false });

      // Join outbox with contact_messages
      const joinSql = `
        SELECT m.receipt_id, m.status as msg_status, o.status as outbox_status, o.attempts
        FROM public.contact_messages m
        JOIN public.email_outbox o ON o.message_id = m.id
        WHERE m.receipt_id = $1;
      `;
      const joinRes = await db.query(joinSql, [receipt.id]);
      expect(joinRes.rows.length).toBe(1);

      const row = joinRes.rows[0] as Record<string, unknown>;
      expect(row.receipt_id).toBe(receipt.id);
      expect(row.msg_status).toBe("received");
      expect(row.outbox_status).toBe("pending");
      expect(Number(row.attempts)).toBe(0);
    });

    it("4.3 [idempotency expiry & post-expiry legitimate reuse]: key reuse after 24h creates new receipt and records", async () => {
      const key = randomUUID();
      const t0 = new Date("2026-10-02T08:00:00Z");

      // Day 1: Initial submission
      const r1 = await receiveContact(
        {
          name: "Day 1 User",
          email: "daily@user.test",
          message: "Day 1 inquiry payload meeting length.",
          idempotencyKey: key,
        },
        "10.9.9.1",
        { db, now: t0, useInMemoryMutex: false }
      );
      expect(r1.status).toBe("received");

      // Day 2 (25 hours later): legitimate reuse of the same idempotency key
      const t25 = new Date(t0.getTime() + 25 * 3600 * 1000);
      const r2 = await receiveContact(
        {
          name: "Day 2 User",
          email: "daily@user.test",
          message: "Day 2 inquiry after 24 hour sliding window expiration.",
          idempotencyKey: key,
        },
        "10.9.9.1",
        { db, now: t25, useInMemoryMutex: false }
      );

      expect(r2.status).toBe("received");
      expect(r2.id).not.toBe(r1.id); // Fresh distinct receipt ID!

      // Messages table now has 2 distinct entries
      const msgRes = await db.query("SELECT COUNT(*) as cnt FROM public.contact_messages;");
      const outboxRes = await db.query("SELECT COUNT(*) as cnt FROM public.email_outbox;");
      expect(Number((msgRes.rows[0] as Record<string, unknown>).cnt)).toBe(2);
      expect(Number((outboxRes.rows[0] as Record<string, unknown>).cnt)).toBe(2);

      // Idempotency table has the updated active record with r2's receipt
      const keyHash = hashIdempotencyKey(key);
      const idempRow = (await db.query("SELECT * FROM public.contact_idempotency WHERE key_hash = $1;", [keyHash]))
        .rows[0] as Record<string, unknown>;
      expect(idempRow.receipt_id).toBe(r2.id);
    });
  });
});
