/**
 * YOR WORLD Milestone A3: Server Supabase Client Factories
 *
 * Enforces strict credential boundaries:
 * - Public/SSR Client uses anon key and cookie/header session passing.
 * - Service Role Client uses service_role key, is strictly server-only, and will throw if imported client-side.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

// Guard: Ensure server credentials can NEVER execute in a client/browser environment
if (typeof window !== "undefined") {
  throw new Error("Fatal security violation: Server auth client module imported in client context.");
}

export interface SupabaseEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string | undefined;
}

export function getSupabaseEnv(): SupabaseEnvConfig {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase authentication is not configured.");
  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
}

/**
 * Creates an SSR client bound to request cookies or bearer auth.
 * Uses ONLY the public anon key.
 */
export function createPublicServerClient(cookieStore?: { getAll: () => Array<{ name: string; value: string }> }): SupabaseClient {
  const env = getSupabaseEnv();
  if (cookieStore) {
    const cookies: CookieMethodsServer = { getAll: () => cookieStore.getAll(), setAll() {} };
    return createServerClient(env.supabaseUrl, env.supabaseAnonKey, { cookies });
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Creates a privileged service-role client strictly for server-side verification and background jobs.
 * This client bypasses RLS and MUST NEVER be exposed or passed outside server domain boundaries.
 */
export function createAdminServiceRoleClient(signal?: AbortSignal): SupabaseClient {
  const env = getSupabaseEnv();

  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin service client.");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    ...(signal ? { global: { fetch: (input, init) => fetch(input, {
      ...init, signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal,
    }) } } : {}),
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
