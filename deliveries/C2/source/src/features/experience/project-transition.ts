import { ProjectIdSchema, type ProjectId } from "@/contracts/content";
import type { CameraId } from "@/contracts/experience";

export const MAX_TRANSITION_MS = 1400;

export interface ProjectMotif {
  id: ProjectId;
  name: string;
  camera: CameraId;
  motifStyle: "chassis-pulse" | "energy-trace" | "scanner-shimmer" | "broadcast-chime" | "unverified-alert";
  accentColor: string;
  durationMs: number;
}

export const PROJECT_MOTIFS: Record<ProjectId, ProjectMotif> = {
  helios: {
    id: "helios",
    name: "Helios Computing System",
    camera: "pc",
    motifStyle: "chassis-pulse",
    accentColor: "#f59e0b",
    durationMs: 900,
  },
  zenith: {
    id: "zenith",
    name: "Yor Zenith Solar Platform",
    camera: "energy",
    motifStyle: "energy-trace",
    accentColor: "#10b981",
    durationMs: 950,
  },
  "ai-vs-real": {
    id: "ai-vs-real",
    name: "AI vs. Real Image Classifier",
    camera: "scanner",
    motifStyle: "scanner-shimmer",
    accentColor: "#6366f1",
    durationMs: 900,
  },
  talks: {
    id: "talks",
    name: "Yor Talks Technical Broadcast",
    camera: "microphone",
    motifStyle: "broadcast-chime",
    accentColor: "#ec4899",
    durationMs: 850,
  },
  candidatex: {
    id: "candidatex",
    name: "CandidateX (Unpublished)",
    camera: "monitor",
    motifStyle: "unverified-alert",
    accentColor: "#ef4444",
    durationMs: 0,
  },
};

export class UnknownProjectError extends Error {
  constructor(public readonly projectId: string) {
    super(`Unknown project: '${projectId}'. Only verified projects can be transitioned.`);
    this.name = "UnknownProjectError";
  }
}

export class UnpublishedProjectError extends Error {
  constructor(public readonly projectId: string) {
    super(`Cannot navigate to unpublished candidate: '${projectId}'. Evidence verification pending.`);
    this.name = "UnpublishedProjectError";
  }
}

export class TransitionAbortedError extends Error {
  constructor(message = "Project transition was aborted before navigation.") {
    super(message);
    this.name = "AbortError";
  }
}

export interface TransitionOptions {
  reducedMotion?: boolean;
  onMotifStart?: (motif: ProjectMotif) => void;
  onMotifProgress?: (progress: number) => void;
}

/**
 * Executes a bounded project-selection transition respecting the 1.4s budget.
 *
 * Invariants:
 * 1. Duration <= 1400ms under all conditions.
 * 2. Reduced motion bypasses delay (0ms duration).
 * 3. AbortSignal cancellation immediately throws TransitionAbortedError; caller MUST NOT navigate.
 * 4. Unknown projects reject with UnknownProjectError.
 * 5. Unpublished candidatex rejects with UnpublishedProjectError.
 */
export async function startProjectTransition(
  projectId: ProjectId,
  signal: AbortSignal,
  options: TransitionOptions = {}
): Promise<void> {
  // Validate projectId schema
  const parsed = ProjectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    throw new UnknownProjectError(String(projectId));
  }

  // Reject unpublished candidates
  if (projectId === "candidatex") {
    throw new UnpublishedProjectError(projectId);
  }

  // Immediate abort check
  if (signal.aborted) {
    throw new TransitionAbortedError();
  }

  const motif = PROJECT_MOTIFS[projectId];
  if (!motif) {
    throw new UnknownProjectError(projectId);
  }

  options.onMotifStart?.(motif);

  // If reduced motion is requested, complete immediately without animation delay
  if (options.reducedMotion) {
    if (signal.aborted) {
      throw new TransitionAbortedError();
    }
    options.onMotifProgress?.(1.0);
    return;
  }

  // Enforce the 1.4-second maximum room transition delay budget
  const actualDurationMs = Math.min(motif.durationMs, MAX_TRANSITION_MS);

  await new Promise<void>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let animId: ReturnType<typeof requestAnimationFrame> | null = null;
    const startTime = Date.now();

    const onAbort = () => {
      cleanup();
      reject(new TransitionAbortedError());
    };

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (animId !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(animId);
      }
    };

    signal.addEventListener("abort", onAbort, { once: true });

    // Progress updates for visual motif feedback
    const tick = () => {
      if (signal.aborted) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / actualDurationMs, 1.0);
      options.onMotifProgress?.(progress);
      if (progress < 1.0 && typeof requestAnimationFrame !== "undefined") {
        animId = requestAnimationFrame(tick);
      }
    };

    if (typeof requestAnimationFrame !== "undefined") {
      animId = requestAnimationFrame(tick);
    }

    timeoutId = setTimeout(() => {
      cleanup();
      if (signal.aborted) {
        reject(new TransitionAbortedError());
      } else {
        options.onMotifProgress?.(1.0);
        resolve();
      }
    }, actualDurationMs);
  });
}
