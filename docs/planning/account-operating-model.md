# YOR WORLD — Account Operating Model & Governance Flow

**Authority:** Human Instruction & Architectural Policy  
**Effective Date:** 2026-10-02  
**Status:** ACTIVE & BINDING  

---

## 1. Prime Directive

> [!CAUTION]
> **NEVER RUN ALL FIVE ACCOUNTS ON THE SAME PROBLEM.**
> Do not allow multiple accounts or subagents to swarm, guess, or execute simultaneously on the same task. Work is partitioned into strictly bounded single-owner packets with a unidirectional review and acceptance pipeline.

---

## 2. Default Account Responsibilities

The five primary local accounts have distinct, non-overlapping roles:

| Account | Default Responsibility | Scope & Output Domain |
| :--- | :--- | :--- |
| **Gemini #1** | **Platform / Backend Maker** | Track A (`deliveries/A*/`). Next.js app, semantic HTML, backend endpoints, database schema, RLS policies, admin auth, CMS publishing, asset pipelines, and operations. |
| **Gemini #2** | **World / Art Maker** | Track B (`deliveries/B*/`, `deliveries/W1/`, etc.). Blender models, GLB exports, 3D meshes, textures, materials, lighting, rig hierarchies, avatar animations, and interactive prop assets. |
| **Gemini #3** | **Runtime / Integration Maker** | Track C (`deliveries/C*/`, `deliveries/G1/`, etc.). Three.js runtime integration, SceneIntegrator, CharacterDirector, EntranceCoordinator, ExperienceController, camera arbitration, and canvas lifecycle. |
| **GPT Plus #2** | **Independent Auditor** | Maker-independent verification, code/asset audit, defect logging, regression scanning, and delta audits. **The auditor never writes production fixes.** |
| **GPT Plus #1** | **Architect & Acceptance Authority** | Lead architect and coordinator. Owns task packet issuance, specification governance, frozen baselines, gate evaluation, and final acceptance sign-off. |

*Note on Claude Accounts (C01–C15):* The 15 Claude free browser accounts serve as a secondary/reserve pool for specialized browser reviews (a11y, telemetry, outbox, legal/provenance) per `docs/planning/browser-review-workflow.md`.

---

## 3. Canonical Execution Pipeline

Every packet must progress sequentially through this strict seven-stage pipeline:

```
[1] PARENT PACKET (GPT Plus #1)
         │
         ▼
[2] GEMINI IMPLEMENTATION (Gemini #1, #2, or #3)
         │
         ▼
[3] GPT #2 AUDIT (GPT Plus #2)
         │
         ▼
[4] GEMINI CORRECTION (Assigned Gemini Maker)
         │
         ▼
[5] GPT #2 DELTA AUDIT (GPT Plus #2)
         │
         ▼
[6] GPT #1 ACCEPTANCE (GPT Plus #1)
         │
         ▼
[7] NEXT PACKET (GPT Plus #1)
```

### Stage Details

1. **PARENT PACKET (GPT Plus #1)**:
   The Lead Architect issues a bounded work order specifying exact input hashes, frozen contracts, exclusive output root (`deliveries/<packet>/`), and required exit evidence.
2. **GEMINI IMPLEMENTATION (Gemini Maker)**:
   The designated Gemini maker (Gemini #1 for platform, Gemini #2 for world/art, or Gemini #3 for runtime/integration) implements the packet within its owned directory and produces actual files and a comprehensive `report.md` with PASS/FAIL/NOT RUN evidence.
3. **GPT #2 AUDIT (GPT Plus #2)**:
   GPT Plus #2 performs an adversarial, maker-independent audit inspecting code quality, test results, contract compliance, asset budgets, and edge cases. Returns a structured defect list or audit clearance.
4. **GEMINI CORRECTION (Assigned Gemini Maker)**:
   If defects are found, the original Gemini maker implements the corrections. The auditor does not fix the code.
5. **GPT #2 DELTA AUDIT (GPT Plus #2)**:
   GPT Plus #2 audits the exact delta of the correction to verify that all defects are cleanly resolved without introducing regressions or altering frozen contracts.
6. **GPT #1 ACCEPTANCE (GPT Plus #1)**:
   GPT Plus #1 reviews the implementation and delta audit, verifies milestone gate criteria, signs off formal acceptance, and updates living reconciliation records.
7. **NEXT PACKET (GPT Plus #1)**:
   Only after formal acceptance does GPT Plus #1 unlock and issue the subsequent dependent packet.

---

## 4. Model Tiering Directive

| Model | Assigned Scope | Justification & Guardrails |
| :--- | :--- | :--- |
| **GPT-6.1 Sol** | **Ordinary Coordination & Auditing** | Standard packet preparation, routine code and test audits, delta verification, status tracking, and defect tracking. Fast, reliable, and cost-effective for operational workflows. |
| **Astra** | **Dangerous Cross-Lane Decisions & Major Gates** | Reserved exclusively for critical architectural pivots, cross-lane schema/contract breaking changes (e.g. Platform vs. World vs. Runtime), and major milestone release gates (G1, G3, G7). |

---

## 5. Non-Negotiable Governance Invariants

### Invariant 1: Do Not Let the Auditor Become the Fixer
The auditor (GPT Plus #2) evaluates, inspects, and identifies defects. The auditor is strictly prohibited from authoring production code, modifying maker deliverables, or pushing fixes. Corrections must always be routed back to the designated Gemini maker. This prevents unreviewed auditor changes and preserves clear separation of concerns.

### Invariant 2: Do Not Let the Maker Approve Itself
No maker (Gemini #1, #2, or #3) may declare its own packet accepted, sign off on gates, or advance to the next phase without independent audit (GPT Plus #2) and formal acceptance by the architect (GPT Plus #1). Self-approval is invalid.

### Invariant 3: Do Not Let Later Work Silently Alter an Accepted Revision
Accepted deliverables and frozen contract revisions are immutable baselines. Subsequent packets may only consume accepted revisions via defined interfaces. No downstream task may retroactively or silently mutate an accepted revision without an explicit, audited amendment packet and architect acceptance.
