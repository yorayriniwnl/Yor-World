import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  return Response.json(
    {
      auditEvents: [
        {
          id: "evt-init",
          action: "system_initialized",
          entityType: "system",
          createdAt: new Date().toISOString(),
          actor: result.context.userId,
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Vary: "Authorization, Cookie",
      },
    }
  );
}

export async function POST(request: Request) {
  const result = await verifyOwner(request);
  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  try {
    const body = await request.json();
    return Response.json(
      {
        id: `evt-${Date.now()}`,
        action: body.action || "generic_action",
        entityType: body.entityType || "general",
        actor: result.context.userId,
        recordedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
