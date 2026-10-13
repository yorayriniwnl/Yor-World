-- Forward schema-v3 repair. The three historical migrations remain unchanged.
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE claims jsonb;
BEGIN
  claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  IF jsonb_typeof(claims) IS DISTINCT FROM 'object' THEN RETURN '{}'::jsonb; END IF;
  RETURN claims;
EXCEPTION WHEN invalid_text_representation THEN RETURN '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  legacy text := NULLIF(current_setting('request.jwt.claim.sub', true), '');
  raw_claims text := NULLIF(current_setting('request.jwt.claims', true), '');
  claims jsonb;
  subject uuid;
BEGIN
  IF raw_claims IS NOT NULL THEN
    claims := raw_claims::jsonb;
    IF jsonb_typeof(claims) IS DISTINCT FROM 'object'
       OR jsonb_typeof(claims -> 'sub') IS DISTINCT FROM 'string'
       OR NULLIF(claims ->> 'sub', '') IS NULL THEN RETURN NULL; END IF;
    subject := (claims ->> 'sub')::uuid;
    -- A legacy subject must never mask invalid or contradictory native claims.
    IF legacy IS NOT NULL AND legacy::uuid <> subject THEN RETURN NULL; END IF;
    RETURN subject;
  END IF;
  RETURN legacy::uuid;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'owner' AND active); $$;

CREATE OR REPLACE FUNCTION public.is_active_owner_with_aal2()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT public.is_active_owner() AND COALESCE(auth.jwt() ->> 'aal', '') = 'aal2'; $$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_owner(), public.is_active_owner_with_aal2() TO anon, authenticated, service_role;

-- NULL bucket means an unbound legacy object; never infer identity from environment.
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS storage_bucket text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS integrity_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.media_is_retained(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.publication_history
    WHERE jsonb_path_exists(snapshot,
      '$.projects[*].sections[*].blocks[*] ? (@.type == "image" && @.mediaId == $id)', jsonb_build_object('id', p_id::text))
  ) OR EXISTS (
    SELECT 1 FROM public.published_content
    WHERE jsonb_path_exists(payload,
      '$.projects[*].sections[*].blocks[*] ? (@.type == "image" && @.mediaId == $id)', jsonb_build_object('id', p_id::text))
  );
$$;
REVOKE ALL ON FUNCTION public.media_is_retained(uuid) FROM PUBLIC;

-- Statement lock precedes row locks, including direct authenticated SQL mutations.
CREATE OR REPLACE FUNCTION public.lock_media_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('yor-publication')); RETURN NULL; END; $$;
DROP TRIGGER IF EXISTS media_lifecycle_lock ON public.media_assets;
CREATE TRIGGER media_lifecycle_lock BEFORE INSERT OR UPDATE OR DELETE ON public.media_assets
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_media_lifecycle();

CREATE OR REPLACE FUNCTION public.guard_media_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE retained boolean;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    retained := public.media_is_retained(OLD.id);
    IF TG_OP = 'DELETE' THEN
      IF retained THEN RAISE EXCEPTION 'Retained publication media cannot be deleted'; END IF;
      RETURN OLD;
    END IF;
    IF (OLD.approval_status = 'approved' OR retained) AND
       ROW(NEW.id, NEW.storage_bucket, NEW.object_key, NEW.hash, NEW.bytes, NEW.mime)
       IS DISTINCT FROM ROW(OLD.id, OLD.storage_bucket, OLD.object_key, OLD.hash, OLD.bytes, OLD.mime)
    THEN RAISE EXCEPTION 'Approved or retained media identity is immutable'; END IF;
  END IF;
  IF NEW.approval_status = 'approved' AND
     (TG_OP = 'INSERT' OR OLD.approval_status <> 'approved') THEN
    -- Authenticated SQL cannot attest that provider bytes were read by the server.
    IF current_setting('role', true) IN ('anon', 'authenticated')
       OR NEW.storage_bucket IS NULL OR NEW.storage_bucket = ''
       OR NEW.integrity_verified_at IS NULL
       OR NEW.hash !~ '^[a-f0-9]{64}$' OR NEW.bytes <= 0 OR NEW.bytes > 5242880
    THEN RAISE EXCEPTION 'Approval requires privileged verification of a bound object'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_media_integrity(), public.lock_media_lifecycle() FROM PUBLIC;
DROP TRIGGER IF EXISTS media_integrity_guard ON public.media_assets;
CREATE TRIGGER media_integrity_guard BEFORE INSERT OR UPDATE OR DELETE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.guard_media_integrity();
