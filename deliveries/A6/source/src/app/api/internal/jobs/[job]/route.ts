import { NextRequest, NextResponse } from "next/server";
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
  const result = await executeJob(job);

  if (!result.success && result.error?.startsWith("Unknown job")) {
    return NextResponse.json(
      { error: result.error },
      { status: 404 }
    );
  }

  const status = result.success ? 200 : 500;
  return NextResponse.json(result, { status });
}
