-- Canonical RC3 operational security delta. Apply AFTER the byte-preserved A3/A4 migrations.
-- DCL only: no table/schema changes and no historical migration renumbering.
-- A4's SECURITY DEFINER helper trusts p_actor/p_snapshot and has default PUBLIC EXECUTE.
-- Owner publication must enter through the server's verified owner/AAL2/revision/content gates.
REVOKE ALL ON FUNCTION public.publish_new_revision(integer,jsonb,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_new_revision(integer,jsonb,uuid) FROM anon;
REVOKE ALL ON FUNCTION public.publish_new_revision(integer,jsonb,uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.publish_new_revision(integer,jsonb,uuid) TO service_role;

-- is_active_owner() and is_active_owner_with_aal2() are read-only policy predicates.
-- They take no caller-selected owner argument, read public.admin_users using auth.uid(),
-- and bind the AAL2 predicate to auth.jwt(). Their execution is needed by RLS policies.
