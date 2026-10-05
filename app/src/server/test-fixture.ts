/** Explicit, synthetic E2E adapter. Never selected by an unavailable production database. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { approvedPublication } from "@/content/approved-publication";
import { isE2EFixture } from "./database";
import type { QueryableDb } from "./contact/quota";

export async function createFixtureDb(): Promise<QueryableDb> {
  if (!isE2EFixture()) throw new Error("E2E fixture adapter is disabled.");
  const databasePath = process.env.YOR_TEST_DATABASE_PATH!;
  const db = new PGlite(databasePath);
  for (const name of ["20261001000000_a3_owner_auth_rls.sql", "20261001000001_a4_publication_media.sql"]) {
    await db.exec(await readFile(path.join(process.cwd(), "supabase", "migrations", name), "utf8"));
  }
  // The fixture may reopen the same database; numbered migrations run once.
  const refreshTable = await db.query<{ name: string | null }>("SELECT to_regclass('public.github_refresh_state') AS name");
  if (!refreshTable.rows[0]?.["name"]) {
    await db.exec(await readFile(path.join(process.cwd(),"supabase","migrations","20261005000000_github_refresh_state.sql"),"utf8"));
  }
  await db.exec(await readFile(path.join(process.cwd(),"supabase","operations","harden-publication-grants.sql"),"utf8"));
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2) ON CONFLICT(id) DO NOTHING", ["11111111-1111-1111-1111-111111111111", "owner@yorworld.test"]);
  await db.query("INSERT INTO public.admin_users(id,role,active) VALUES($1,'owner',true) ON CONFLICT(id) DO NOTHING", ["11111111-1111-1111-1111-111111111111"]);
  const found = await db.query("SELECT revision FROM public.published_content LIMIT 1");
  if (!found.rows.length) {
    await db.query("INSERT INTO public.published_content(revision,payload) VALUES($1,$2)", [approvedPublication.revision, JSON.stringify(approvedPublication)]);
    await db.query("INSERT INTO public.publication_history(revision,snapshot,actor) VALUES($1,$2,$3)", [approvedPublication.revision, JSON.stringify(approvedPublication), "11111111-1111-1111-1111-111111111111"]);
  }
  return db;
}
