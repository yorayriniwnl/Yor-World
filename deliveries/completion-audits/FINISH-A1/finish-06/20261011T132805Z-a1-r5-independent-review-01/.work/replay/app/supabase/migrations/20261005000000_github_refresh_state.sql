-- Explicit amendment after schema_v1: private hourly GitHub attempt coordination.
-- Operational state only; no provider bodies, credentials, headers or error text.
CREATE TABLE public.github_refresh_state (
  repository_id text PRIMARY KEY CHECK (repository_id IN (
    'yorayriniwnl/Yor-World', 'yorayriniwnl/helios', 'yorayriniwnl/zenith',
    'yorayriniwnl/ai-vs-real', 'yorayriniwnl/talks'
  )),
  last_attempt_at timestamptz NOT NULL,
  last_status text NOT NULL CHECK (last_status IN (
    'pending', 'ok', 'rate_limited', 'upstream_error', 'network_error',
    'timeout', 'invalid_response'
  )),
  updated_at timestamptz NOT NULL
);

ALTER TABLE public.github_refresh_state ENABLE ROW LEVEL SECURITY;
-- Zero public policies. Revoke inherited PUBLIC and default role privileges too.
REVOKE ALL ON TABLE public.github_refresh_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.github_refresh_state TO service_role;
