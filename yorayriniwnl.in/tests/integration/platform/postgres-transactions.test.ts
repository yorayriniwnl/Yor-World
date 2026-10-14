import { afterEach,describe,expect,it,vi } from "vitest";
import { getPlatformDb } from "@/server/database";

const calls=vi.hoisted(() => ({ statements: [] as string[],released: 0,poolQueries: 0 }));
vi.mock("pg",() => ({ Pool: class {
  async query() { calls.poolQueries++; return { rows: [] }; }
  async connect() { return { query: async (sql: string) => { calls.statements.push(sql); return { rows: [] }; },release: () => { calls.released++; } }; }
} }));
describe("Production PostgreSQL transactions retain one checked-out connection",() => {
  const original=process.env.DATABASE_URL;
  afterEach(() => { if (original === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL=original; calls.statements=[];calls.released=0;calls.poolQueries=0; });
  it("commits all writes on the transaction client and releases it",async () => {
    process.env.DATABASE_URL="postgresql://synthetic:synthetic@localhost/fixture";
    const db=await getPlatformDb();
    await db.transaction!(async (tx) => { await tx.query("CLAIM"); await tx.query("WRITE"); });
    expect(calls.statements).toEqual(["BEGIN","CLAIM","WRITE","COMMIT"]);
    expect(calls.poolQueries).toBe(0);
    expect(calls.released).toBe(1);
  });
  it("rolls back failure on the same client, then releases the connection",async () => {
    process.env.DATABASE_URL="postgresql://synthetic:synthetic@localhost/fixture";
    const db=await getPlatformDb();
    await expect(db.transaction!(async (tx) => { await tx.query("CLAIM"); throw new Error("Synthetic failure"); })).rejects.toThrow("Synthetic failure");
    expect(calls.statements).toEqual(["BEGIN","CLAIM","ROLLBACK"]);
    expect(calls.poolQueries).toBe(0);
    expect(calls.released).toBe(1);
  });
});
