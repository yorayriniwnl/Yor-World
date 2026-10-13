"use client";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function SignOutButton() {
  const router=useRouter();
  async function signOut() {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) await createBrowserClient(url,key).auth.signOut();
    document.cookie="yor-admin-token=; Path=/; Max-Age=0; SameSite=Lax";
    router.replace("/admin/login"); router.refresh();
  }
  return <button type="button" onClick={signOut}>Sign Out</button>;
}
