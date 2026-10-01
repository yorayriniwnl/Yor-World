-- YOR WORLD Milestone A3: Supabase Database Authorization & RLS Test Suite
-- Standard pgTAP / SQL test assertions for identity-based access control

BEGIN;
SELECT plan(45);

-- 1. Schema Invariants: Verify RLS is active on all protected tables
SELECT tables_are(
  'public',
  ARRAY[
    'admin_users', 'audit_events', 'projects', 'project_revisions',
    'evidence_records', 'media_assets', 'site_revisions',
    'publication_history', 'published_content', 'contact_messages',
    'contact_idempotency', 'email_outbox', 'request_quotas',
    'github_snapshots', 'aggregate_events'
  ],
  'All 15 core domain and system tables exist in public schema'
);

SELECT row_level_security_is_active('public', 'admin_users', 'RLS active on admin_users');
SELECT row_level_security_is_active('public', 'projects', 'RLS active on projects');
SELECT row_level_security_is_active('public', 'project_revisions', 'RLS active on project_revisions');
SELECT row_level_security_is_active('public', 'evidence_records', 'RLS active on evidence_records');
SELECT row_level_security_is_active('public', 'media_assets', 'RLS active on media_assets');
SELECT row_level_security_is_active('public', 'site_revisions', 'RLS active on site_revisions');
SELECT row_level_security_is_active('public', 'publication_history', 'RLS active on publication_history');
SELECT row_level_security_is_active('public', 'published_content', 'RLS active on published_content');
SELECT row_level_security_is_active('public', 'contact_messages', 'RLS active on contact_messages');
SELECT row_level_security_is_active('public', 'audit_events', 'RLS active on audit_events');

-- 2. Test Fixture Setup
-- Create test users in auth.users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner_active@yorworld.test'),
  ('22222222-2222-2222-2222-222222222222', 'owner_revoked@yorworld.test'),
  ('33333333-3333-3333-3333-333333333333', 'owner_no_mfa@yorworld.test'),
  ('44444444-4444-4444-4444-444444444444', 'non_owner@yorworld.test');

-- Configure admin_users authoritative records
INSERT INTO public.admin_users (id, role, active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner', true),
  ('22222222-2222-2222-2222-222222222222', 'owner', false), -- Revoked owner
  ('33333333-3333-3333-3333-333333333333', 'owner', true);  -- Active in table, but will test with AAL1

-- Seed one project and one published content row via service_role
INSERT INTO public.projects (id, slug, title) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-project', 'Test Project');
INSERT INTO public.published_content (id, revision, payload) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, '{"title": "Initial Public Content"}'::jsonb);

-- 3. Anonymous Identity Checks
SET ROLE anon;
RESET request.jwt.claim.sub;
RESET request.jwt.claims;

-- Anon can read published_content
SELECT results_eq(
  'SELECT count(*)::int FROM public.published_content',
  ARRAY[1],
  'Anonymous role CAN read published_content'
);

-- Anon CANNOT read private projects
SELECT throws_ok(
  'SELECT * FROM public.projects',
  '42501',
  NULL,
  'Anonymous role is DENIED SELECT on private projects'
);

-- Anon CANNOT read admin_users
SELECT throws_ok(
  'SELECT * FROM public.admin_users',
  '42501',
  NULL,
  'Anonymous role is DENIED SELECT on admin_users'
);

-- Anon CANNOT mutate published_content
SELECT throws_ok(
  'INSERT INTO public.published_content (revision, payload) VALUES (2, ''{}''::jsonb)',
  '42501',
  NULL,
  'Anonymous role is DENIED INSERT on published_content'
);

-- 4. Authenticated Non-Owner Checks
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
SELECT set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "aal": "aal2"}', true);

SELECT is_empty(
  'SELECT * FROM public.projects',
  'Authenticated non-owner sees 0 rows from projects'
);
SELECT is_empty(
  'SELECT * FROM public.admin_users',
  'Authenticated non-owner sees 0 rows from admin_users'
);
SELECT throws_ok(
  'INSERT INTO public.projects (slug, title) VALUES (''hacked'', ''Hacked'')',
  '42501',
  NULL,
  'Authenticated non-owner is DENIED INSERT into projects'
);

-- 5. Owner Without MFA (AAL1) Checks
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
SELECT set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "aal": "aal1"}', true);

SELECT is_empty(
  'SELECT * FROM public.projects',
  'Owner with AAL1 (without MFA) sees 0 rows from projects'
);
SELECT is_empty(
  'SELECT * FROM public.admin_users',
  'Owner with AAL1 sees 0 rows from admin_users'
);
SELECT throws_ok(
  'INSERT INTO public.projects (slug, title) VALUES (''no-mfa'', ''No MFA'')',
  '42501',
  NULL,
  'Owner with AAL1 is DENIED INSERT into projects'
);

-- 6. Revoked Owner (with otherwise-valid AAL2 token) Checks
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SELECT set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "aal": "aal2"}', true);

SELECT is_empty(
  'SELECT * FROM public.projects',
  'Revoked owner with valid AAL2 token sees 0 rows from projects'
);
SELECT is_empty(
  'SELECT * FROM public.admin_users',
  'Revoked owner sees 0 rows from admin_users'
);
SELECT throws_ok(
  'INSERT INTO public.projects (slug, title) VALUES (''revoked'', ''Revoked'')',
  '42501',
  NULL,
  'Revoked owner is DENIED INSERT into projects immediately'
);

-- 7. Active Owner with MFA (AAL2) Checks
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "aal": "aal2"}', true);

SELECT results_eq(
  'SELECT count(*)::int FROM public.projects',
  ARRAY[1],
  'Active owner with AAL2 CAN SELECT projects'
);
SELECT results_eq(
  'SELECT count(*)::int FROM public.admin_users',
  ARRAY[1],
  'Active owner with AAL2 CAN SELECT their own admin_users record'
);

SELECT lives_ok(
  'INSERT INTO public.projects (slug, title) VALUES (''owner-proj'', ''Owner Project'')',
  'Active owner with AAL2 CAN INSERT project'
);
SELECT lives_ok(
  'UPDATE public.projects SET title = ''Updated Title'' WHERE slug = ''owner-proj''',
  'Active owner with AAL2 CAN UPDATE project'
);
SELECT lives_ok(
  'DELETE FROM public.projects WHERE slug = ''owner-proj''',
  'Active owner with AAL2 CAN DELETE project'
);

-- Audit log immutability check: active owner can insert but CANNOT delete
SELECT lives_ok(
  'INSERT INTO public.audit_events (actor, action, entity_type) VALUES (''11111111-1111-1111-1111-111111111111'', ''test_action'', ''project'')',
  'Active owner CAN append audit event'
);
SELECT throws_ok(
  'DELETE FROM public.audit_events',
  '42501',
  NULL,
  'Active owner CANNOT DELETE audit events (append-only enforced)'
);

SELECT * FROM finish();
ROLLBACK;
