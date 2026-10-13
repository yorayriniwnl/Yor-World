import { verifyOwner,createAuthErrorResponse } from "@/server/auth/require-owner";
import { getPlatformDb } from "@/server/database";
import { isDraftTestRegistryEnabled } from "@/server/content/revisions";
export const dynamic="force-dynamic";
const headers={ "Cache-Control": "no-store, private",Vary: "Authorization, Cookie" };
export async function GET(request: Request) {
  const result=await verifyOwner(request);
  if (!result.ok) return createAuthErrorResponse(result);
  try {
    const auditEvents=isDraftTestRegistryEnabled() ? [] : (await (await getPlatformDb()).query("SELECT id,actor,action,entity_type,entity_id,payload,created_at FROM public.audit_events ORDER BY created_at DESC LIMIT 100")).rows;
    return Response.json({ auditEvents },{ headers });
  } catch { return Response.json({ error: "Audit storage is unavailable." },{ status: 503,headers }); }
}
export async function POST(request: Request) {
  const result=await verifyOwner(request);
  if (!result.ok) return createAuthErrorResponse(result);
  let body: Record<string,unknown>;
  try { body=await request.json(); } catch { return Response.json({ error: "Invalid JSON body" },{ status: 400,headers }); }
  if (typeof body.action !== "string" || !/^[a-zA-Z0-9_:-]{1,64}$/.test(body.action) || typeof body.entityType !== "string" || !/^[a-zA-Z0-9_:-]{1,64}$/.test(body.entityType)) return Response.json({ error: "Bounded action and entityType are required." },{ status: 422,headers });
  try {
    const record=isDraftTestRegistryEnabled() ? { id: "test-audit",action: body.action,actor: result.context.userId } :
      (await (await getPlatformDb()).query("INSERT INTO public.audit_events(actor,action,entity_type) VALUES($1,$2,$3) RETURNING id,actor,action,created_at",[result.context.userId,body.action,body.entityType])).rows[0];
    return Response.json(record,{ status: 201,headers });
  } catch { return Response.json({ error: "Audit storage is unavailable." },{ status: 503,headers }); }
}
