import { NextRequest, NextResponse } from "next/server";
import { checkHealth } from "@/server/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const probe = new URL(request.url).searchParams.get("probe") ?? "readiness";
  if (probe !== "readiness" && probe !== "liveness") {
    return NextResponse.json({ error: "invalid_probe" }, { status: 400, headers });
  }
  const result = await checkHealth(probe);
  return NextResponse.json(result, { status: result.readiness === "not_ready" ? 503 : 200, headers });
}

export async function HEAD(request: NextRequest) {
  const result = await GET(request);
  return new NextResponse(null, { status: result.status, headers: result.headers });
}
