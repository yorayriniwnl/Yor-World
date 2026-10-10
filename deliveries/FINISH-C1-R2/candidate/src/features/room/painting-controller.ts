/**
 * PaintingController manages interactive wall painting dragging,
 * 8px click-suppression threshold, 6-degree maximum tilt clamp,
 * 1.2-second damped spring restoration to neutral, pointer capture lifecycle,
 * and hidden detail revelation.
 */

export interface PaintingState {
  angleDeg: number;
  isDragging: boolean;
  activePointerId: number | null;
  detailFound: boolean;
  isSettled: boolean;
}

export interface PointerCaptureTarget {
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
}

export type PaintingListener = (state: Readonly<PaintingState>) => void;

export class PaintingController {
  public static readonly MAX_TILT_DEG = 6.0;
  public static readonly DRAG_THRESHOLD_PX = 8.0;
  public static readonly REVEAL_THRESHOLD_DEG = 5.0;
  public static readonly SETTLE_DURATION_SEC = 1.2;

  private angleDeg = 0;
  private velocityDeg = 0; // for spring dynamics
  private isDragging = false;
  private activePointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragDistance = 0;
  private detailFound = false;
  private isSettled = true;

  private listeners = new Set<PaintingListener>();

  constructor(initialDetailFound = false) {
    this.detailFound = initialDetailFound;
  }

  public subscribe(listener: PaintingListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const s = this.getState();
    for (const l of this.listeners) {
      try {
        l(s);
      } catch (err) {
        console.error("[PaintingController] Error in listener:", err);
      }
    }
  }

  public getState(): Readonly<PaintingState> {
    return {
      angleDeg: this.angleDeg,
      isDragging: this.isDragging,
      activePointerId: this.activePointerId,
      detailFound: this.detailFound,
      isSettled: this.isSettled,
    };
  }

  /**
   * Pointer down event. Captures primary pointer.
   * Multitouch ignores secondary pointers.
   */
  public onPointerDown(e: { pointerId: number; clientX: number; clientY: number; target?: PointerCaptureTarget | null }): boolean {
    if (this.activePointerId !== null && this.activePointerId !== e.pointerId) {
      return false; // ignore secondary touches
    }

    this.activePointerId = e.pointerId;
    this.isDragging = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragDistance = 0;
    this.isSettled = false;

    if (e.target && typeof e.target.setPointerCapture === "function") {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture fails
      }
    }

    this.notify();
    return true;
  }

  /**
   * Pointer move event. Evaluates 8px threshold and clamps tilt to [-6, +6] degrees.
   */
  public onPointerMove(e: { pointerId: number; clientX: number; clientY: number }): boolean {
    if (this.activePointerId !== e.pointerId) return false;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.dragDistance = Math.hypot(dx, dy);

    if (this.dragDistance >= PaintingController.DRAG_THRESHOLD_PX) {
      this.isDragging = true;
      // Map horizontal displacement: 100px drag = 6 degrees tilt
      const targetAngle = (dx / 100) * PaintingController.MAX_TILT_DEG;
      this.setAngle(targetAngle);
      return true;
    }

    return false;
  }

  /**
   * Pointer up or pointer cancel. Releases capture and starts 1.2s spring return.
   * Returns true if this was a click (moved < 8px), or false if it was a drag.
   */
  public onPointerUp(e: { pointerId: number; target?: PointerCaptureTarget | null }): boolean {
    if (this.activePointerId !== e.pointerId) return false;

    const wasClick = !this.isDragging && this.dragDistance < PaintingController.DRAG_THRESHOLD_PX;

    if (e.target && typeof e.target.releasePointerCapture === "function") {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture fails
      }
    }

    this.activePointerId = null;
    this.isDragging = false;

    if (wasClick) {
      // Tap triggers a preset tilt to reveal detail, then settles back
      this.triggerPresetTilt();
    }

    this.notify();
    return wasClick;
  }

  public onPointerCancel(e: { pointerId: number; target?: PointerCaptureTarget | null }): void {
    if (this.activePointerId !== e.pointerId) return;

    if (e.target && typeof e.target.releasePointerCapture === "function") {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    this.activePointerId = null;
    this.isDragging = false;
    this.notify();
  }

  public releaseCapture(): void {
    this.activePointerId = null;
    this.isDragging = false;
    this.notify();
  }

  /**
   * Directly sets the tilt angle clamped between -6 and +6 degrees.
   * Checks for hidden detail revelation threshold.
   */
  public setAngle(deg: number): void {
    const clamped = Math.max(-PaintingController.MAX_TILT_DEG, Math.min(PaintingController.MAX_TILT_DEG, deg));
    this.angleDeg = clamped;
    this.isSettled = false;

    if (Math.abs(clamped) >= PaintingController.REVEAL_THRESHOLD_DEG) {
      this.detailFound = true;
    }

    this.notify();
  }

  /**
   * Non-geometry or tap preset tilt: tilts to 5.5 degrees, reveals detail, and springs back.
   */
  public triggerPresetTilt(): void {
    this.setAngle(5.5);
    this.detailFound = true;
    this.notify();
  }

  /**
   * Updates spring dampening towards 0 degrees (neutral).
   * Called in RAF loop with delta time (dt in seconds).
   * Reaches neutral within 1.2s.
   */
  public advance(dt: number): void {
    if (this.isDragging || this.isSettled) return;

    // Critically damped spring towards target = 0
    const stiffness = 36.0;
    const damping = 12.0;

    const force = -stiffness * this.angleDeg - damping * this.velocityDeg;
    this.velocityDeg += force * dt;
    this.angleDeg += this.velocityDeg * dt;

    if (Math.abs(this.angleDeg) < 0.05 && Math.abs(this.velocityDeg) < 0.2) {
      this.angleDeg = 0;
      this.velocityDeg = 0;
      this.isSettled = true;
    }

    this.notify();
  }

  public reset(): void {
    this.angleDeg = 0;
    this.velocityDeg = 0;
    this.isDragging = false;
    this.activePointerId = null;
    this.isSettled = true;
    this.notify();
  }
}
