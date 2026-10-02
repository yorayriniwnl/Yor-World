# YOR WORLD Gate G6 Staging Release Candidate Record

**Candidate ID:** `v1.0.0-rc2`  
**Evaluation Gate:** Gate G6 (Production Staging Candidate — REWORK)  
**Candidate Source Commit:** `eaa5fe7d50524d0446f10c57b369fd9ca7dc892f`  
**Assembled Date:** 2026-10-02  
**Responsible Maker:** Gemini #3 — Runtime / Integration Maker  
**Status:** **SUBMITTED FOR GPT PLUS #2 AUDIT (G6 CANDIDATE HANDOFF)**  

---

## 1. Candidate Composition

The `v1.0.0-rc2` release candidate supersedes `rc1` (preserved as historical evidence) and resolves all release-engineering defects identified during initial Gate G6 audit:

1. **Accepted Track A Platform Baseline:**
   - Milestone A1: Design tokens, typography, and semantic color palette (`A1-R1`).
   - Milestone A2: Verified portfolio content and static HTML shell (`A2-R1`).
   - Milestone A3: Owner administration, MFA AAL2 TOTP, and 15 RLS table policies (`A3-R1`).
   - Milestone A4: Authoritative CMS publishing, media approvals, and snapshot rollback (`A4-R1`).
   - Milestone A5: Durable contact message persistence, 24h idempotency, and leased outbox worker (`A5-R1`).
   - Milestone A6: Cached project metadata, privacy-safe telemetry, and disaster recovery (`A6-R1`).
2. **Accepted Track B World & Art Baseline:**
   - Core Track B Freeze: `W1-F1-r2`, `W2-F1-r2`, `B3-P1-R1`, `B2/B3-P2-R1`, `B4-R1`, `B5-R1`, `IA-R1`.
   - G6 World & Art Freeze: `g6-world-art-freeze-20261002` (15 runtime assets verified with Khronos glTF-Validator; 0 errors, 0 warnings).
3. **Track C Runtime & Integration Candidates:**
   - Milestone C1: Intent arbitration and interaction controller (`C1-R1`).
   - Milestone C2: Studio monitor launcher, project transitions, and browser history navigation (`C2`).
   - Milestone C3: Mobile resilience, WCAG 2.2 AA accessibility, adaptive quality (HIGH/MED/LOW/STATIC), audio opt-in/denial, reduced motion travel removal, and renderer failure recovery (`deliveries/C3/`).
   - Milestone C4: Release evidence, CI pipeline, non-production restore record, release manifest validator, and immutable staging candidate dossier (`deliveries/C4/`).

---

## 2. Invariant Compliance & Release Boundaries

| Release Boundary | Candidate Enforcement | Authority |
| :--- | :--- | :--- |
| **Maker Self-Approval** | **STRICTLY FORBIDDEN:** Maker has not approved this candidate; status is `candidate` / `pending_audit`. | Account Operating Model |
| **Public Deployment** | **NOT EXECUTED:** Candidate is staged locally for audit; zero public deployments performed. | Governance Policy |
| **Gate G7 Production Scope** | **GATED / LOCKED:** Production domains, live TLS, live Supabase instance, live email delivery, and uptime monitors are deferred to Gate G7. | Governance Policy |
| **Physical Hardware Claims** | **HONESTLY DECLARED:** Physical lab devices and screen reader audio sessions are recorded as NOT RUN with explicit protocols in `docs/operations/manual-device-checklist-template.md`. | Verification Policy |
