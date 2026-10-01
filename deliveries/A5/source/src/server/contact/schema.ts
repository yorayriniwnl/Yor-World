/**
 * YOR WORLD Milestone A5: Contact Contracts, Schema & Normalization
 *
 * Implements strict input validation, normalization, and hashing
 * as specified in docs/planning/engineering-and-content.md § 11.
 */

import { z } from "zod";
import { createHash } from "node:crypto";

export const MAX_BODY_BYTES = 8192; // 8 KiB max payload size
export const IDEMPOTENCY_EXPIRY_HOURS = 24;

export const ContactInputSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must not exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(254, "Email must not exceed 254 characters"),
  message: z
    .string()
    .trim()
    .min(20, "Message must be at least 20 characters long")
    .max(4000, "Message must not exceed 4000 characters"),
  idempotencyKey: z
    .string()
    .trim()
    .min(10, "Idempotency key must be at least 10 characters")
    .max(128, "Idempotency key must not exceed 128 characters"),
  website: z.string().optional(), // Honeypot field; must be empty/omitted
});

export type ContactInput = z.infer<typeof ContactInputSchema>;

export const ReceiptSchema = z.strictObject({
  id: z.string().min(1),
  status: z.literal("received"),
  receivedAt: z.string().datetime().optional(),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export interface NormalizedPayload {
  name: string;
  email: string;
  message: string;
}

/**
 * Normalizes user input for deterministic hashing and storage:
 * - Trims whitespace
 * - Converts email to lowercase
 */
export function normalizePayload(input: Pick<ContactInput, "name" | "email" | "message">): NormalizedPayload {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    message: input.message.trim(),
  };
}

/**
 * Computes deterministic SHA-256 hash of the normalized payload fields.
 */
export function hashPayload(normalized: NormalizedPayload): string {
  const serialized = JSON.stringify({
    name: normalized.name,
    email: normalized.email,
    message: normalized.message,
  });
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

/**
 * Computes SHA-256 hash of an idempotency key with an optional server secret.
 */
export function hashIdempotencyKey(key: string, secret = "yor-world-contact-salt"): string {
  return createHash("sha256").update(`${key}:${secret}`, "utf8").digest("hex");
}

/**
 * Computes SHA-256 hash of a quota identifier (IP or email) with an optional server secret.
 * Protects visitor privacy by avoiding raw IP storage.
 */
export function hashQuotaKey(identifier: string, secret = "yor-world-quota-salt"): string {
  return createHash("sha256").update(`${identifier.trim().toLowerCase()}:${secret}`, "utf8").digest("hex");
}

/**
 * Safely HTML-escapes strings to prevent injection into notifications or emails.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
