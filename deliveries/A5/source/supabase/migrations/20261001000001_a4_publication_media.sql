-- YOR WORLD Milestone A4 Migration
-- Structured Publishing, Media Asset Approval & Publication Snapshot History

-- 1. Enforce constraints on media_assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_media_approval_status'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT check_media_approval_status
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_media_mime'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT check_media_mime
      CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp'));
  END IF;
END $$;

-- 2. Performance & integrity indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_approval
  ON public.media_assets(approval_status);

CREATE INDEX IF NOT EXISTS idx_media_assets_object_key
  ON public.media_assets(object_key);

CREATE INDEX IF NOT EXISTS idx_publication_history_revision
  ON public.publication_history(revision DESC);

CREATE INDEX IF NOT EXISTS idx_published_content_revision
  ON public.published_content(revision DESC);

CREATE INDEX IF NOT EXISTS idx_project_revisions_lookup
  ON public.project_revisions(project_id, revision DESC);

-- 3. Media access RLS refinement:
-- Public can ONLY view approved media if queried via DB; pending/rejected media is strictly owner-only.
-- In A3, public had ZERO SELECT on media_assets. Only active owner with AAL2 can read or modify.
-- To ensure private draft media is NEVER exposed publicly:
-- anonymous and non-owners remain DENIED from SELECT on media_assets.
-- Only authenticated owners with AAL2 can SELECT, INSERT, UPDATE, DELETE on media_assets.

-- 4. Transactional Publication Helper Function
CREATE OR REPLACE FUNCTION public.publish_new_revision(
  p_revision integer,
  p_snapshot jsonb,
  p_actor uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into publication history
  INSERT INTO public.publication_history (revision, snapshot, actor, created_at)
  VALUES (p_revision, p_snapshot, p_actor, now());

  -- Update or insert active published content
  INSERT INTO public.published_content (id, revision, payload, published_at)
  VALUES (gen_random_uuid(), p_revision, p_snapshot, now());

  -- Log audit event
  INSERT INTO public.audit_events (actor, action, entity_type, entity_id, payload, created_at)
  VALUES (
    p_actor,
    'publication_published',
    'publication',
    p_revision::text,
    jsonb_build_object('revision', p_revision, 'published_at', now()),
    now()
  );
END;
$$;
