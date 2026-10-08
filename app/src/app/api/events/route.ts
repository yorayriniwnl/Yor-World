import { NextRequest, NextResponse } from "next/server";
import { recordTelemetryEvent } from "@/server/telemetry/events";
import { BodyTooLargeError, readBoundedBody } from "@/server/http/read-body";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  let actualBytes = 0;
  try {
    const raw = await readBoundedBody(request, 4096);
    actualBytes = raw.bytes;
    body = JSON.parse(raw.text);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return NextResponse.json(
      { error: "Payload exceeds 4096 bytes ceiling" }, { status: 413 }
    );
    return NextResponse.json(
      { error: "Malformed JSON payload" },
      { status: 400 }
    );
  }

  const result = await recordTelemetryEvent(body, actualBytes);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Event rejected by allowlist policy" },
      { status: result.status }
    );
  }

  // Non-blocking 202 Accepted
  return NextResponse.json({ accepted: true }, { status: 202 });
}
