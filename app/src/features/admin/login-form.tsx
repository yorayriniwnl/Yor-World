"use client";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import styles from "@/app/admin/admin.module.css";

export function OwnerLoginForm() {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const input=new FormData(event.currentTarget);
    setBusy(true); setError(null);
    try {
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Owner sign-in is temporarily unavailable.");
      const client=createBrowserClient(url,key);
      const signed=await client.auth.signInWithPassword({ email: String(input.get("email")),password: String(input.get("password")) });
      if (signed.error) throw new Error("Unable to authenticate with those credentials.");
      const factors=await client.auth.mfa.listFactors();
      const factor=factors.data?.totp.find((item) => item.status === "verified");
      if (!factor) { await client.auth.signOut(); throw new Error("An enrolled authenticator is required for owner access."); }
      const verified=await client.auth.mfa.challengeAndVerify({ factorId: factor.id,code: String(input.get("totp")) });
      if (verified.error) { await client.auth.signOut(); throw new Error("The authenticator code could not be verified."); }
      const owner=await fetch("/api/admin/verify",{ cache: "no-store" });
      if (!owner.ok) { await client.auth.signOut(); throw new Error("Active owner authorization is required."); }
      router.replace("/admin"); router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed. Please try again.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className={styles.form}>
    {error && <p role="alert">{error}</p>}
    <div className={styles.field}><label htmlFor="owner-email" className={styles.label}>Owner Email</label><input id="owner-email" name="email" type="email" required autoComplete="username" className={styles.input} disabled={busy}/></div>
    <div className={styles.field}><label htmlFor="owner-password" className={styles.label}>Password</label><input id="owner-password" name="password" type="password" required autoComplete="current-password" className={styles.input} disabled={busy}/></div>
    <div className={styles.field}><label htmlFor="owner-totp" className={styles.label}>TOTP Security Code (AAL2 MFA)</label><input id="owner-totp" name="totp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required className={styles.input} disabled={busy}/><p className={styles.subtitle}>6-digit code from your enrolled authenticator.</p></div>
    <button className={styles.button} disabled={busy}>{busy ? "Verifying owner..." : "Authenticate with MFA (AAL2)"}</button>
    <noscript><p>Owner sign-in requires JavaScript. The public portfolio and direct email remain available.</p></noscript>
  </form>;
}
