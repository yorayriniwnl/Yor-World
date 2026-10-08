/**
 * YOR WORLD Milestone A5: Contact Submission API Route (/api/contact)
 *
 * Implements strict HTTP semantics:
 * - 202 Accepted: Valid durable receipt persisted to PostgreSQL outbox
 * - 400 Bad Request: Field validation failure or honeypot triggered
 * - 409 Conflict: Idempotency key already submitted with different payload
 * - 413 Payload Too Large: Request body exceeds 8 KiB limit
 * - 429 Too Many Requests: Atomic network or email quota exceeded (with Retry-After header)
 * - 503 Service Unavailable: Durable persistence failed (status != "received")
 */

import { NextRequest, NextResponse } from "next/server";
import { MAX_BODY_BYTES } from "@/server/contact/schema";
import {
  receiveContact,
  ContactValidationError,
  IdempotencyConflictError,
} from "@/server/contact/receive";
import { QuotaExceededError } from "@/server/contact/quota";
import { PersistenceError } from "@/server/contact/outbox";
import { getContactDb } from "@/server/contact/db";
import { contactNetworkKey } from "@/server/contact/client-network";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
  };

  // 1. Check Content-Length if present
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error: "Payload Too Large: Request body exceeds 8 KiB ceiling.",
        status: "rejected",
      },
      { status: 413, headers: noStoreHeaders }
    );
  }

  // 2. Read and verify raw body size
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body.", status: "rejected" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const byteLength = Buffer.byteLength(rawText, "utf8");
  if (byteLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error: "Payload Too Large: Request body exceeds 8 KiB ceiling.",
        status: "rejected",
      },
      { status: 413, headers: noStoreHeaders }
    );
  }

  // 3. Parse JSON
  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON format.", status: "rejected" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  // 4. Resolve a quota key only from a trusted deployment edge.
  const networkKey = contactNetworkKey(request.headers);

  // 5. Process contact inquiry
  try {
    const db = await getContactDb();
    const receipt = await receiveContact(body, networkKey, { db });

    return NextResponse.json(
      {
        id: receipt.id,
        status: receipt.status,
      },
      { status: 202, headers: noStoreHeaders }
    );
  } catch (error: unknown) {
    if (error instanceof ContactValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          errors: error.errors,
          status: "rejected",
        },
        { status: 400, headers: noStoreHeaders }
      );
    }

    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          status: "conflict",
        },
        { status: 409, headers: noStoreHeaders }
      );
    }

    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfter: error.retryAfter,
          status: "rate_limited",
        },
        {
          status: 429,
          headers: {
            ...noStoreHeaders,
            "Retry-After": String(error.retryAfter),
          },
        }
      );
    }

    if (error instanceof PersistenceError || (error instanceof Error && error.name === "PersistenceError")) {
      return NextResponse.json(
        {
          error: "Durable persistence failed. Contact message was not accepted.",
          status: "unavailable",
        },
        { status: 503, headers: noStoreHeaders }
      );
    }

    console.error("[API /api/contact] STORAGE_UNAVAILABLE");
    return NextResponse.json(
      {
        error: "Internal server error occurred while processing message.",
        status: "unavailable",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
