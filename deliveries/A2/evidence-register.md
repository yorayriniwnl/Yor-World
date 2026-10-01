# YOR WORLD — Evidence and Claims Register (Milestone A2)

**Author:** GPT-1 (Track A Platform & Content Maker)  
**Date:** 2026-10-01  
**Authority:** [PARENT-RECON-03](../planning/reviews/2026-10-01-reconciliation-03.md) & Product Design Revision 2  
**Governing Standard:** C01 (No invented claims), C02 (No-WebGL accessibility), C11 (Approved evidence snapshot)

---

## 1. Overview and Methodology

In accordance with YOR WORLD constraint **C01**, all public text, project metrics, technical capabilities, biographical details, and external links are strictly grounded in verifiable owner-provided evidence. Unverified claims, metrics without reproducible methodology, unconfirmed research publications, and unverified credentials are categorized internally as **unknown** or **not-measured** and are **omitted from public publication**.

### Status Taxonomy

| Status | Definition | Public Publication Rule |
| :--- | :--- | :--- |
| **`verified`** | Backed by a verified owner repository, live production URL, commit log, academic enrollment, or certified receipt. | Eligible for public case study, about, or résumé text. |
| **`unknown`** | Mentioned in planning discussions, informal notes, or visual concepts, but lacking authoritative owner verification. | **OMITTED** from public routes. Retained internally in audit registry. |
| **`not-measured`** | System capability or architecture designed, but lacking empirical benchmark or production telemetry. | Described qualitatively; quantitative numbers omitted. |
| **`not-applicable`** | Structural invariant, architectural decision, or design boundary where measurement is irrelevant. | Stated as an invariant or architecture decision. |

---

## 2. Identity, Bio, and Credentials Register

| Claim ID | Public Claim | Evidence Source | Verification State | Public Wording / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **BIO-01** | Full Name: Ayush Roy | Owner GitHub profile (`yorayriniwnl`), live domain `yorayriniwnl.in` | **`verified`** | "Ayush Roy" |
| **BIO-02** | Moniker / Handle: Yor / yorayriniwnl | GitHub (`@yorayriniwnl`), repository origin, project naming | **`verified`** | "Ayush Roy / Yor (`yorayriniwnl`)" |
| **BIO-03** | Headline / Role: Full-Stack & Systems Developer | Owner GitHub profile bio & profile README | **`verified`** | "Full-stack developer building realtime systems, 3D product interfaces, and applied ML." |
| **BIO-04** | Location: Bhubaneswar, Odisha, India | Owner GitHub profile location metadata | **`verified`** | "Bhubaneswar, Odisha, India" |
| **BIO-05** | Education: B.Tech in Computer Science and Communication Engineering, KIIT Deemed to be University (2023–2027 expected) | Owner profile README (`field-notes`), KIIT enrollment record | **`verified`** | "B.Tech in Computer Science and Communication Engineering at KIIT Deemed to be University, 2023–2027 (Expected)." |
| **BIO-06** | Coursework: Data Structures & Algorithms, Operating Systems, DBMS, Computer Networks, OOP | Owner profile README (`field-notes`) | **`verified`** | "Coursework: Data Structures & Algorithms, Operating Systems, Database Management Systems, Computer Networks, Object-Oriented Programming." |
| **BIO-07** | Experience: Telecom & Data Network Intern at Bharat Sanchar Nigam Limited (BSNL), June 2026 | Owner profile README (`field-notes`), RGMTTC certificate record | **`verified`** | "Telecom & Data Network Intern at Bharat Sanchar Nigam Limited (BSNL), June 2026. Completed an RGMTTC-certified four-week program in telecom, data-network systems, and infrastructure." |
| **BIO-08** | Contact Email: `ayushroy.dev@gmail.com` | Owner profile README contact channel | **`verified`** | "`ayushroy.dev@gmail.com`" |
| **BIO-09** | Formal Academic Research Papers | Checked: Google Scholar, arXiv, owner repositories | **`unknown`** | **OMITTED** from public About and Résumé routes. |
| **BIO-10** | Professional Industry Certifications (AWS, GCP, CKA) | Checked: profile receipts | **`unknown`** | **OMITTED** from public routes. |

---

## 3. Five Required Project Candidates Register

### 3.1. AI vs. Real Image Detector (`ai-vs-real`)

| Claim ID | Public Claim | Evidence Source | Verification State | Public Wording / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **AIR-01** | Project Identity & Slug | `https://github.com/yorayriniwnl/Yor-Ai-vs-real-image` | **`verified`** | `AI vs. Real Image Detector` (slug: `ai-vs-real`) |
| **AIR-02** | Authorship & Role | Git commit history on `yorayriniwnl/Yor-Ai-vs-real-image` | **`verified`** | "Sole developer: designed feature extraction pipeline, trained and calibrated classifier, and built Streamlit interface." |
| **AIR-03** | Core Architecture: Handcrafted texture forensics using LBP and GLCM with SVM | Repository source code (`train.py`, `app.py`, feature modules) | **`verified`** | "A probability-aware image classifier built from handcrafted texture features (Local Binary Patterns and Gray-Level Co-occurrence Matrix) and a calibrated support vector machine." |
| **AIR-04** | Quantitative Result: 78.5% held-out test accuracy | Evaluated model receipt, owner profile proof badge, test split `random_state=42` | **`verified`** | "78.5% held-out test accuracy on deterministic 80/20 train/test evaluation using LBP and GLCM texture features with an RBF SVM." |
| **AIR-05** | Local Inference Artifacts: Committed SVM and scaler | Repository commit `scaler.joblib`, `model.joblib` | **`verified`** | "Local inference with committed SVM and scaler artifacts; zero external inference API dependencies." |
| **AIR-06** | Live Demonstration URL | `https://yor-ai-vs-real-image.vercel.app` | **`verified`** | "`https://yor-ai-vs-real-image.vercel.app`" |
| **AIR-07** | Commercial User Count / MAU | Production telemetry / server logs | **`unknown`** | **OMITTED**. Published as demonstration forensic project. |

### 3.2. Yor Zenith (`zenith`)

| Claim ID | Public Claim | Evidence Source | Verification State | Public Wording / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **ZEN-01** | Project Identity & Slug | `https://github.com/yorayriniwnl/Yor-Zenith` | **`verified`** | `Yor Zenith` (slug: `zenith`) |
| **ZEN-02** | Authorship & Role | Git commit history on `yorayriniwnl/Yor-Zenith` | **`verified`** | "Sole developer: architected full-stack platform, authored 3D roof planning in Three.js, and implemented solar modeling algorithms." |
| **ZEN-03** | Core Architecture: 3D roof planning, energy simulation, ROI modeling | Repository source (`frontend/src/`, `backend/app/`) | **`verified`** | "A full-stack solar feasibility platform combining interactive 3D roof planning, energy-output simulation, and financial analysis." |
| **ZEN-04** | Technology Stack: React, TypeScript, Three.js, Python, FastAPI | Repository `package.json`, `requirements.txt` | **`verified`** | "React, TypeScript, Three.js, Python, FastAPI, Vercel" |
| **ZEN-05** | Live Demonstration URL | `https://zenith-xi-snowy.vercel.app` | **`verified`** | "`https://zenith-xi-snowy.vercel.app`" |
| **ZEN-06** | Real-Time Satellite LIDAR GIS Integration | Technical codebase audit | **`not-measured`** | Disclosed limitation: "Irradiance calculations use mathematical solar path equations rather than live LIDAR point clouds." |
| **ZEN-07** | Utility Provider API Integration | Technical codebase audit | **`not-applicable`** | Disclosed limitation: "Tariff rates use configurable presets rather than live utility billing APIs." |

### 3.3. Yor Helios (`helios`)

| Claim ID | Public Claim | Evidence Source | Verification State | Public Wording / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **HEL-01** | Project Identity & Slug | `https://github.com/yorayriniwnl/Yor-Helios` | **`verified`** | `Yor Helios` (slug: `helios`) |
| **HEL-02** | Authorship & Role | Git commit history on `yorayriniwnl/Yor-Helios` | **`verified`** | "Sole developer: architected asynchronous event-streaming backend, WebSocket distribution, and Docker containerization." |
| **HEL-03** | Core Architecture: Realtime energy intelligence, anomaly detection, WebSockets | Repository source (`main.py`, `docker-compose.yml`) | **`verified`** | "An energy-monitoring platform streaming anomaly and threshold events into channel-specific operator dashboards." |
| **HEL-04** | Technology Stack: Python, FastAPI, TypeScript, Docker, Docker Compose, WebSocket | Repository configuration | **`verified`** | "Python, FastAPI, TypeScript, Docker, WebSocket" |
| **HEL-05** | Production Status: In Development | Owner profile status, repository state | **`verified`** | "Status: In Development (code available; reproducible via Docker Compose)." |
| **HEL-06** | Live Cloud Production URL | Checked: no live cloud hosting active | **`unknown` / `not-deployed`** | **OMITTED**. Repository link provided; no simulated live URL claimed. |
| **HEL-07** | Physical Industrial Hardware Interface (Modbus/BACnet) | Checked: repository uses synthetic telemetry generators | **`not-measured`** | Disclosed limitation: "Tested with synthetic telemetry streams; physical hardware integration is queued for future hardware testing." |

### 3.4. Yor Talks V2 (`talks`)

| Claim ID | Public Claim | Evidence Source | Verification State | Public Wording / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **TLK-01** | Project Identity & Slug | `https://github.com/yorayriniwnl/yor-talksv2` | **`verified`** | `Yor Talks V2` (slug: `talks`) |
| **TLK-02** | Authorship & Role | Git commit history on `yorayriniwnl/yor-talksv2` | **`verified`** | "Sole developer: built React/Vite frontend, Express Socket.IO server, and PostgreSQL schema with Drizzle ORM." |
| **TLK-03** | Core Architecture: Low-latency messaging, room architecture, relational persistence | Repository source (`server/`, `client/`, `schema.ts`) | **`verified`** | "A full-stack communication platform with realtime messaging, typed interface components, and a documented public-beta path." |
| **TLK-04** | Technology Stack: React, Vite, TypeScript, Express, Socket.IO, PostgreSQL, Drizzle ORM | Repository `package.json` | **`verified`** | "React, Vite, TypeScript, Express, Socket.IO, PostgreSQL, Drizzle ORM, Vercel" |
| **TLK-05** | Live Demonstration URL | `https://yor-talks.vercel.app` | **`verified`** | "`https://yor-talks.vercel.app`" |
| **TLK-06** | End-to-End Encryption (E2EE) | Codebase audit: messages stored plaintext in Postgres | **`unknown` / `not-applicable`** | **OMITTED**. Disclosed limitation: "Standard demonstration architecture; does not feature end-to-end encryption or multi-region clustering." |

### 3.5. CandidateX (`candidatex`)

| Claim ID | Public Claim | Evidence Source | Verification State | Public Wording / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **CDX-01** | Project Identity: CandidateX | Quoted in `references/text/source-discussion.txt` | **`unknown`** | Candidate identifier retained in contract enum `ProjectId`. |
| **CDX-02** | Public GitHub Repository | Checked: `github.com/yorayriniwnl` (No CandidateX repo exists) | **`unknown`** | **OMITTED** from public publication snapshot. |
| **CDX-03** | Public Live Deployment URL | Checked: no verified live domain | **`unknown`** | **OMITTED**. Route `/projects/candidatex` returns 404 via `notFound()`. |
| **CDX-04** | Authorship / Contribution | Checked: no verifiable contribution record | **`unknown`** | **OMITTED**. |
| **CDX-05** | Publication Decision | Task A2 & Engineering §8 | **`unpublished`** | **UNPUBLISHED CANDIDATE**. Retained internally as candidate project; excluded from active `Publication.projects`. |

---

## 4. Skills and External Links Register

| Link / Profile | URL | Verification Evidence | Status |
| :--- | :--- | :--- | :--- |
| **Personal Site** | `https://www.yorayriniwnl.in` (and `https://yorayriniwnl.in`) | Owner profile link, domain authority | **`verified`** |
| **GitHub Profile** | `https://github.com/yorayriniwnl` | Live profile inspected | **`verified`** |
| **LinkedIn Profile** | `https://linkedin.com/in/yorayriniwnl` | Owner profile link | **`verified`** |
| **Devpost Profile** | `https://devpost.com/yorayriniwnl` | Owner profile link | **`verified`** |
| **Steam Profile** | `https://steamcommunity.com/id/yorayriniwnl/` | Owner profile link | **`verified`** |
| **AI vs. Real Repo** | `https://github.com/yorayriniwnl/Yor-Ai-vs-real-image` | Repository verified live | **`verified`** |
| **AI vs. Real Demo** | `https://yor-ai-vs-real-image.vercel.app` | Vercel deployment verified live | **`verified`** |
| **Yor Zenith Repo** | `https://github.com/yorayriniwnl/Yor-Zenith` | Repository verified live | **`verified`** |
| **Yor Zenith Demo** | `https://zenith-xi-snowy.vercel.app` | Vercel deployment verified live | **`verified`** |
| **Yor Helios Repo** | `https://github.com/yorayriniwnl/Yor-Helios` | Repository verified live | **`verified`** |
| **Yor Talks Repo** | `https://github.com/yorayriniwnl/yor-talksv2` | Repository verified live | **`verified`** |
| **Yor Talks Demo** | `https://yor-talks.vercel.app` | Vercel deployment verified live | **`verified`** |

---

## 5. Unsupported Claims Rejection Log

The following claims were identified during review of informal discussions and planning artifacts, evaluated against verified evidence, and explicitly **REJECTED** from entering the public publication:

1. **"CandidateX is a live published SaaS application"** — *REJECTED*: No repository or live deployment exists. Retained internally as an unpublished candidate.
2. **"AI vs. Real achieves 99%+ real-world accuracy"** — *REJECTED*: Verified empirical held-out accuracy is exactly **78.5%** on deterministic 80/20 LBP/GLCM SVM evaluation. Only the verified 78.5% metric is published.
3. **"Yor Helios is deployed on production Kubernetes clusters with live smart meters"** — *REJECTED*: System is containerized via Docker Compose with synthetic telemetry generators. Stated honestly as "In Development".
4. **"Published author of peer-reviewed AI forensics papers"** — *REJECTED*: No verified academic papers exist on Google Scholar/arXiv. Research claims omitted.
5. **"Yor Talks features end-to-end encrypted messaging"** — *REJECTED*: Database stores messages in PostgreSQL. Omitted; documented as demonstration platform.
6. **"10,000+ active monthly users"** — *REJECTED*: No production analytics telemetry audited. All user count metrics omitted.
