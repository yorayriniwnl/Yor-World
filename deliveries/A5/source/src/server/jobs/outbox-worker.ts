/**
 * YOR WORLD Milestone A5: Outbox Leases, Worker & Bounded Retries
 *
 * Implements lease-based outbox processing:
 * - Leased claiming prevents concurrent workers from duplicate delivery.
 * - Exponential backoff: ~1 min, ~5 min, ~30 min, ~120 min.
 * - Permanent failure marking after 4 failed attempts for owner triage.
 * - Database receipts remain valid even during total email outages.
 */

import type { QueryableDb } from "../contact/quota";
import {
  type EmailAdapter,
  MockEmailAdapter,
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

export const RETRY_DELAYS_SECONDS = [60, 300, 1800, 7200]; // 1m, 5m, 30m, 120m

/**
 * Calculates next attempt date based on attempt number (1-indexed).
 */
export function calculateNextRetry(now: Date, attempts: number): Date {
  const index = Math.min(attempts - 1, RETRY_DELAYS_SECONDS.length - 1);
  const delaySec = RETRY_DELAYS_SECONDS[Math.max(0, index)] ?? 60;
  return new Date(now.getTime() + delaySec * 1000);
}

/**
 * Atomically claims and processes pending email outbox records.
 */
export async function processOutbox(
  now: Date,
  limit: number,
  options: OutboxProcessOptions
): Promise<OutboxProcessResult> {
  const { db, emailAdapter = new MockEmailAdapter() } = options;
  const leaseSec = options.leaseDurationSeconds ?? 300; // 5 minute default lease
  const leaseUntil = new Date(now.getTime() + leaseSec * 1000);

  let sent = 0;
  let retried = 0;
  let failed = 0;

  // 1. Claim pending jobs atomically with leases
  const claimSql = `
    UPDATE public.email_outbox
    SET lease_until = $1, status = 'processing'
    WHERE id IN (
      SELECT id
      FROM public.email_outbox
      WHERE (status = 'pending' OR status = 'retrying')
        AND next_attempt_at <= $2
        AND (lease_until IS NULL OR lease_until < $2)
        AND attempts < 5
      ORDER BY next_attempt_at ASC
      LIMIT $3
    )
    RETURNING id, message_id, attempts;
  `;
  const claimResult = await db.query(claimSql, [leaseUntil.toISOString(), now.toISOString(), limit]);
  const claimedRows = (claimResult.rows || []) as unknown as Array<{ id: string; message_id: string; attempts: number }>;

  // 2. Process each claimed item individually
  for (const row of claimedRows) {
    try {
      // Fetch associated contact message
      const msgResult = await db.query(
        "SELECT id, receipt_id, name, email, body, received_at FROM public.contact_messages WHERE id = $1 LIMIT 1;",
        [row.message_id]
      );

      const msg = msgResult.rows[0] as
        | { id: string; receipt_id: string; name: string; email: string; body: string; received_at: string }
        | undefined;

      if (!msg) {
        // Orphaned outbox row: mark failed
        await db.query(
          "UPDATE public.email_outbox SET status = 'failed', lease_until = NULL WHERE id = $1;",
          [row.id]
        );
        failed++;
        continue;
      }

      const notification = formatContactNotification(
        String(msg.name),
        String(msg.email),
        String(msg.body),
        String(msg.receipt_id),
        new Date(String(msg.received_at))
      );

      const idempotencyKey = `outbox_${row.id}_attempt_${row.attempts + 1}`;
      const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL || "owner@yor.world";

      const sendResult = await emailAdapter.send(
        {
          to: ownerEmail,
          replyTo: String(msg.email),
          subject: notification.subject,
          text: notification.text,
          html: notification.html,
        },
        idempotencyKey
      );

      if (sendResult.success) {
        await db.query(
          "UPDATE public.email_outbox SET status = 'sent', provider_id = $1, lease_until = NULL WHERE id = $2;",
          [sendResult.providerId, row.id]
        );
        sent++;
      } else {
        const nextAttempts = row.attempts + 1;
        if (sendResult.retryable && nextAttempts < 5) {
          const nextAttemptDate = calculateNextRetry(now, nextAttempts);
          await db.query(
            "UPDATE public.email_outbox SET status = 'retrying', attempts = $1, next_attempt_at = $2, lease_until = NULL WHERE id = $3;",
            [nextAttempts, nextAttemptDate.toISOString(), row.id]
          );
          retried++;
        } else {
          // Non-retryable failure or maximum retries exceeded
          await db.query(
            "UPDATE public.email_outbox SET status = 'failed', attempts = $1, lease_until = NULL WHERE id = $2;",
            [nextAttempts, row.id]
          );
          failed++;
        }
      }
    } catch {
      // In case of an unexpected worker exception, increment attempt and clear lease
      const nextAttempts = row.attempts + 1;
      const nextAttemptDate = calculateNextRetry(now, nextAttempts);
      await db.query(
        "UPDATE public.email_outbox SET status = 'retrying', attempts = $1, next_attempt_at = $2, lease_until = NULL WHERE id = $3;",
        [nextAttempts, nextAttemptDate.toISOString(), row.id]
      );
      retried++;
    }
  }

  return { sent, retried, failed };
}
