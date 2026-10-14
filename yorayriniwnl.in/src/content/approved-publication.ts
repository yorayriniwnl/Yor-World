import type { Publication } from "@/contracts/content";

/**
 * Approved Publication Snapshot Revision 1.
 * Author: Parent Codex & GPT-1
 * Governing Standard: C01 (No invented claims), C11 (Approved evidence snapshot)
 *
 * CandidateX is intentionally held as an unpublished candidate; it does not appear
 * in active public projects because its repository and deployment evidence are unverified.
 */
export const approvedPublication: Publication = {
  revision: 1,
  publishedAt: "2026-10-01T12:00:00Z",
  assetManifestRevision: "manifest-20261001-r1",
  projects: [
    {
      id: "ai-vs-real",
      slug: "ai-vs-real",
      title: "AI vs. Real Image Detector",
      summary: "A probability-aware image classifier built from handcrafted texture features and a calibrated support vector machine.",
      contribution: "Sole developer. Designed and implemented the complete computer vision pipeline, including illumination-invariant preprocessing, LBP and GLCM feature extraction, RBF SVM training and probability calibration, model persistence, and the Streamlit demonstration interface.",
      revision: 1,
      links: [
        {
          label: "Source Repository",
          url: "https://github.com/yorayriniwnl/Yor-Ai-vs-real-image",
          checkedAt: "2026-10-01T12:00:00Z",
        },
        {
          label: "Live Demonstration",
          url: "https://yor-ai-vs-real-image.vercel.app",
          checkedAt: "2026-10-01T12:00:00Z",
        },
      ],
      evidence: [
        {
          id: "ev-air-repo",
          kind: "repository",
          url: "https://github.com/yorayriniwnl/Yor-Ai-vs-real-image",
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Public repository with committed Python training pipeline, OpenCV preprocessing, and Streamlit application.",
        },
        {
          id: "ev-air-demo",
          kind: "deployment",
          url: "https://yor-ai-vs-real-image.vercel.app",
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Live Vercel demonstration running interactive image classification.",
        },
        {
          id: "ev-air-accuracy",
          kind: "measurement",
          url: null,
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "78.5% held-out test accuracy on deterministic 80/20 train/test evaluation split using LBP and GLCM features with calibrated RBF SVM.",
        },
      ],
      sections: [
        {
          id: "challenge",
          heading: "Forensic Challenge & Motivation",
          blocks: [
            {
              type: "paragraph",
              text: "Generative image models frequently produce convincing macro-level compositions while leaving subtle micro-texture irregularities, pixel correlation shifts, and boundary artifacts across spatial domains.",
            },
            {
              type: "paragraph",
              text: "Traditional deep learning forensic detectors often overfit to specific generator architectures and require heavy GPU runtimes for inference. This project sought a transparent, lightweight, CPU-runnable classifier that operates directly on interpretable spatial texture statistics rather than opaque neural embeddings.",
            },
          ],
        },
        {
          id: "feature-engineering",
          heading: "Texture Feature Extraction Pipeline",
          blocks: [
            {
              type: "paragraph",
              text: "The extraction pipeline combines two complementary structural texture descriptors to capture both fine-grained roughness and broader spatial pixel relationships:",
            },
            {
              type: "list",
              items: [
                "Local Binary Patterns (LBP): Computes circular neighborhood comparisons (P=8, R=1) to capture micro-edge distributions and high-frequency noise typical of generative upscalers.",
                "Gray-Level Co-occurrence Matrix (GLCM): Evaluates second-order joint probability distributions of gray-level transitions across multiple orientations (0°, 45°, 90°, 135°), extracting contrast, dissimilarity, homogeneity, energy, and correlation.",
                "Illumination Invariance: Normalizes input images prior to matrix computation to prevent ambient lighting gradients from confounding textural feature calculation.",
              ],
            },
            {
              type: "code",
              language: "python",
              text: "# Illustrative feature extraction pipeline snippet\nimport cv2\nfrom skimage.feature import local_binary_pattern, graycomatrix, graycoprops\n\ndef extract_texture_vector(image_gray):\n    lbp = local_binary_pattern(image_gray, P=8, R=1, method='uniform')\n    lbp_hist, _ = np.histogram(lbp.ravel(), bins=10, range=(0, 10), density=True)\n    glcm = graycomatrix(image_gray, distances=[1], angles=[0, np.pi/4, np.pi/2, 3*np.pi/4], symmetric=True, normed=True)\n    contrast = graycoprops(glcm, 'contrast').mean()\n    homogeneity = graycoprops(glcm, 'homogeneity').mean()\n    energy = graycoprops(glcm, 'energy').mean()\n    correlation = graycoprops(glcm, 'correlation').mean()\n    return np.hstack([lbp_hist, [contrast, homogeneity, energy, correlation]])",
            },
          ],
        },
        {
          id: "model-architecture",
          heading: "Classifier Training and Probability Calibration",
          blocks: [
            {
              type: "paragraph",
              text: "Extracted feature vectors are standardized and passed to a Support Vector Machine with a Radial Basis Function (RBF) kernel. To provide meaningful risk scores rather than binary decisions, the classifier applies Platt scaling via probability calibration.",
            },
            {
              type: "paragraph",
              text: "Trained scaler and model artifacts are serialized using joblib, enabling instant local CPU inference with zero external API dependencies or network latency.",
            },
          ],
        },
        {
          id: "results-and-limitations",
          heading: "Verified Performance and Forensic Boundaries",
          blocks: [
            {
              type: "paragraph",
              text: "On a deterministic 80/20 train/test evaluation split, the calibrated model demonstrated 78.5% held-out test accuracy across test sets.",
            },
            {
              type: "list",
              items: [
                "Heavy JPEG re-compression degrades high-frequency LBP micro-textures, reducing detection confidence.",
                "Handcrafted texture features remain sensitive to input scaling; images should be evaluated at native or standardized resolutions.",
                "Designed for forensic exploration; not claimed as an adversarial-grade enterprise defense system.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "zenith",
      slug: "zenith",
      title: "Yor Zenith",
      summary: "A full-stack solar feasibility platform combining 3D roof planning, energy-output simulation, and financial analysis.",
      contribution: "Sole developer. Architected the full-stack system, implemented the 3D roof planning viewer in Three.js and React, developed mathematical solar irradiance calculations, and integrated financial subsidy and ROI modeling.",
      revision: 1,
      links: [
        {
          label: "Source Repository",
          url: "https://github.com/yorayriniwnl/Yor-Zenith",
          checkedAt: "2026-10-01T12:00:00Z",
        },
        {
          label: "Live Demonstration",
          url: "https://zenith-xi-snowy.vercel.app",
          checkedAt: "2026-10-01T12:00:00Z",
        },
      ],
      evidence: [
        {
          id: "ev-zen-repo",
          kind: "repository",
          url: "https://github.com/yorayriniwnl/Yor-Zenith",
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Public repository with Three.js/React frontend and Python/FastAPI backend.",
        },
        {
          id: "ev-zen-demo",
          kind: "deployment",
          url: "https://zenith-xi-snowy.vercel.app",
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Live interactive 3D solar feasibility planner hosted on Vercel.",
        },
      ],
      sections: [
        {
          id: "domain-context",
          heading: "Solar Feasibility Decision Support",
          blocks: [
            {
              type: "paragraph",
              text: "Residential and commercial rooftop solar planning typically requires expensive specialized CAD modeling or on-site engineering surveys. Property owners lack accessible tools to quickly visualize panel arrangements, understand seasonal yield variation, and calculate capital payback timelines.",
            },
            {
              type: "paragraph",
              text: "Yor Zenith delivers an integrated browser-based workflow bridging spatial layout and investment decision-making in one interface.",
            },
          ],
        },
        {
          id: "spatial-engine",
          heading: "3D Spatial Modeling & Panel Placement",
          blocks: [
            {
              type: "paragraph",
              text: "The frontend provides a real-time 3D workspace authored with Three.js and React. Users configure parametric roof dimensions, pitch angles, azimuth orientation, and perimeter setbacks.",
            },
            {
              type: "list",
              items: [
                "Interactive raycasting to test solar module grid arrangements and surface fit.",
                "Obstacle boundary definition for roof vents, chimneys, and skylights.",
                "Real-time visual shadow direction cues based on solar elevation angles.",
              ],
            },
          ],
        },
        {
          id: "simulation-and-finance",
          heading: "Irradiance Calculation & Financial Return",
          blocks: [
            {
              type: "paragraph",
              text: "The simulation engine models seasonal incident solar energy based on geographical latitude, roof tilt, and compass orientation:",
            },
            {
              type: "code",
              language: "typescript",
              text: "// Mathematical solar irradiance estimation model\nexport function calculateSolarYield(params: {\n  panelCapacityKw: number;\n  tiltDegrees: number;\n  azimuthDegrees: number;\n  annualSunHours: number;\n  systemEfficiency: number;\n}): { annualKwh: number; monthlyDistribution: number[] } {\n  const orientationFactor = Math.cos((params.azimuthDegrees - 180) * (Math.PI / 180)) * 0.15 + 0.85;\n  const tiltFactor = Math.cos((params.tiltDegrees - 25) * (Math.PI / 180)) * 0.10 + 0.90;\n  const annualKwh = params.panelCapacityKw * params.annualSunHours * params.systemEfficiency * orientationFactor * tiltFactor;\n  // Monthly irradiance distribution coefficients\n  const weights = [0.06, 0.07, 0.09, 0.10, 0.11, 0.11, 0.10, 0.09, 0.09, 0.08, 0.05, 0.05];\n  return { annualKwh: Math.round(annualKwh), monthlyDistribution: weights.map(w => Math.round(annualKwh * w)) };\n}",
            },
            {
              type: "paragraph",
              text: "Financial modeling factors in gross equipment cost, estimated national/state clean energy subsidies, electricity tariff savings, and projected investment payback periods.",
            },
          ],
        },
        {
          id: "limitations",
          heading: "Technical Invariants and Limitations",
          blocks: [
            {
              type: "paragraph",
              text: "The irradiance model uses trigonometric solar path equations rather than high-resolution satellite LIDAR point clouds. Financial projections use user-configurable utility rate presets rather than live dynamic utility billing API feeds.",
            },
          ],
        },
      ],
    },
    {
      id: "helios",
      slug: "helios",
      title: "Yor Helios",
      summary: "An energy-monitoring platform streaming anomaly and threshold events into channel-specific operator dashboards.",
      contribution: "Sole developer. Architected the asynchronous event-streaming backend using Python and FastAPI, designed WebSocket subscription channels, built threshold anomaly detection rules, and containerized the system with Docker Compose.",
      revision: 1,
      links: [
        {
          label: "Source Repository",
          url: "https://github.com/yorayriniwnl/Yor-Helios",
          checkedAt: "2026-10-01T12:00:00Z",
        },
      ],
      evidence: [
        {
          id: "ev-hel-repo",
          kind: "repository",
          url: "https://github.com/yorayriniwnl/Yor-Helios",
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Public repository with FastAPI asynchronous streaming server and Docker Compose orchestration.",
        },
        {
          id: "ev-hel-status",
          kind: "document",
          url: null,
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Project is in active development with runnable Docker Compose local environment; live cloud production hosting is not deployed.",
        },
      ],
      sections: [
        {
          id: "architecture",
          heading: "Streaming Architecture & Event Broker",
          blocks: [
            {
              type: "paragraph",
              text: "Industrial and commercial facility power monitoring requires immediate detection of voltage spikes, sustained overcurrent, and phase imbalances. Yor Helios provides a lightweight event pipeline designed for low-overhead local or edge deployment.",
            },
            {
              type: "paragraph",
              text: "Built on FastAPI and Python's asyncio event loop, the backend ingests incoming energy telemetry streams and broadcasts parsed anomaly events over persistent WebSocket connections.",
            },
            {
              type: "image",
              mediaId: "missing-helios-diagram",
              alt: "Yor Helios edge telemetry architecture diagram",
              caption: "Figure 1: Architectural topology under review for public asset publication.",
            },
          ],
        },
        {
          id: "anomaly-engine",
          heading: "Threshold Engine & Channel Subscriptions",
          blocks: [
            {
              type: "list",
              items: [
                "Channel-Specific Subscriptions: Operators can isolate alerts by electrical bus, facility zone, or severity rating.",
                "Sliding Window Anomaly Rules: Tracks short-term rolling averages to differentiate transient motor inrush spikes from sustained overloads.",
                "Heartbeat & Reconnection Protocol: Provides connection liveness verification and resilient automated client re-connection.",
              ],
            },
            {
              type: "code",
              language: "python",
              text: "# WebSocket broadcaster and channel routing\nfrom fastapi import FastAPI, WebSocket, WebSocketDisconnect\n\nclass ConnectionManager:\n    def __init__(self):\n        self.active_channels: dict[str, list[WebSocket]] = {}\n\n    async def connect(self, channel: str, websocket: WebSocket):\n        await websocket.accept()\n        self.active_channels.setdefault(channel, []).append(websocket)\n\n    def disconnect(self, channel: str, websocket: WebSocket):\n        if channel in self.active_channels and websocket in self.active_channels[channel]:\n            self.active_channels[channel].remove(websocket)\n\n    async def broadcast_alert(self, channel: str, event: dict):\n        for connection in self.active_channels.get(channel, []):\n            await connection.send_json(event)",
            },
          ],
        },
        {
          id: "deployment-status",
          heading: "Development Status & Scope",
          blocks: [
            {
              type: "paragraph",
              text: "Yor Helios is containerized using Docker Compose for one-command local reproduction. In accordance with honest disclosure standards, this platform is in development: no live cloud production cluster or physical sensor hardware integration is active.",
            },
          ],
        },
      ],
    },
    {
      id: "talks",
      slug: "talks",
      title: "Yor Talks V2",
      summary: "A full-stack communication platform with realtime messaging, typed interface components, and a documented public-beta path.",
      contribution: "Sole developer. Built the reactive user interface in React, Vite, and TypeScript; engineered the Express backend and WebSocket event broker with Socket.IO; designed the relational database schema and queries using Drizzle ORM and PostgreSQL.",
      revision: 1,
      links: [
        {
          label: "Source Repository",
          url: "https://github.com/yorayriniwnl/yor-talksv2",
          checkedAt: "2026-10-01T12:00:00Z",
        },
        {
          label: "Live Demonstration",
          url: "https://yor-talks.vercel.app",
          checkedAt: "2026-10-01T12:00:00Z",
        },
      ],
      evidence: [
        {
          id: "ev-tlk-repo",
          kind: "repository",
          url: "https://github.com/yorayriniwnl/yor-talksv2",
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Public repository containing full-stack TypeScript codebase, Drizzle ORM migrations, and Socket.IO server.",
        },
        {
          id: "ev-tlk-demo",
          kind: "deployment",
          url: "https://yor-talks.vercel.app",
          checkedAt: "2026-10-01T12:00:00Z",
          status: "verified",
          note: "Live demonstration instance hosted on Vercel.",
        },
      ],
      sections: [
        {
          id: "communication-layer",
          heading: "Realtime Communication Architecture",
          blocks: [
            {
              type: "paragraph",
              text: "Yor Talks V2 was engineered to explore responsive messaging patterns, end-to-end TypeScript type safety, and efficient relational persistence for multi-channel chat environments.",
            },
            {
              type: "paragraph",
              text: "The application separates concerns between an Express-based HTTP REST API for authentication and workspace operations, and a Socket.IO broker for bidirectional conversation rooms and typing telemetry.",
            },
          ],
        },
        {
          id: "data-model",
          heading: "Relational Persistence & Schemas",
          blocks: [
            {
              type: "paragraph",
              text: "Database access is governed by PostgreSQL with schemas defined in TypeScript via Drizzle ORM:",
            },
            {
              type: "list",
              items: [
                "Workspaces and Channels: Structured isolation with foreign-key referential integrity.",
                "Messages & Receipts: Indexed conversation history optimized for chronological cursor pagination.",
                "Optimistic Client Updates: Messages render immediately in the client UI and update upon server confirmation.",
              ],
            },
            {
              type: "code",
              language: "typescript",
              text: "// Relational message schema declaration in Drizzle ORM\nimport { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';\n\nexport const messages = pgTable('messages', {\n  id: uuid('id').defaultRandom().primaryKey(),\n  channelId: uuid('channel_id').notNull(),\n  userId: uuid('user_id').notNull(),\n  content: text('content').notNull(),\n  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),\n});",
            },
          ],
        },
        {
          id: "current-status",
          heading: "Demo Status & Limitations",
          blocks: [
            {
              type: "paragraph",
              text: "Yor Talks V2 operates as a publicly accessible demonstration. It does not provide end-to-end encryption or multi-region database clustering. All claims reflect the verified repository and live demonstration instance.",
            },
          ],
        },
      ],
    },
  ],
};
