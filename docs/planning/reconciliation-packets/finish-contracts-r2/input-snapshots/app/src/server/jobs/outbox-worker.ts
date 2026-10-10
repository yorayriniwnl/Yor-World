/** Lease-fenced outbox delivery with the accepted bounded retry schedule. */
import type { QueryableDb } from "../contact/quota";
import {
  type EmailAdapter,
  createConfiguredEmailAdapter,
  formatContactNotification,
} from "../contact/email-adapter";

export interface OutboxProcessOptions {
  db: QueryableDb;
  emailAdapter?: EmailAdapter;
  leaseDurationSeconds?: number;
}

export interface OutboxProcessResult {
  sent: number;
  retried: number;
  failed: number;
}

export const RETRY_DELAYS_SECONDS = [60, 300, 1800, 7200];

export function calculateNextRetry(now: Date, attempts: number): Date {
  const index = Math.min(attempts - 1, RETRY_DELAYS_SECONDS.length - 1);
  const delaySec = RETRY_DELAYS_SECONDS[Math.max(0, index)] ?? 60;
  return new Date(now.getTime() + delaySec * 1000);
}

/** Each claim/completion must run in its own committed database statement. */
export async function processOutbox(
  now: Date,
  limit: number,
  options: OutboxProcessOptions
): Promise<OutboxProcessResult> {
  const { db, emailAdapter = createConfiguredEmailAdapter() } = options;
  const leaseSec = options.leaseDurationSeconds ?? 300;
  const leaseUntil = new Date(now.getTime() + leaseSec * 1000);
  // Advance the supplied scheduling clock while provider/database awaits consume time.
  const startedAt = Date.now();
  const currentTime = () => new Date(now.getTime() + Math.max(0, Date.now() - startedAt));
  const result: OutboxProcessResult = { sent: 0, retried: 0, failed: 0 };

  const claimResult = await db.query(`WITH due AS (
    SELECT id FROM public.email_outbox
    WHERE ((status IN ('pending','retrying') AND next_attempt_at <= $2)
      OR (status='processing' AND lease_until <= $2))
      AND (lease_until IS NULL OR lease_until <= $2) AND attempts < 5
    ORDER BY next_attempt_at ASC LIMIT $3 FOR UPDATE SKIP LOCKED
  ) UPDATE public.email_outbox AS queue SET lease_until=$1,status='processing'
    FROM due WHERE queue.id=due.id
    RETURNING queue.id,queue.message_id,queue.attempts,queue.xmin::text AS claim_version`,
  [leaseUntil.toISOString(), now.toISOString(), Math.min(100, Math.max(1, limit))]);
  const claimedRows = claimResult.rows as Array<{
    id: string; message_id: string; attempts: number; claim_version: string;
  }>;

  for (const row of claimedRows) {
    // xmin changes on reclaim, even if two claims happen to have the same expiry.
    // Time validity is also required: expiry alone forfeits ownership without reclaim.
    const fence = "id = $1 AND xmin::text = $2 AND status = 'processing' AND lease_until > $3";
    const fenceParams = () => [row.id, row.claim_version, currentTime().toISOString()];
    const ownsClaim = async () => (await db.query(
      `SELECT id FROM public.email_outbox WHERE ${fence}`, fenceParams()
    )).rows.length === 1;
    const completeFailure = async (retryable: boolean) => {
      const attempts = row.attempts + 1;
      const retry = retryable && attempts < 5;
      const updated = await db.query(
        `UPDATE public.email_outbox SET status = $4, attempts = $5,
          next_attempt_at = $6, lease_until = NULL WHERE ${fence} RETURNING id`,
        [...fenceParams(), retry ? "retrying" : "failed", attempts,
          calculateNextRetry(now, attempts).toISOString()]
      );
      if (updated.rows.length === 1) result[retry ? "retried" : "failed"]++;
    };

    try {
      // Queued batch entries may expire while an earlier provider call is pending.
      if (!await ownsClaim()) continue;
      const msgResult = await db.query(
        "SELECT id, receipt_id, name, email, body, received_at FROM public.contact_messages WHERE id = $1 LIMIT 1;",
        [row.message_id]
      );
      const msg = msgResult.rows[0];
      if (!msg) {
        await completeFailure(false);
        continue;
      }
      const notification = formatContactNotification(
        String(msg.name), String(msg.email), String(msg.body), String(msg.receipt_id),
        new Date(String(msg.received_at))
      );
      // Message lookup can itself outlive the lease; check immediately before send.
      if (!await ownsClaim()) continue;
      const sendResult = await emailAdapter.send({
        to: process.env.OWNER_NOTIFICATION_EMAIL || "",
        replyTo: String(msg.email), subject: notification.subject,
        text: notification.text, html: notification.html,
      }, `outbox_${row.id}`);
      if (sendResult.success) {
        const updated = await db.query(
          `UPDATE public.email_outbox SET status = 'sent', provider_id = $4,
            lease_until = NULL WHERE ${fence} RETURNING id`,
          [...fenceParams(), sendResult.providerId]
        );
        if (updated.rows.length === 1) result.sent++;
      } else {
        await completeFailure(sendResult.retryable);
      }
    } catch {
      // Read/adapter/completion errors share the same ceiling, and remain fenced.
      // If the DB remains unavailable, propagate rather than inventing an outcome.
      await completeFailure(true);
    }
  }
  return result;
}
