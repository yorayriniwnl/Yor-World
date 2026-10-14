import { NextRequest, NextResponse } from "next/server";
import { getRepositoryMetadata, isAllowlistedRepository } from "@/server/integrations/github";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json(
      { error: "Query parameter 'repo' is required (e.g. 'yorayriniwnl/Yor-World')" },
      { status: 400 }
    );
  }

  if (!isAllowlistedRepository(repo)) {
    return NextResponse.json(
      { error: `Repository '${repo}' is not permitted by allowlist policy` },
      { status: 403 }
    );
  }

  const result = await getRepositoryMetadata(repo);

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error || "Failed to retrieve repository metadata" },
      { status: result.status }
    );
  }

  // Never expose tokens or headers; return clean metadata
  return NextResponse.json(result.data, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
