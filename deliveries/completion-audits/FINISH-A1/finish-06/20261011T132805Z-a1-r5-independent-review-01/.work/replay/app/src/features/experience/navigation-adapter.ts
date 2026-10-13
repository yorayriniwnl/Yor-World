import type { PublicRoute } from "@/contracts/experience";
import { ProjectIdSchema, type ProjectId } from "@/contracts/content";
import type { ExperienceController } from "./controller";
import { saveReturnSnapshot } from "./return-snapshot";
import { UnknownProjectError, UnpublishedProjectError } from "./project-transition";

export interface NavigationTargetRouter {
  push: (href: string) => void;
  replace?: (href: string) => void;
  back?: () => void;
}

export interface NavigationAdapterOptions {
  controller?: ExperienceController | null;
  router?: NavigationTargetRouter | null;
  onTransitionStart?: (projectId: ProjectId) => void;
  onTransitionCancel?: (projectId: ProjectId) => void;
  onTransitionComplete?: (projectId: ProjectId) => void;
  onError?: (error: Error) => void;
}

export class NavigationAdapter {
  private controller: ExperienceController | null = null;
  private router: NavigationTargetRouter | null = null;
  private currentAbortController: AbortController | null = null;
  private inFlightProjectId: ProjectId | null = null;

  constructor(private readonly options: NavigationAdapterOptions = {}) {
    this.controller = options.controller ?? null;
    this.router = options.router ?? null;
  }

  public setController(controller: ExperienceController | null): void {
    this.controller = controller;
  }

  public setRouter(router: NavigationTargetRouter | null): void {
    this.router = router;
  }

  public isTransitioning(): boolean {
    return this.inFlightProjectId !== null;
  }

  public getInFlightProject(): ProjectId | null {
    return this.inFlightProjectId;
  }

  /**
   * Cancel any in-flight transitions immediately.
   */
  public cancelTransitions(): void {
    if (this.currentAbortController) {
      const canceled = this.inFlightProjectId;
      this.currentAbortController.abort("DIRECT_NAVIGATION_CANCELLATION");
      this.currentAbortController = null;
      this.inFlightProjectId = null;
      if (canceled) {
        this.options.onTransitionCancel?.(canceled);
      }
    }
  }

  /**
   * Open a verified project case study.
   * Cancels any prior in-flight project transition to guarantee rapid switching without stale navigation.
   */
  public openProject(projectId: ProjectId): void {
    // Validate schema
    const check = ProjectIdSchema.safeParse(projectId);
    if (!check.success) {
      const err = new UnknownProjectError(String(projectId));
      this.options.onError?.(err);
      throw err;
    }

    // Reject unpublished candidates
    if (projectId === "candidatex") {
      const err = new UnpublishedProjectError(projectId);
      this.options.onError?.(err);
      throw err;
    }

    // Cancel prior transition if active (rapid project switching protection)
    this.cancelTransitions();

    const abortController = new AbortController();
    this.currentAbortController = abortController;
    this.inFlightProjectId = projectId;
    this.options.onTransitionStart?.(projectId);

    // Save snapshot of current room preferences/camera before navigating
    if (this.controller) {
      const snap = this.controller.getSnapshot();
      saveReturnSnapshot({
        preferences: snap.preferences,
        world: snap.world,
        lastProjectId: projectId,
        previousCamera: snap.activeCamera,
      });
    }

    const targetUrl = `/projects/${projectId}`;

    // If an ExperienceController is available and 3D experience is active,
    // dispatch Tier 2 OPEN_PROJECT intent to let the controller coordinate camera/character
    if (this.controller) {
      this.controller.send({
        type: "OPEN_PROJECT",
        projectId,
        source: "dom",
      });
    }

    // Direct routing fallback or completion execution
    if (!this.controller) {
      this.executeNavigation(targetUrl);
      this.inFlightProjectId = null;
      this.currentAbortController = null;
      this.options.onTransitionComplete?.(projectId);
    }
  }

  /**
   * Navigate to a public route directly.
   * Direct DOM navigation cancels any in-flight transition immediately.
   */
  public openRoute(path: PublicRoute): void {
    // Direct DOM navigation cancels immediately
    this.cancelTransitions();

    if (this.controller) {
      this.controller.send({
        type: "NAVIGATE",
        path,
        source: "dom",
        camera: null,
      });
    }

    this.executeNavigation(path);
  }

  private executeNavigation(url: string): void {
    if (this.router) {
      this.router.push(url);
    } else if (typeof window !== "undefined") {
      window.location.href = url;
    }
  }
}
