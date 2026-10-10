import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyOwner } from "./require-owner";

export async function requirePageOwner() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "localhost";
  const request = new Request(`http://${host}/admin`, { headers: requestHeaders });
  const result = await verifyOwner(request);
  if (!result.ok) redirect("/admin/login");
  return result.context;
}
