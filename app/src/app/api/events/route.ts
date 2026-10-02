import { NextRequest, NextResponse } from "next/server";
import { recordTelemetryEvent } from "@/server/telemetry/events";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (contentLength > 4096) {
    return NextResponse.json(
      { error: "Payload exceeds 4096 bytes ceiling" },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    const rawText = await request.text();
    if (rawText.length > 4096) {
      return NextResponse.json(
        { error: "Payload exceeds 4096 bytes ceiling" },
        { status: 413 }
      );
    }
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON payload" },
      { status: 400 }
    );
  }

  const result = await recordTelemetryEvent(body, contentLength);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Event rejected by allowlist policy" },
      { status: result.status }
    );
  }

  // Non-blocking 202 Accepted
  return NextResponse.json({ accepted: true }, { status: 202 });
}
