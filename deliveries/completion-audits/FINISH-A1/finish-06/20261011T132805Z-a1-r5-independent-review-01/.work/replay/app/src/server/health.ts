import "server-only";
import { Socket } from "node:net";
import { Client } from "pg";
import { getSupabaseEnv } from "./auth/clients";

export const HEALTH_PROBE_TIMEOUT_MS = 2000;
const CLEANUP_TIMEOUT_MS = 200;
const MAX_AUTH_HEALTH_BYTES = 4096;

export type HealthProbe = "readiness" | "liveness";
export type DependencyHealth = "reachable" | "missing_configuration" | "invalid_configuration"
  | "fixture_rejected" | "unavailable" | "timed_out" | "not_checked";
export interface HealthSnapshot {
  probe: HealthProbe;
  liveness: "alive";
  readiness: "ready" | "not_ready" | "not_checked";
  checkedAt: string;
  checks: { database: DependencyHealth; authentication: DependencyHealth };
  scope: "Dependency reachability only; owner, MFA, RLS, mail and restore verification are separate.";
}

function snapshot(probe: HealthProbe, database: DependencyHealth, authentication: DependencyHealth): HealthSnapshot {
  return {
    probe, liveness: "alive", checkedAt: new Date().toISOString(),
    readiness: probe === "liveness" ? "not_checked" : database === "reachable" && authentication === "reachable" ? "ready" : "not_ready",
    checks: { database, authentication },
    scope: "Dependency reachability only; owner, MFA, RLS, mail and restore verification are separate.",
  };
}

/** Bounds both waiting and cancellation; never exposes provider error values. */
async function boundedProbe(work: () => Promise<boolean>, cancel: () => void): Promise<DependencyHealth> {
  let timedOut = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DependencyHealth>((resolve) => {
    deadline = setTimeout(() => {
      timedOut = true;
      try { cancel(); } catch { /* Cleanup failure cannot leak provider details. */ }
      resolve("timed_out");
    }, HEALTH_PROBE_TIMEOUT_MS);
  });
  try {
    const result = Promise.resolve().then(work).then<DependencyHealth, DependencyHealth>(
      (reachable) => reachable ? "reachable" : "unavailable",
      () => timedOut ? "timed_out" : "unavailable",
    );
    return await Promise.race([result, timeout]);
  } finally { clearTimeout(deadline); }
}

async function boundedCleanup(close: () => Promise<unknown>): Promise<void> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(close).catch(() => undefined),
      new Promise<void>((resolve) => { deadline = setTimeout(resolve, CLEANUP_TIMEOUT_MS); }),
    ]);
  } finally { clearTimeout(deadline); }
}

async function probeDatabase(connectionString: string): Promise<DependencyHealth> {
  let client: Client;
  let socket: Socket | undefined;
  try {
    client = new Client({ connectionString, connectionTimeoutMillis: HEALTH_PROBE_TIMEOUT_MS,
      query_timeout: HEALTH_PROBE_TIMEOUT_MS, statement_timeout: HEALTH_PROBE_TIMEOUT_MS,
      application_name: "yor-world-health", stream: () => socket = new Socket() });
  } catch { socket?.destroy(); return "invalid_configuration"; }
  client.on("error", () => { /* The active operation reports generic unavailable status. */ });
  let closing: Promise<void> | undefined;
  const close = () => closing ??= client.end();
  try {
    return await boundedProbe(async () => {
      await client.connect();
      const result = await client.query<{ health: number }>("SELECT 1::integer AS health");
      return result.rows.length === 1 && result.rows[0]?.health === 1;
    }, () => { void close().catch(() => undefined); socket?.destroy(); });
  } finally {
    await boundedCleanup(close);
    // The health probe owns this transport; a hung graceful close cannot retain it.
    socket?.destroy();
  }
}

async function probeAuthentication(url: URL, anonKey: string): Promise<DependencyHealth> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let cancellation: Promise<unknown> | undefined;
  const cancel = () => {
    controller.abort();
    if (reader) cancellation ??= reader.cancel().catch(() => undefined);
  };
  try {
    return await boundedProbe(async () => {
      const response = await fetch(new URL("/auth/v1/health", url), {
        method: "GET", headers: { apikey: anonKey }, redirect: "error", cache: "no-store", signal: controller.signal,
      });
      reader = response.body?.getReader();
      if (response.status !== 200 || !reader) return false;
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > MAX_AUTH_HEALTH_BYTES) return false;
        chunks.push(item.value);
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      return typeof body === "object" && body !== null && "name" in body && ["GoTrue", "Auth"].includes(String(body.name));
    }, cancel);
  } finally {
    cancel();
    await boundedCleanup(() => cancellation ?? Promise.resolve());
  }
}

function databaseConfiguration(): { value: string } | { status: DependencyHealth } {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) return { status: "missing_configuration" };
  try {
    const parsed = new URL(value);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || parsed.hash) throw new Error();
    return { value };
  } catch { return { status: "invalid_configuration" }; }
}

function authenticationConfiguration(): { url: URL; anonKey: string } | { status: DependencyHealth } {
  let config: ReturnType<typeof getSupabaseEnv>;
  try { config = getSupabaseEnv(); } catch { return { status: "missing_configuration" }; }
  if (!config.supabaseUrl.trim() || !config.supabaseAnonKey.trim() || !config.supabaseServiceRoleKey?.trim()) {
    return { status: "missing_configuration" };
  }
  try {
    const url = new URL(config.supabaseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
      return { status: "invalid_configuration" };
    }
    return { url, anonKey: config.supabaseAnonKey };
  } catch { return { status: "invalid_configuration" }; }
}

async function checkReadiness(): Promise<HealthSnapshot> {
  // Production readiness never invokes the embedded fixture or a test DB registry.
  if (process.env.YOR_E2E_FIXTURE === "1" || process.env.YOR_TEST_DATABASE_PATH) {
    return snapshot("readiness", "fixture_rejected", "fixture_rejected");
  }
  const database = databaseConfiguration();
  const authentication = authenticationConfiguration();
  const [databaseStatus, authenticationStatus] = await Promise.all([
    "status" in database ? database.status : probeDatabase(database.value),
    "status" in authentication ? authentication.status : probeAuthentication(authentication.url, authentication.anonKey),
  ]);
  return snapshot("readiness", databaseStatus, authenticationStatus);
}

let readinessInFlight: Promise<HealthSnapshot> | undefined;

/** Concurrent callers share one bounded evaluation; completed results are never cached. */
export function checkHealth(probe: HealthProbe): Promise<HealthSnapshot> {
  if (probe === "liveness") return Promise.resolve(snapshot(probe, "not_checked", "not_checked"));
  readinessInFlight ??= checkReadiness()
    .catch(() => snapshot("readiness", "unavailable", "unavailable"))
    .finally(() => { readinessInFlight = undefined; });
  return readinessInFlight;
}
