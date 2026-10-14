# Public hostname observation — 2026-10-14

**Authority:** Parent Codex, read-only G7 preparation observation
**Target observed:** `https://yorayriniwnl.in/`
**Method:** Direct public-page fetch with the web browsing service on 2026-10-14. No provider dashboard, DNS, TLS-certificate, source repository, or deployment configuration was changed or inspected.

## Observation

The public homepage currently serves a portfolio titled “Ayush Roy | Product & Full-Stack Engineer” and prominently links to CandidateX. The public route [`/projects/candidatex`](https://yorayriniwnl.in/projects/candidatex) serves a CandidateX case-study page and describes the project as “Research prototype · source + live.” The homepage also describes CandidateX and links into the case study.

This differs from the accepted local release boundary, where CandidateX is unpublished and the production-build route guard returns 404. If `yorayriniwnl.in` is the intended production hostname for the accepted YOR WORLD source, the public CandidateX route is a blocking G7 discrepancy. The local source-folder URL override is not proof that this public deployment was built from the accepted source.

The page was fetchable over an HTTPS URL. This observation does **not** verify authoritative DNS ownership, certificate-chain/cipher requirements, HTTP-to-HTTPS redirect behavior, canonical headers, current hosting project or deployed commit, backend health, or sender-domain verification. Those checks remain NOT RUN.

## Release handling

Do not claim the accepted local source is deployed to this host. Before G7, the owner must confirm the intended production hostname and verified Resend sender domain, and the release lane must bind the live Vercel deployment to the exact accepted source. The CandidateX route must satisfy the existing 404 requirement on the chosen production host. No traffic, DNS, hosting, email, or provider setting was modified for this observation.
