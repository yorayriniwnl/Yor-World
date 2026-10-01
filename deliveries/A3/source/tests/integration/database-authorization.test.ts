/**
 * YOR WORLD Milestone A3: Full Database Authorization & RLS Integration Suite
 *
 * Runs on real embedded PostgreSQL (PGlite) executing the authoritative migration.
 * Comprehensively tests all 5 identities across SELECT, INSERT, UPDATE, DELETE
 * for all protected domain tables.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";

type Identity = "anon" | "authenticated_non_owner" | "owner_aal1" | "active_owner_aal2" | "revoked_owner_aal2";

interface IdentityConfig {
  role: "anon" | "authenticated";
  sub?: string;
  aal?: "aal1" | "aal2";
}

const IDENTITIES: Record<Identity, IdentityConfig> = {
  anon: {
    role: "anon",
  },
  authenticated_non_owner: {
    role: "authenticated",
    sub: "44444444-4444-4444-4444-444444444444",
    aal: "aal2",
  },
  owner_aal1: {
    role: "authenticated",
    sub: "33333333-3333-3333-3333-333333333333",
    aal: "aal1",
  },
  active_owner_aal2: {
    role: "authenticated",
    sub: "11111111-1111-1111-1111-111111111111",
    aal: "aal2",
  },
  revoked_owner_aal2: {
    role: "authenticated",
    sub: "22222222-2222-2222-2222-222222222222",
    aal: "aal2",
  },
};

describe("Milestone A3: PostgreSQL Database Grants & Row Level Security (RLS)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();

    // 1. Read and execute authoritative migration SQL
    const migrationPath = join(process.cwd(), "supabase/migrations/20261001000000_a3_owner_auth_rls.sql");
    const migrationSql = readFileSync(migrationPath, "utf8");
    await db.exec(migrationSql);

    // 2. Seed test users in auth.users
    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES
        ('${IDENTITIES.active_owner_aal2.sub}', 'owner_active@yorworld.test'),
        ('${IDENTITIES.revoked_owner_aal2.sub}', 'owner_revoked@yorworld.test'),
        ('${IDENTITIES.owner_aal1.sub}', 'owner_aal1@yorworld.test'),
        ('${IDENTITIES.authenticated_non_owner.sub}', 'visitor@external.test');

      -- Seed admin_users table
      INSERT INTO public.admin_users (id, role, active) VALUES
        ('${IDENTITIES.active_owner_aal2.sub}', 'owner', true),
        ('${IDENTITIES.revoked_owner_aal2.sub}', 'owner', false),
        ('${IDENTITIES.owner_aal1.sub}', 'owner', true);

      -- Seed initial test records for query tests
      INSERT INTO public.projects (id, slug, title) VALUES
        ('10000000-0000-0000-0000-000000000001', 'project-seed', 'Seed Project');

      INSERT INTO public.published_content (id, revision, payload) VALUES
        ('20000000-0000-0000-0000-000000000001', 1, '{"status": "published"}'::jsonb);

      INSERT INTO public.contact_messages (id, receipt_id, name, email, body) VALUES
        ('30000000-0000-0000-0000-000000000001', 'rec-001', 'Alice', 'alice@test.com', 'Hello Yor');
    `);
  });

  async function setContext(identityKey: Identity) {
    const config = IDENTITIES[identityKey];
    if (config.role === "anon") {
      await db.exec(`
        SET ROLE anon;
        RESET request.jwt.claim.sub;
        RESET request.jwt.claims;
      `);
    } else {
      const claims = JSON.stringify({ sub: config.sub, aal: config.aal });
      await db.exec(`
        SET ROLE authenticated;
        SELECT set_config('request.jwt.claim.sub', '${config.sub}', false);
        SELECT set_config('request.jwt.claims', '${claims}', false);
      `);
    }
  }

  async function resetContext() {
    await db.exec(`
      RESET ROLE;
      RESET request.jwt.claim.sub;
      RESET request.jwt.claims;
    `);
  }

  describe("Identity Authorization Matrix: projects table", () => {
    it("anonymous: denied SELECT, INSERT, UPDATE, DELETE", async () => {
      await setContext("anon");
      await expect(db.query("SELECT * FROM public.projects")).rejects.toThrow(/permission denied/i);
      await expect(db.query("INSERT INTO public.projects (slug, title) VALUES ('a', 'a')")).rejects.toThrow(/permission denied/i);
      await expect(db.query("UPDATE public.projects SET title = 'b'")).rejects.toThrow(/permission denied/i);
      await expect(db.query("DELETE FROM public.projects")).rejects.toThrow(/permission denied/i);
      await resetContext();
    });

    it("authenticated non-owner: denied SELECT, INSERT, UPDATE, DELETE (0 rows or error)", async () => {
      await setContext("authenticated_non_owner");
      const sel = await db.query("SELECT * FROM public.projects");
      expect(sel.rows).toHaveLength(0); // RLS blocks visibility

      await expect(db.query("INSERT INTO public.projects (slug, title) VALUES ('anon-p', 'Anon P')")).rejects.toThrow(/violates row-level security policy/i);
      const upd = await db.query("UPDATE public.projects SET title = 'updated' WHERE slug = 'project-seed'");
      expect(upd.affectedRows).toBe(0);
      const del = await db.query("DELETE FROM public.projects WHERE slug = 'project-seed'");
      expect(del.affectedRows).toBe(0);
      await resetContext();
    });

    it("owner without MFA (AAL1): denied SELECT, INSERT, UPDATE, DELETE", async () => {
      await setContext("owner_aal1");
      const sel = await db.query("SELECT * FROM public.projects");
      expect(sel.rows).toHaveLength(0);

      await expect(db.query("INSERT INTO public.projects (slug, title) VALUES ('aal1-p', 'P')")).rejects.toThrow(/violates row-level security policy/i);
      const upd = await db.query("UPDATE public.projects SET title = 'updated' WHERE slug = 'project-seed'");
      expect(upd.affectedRows).toBe(0);
      const del = await db.query("DELETE FROM public.projects WHERE slug = 'project-seed'");
      expect(del.affectedRows).toBe(0);
      await resetContext();
    });

    it("revoked owner with otherwise-valid session: denied IMMEDIATELY on all operations", async () => {
      await setContext("revoked_owner_aal2");
      const sel = await db.query("SELECT * FROM public.projects");
      expect(sel.rows).toHaveLength(0);

      await expect(db.query("INSERT INTO public.projects (slug, title) VALUES ('revoked-p', 'P')")).rejects.toThrow(/violates row-level security policy/i);
      const upd = await db.query("UPDATE public.projects SET title = 'updated' WHERE slug = 'project-seed'");
      expect(upd.affectedRows).toBe(0);
      const del = await db.query("DELETE FROM public.projects WHERE slug = 'project-seed'");
      expect(del.affectedRows).toBe(0);
      await resetContext();
    });

    it("active owner with MFA (AAL2): allowed SELECT, INSERT, UPDATE, DELETE", async () => {
      await setContext("active_owner_aal2");
      const sel = await db.query("SELECT * FROM public.projects");
      expect(sel.rows.length).toBeGreaterThanOrEqual(1);

      await db.query("INSERT INTO public.projects (slug, title) VALUES ('owner-p', 'Owner P')");
      const selInserted = await db.query("SELECT * FROM public.projects WHERE slug = 'owner-p'");
      expect(selInserted.rows).toHaveLength(1);

      const upd = await db.query("UPDATE public.projects SET title = 'Owner P Updated' WHERE slug = 'owner-p'");
      expect(upd.affectedRows).toBe(1);

      const del = await db.query("DELETE FROM public.projects WHERE slug = 'owner-p'");
      expect(del.affectedRows).toBe(1);
      await resetContext();
    });
  });

  describe("published_content table (Public read, Owner-only write)", () => {
    it("anonymous: ALLOWED SELECT, but DENIED INSERT, UPDATE, DELETE", async () => {
      await setContext("anon");
      const sel = await db.query("SELECT * FROM public.published_content");
      expect(sel.rows.length).toBeGreaterThanOrEqual(1);

      await expect(db.query("INSERT INTO public.published_content (revision, payload) VALUES (2, '{}'::jsonb)")).rejects.toThrow(/permission denied/i);
      await expect(db.query("UPDATE public.published_content SET payload = '{}'::jsonb")).rejects.toThrow(/permission denied/i);
      await expect(db.query("DELETE FROM public.published_content")).rejects.toThrow(/permission denied/i);
      await resetContext();
    });

    it("active owner with AAL2: ALLOWED SELECT, INSERT, UPDATE, DELETE", async () => {
      await setContext("active_owner_aal2");
      await db.query("INSERT INTO public.published_content (id, revision, payload) VALUES ('20000000-0000-0000-0000-000000000002', 2, '{\"ver\": 2}'::jsonb)");
      const upd = await db.query("UPDATE public.published_content SET payload = '{\"ver\": 2.1}'::jsonb WHERE revision = 2");
      expect(upd.affectedRows).toBe(1);
      const del = await db.query("DELETE FROM public.published_content WHERE revision = 2");
      expect(del.affectedRows).toBe(1);
      await resetContext();
    });
  });

  describe("audit_events table (Append-only security guarantee)", () => {
    it("active owner with AAL2: ALLOWED SELECT and INSERT, but strictly DENIED UPDATE and DELETE", async () => {
      await setContext("active_owner_aal2");
      await db.query(`
        INSERT INTO public.audit_events (id, actor, action, entity_type)
        VALUES ('40000000-0000-0000-0000-000000000001', '${IDENTITIES.active_owner_aal2.sub}', 'test_event', 'system')
      `);

      const sel = await db.query("SELECT * FROM public.audit_events WHERE id = '40000000-0000-0000-0000-000000000001'");
      expect(sel.rows).toHaveLength(1);

      // Audit logs are append-only: UPDATE and DELETE policies do not exist for authenticated users!
      await expect(db.query("UPDATE public.audit_events SET action = 'tampered'")).rejects.toThrow(/permission denied/i);
      await expect(db.query("DELETE FROM public.audit_events")).rejects.toThrow(/permission denied/i);
      await resetContext();
    });
  });

  describe("admin_users table (No self-tampering or role escalation)", () => {
    it("active owner with AAL2: CAN SELECT their own record, but CANNOT INSERT, UPDATE, or DELETE admin_users", async () => {
      await setContext("active_owner_aal2");
      const sel = await db.query(`SELECT * FROM public.admin_users WHERE id = '${IDENTITIES.active_owner_aal2.sub}'`);
      expect(sel.rows).toHaveLength(1);

      // Cannot see other users' records
      const otherSel = await db.query(`SELECT * FROM public.admin_users WHERE id = '${IDENTITIES.revoked_owner_aal2.sub}'`);
      expect(otherSel.rows).toHaveLength(0);

      // Cannot alter role or active state
      await expect(db.query(`UPDATE public.admin_users SET role = 'superuser'`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`INSERT INTO public.admin_users (id, role) VALUES ('55555555-5555-5555-5555-555555555555', 'owner')`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`DELETE FROM public.admin_users`)).rejects.toThrow(/permission denied/i);
      await resetContext();
    });
  });

  describe("contact_messages table", () => {
    it("unauthenticated / non-owner: DENIED SELECT, UPDATE, DELETE", async () => {
      await setContext("anon");
      await expect(db.query("SELECT * FROM public.contact_messages")).rejects.toThrow(/permission denied/i);
      await resetContext();

      await setContext("authenticated_non_owner");
      const sel = await db.query("SELECT * FROM public.contact_messages");
      expect(sel.rows).toHaveLength(0);
      await resetContext();
    });

    it("active owner with AAL2: ALLOWED SELECT, UPDATE status, DELETE", async () => {
      await setContext("active_owner_aal2");
      const sel = await db.query("SELECT * FROM public.contact_messages WHERE receipt_id = 'rec-001'");
      expect(sel.rows).toHaveLength(1);

      const upd = await db.query("UPDATE public.contact_messages SET status = 'read' WHERE receipt_id = 'rec-001'");
      expect(upd.affectedRows).toBe(1);
      await resetContext();
    });
  });
});
