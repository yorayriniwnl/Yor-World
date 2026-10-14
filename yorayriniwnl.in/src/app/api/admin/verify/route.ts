import { verifyOwner, createAuthErrorResponse } from "@/server/auth/require-owner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await verifyOwner(request);

  if (!result.ok) {
    return createAuthErrorResponse(result);
  }

  return Response.json(
    {
      authenticated: true,
      owner: {
        userId: result.context.userId,
        email: result.context.email,
        assurance: result.context.assurance,
        role: result.context.role,
        active: result.context.active,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Vary: "Authorization, Cookie",
      },
    }
  );
}
