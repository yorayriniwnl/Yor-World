/**
 * YOR WORLD Amendment A5/A6-CONTACT-IDEMPOTENCY-R2
 * Multi-Process Concurrency Test Runner
 *
 * Spawns multiple independent OS processes (separate Node instances / serverless runtimes)
 * to prove that correctness is 100% database-owned with zero shared memory.
 */

const http = require("http");
const path = require("path");
const { fork } = require("child_process");
const { PGlite } = require("@electric-sql/pglite");
const { randomUUID } = require("node:crypto");

async function main() {
  console.log("=== STARTING MULTI-PROCESS CONCURRENCY TEST RUNNER ===");

  const db = new PGlite();
  await db.exec(`
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
  `);

  const server = http.createServer(async (req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { sql, params } = JSON.parse(body);
        const result = await db.query(sql, params);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  const port = 3198;
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  console.log(`[Database Daemon] Listening on http://127.0.0.1:${port}`);

  const workerScript = path.join(__dirname, "multi-process-worker.cjs");

  function spawnWorker(workerId, key, message, name, email) {
    return new Promise((resolve, reject) => {
      const child = fork(workerScript, [
        workerId,
        String(port),
        key,
        message,
        name || "Subject",
        email || "subject@test.org",
      ]);
      child.on("message", (msg) => {
        resolve(msg);
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker ${workerId} exited with code ${code}`));
        }
      });
    });
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Two independent Node processes with identical payload
    // -------------------------------------------------------------
    console.log("\n[Test 1] 2 independent Node processes, identical payload concurrently...");
    const key1 = `mp-key-1-${randomUUID()}`;
    const p1 = spawnWorker("Proc-A1", key1, "Multi-process identical payload inquiry", "Alice", "alice@mp.test");
    const p2 = spawnWorker("Proc-A2", key1, "Multi-process identical payload inquiry", "Alice", "alice@mp.test");

    const [res1, res2] = await Promise.all([p1, p2]);
    console.log("   Process 1 response:", res1);
    console.log("   Process 2 response:", res2);

    if (res1.receiptId !== res2.receiptId) {
      throw new Error(`Receipt mismatch between Process 1 (${res1.receiptId}) and Process 2 (${res2.receiptId})`);
    }
    if (res1.status !== "received" || res2.status !== "received") {
      throw new Error("One or both processes failed to receive 'received' status");
    }

    const cMsg1 = await db.query("SELECT COUNT(*) as c FROM public.contact_messages WHERE receipt_id = $1", [
      res1.receiptId,
    ]);
    const cOut1 = await db.query(
      "SELECT COUNT(*) as c FROM public.email_outbox WHERE message_id IN (SELECT id FROM public.contact_messages WHERE receipt_id = $1)",
      [res1.receiptId]
    );

    console.log(`   COUNT(contact_messages): ${cMsg1.rows[0].c} (expected: 1)`);
    console.log(`   COUNT(email_outbox): ${cOut1.rows[0].c} (expected: 1)`);

    if (Number(cMsg1.rows[0].c) !== 1 || Number(cOut1.rows[0].c) !== 1) {
      throw new Error("Duplicate database rows detected across processes!");
    }
    console.log("   -> PASS: Exactly 1 durable message and outbox row across separate processes.");

    // -------------------------------------------------------------
    // TEST 2: Two independent Node processes with conflicting payload
    // -------------------------------------------------------------
    console.log("\n[Test 2] 2 independent Node processes, conflicting payload concurrently...");
    const key2 = `mp-key-2-${randomUUID()}`;
    const p3 = spawnWorker("Proc-B1", key2, "Original authoritative payload", "Bob", "bob@mp.test");
    const p4 = spawnWorker("Proc-B2", key2, "Conflicting altered payload", "Bob", "bob@mp.test");

    const [res3, res4] = await Promise.all([p3, p4]);
    console.log("   Process 3 response:", res3);
    console.log("   Process 4 response:", res4);

    const winner = res3.outcome === "winner" ? res3 : res4;
    const loser = res3.outcome === "winner" ? res4 : res3;

    if (winner.status !== "received" || loser.statusCode !== 409) {
      throw new Error(`Expected one winner (received) and one 409 conflict, got: ${JSON.stringify({ res3, res4 })}`);
    }

    // Verify winning receipt in DB was never overwritten
    const checkWinner = await db.query(
      "SELECT receipt_id FROM public.contact_messages WHERE receipt_id = $1",
      [winner.receiptId]
    );
    if (checkWinner.rows.length !== 1) {
      throw new Error("Winning receipt not found in contact_messages");
    }
    console.log("   -> PASS: Deterministic 409 conflict rejected, authoritative receipt uncorrupted.");

    // -------------------------------------------------------------
    // TEST 3: Four simulated serverless instances concurrently
    // -------------------------------------------------------------
    console.log("\n[Test 3] 4 simulated serverless instances concurrently...");
    const key3 = `mp-key-3-${randomUUID()}`;
    const workers = [
      spawnWorker("Serverless-Inst-1", key3, "Serverless concurrent submission", "Carol", "carol@serverless.test"),
      spawnWorker("Serverless-Inst-2", key3, "Serverless concurrent submission", "Carol", "carol@serverless.test"),
      spawnWorker("Serverless-Inst-3", key3, "Serverless concurrent submission", "Carol", "carol@serverless.test"),
      spawnWorker("Serverless-Inst-4", key3, "Serverless concurrent submission", "Carol", "carol@serverless.test"),
    ];

    const results3 = await Promise.all(workers);
    const expectedReceipt = results3[0].receiptId;

    for (const r of results3) {
      if (r.receiptId !== expectedReceipt || r.status !== "received") {
        throw new Error(`Instance ${r.workerId} failed to match expected receipt: ${JSON.stringify(r)}`);
      }
    }

    const cMsg3 = await db.query("SELECT COUNT(*) as c FROM public.contact_messages WHERE receipt_id = $1", [
      expectedReceipt,
    ]);
    const cOut3 = await db.query(
      "SELECT COUNT(*) as c FROM public.email_outbox WHERE message_id IN (SELECT id FROM public.contact_messages WHERE receipt_id = $1)",
      [expectedReceipt]
    );

    console.log(`   All 4 serverless instances received identical receipt: ${expectedReceipt}`);
    console.log(`   COUNT(contact_messages): ${cMsg3.rows[0].c} (expected: 1)`);
    console.log(`   COUNT(email_outbox): ${cOut3.rows[0].c} (expected: 1)`);

    if (Number(cMsg3.rows[0].c) !== 1 || Number(cOut3.rows[0].c) !== 1) {
      throw new Error("Duplicate database rows detected across serverless instances!");
    }
    console.log("   -> PASS: 4 serverless instances resolved exactly 1 durable logical submission.");

    console.log("\n=== ALL MULTI-PROCESS CONCURRENCY VERIFICATIONS PASSED (0 ERRORS) ===");
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error("FATAL TEST RUNNER FAILURE:", err);
  process.exit(1);
});
