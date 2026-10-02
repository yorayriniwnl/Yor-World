# Canonical RC3 production route inventory

This inventory is cross-checked against the final source-bound compiled manifests, canonical route sources and hashed `release-composition.json`. The final build proves both public/runtime and admin/platform composition; `commands-and-exit-codes.md` and `evidence/07-production-build.log` record exact source/commands/exit status.

| Route | Build behavior | Methods/access/consumer |
| --- | --- | --- |
| `/` | Dynamic | Public approved snapshot with on-demand C3 world launcher; backend absence falls back to verified static content. |
| `/about` | Static page | Accepted A6 details in C3 semantic public shell. |
| `/resume` | Static page | Accepted A6 structured résumé content in C3 shell. |
| `/contact` | Static page + client form | Working accepted form posts to canonical `/api/contact`; no unavailable-messaging placeholder. |
| `/projects` | Dynamic | Approved publication directory; no private drafts. |
| `/projects/[slug]` | Dynamic | Approved project case studies; `helios`, `zenith`, `ai-vs-real`, `talks` reachable, `candidatex` unavailable/404. |
| `/admin` | Dynamic | Server-side owner/AAL2 authorization before dashboard; anonymous visitor redirected to login. |
| `/admin/login` | Static page | Public sign-in/TOTP form; successful claims are verified server-side. |
| `/admin/editor` | Dynamic | Protected drafts and private media/editor UI. |
| `/admin/publish` | Dynamic | Protected approval/publication/rollback UI. |
| `/api/contact` | Dynamic | POST; 202 honest receipt, validation/honeypot, 409 conflicting replay, 413 oversize, 429 quota, 503 unavailable storage. Executes R2 receive/outbox. |
| `/api/admin/audit` | Dynamic | GET/POST, protected owner/AAL2 audit. |
| `/api/admin/media` | Dynamic | GET/POST, protected private registration and metadata. |
| `/api/admin/media/[id]` | Dynamic | GET, protected media details. |
| `/api/admin/media/[id]/approve` | Dynamic | POST, protected approval. |
| `/api/admin/projects` | Dynamic | GET/POST, protected draft inventory/save with revision/schema validation. |
| `/api/admin/publish` | Dynamic | GET/POST, protected snapshot/history/publication with 409 stale revision and 422 invalid content semantics. |
| `/api/admin/rollback` | Dynamic | POST, protected rollback creates a new authoritative publication revision. |
| `/api/admin/verify` | Dynamic | GET, accepted session/owner/MFA verification endpoint; no invented login API. |
| `/api/events` | Dynamic | POST, allowlisted aggregate telemetry only. |
| `/api/github` | Dynamic | GET, accepted allowlisted repository metadata/cache fallback. |
| `/api/internal/jobs/[job]` | Dynamic | POST, configured secret required; accepted jobs `process-outbox`, `refresh-github`, `cleanup-stale`. |
| `/robots.txt` | Static metadata route | Canonical public configuration. |
| `/sitemap.xml` | Dynamic metadata route | Approved public publication paths. |
| `/_not-found` | Static framework artifact | Shared public 404 presentation. |
| `/_global-error` | Static framework artifact | Framework error artifact. |

The release policy requires all 22 public/admin/API application routes, including every accepted A6 API; metadata/framework artifacts are separately listed. `/api/health` was absent from the accepted A6 route inventory and is not invented by this integration. Live monitoring/health requirements remain a G7 implementation/verification prerequisite, not a claimed existing RC3 endpoint.

Home/projects/case studies read the server-only durable approved snapshot on each request and preserve backend-unavailable fallback. Static about/résumé/contact pages still use the C3 layout, navigation, keyboard and responsive presentation. The production build is not a C3-only static route table. Final route/module loss fails `scripts/release/check-release-composition.mjs`; actual route sources, R2 modules and frozen asset files must also exist in the deterministic app bundle.
