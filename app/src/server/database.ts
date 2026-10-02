import { Pool, type PoolClient } from "pg";
import type { QueryableDb } from "./contact/quota";

if (typeof window !== "undefined") throw new Error("Server database module cannot run in a browser.");

export function isTestRuntime(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export function isE2EFixture(): boolean {
  return process.env.YOR_E2E_FIXTURE === "1" && Boolean(process.env.YOR_TEST_DATABASE_PATH);
}

let overrideDb: QueryableDb | null = null;
let pool: Pool | null = null;
// Next route bundles can instantiate this module separately in the same Node process.
// One explicit test database must have one initializer/connection owner across those bundles.
const fixtureState = globalThis as typeof globalThis & {
  __yorRc3FixtureDatabases?: Map<string, Promise<QueryableDb>>;
};

export function setPlatformDbForTests(db: QueryableDb | null): void {
  if (!isTestRuntime()) throw new Error("Database test injection is disabled outside tests.");
  overrideDb = db;
}

export function hasPlatformDatabase(): boolean {
  return Boolean(overrideDb || isE2EFixture() || process.env.DATABASE_URL);
}

function clientHandle(client: PoolClient): QueryableDb {
  return { query: async (sql, params = []) => ({ rows: (await client.query(sql, params)).rows }) };
}

/** Each transaction checks out ONE connection. Pool.query is never used for BEGIN/COMMIT. */
export async function getPlatformDb(): Promise<QueryableDb> {
  if (overrideDb) return overrideDb;
  if (isE2EFixture()) {
    const fixturePath = process.env.YOR_TEST_DATABASE_PATH!;
    const databases = fixtureState.__yorRc3FixtureDatabases ??= new Map();
    let fixtureDb = databases.get(fixturePath);
    if (!fixtureDb) {
      fixtureDb = import("./test-fixture").then(({ createFixtureDb }) => createFixtureDb());
      databases.set(fixturePath, fixtureDb);
    }
    return fixtureDb;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Durable database is not configured.");
  pool ??= new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
  const currentPool = pool;
  return {
    query: async (sql, params = []) => ({ rows: (await currentPool.query(sql, params)).rows }),
    transaction: async <T>(run: (tx: QueryableDb) => Promise<T>): Promise<T> => {
      const client = await currentPool.connect();
      try {
        await client.query("BEGIN");
        const result = await run(clientHandle(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch { /* Preserve original failure. */ }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
