/**
 * YOR WORLD Amendment A5/A6-CONTACT-IDEMPOTENCY-R2
 * Multi-Process Concurrency Worker
 *
 * Runs in an isolated OS process with its own V8 isolate and heap.
 * Executes contact submission against an independent database connection.
 */

const http = require("http");
const { randomUUID, createHash } = require("node:crypto");

const workerId = process.argv[2];
const dbPort = parseInt(process.argv[3], 10);
const idempotencyKey = process.argv[4];
const payloadMessage = process.argv[5];
const authorName = process.argv[6] || "Worker Subject";
const authorEmail = process.argv[7] || "worker@dist.test";

function hashPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function hashIdempotencyKey(key) {
  return createHash("sha256").update(`idemp:${key}`).digest("hex");
}

const remoteDb = {
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: dbPort,
          path: "/query",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              if (res.statusCode >= 400) {
                reject(new Error(parsed.error || "Remote database error"));
              } else {
                resolve(parsed);
              }
            } catch (err) {
              reject(err);
            }
          });
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify({ sql, params }));
      req.end();
    });
  },
};

async function execute() {
  const now = new Date();
  const normalized = {
    name: authorName.trim(),
    email: authorEmail.trim().toLowerCase(),
    message: payloadMessage.trim(),
    idempotencyKey,
  };
  const payloadHash = hashPayload(normalized);
  const keyHash = hashIdempotencyKey(idempotencyKey);
  const receiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const expiresAt = new Date(now.getTime() + 86400000);

  // 1. Database-level atomic claim
  const claimSql = `
    INSERT INTO public.contact_idempotency (key_hash, payload_hash, receipt_id, expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (key_hash) DO UPDATE
    SET payload_hash = EXCLUDED.payload_hash,
        receipt_id = EXCLUDED.receipt_id,
        expires_at = EXCLUDED.expires_at
    WHERE public.contact_idempotency.expires_at <= $5
    RETURNING key_hash, payload_hash, receipt_id;
  `;

  const claimRes = await remoteDb.query(claimSql, [
    keyHash,
    payloadHash,
    receiptId,
    expiresAt.toISOString(),
    now.toISOString(),
  ]);

  if (claimRes.rows && claimRes.rows.length > 0) {
    // Winner
    const messageId = randomUUID();
    const outboxId = randomUUID();
    await remoteDb.query(
      `INSERT INTO public.contact_messages (id, receipt_id, name, email, body, received_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'received');`,
      [messageId, receiptId, normalized.name, normalized.email, normalized.message, now.toISOString()]
    );
    await remoteDb.query(
      `INSERT INTO public.email_outbox (id, message_id, status, attempts, next_attempt_at, lease_until, provider_id)
       VALUES ($1, $2, 'pending', 0, $3, NULL, NULL);`,
      [outboxId, messageId, now.toISOString()]
    );

    return {
      workerId,
      receiptId,
      status: "received",
      outcome: "winner",
    };
  }

  // Loser: read committed record
  const checkSql = `SELECT receipt_id, payload_hash FROM public.contact_idempotency WHERE key_hash = $1 LIMIT 1;`;
  let existingRes = await remoteDb.query(checkSql, [keyHash]);
  let retries = 0;
  while ((!existingRes.rows || existingRes.rows.length === 0) && retries < 25) {
    await new Promise((r) => setTimeout(r, 20));
    existingRes = await remoteDb.query(checkSql, [keyHash]);
    retries++;
  }

  const row = existingRes.rows && existingRes.rows[0];
  if (!row) {
    throw new Error("Unable to resolve authoritative idempotency record.");
  }

  if (String(row.payload_hash) === payloadHash) {
    return {
      workerId,
      receiptId: String(row.receipt_id),
      status: "received",
      outcome: "loser_replayed_same",
    };
  }

  return {
    workerId,
    status: "conflict",
    statusCode: 409,
    outcome: "conflict_detected",
  };
}

(async () => {
  try {
    const res = await execute();
    process.send(res);
  } catch (err) {
    process.send({ workerId, error: err.message });
  }
})();
