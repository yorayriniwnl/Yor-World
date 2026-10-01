/**
 * YOR WORLD Milestone A5: Email Adapter
 *
 * Implements isolated email notification transport behind a narrow adapter.
 * Uses provider-level idempotency keys and escaped HTML output.
 */

import { escapeHtml } from "./schema";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export type EmailSendResult =
  | { success: true; providerId: string }
  | { success: false; retryable: boolean; error: string; statusCode?: number };

export interface EmailAdapter {
  send(message: EmailMessage, idempotencyKey: string): Promise<EmailSendResult>;
}

/**
 * Formats notification email for the portfolio owner with strict HTML escaping.
 */
export function formatContactNotification(
  name: string,
  email: string,
  message: string,
  receiptId: string,
  receivedAt: Date
): { subject: string; text: string; html: string } {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const safeReceipt = escapeHtml(receiptId);
  const dateStr = receivedAt.toISOString();

  const subject = `[Yor World] New contact message from ${name} (${receiptId})`;

  const text = [
    `New contact message received on YOR WORLD.`,
    `Receipt ID: ${receiptId}`,
    `Received At: ${dateStr}`,
    `From: ${name} <${email}>`,
    ``,
    `Message:`,
    `${message}`,
    ``,
    `---`,
    `This receipt was durably stored in PostgreSQL outbox before delivery.`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111;">
  <h2 style="color: #6366f1;">New Contact Inquiry — YOR WORLD</h2>
  <p><strong>Receipt ID:</strong> <code>${safeReceipt}</code></p>
  <p><strong>Date (UTC):</strong> ${escapeHtml(dateStr)}</p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
  <p><strong>Sender:</strong> ${safeName} &lt;<a href="mailto:${safeEmail}">${safeEmail}</a>&gt;</p>
  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0;">
    <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #6b7280;">Message</h3>
    <p style="white-space: pre-wrap; margin-bottom: 0;">${safeMessage}</p>
  </div>
  <p style="font-size: 12px; color: #6b7280;">
    Durable status: Message persisted to PostgreSQL outbox. This email is dispatched asynchronously by the outbox worker.
  </p>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

/**
 * Mock Email Adapter for unit & integration testing with failure injection.
 */
export class MockEmailAdapter implements EmailAdapter {
  public sentMessages: Array<{ message: EmailMessage; idempotencyKey: string }> = [];
  public failureConfig: { retryable: boolean; error: string; statusCode?: number } | undefined = undefined;

  public setFailure(config?: { retryable: boolean; error: string; statusCode?: number }): void {
    this.failureConfig = config;
  }

  async send(message: EmailMessage, idempotencyKey: string): Promise<EmailSendResult> {
    if (this.failureConfig) {
      const res: EmailSendResult = this.failureConfig.statusCode !== undefined
        ? {
            success: false,
            retryable: this.failureConfig.retryable,
            error: this.failureConfig.error,
            statusCode: this.failureConfig.statusCode,
          }
        : {
            success: false,
            retryable: this.failureConfig.retryable,
            error: this.failureConfig.error,
          };
      return res;
    }

    this.sentMessages.push({ message, idempotencyKey });
    return {
      success: true,
      providerId: `mock-email-${this.sentMessages.length}-${Date.now()}`,
    };
  }
}
