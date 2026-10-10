-- YOR WORLD Milestone A3 Migration
-- Authoritative Owner Administration, Least-Privilege Grants & Row Level Security (RLS)

-- 1. Setup Auth Schema, Roles, and Context Functions if not present (PostgreSQL / Supabase compatibility)
CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- Simulated / fallback auth functions for test environments if running outside live Supabase
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

-- 2. Authoritative Owner Administration Table (Section 8 & 9)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Security Definer Helper Functions (Section 9)
CREATE OR REPLACE FUNCTION public.is_active_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'owner'
      AND admin_users.active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_owner_with_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'owner'
      AND admin_users.active = true
  ) AND COALESCE((auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

-- 4. Protected Domain Tables (Section 8)

-- 4.1 Audit Events (append-only)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.2 Projects & Project Revisions
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  draft_revision integer NOT NULL DEFAULT 1,
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.project_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  revision integer NOT NULL,
  payload jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision)
);

-- 4.3 Evidence Records
CREATE TABLE IF NOT EXISTS public.evidence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  kind text NOT NULL,
  source_url text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  notes text
);

-- 4.4 Media Assets
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key text UNIQUE NOT NULL,
  hash text NOT NULL,
  mime text NOT NULL,
  bytes bigint NOT NULL,
  dimensions jsonb,
  provenance jsonb,
  approval_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.5 Site Revisions
CREATE TABLE IF NOT EXISTS public.site_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision integer UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.6 Publication History
CREATE TABLE IF NOT EXISTS public.publication_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  actor uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.7 Published Content (Public Read)
CREATE TABLE IF NOT EXISTS public.published_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision integer NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);

-- 4.8 Contact Messages (Private)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  body text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'received'
);

-- 4.9 Auxiliary Outbox, Quota & Job Tables (Private / Service Role)
CREATE TABLE IF NOT EXISTS public.contact_idempotency (
  key_hash text PRIMARY KEY,
  payload_hash text NOT NULL,
  receipt_id text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.contact_messages(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  provider_id text
);

CREATE TABLE IF NOT EXISTS public.request_quotas (
  key_hash text PRIMARY KEY,
  bucket_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.github_snapshots (
  repository_id text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS public.aggregate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  event text NOT NULL,
  project_id text,
  tier text,
  count integer NOT NULL DEFAULT 1,
  UNIQUE (date, event, project_id, tier)
);

-- 5. Enable Row Level Security (RLS) on ALL Tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregate_events ENABLE ROW LEVEL SECURITY;

-- 6. Least-Privilege Grants Model (Section 8)
-- Revoke default public schema permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Public table: published_content
GRANT SELECT ON public.published_content TO anon, authenticated;
GRANT ALL ON public.published_content TO service_role;

-- Authenticated table grants (controlled strictly by RLS)
GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_content TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT SELECT, INSERT ON public.audit_events TO authenticated;

-- Service role grants (internal jobs, provisioning, contact webhook)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 7. Define Precise RLS Policies

-- 7.1 published_content: public SELECT, owner with AAL2 write
CREATE POLICY "published_content_public_read"
  ON public.published_content FOR SELECT
  TO public
  USING (true);

CREATE POLICY "published_content_owner_insert"
  ON public.published_content FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "published_content_owner_update"
  ON public.published_content FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "published_content_owner_delete"
  ON public.published_content FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.2 admin_users: active owner with AAL2 can read their own row; NO authenticated write
CREATE POLICY "admin_users_owner_select"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2() AND id = auth.uid());

-- 7.3 projects
CREATE POLICY "projects_owner_select"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "projects_owner_insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "projects_owner_update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "projects_owner_delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.4 project_revisions
CREATE POLICY "project_revisions_owner_select"
  ON public.project_revisions FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "project_revisions_owner_insert"
  ON public.project_revisions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2() AND created_by = auth.uid());

CREATE POLICY "project_revisions_owner_update"
  ON public.project_revisions FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "project_revisions_owner_delete"
  ON public.project_revisions FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.5 evidence_records
CREATE POLICY "evidence_records_owner_select"
  ON public.evidence_records FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "evidence_records_owner_insert"
  ON public.evidence_records FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "evidence_records_owner_update"
  ON public.evidence_records FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "evidence_records_owner_delete"
  ON public.evidence_records FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.6 media_assets
CREATE POLICY "media_assets_owner_select"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "media_assets_owner_insert"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "media_assets_owner_update"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "media_assets_owner_delete"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.7 site_revisions
CREATE POLICY "site_revisions_owner_select"
  ON public.site_revisions FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "site_revisions_owner_insert"
  ON public.site_revisions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2() AND created_by = auth.uid());

CREATE POLICY "site_revisions_owner_update"
  ON public.site_revisions FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "site_revisions_owner_delete"
  ON public.site_revisions FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.8 publication_history
CREATE POLICY "publication_history_owner_select"
  ON public.publication_history FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "publication_history_owner_insert"
  ON public.publication_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2() AND actor = auth.uid());

CREATE POLICY "publication_history_owner_update"
  ON public.publication_history FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "publication_history_owner_delete"
  ON public.publication_history FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.9 contact_messages: owner can SELECT, UPDATE status, or DELETE; INSERT is service_role only
CREATE POLICY "contact_messages_owner_select"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "contact_messages_owner_update"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.is_active_owner_with_aal2())
  WITH CHECK (public.is_active_owner_with_aal2());

CREATE POLICY "contact_messages_owner_delete"
  ON public.contact_messages FOR DELETE
  TO authenticated
  USING (public.is_active_owner_with_aal2());

-- 7.10 audit_events: append-only for owner with AAL2; UPDATE/DELETE strictly prohibited
CREATE POLICY "audit_events_owner_select"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (public.is_active_owner_with_aal2());

CREATE POLICY "audit_events_owner_insert"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_owner_with_aal2() AND (actor IS NULL OR actor = auth.uid()));

-- 7.11 Internal infrastructure tables: deny all authenticated/anon by default (RLS enabled, zero policies = deny all)
-- Only service_role (which bypasses RLS in Postgres / Supabase) has access to contact_idempotency, email_outbox, request_quotas, github_snapshots, aggregate_events.
