# YOR WORLD Gate G6 Release Candidate: Configuration & Security Hygiene Audit

**Milestone Coverage:** Milestones A1–A6, Gate G5 (`G5-R1`), Gate G6 Pre-Release  
**Maker Lane:** Gemini #1 — Platform / Backend Release-Candidate Evidence Maker  
**Candidate Source:** `deliveries/A6/source/` (Accumulated A1–A6 platform baseline)  
**Evidence Receipt:** `evidence/11-configuration-audit.log`  

---

## 1. Executive Summary

This configuration audit inspects all configuration files, application entry points, client bundles, and server routines of the accepted release-candidate platform baseline. The objective is to identify potential configuration hazards prior to release packaging: hardcoded development artifacts, leaked credentials, debug backdoors, overly permissive CORS policies, or environment misconfigurations.

Where production values cannot exist prior to live infrastructure provisioning, they are formally declared as **`REQUIRES G7 LIVE VERIFICATION`** in strict compliance with the operating guidelines.

---

## 2. Configuration Audit Matrix

| Audit Dimension | Target / Scope | Inspection Finding | Verdict / Status |
|---|---|---|:---:|
| **1. Localhost URLs** | `src/app/`, `src/features/`, `src/content/` | Zero hardcoded `localhost` or `127.0.0.1` URLs in production runtime code. Found only in development fallback definitions (`src/server/auth/clients.ts`) and mock integration test fixtures. | **PASS** |
| **2. Development Endpoints** | `src/app/api/` | Zero `/api/debug`, `/api/mock`, or backdoor administrative routes present in production route tree. | **PASS** |
| **3. Test / Staging Credentials** | `src/`, `.env*`, config | No production API keys, service role secrets, or private certificates committed in repository code. | **PASS** |
| **4. Placeholder Origins** | `next.config.ts`, route handlers | No placeholder domain origins (e.g. `example.com`, `placeholder.domain`) hardcoded in production routing. | **PASS** |
| **5. Debug Flags** | Next.js config, Turbopack | `reactStrictMode: true`, `poweredByHeader: false`. Next.js telemetry disabled via environment (`NEXT_TELEMETRY_DISABLED=1`). | **PASS** |
| **6. Wildcard CORS** | `src/app/api/**` | Zero wildcard CORS (`Access-Control-Allow-Origin: *`) headers configured. All route handlers default to strict same-origin. | **PASS** |
| **7. Client Secret Bundling** | `src/` (`NEXT_PUBLIC_*`) | No server secrets (`SERVICE_ROLE_KEY`, `CRON_SECRET`, `INTERNAL_JOB_KEY`, `GITHUB_TOKEN`) use the `NEXT_PUBLIC_` prefix. Client code has zero access to server credentials. | **PASS** |
| **8. Environment Assumptions** | Production environment variables | Required production secrets and URLs must be injected into host runtime. | **REQUIRES G7 LIVE VERIFICATION** |
| **9. Security Headers** | `next.config.ts` / Edge CDN | Strict Transport Security (HSTS), Content Security Policy (CSP), X-Frame-Options, X-Content-Type-Options must be validated live on domain. | **REQUIRES G7 LIVE VERIFICATION** |

---

## 3. Deep Dive Findings

### 3.1 Localhost & Endpoint Isolation
- Production source files in `src/` contain zero references to `localhost`.
- In `src/server/auth/clients.ts`, fallback values (`http://127.0.0.1:54321`, `"mock-anon-key-for-local-testing"`) exist solely to allow unit and integration testing without crashing when external variables are unset.
- Furthermore, `src/server/auth/clients.ts` contains an explicit browser context guard:
  ```ts
  if (typeof window !== "undefined") {
    throw new Error("Fatal security violation: Server auth client module imported in client context.");
  }
  ```
  This guarantees that server authentication clients can never be bundled or executed client-side.

### 3.2 CORS & API Route Security
- Standard Next.js route handlers (`src/app/api/`) do not emit permissive CORS headers.
- Internal job endpoints (`/api/internal/jobs/[job]`) strictly enforce secret bearer token authorization (`CRON_SECRET` / `INTERNAL_JOB_KEY`) before job execution.
- External GitHub metadata fetches (`/api/github`) enforce an allowlist of 5 canonical repositories, rejecting any arbitrary external URL with **HTTP 403 Forbidden**.

### 3.3 Production Environment Variables Requiring G7 Live Verification

The following variables cannot and must not be committed to source control; their presence and validity will be verified live during Gate G7 deployment:

1. `NEXT_PUBLIC_SUPABASE_URL`: Production Supabase project HTTPS endpoint (**REQUIRES G7 LIVE VERIFICATION**).
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Production Supabase public client anon key (**REQUIRES G7 LIVE VERIFICATION**).
3. `SUPABASE_SERVICE_ROLE_KEY`: Production Supabase backend service role key (**REQUIRES G7 LIVE VERIFICATION**).
4. `CRON_SECRET`: Production internal scheduled job authorization token (**REQUIRES G7 LIVE VERIFICATION**).
5. `OWNER_NOTIFICATION_EMAIL`: Live administrative recipient email address (**REQUIRES G7 LIVE VERIFICATION**).
6. `SMTP_API_KEY` / `RESEND_API_KEY`: Production transactional email provider credential (**REQUIRES G7 LIVE VERIFICATION**).

### 3.4 Production Security Headers Requiring G7 Live Verification

Production security headers should be enforced at the Edge CDN / reverse-proxy layer during live domain deployment:
- `Content-Security-Policy`: Restricts scripts, styles, fonts, and WebGL asset origins (**REQUIRES G7 LIVE VERIFICATION**).
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` (**REQUIRES G7 LIVE VERIFICATION**).
- `X-Frame-Options`: `DENY` (**REQUIRES G7 LIVE VERIFICATION**).
- `X-Content-Type-Options`: `nosniff` (**REQUIRES G7 LIVE VERIFICATION**).
- `Referrer-Policy`: `strict-origin-when-cross-origin` (**REQUIRES G7 LIVE VERIFICATION**).
- `Permissions-Policy`: `camera=(), microphone=(), geolocation=()` (**REQUIRES G7 LIVE VERIFICATION**).
