import { getPlatformDb,hasPlatformDatabase,isTestRuntime } from "../database";
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

// Cache TTL: 1 hour (3600s)
export const CACHE_TTL_MS = 60 * 60 * 1000;
// Stale indicator threshold: 24 hours (86400s)
export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface FetchGitHubOptions {
  githubToken?: string;
  customFetch?: typeof fetch;
  now?: Date;
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

  const now = options.now ?? new Date();
  let cached = snapshotCache.get(repo);
  if (!cached && !isTestRuntime() && hasPlatformDatabase()) {
    try {
      const db=await getPlatformDb();
      const row=(await db.query("SELECT payload,fetched_at FROM public.github_snapshots WHERE repository_id=$1",[repo])).rows[0];
      if (row) { cached={ repo,payload: row["payload"] as GitHubMetadata,fetchedAt: new Date(String(row["fetched_at"])),isStale: false }; snapshotCache.set(repo,cached); }
    } catch { /* Public metadata can still use accepted cache/upstream while storage is unavailable. */ }
  }

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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second bounded timeout

    const upstreamUrl = `https://api.github.com/repos/${repo}`;
    const response = await fetchFn(upstreamUrl, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
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
        fetchedAt: now.toISOString(),
        stale: false,
      };

      if (!isTestRuntime() && hasPlatformDatabase()) {
        try {
          const db=await getPlatformDb();
          await db.query(`INSERT INTO public.github_snapshots(repository_id,payload,fetched_at) VALUES($1,$2,$3)
            ON CONFLICT(repository_id) DO UPDATE SET payload=EXCLUDED.payload,fetched_at=EXCLUDED.fetched_at`,[repo,JSON.stringify(metadata),now.toISOString()]);
        } catch { /* Metadata stays available; persistence is not falsely reported. */ }
      }

      // Save into cache
      snapshotCache.set(repo, {
        repo,
        payload: metadata,
        fetchedAt: now,
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
  } catch (err: unknown) {
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

    const message = err instanceof Error ? err.message : "Network failure";
    return {
      success: false,
      error: `GitHub integration error: ${message}`,
      status: 504,
    };
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
}
