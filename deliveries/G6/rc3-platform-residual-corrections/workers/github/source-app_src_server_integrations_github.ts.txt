import { getPlatformDb,hasPlatformDatabase } from "../database";
import type { QueryableDb } from "../contact/quota";
/**
 * YOR WORLD Milestone A6: GitHub Metadata Integration
 * 
 * Strict specifications per engineering-and-content.md §12:
 * - Server-fetched for an explicit repository allowlist only.
 * - Refreshed at most hourly, indicated stale after 24 hours.
 * - Preserves the last good response on a rate limit or upstream outage.
 * - Never exposes access tokens or internal auth headers.
 * - Never treats commit counts as an expertise score.
 */

export const ALLOWLISTED_REPOSITORIES = [
  "yorayriniwnl/Yor-World",
  "yorayriniwnl/helios",
  "yorayriniwnl/zenith",
  "yorayriniwnl/ai-vs-real",
  "yorayriniwnl/talks",
] as const;

export type AllowlistedRepo = (typeof ALLOWLISTED_REPOSITORIES)[number];

export function isAllowlistedRepository(repo: string): repo is AllowlistedRepo {
  return (ALLOWLISTED_REPOSITORIES as readonly string[]).includes(repo);
}

export interface GitHubMetadata {
  repo: AllowlistedRepo;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  language: string | null;
  updatedAt: string;
  pushedAt: string;
  fetchedAt: string;
  stale: boolean;
  rateLimited?: boolean;
}

export interface GitHubSnapshotRecord {
  repo: AllowlistedRepo;
  payload: GitHubMetadata;
  fetchedAt: Date;
  isStale: boolean;
}

// In-memory snapshot cache for fast retrieval and fallback resilience
const snapshotCache = new Map<string, GitHubSnapshotRecord>();
type MetadataResult = { success: boolean; data?: GitHubMetadata; error?: string; status: number };
// Optional process-local single flight; configured databases own attempt cadence.
// The attempts Map is authoritative only in explicitly unconfigured/offline mode.
const refreshes = new Map<string, Promise<MetadataResult>>();
const attempts = new Map<string, { at: number; result?: MetadataResult }>();

// Cache TTL: 1 hour (3600s)
export const CACHE_TTL_MS = 60 * 60 * 1000;
// Stale indicator threshold: 24 hours (86400s)
export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface FetchGitHubOptions {
  githubToken?: string;
  customFetch?: typeof fetch;
  now?: Date;
}

type RefreshStatus = "pending" | "ok" | "rate_limited" | "upstream_error" | "network_error" | "timeout" | "invalid_response";
type DurableRefresh = { db: QueryableDb; token: string; testNow: string | null };
const unavailable = (): MetadataResult => ({ success: false, status: 503, error: "GitHub refresh temporarily unavailable" });
const databaseDate = (value: unknown): Date => value instanceof Date ? new Date(value.getTime()) : new Date(String(value));

// Test clock injection must not depend on a mock of database.isTestRuntime().
// Production attempts and completion timestamps use the database statement clock.
function testClock(options: FetchGitHubOptions): string | null {
  return (process.env.VITEST === "true" || process.env.NODE_ENV === "test") && options.now
    ? options.now.toISOString() : null;
}

function fallback(cached: GitHubSnapshotRecord | undefined, now: Date, status?: RefreshStatus): MetadataResult {
  if (!cached) return unavailable();
  return { success: true, status: 200, data: {
    ...cached.payload, stale: now.getTime() - cached.fetchedAt.getTime() > STALE_THRESHOLD_MS,
    ...(status === "rate_limited" ? { rateLimited: true } : {}),
  } };
}

async function readDurableSnapshot(db: QueryableDb, repo: AllowlistedRepo, clock: string | null) {
  const row = (await db.query(`SELECT s.payload,s.fetched_at,r.last_status,
    COALESCE($2::timestamptz,statement_timestamp()) AS checked_at
    FROM (SELECT 1) AS singleton
    LEFT JOIN public.github_snapshots s ON s.repository_id=$1
    LEFT JOIN public.github_refresh_state r ON r.repository_id=$1`, [repo,clock])).rows[0]!;
  const now = databaseDate(row["checked_at"]);
  let cached = snapshotCache.get(repo);
  if (row["payload"]) {
    cached = { repo, payload: row["payload"] as GitHubMetadata, fetchedAt: databaseDate(row["fetched_at"]), isStale: false };
    snapshotCache.set(repo,cached);
  }
  return { cached,now,status: row["last_status"] as RefreshStatus | undefined };
}

async function durableFallback(durable: DurableRefresh, repo: AllowlistedRepo, now: Date): Promise<MetadataResult> {
  try {
    const latest = await readDurableSnapshot(durable.db,repo,durable.testNow);
    return fallback(latest.cached,latest.now,latest.status);
  } catch { return fallback(snapshotCache.get(repo),now); }
}

async function finishAttempt(durable: DurableRefresh, repo: AllowlistedRepo, status: RefreshStatus): Promise<boolean> {
  try {
    const result = await durable.db.query(`UPDATE public.github_refresh_state
      SET last_status=$3,updated_at=COALESCE($4::timestamptz,statement_timestamp())
      WHERE repository_id=$1 AND last_attempt_at=$2::timestamptz RETURNING repository_id`,
    [repo,durable.token,status,durable.testNow]);
    return result.rows.length === 1;
  } catch { return true; /* The claimed hour remains reserved even if completion storage fails. */ }
}

/**
 * Fetches GitHub repository metadata with caching, allowlist validation, and outage resilience.
 */
export async function getRepositoryMetadata(
  repo: string,
  options: FetchGitHubOptions = {}
): Promise<{ success: boolean; data?: GitHubMetadata; error?: string; status: number }> {
  // 1. Validate allowlist
  if (!isAllowlistedRepository(repo)) {
    return {
      success: false,
      error: `Repository '${repo}' is not permitted by allowlist policy`,
      status: 403,
    };
  }

  const now = testClock(options) ? options.now! : new Date();
  const pending = refreshes.get(repo);
  if (pending) return pending;
  if (hasPlatformDatabase()) {
    const work = refreshWithDurableClaim(repo,options);
    refreshes.set(repo,work);
    try { return await work; }
    finally { if (refreshes.get(repo) === work) refreshes.delete(repo); }
  }
  const priorAttempt = attempts.get(repo);
  if (priorAttempt && now.getTime() - priorAttempt.at < CACHE_TTL_MS) {
    const cached = snapshotCache.get(repo);
    if (cached) return {
      success: true, status: 200,
      data: { ...cached.payload, stale: now.getTime() - cached.fetchedAt.getTime() > STALE_THRESHOLD_MS,
        ...(priorAttempt.result?.data?.rateLimited === undefined ? {} : { rateLimited: priorAttempt.result.data.rateLimited }) },
    };
    return priorAttempt.result ?? { success: false, status: 503, error: "GitHub refresh temporarily unavailable" };
  }
  // Reserve before any asynchronous database read so overlapping cold starts join.
  const attempt: { at: number; result?: MetadataResult } = { at: now.getTime() };
  attempts.set(repo, attempt);
  const work = refreshRepositoryMetadata(repo, options, snapshotCache.get(repo), now).then((result) => {
    attempt.result = result;
    return result;
  });
  refreshes.set(repo, work);
  try { return await work; }
  finally { if (refreshes.get(repo) === work) refreshes.delete(repo); }
}

async function refreshWithDurableClaim(repo: AllowlistedRepo, options: FetchGitHubOptions): Promise<MetadataResult> {
  const clock = testClock(options);
  let now = clock ? options.now! : new Date();
  let cached = snapshotCache.get(repo);
  try {
    const db = await getPlatformDb();
    const snapshot = await readDurableSnapshot(db,repo,clock);
    cached = snapshot.cached; now = snapshot.now;
    if (cached && now.getTime() - cached.fetchedAt.getTime() < CACHE_TTL_MS) return fallback(cached,now);
    const claim = (await db.query(`INSERT INTO public.github_refresh_state(repository_id,last_attempt_at,last_status,updated_at)
      VALUES($1,COALESCE($2::timestamptz,statement_timestamp()),'pending',COALESCE($2::timestamptz,statement_timestamp()))
      ON CONFLICT(repository_id) DO UPDATE
      SET last_attempt_at=EXCLUDED.last_attempt_at,last_status='pending',updated_at=EXCLUDED.updated_at
      WHERE github_refresh_state.last_attempt_at <= EXCLUDED.last_attempt_at - INTERVAL '1 hour'
      RETURNING last_attempt_at::text AS claim_token`, [repo,clock])).rows[0];
    if (!claim) {
      const latest = await readDurableSnapshot(db,repo,clock);
      return fallback(latest.cached,latest.now,latest.status);
    }
    // Keep PostgreSQL's full timestamp precision: JS Dates lose microseconds.
    const durable = { db,token: String(claim["claim_token"]),testNow: clock };
    return await refreshRepositoryMetadata(repo,options,cached,now,durable);
  } catch {
    // A configured database outage never switches to process-only permission.
    return fallback(cached,now);
  }
}

async function refreshRepositoryMetadata(repo: AllowlistedRepo, options: FetchGitHubOptions,
  cached: GitHubSnapshotRecord | undefined, now: Date, durable?: DurableRefresh): Promise<MetadataResult> {

  // 2. Return fresh cached copy if within 1 hour
  if (cached && now.getTime() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    const isStale = now.getTime() - cached.fetchedAt.getTime() > STALE_THRESHOLD_MS;
    return {
      success: true,
      data: {
        ...cached.payload,
        stale: isStale,
      },
      status: 200,
    };
  }

  // 3. Attempt upstream fetch with timeout and redaction
  const fetchFn = options.customFetch ?? fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Yor-World-Portfolio/1.0",
  };

  const githubToken=options.githubToken ?? process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try { // 4-second bounded timeout

    const upstreamUrl = `https://api.github.com/repos/${repo}`;
    const response = await fetchFn(upstreamUrl, {
      headers,
      signal: controller.signal,
    });


    if (response.ok) {
      let json;
      try { json = await response.json(); }
      catch {
        const status = controller.signal.aborted ? "timeout" : "invalid_response";
        if (durable && !await finishAttempt(durable,repo,status)) return durableFallback(durable,repo,now);
        return cached ? fallback(cached,now) : { success: false, status: 504, error: "GitHub integration temporarily unavailable" };
      }
      const fetchedAt = testClock(options) ? options.now! : new Date();
      const metadata: GitHubMetadata = {
        repo,
        name: json.name || repo.split("/")[1],
        description: json.description || null,
        stars: Number(json.stargazers_count) || 0,
        forks: Number(json.forks_count) || 0,
        openIssues: Number(json.open_issues_count) || 0,
        license: json.license?.spdx_id || json.license?.name || null,
        language: json.language || null,
        updatedAt: json.updated_at || now.toISOString(),
        pushedAt: json.pushed_at || now.toISOString(),
        fetchedAt: fetchedAt.toISOString(),
        stale: false,
      };

      let persistedAt = fetchedAt;
      if (durable) {
        try {
          // One statement locks/fences the attempt before writing its snapshot.
          const saved = (await durable.db.query(`WITH completed AS (
            UPDATE public.github_refresh_state SET last_status='ok',updated_at=COALESCE($4::timestamptz,statement_timestamp())
            WHERE repository_id=$1 AND last_attempt_at=$2::timestamptz RETURNING updated_at
          ) INSERT INTO public.github_snapshots(repository_id,payload,fetched_at)
            SELECT $1,jsonb_set($3::jsonb,'{fetchedAt}',to_jsonb(to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))),updated_at FROM completed
            ON CONFLICT(repository_id) DO UPDATE SET payload=EXCLUDED.payload,fetched_at=EXCLUDED.fetched_at
            RETURNING payload,fetched_at`,[repo,durable.token,JSON.stringify(metadata),durable.testNow])).rows[0];
          if (!saved) return durableFallback(durable,repo,now);
          metadata.fetchedAt = (saved["payload"] as GitHubMetadata).fetchedAt;
          persistedAt = databaseDate(saved["fetched_at"]);
        } catch { /* Return fetched metadata; never claim that persistence succeeded. */ }
      }

      // Save into cache
      snapshotCache.set(repo, {
        repo,
        payload: metadata,
        fetchedAt: persistedAt,
        isStale: false,
      });

      return {
        success: true,
        data: metadata,
        status: 200,
      };
    }

    // Upstream error or rate limit (403 / 429 / 5xx)
    const isRateLimited = response.status === 403 || response.status === 429;
    if (durable && !await finishAttempt(durable,repo,isRateLimited ? "rate_limited" : "upstream_error"))
      return durableFallback(durable,repo,now);

    // Fall back to cached snapshot if available
    if (cached) {
      const isStale = now.getTime() - cached.fetchedAt.getTime() > STALE_THRESHOLD_MS;
      return {
        success: true,
        data: {
          ...cached.payload,
          stale: isStale,
          rateLimited: isRateLimited,
        },
        status: 200, // Return 200 with last good response
      };
    }

    return {
      success: false,
      error: `Upstream GitHub API returned status ${response.status}`,
      status: response.status >= 500 ? 502 : response.status,
    };
  } catch {
    if (durable && !await finishAttempt(durable,repo,controller.signal.aborted ? "timeout" : "network_error"))
      return durableFallback(durable,repo,now);
    // Upstream network failure / timeout: check for fallback
    if (cached) {
      const isStale = now.getTime() - cached.fetchedAt.getTime() > STALE_THRESHOLD_MS;
      return {
        success: true,
        data: {
          ...cached.payload,
          stale: isStale,
        },
        status: 200,
      };
    }

    return {
      success: false,
      error: "GitHub integration temporarily unavailable",
      status: 504,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Populates cache manually for tests or offline operation.
 */
export function setCachedSnapshot(repo: AllowlistedRepo, snapshot: GitHubSnapshotRecord): void {
  snapshotCache.set(repo, snapshot);
}

/**
 * Clears the snapshot cache (for testing).
 */
export function clearSnapshotCache(): void {
  snapshotCache.clear();
  refreshes.clear();
  attempts.clear();
}
