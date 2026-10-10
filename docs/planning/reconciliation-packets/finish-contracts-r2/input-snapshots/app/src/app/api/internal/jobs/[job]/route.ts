import { NextRequest, NextResponse } from "next/server";
import { getContactDb } from "@/server/contact/db";
import { executeJob, verifyJobAuth } from "@/server/jobs/runner";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ job: string }> }
) {
  const authHeader = request.headers.get("authorization");
  const keyHeader = request.headers.get("x-internal-job-key");

  if (!verifyJobAuth(authHeader, keyHeader)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing internal job secret" },
      { status: 401 }
    );
  }

  const { job } = await params;
  let result;
  try {
    const db = job === "process-outbox" || job === "cleanup-stale" ? await getContactDb() : undefined;
    result = await executeJob(job,db ? { db } : {});
  } catch {
    return NextResponse.json({ error: "Durable database is unavailable." },{ status: 503,headers: { "Cache-Control": "no-store" } });
  }

  if (!result.success && result.error?.startsWith("Unknown job")) {
    return NextResponse.json(
      { error: result.error },
      { status: 404 }
    );
  }

  const status = result.success ? 200 : 500;
  return NextResponse.json(result, { status });
}
