# A5/A6-CONTACT-IDEMPOTENCY-R2: Migration and Schema Notes

## 1. Schema Assessment

The contact system schema was introduced in Milestone A3 (`supabase/migrations/20261001000000_a3_owner_auth_rls.sql`) and verified in Milestones A5 and A6:

```sql
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  body text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'received'
);

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
```

## 2. DDL Change Evaluation

* **DDL Modifications Required:** **NONE (0 DDL changes).**
* **Rationale:** 
  - `public.contact_idempotency` already defines `key_hash text PRIMARY KEY`.
  - Under PostgreSQL specification (and PGlite WASM execution), `PRIMARY KEY` creates a unique B-tree index on `key_hash`.
  - The PostgreSQL statement:
    ```sql
    INSERT INTO public.contact_idempotency (
      key_hash, payload_hash, receipt_id, expires_at
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (key_hash) DO UPDATE
    SET
      payload_hash = EXCLUDED.payload_hash,
      receipt_id = EXCLUDED.receipt_id,
      expires_at = EXCLUDED.expires_at
    WHERE public.contact_idempotency.expires_at <= $5
    RETURNING receipt_id;
    ```
    is natively and fully supported by the existing table definition without adding new indexes, columns, or triggers.

## 3. Migration Compatibility

* **Forward Compatibility:** 
  The new application code executes strictly against the existing schema. No database restart or migration lock is required.
* **Zero Downtime:** 
  Can be deployed to production servers, serverless handlers, or containers with zero interruption to active traffic.
* **Data Migration:** 
  No data conversion or backfilling is necessary. Existing idempotency keys in `contact_idempotency` continue to expire naturally along their `expires_at` timestamps.

## 4. Rollback Plan & Implications

* **Rollback Action:** If the new server code needs to be rolled back to the previous revision, deploying the previous container / serverless artifact requires zero schema rollback.
* **Implications:** Because the table structure is unchanged, rolling back the application layer leaves database records completely intact and readable by earlier code.
