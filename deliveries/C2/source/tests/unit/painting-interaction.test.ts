import { describe, it, expect, vi } from "vitest";
import { PaintingController } from "../../src/features/room/painting-controller";

describe("PaintingController (Task C1: Wall Painting Interactions)", () => {
  it("suppresses click when movement reaches or exceeds 8 CSS px threshold", () => {
    const controller = new PaintingController();
    const mockTarget = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    };

    // 1. Pointer down at (100, 100)
    controller.onPointerDown({ pointerId: 1, clientX: 100, clientY: 100, target: mockTarget });
    expect(mockTarget.setPointerCapture).toHaveBeenCalledWith(1);

    // 2. Small movement < 8px (moved 4px)
    let isDrag = controller.onPointerMove({ pointerId: 1, clientX: 104, clientY: 100 });
    expect(isDrag).toBe(false);

    // 3. Exceeds 8px threshold (moved 15px) -> turns into drag!
    isDrag = controller.onPointerMove({ pointerId: 1, clientX: 115, clientY: 100 });
    expect(isDrag).toBe(true);
    expect(controller.getState().isDragging).toBe(true);

    // 4. Pointer up: wasClick must be false because it was dragged
    const wasClick = controller.onPointerUp({ pointerId: 1, target: mockTarget });
    expect(wasClick).toBe(false);
    expect(mockTarget.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it("treats movement < 8px as a tap/click and triggers preset tilt", () => {
    const controller = new PaintingController();

    controller.onPointerDown({ pointerId: 2, clientX: 50, clientY: 50 });
    // Move only 3px
    controller.onPointerMove({ pointerId: 2, clientX: 53, clientY: 50 });

    const wasClick = controller.onPointerUp({ pointerId: 2 });
    expect(wasClick).toBe(true);
    // Tap triggers preset inspection tilt (5.5 deg)
    expect(controller.getState().angleDeg).toBeCloseTo(5.5, 1);
  });

  it("strictly clamps tilt angle to [-6, +6] degrees", () => {
    const controller = new PaintingController();

    controller.setAngle(12.5);
    expect(controller.getState().angleDeg).toBe(6.0);

    controller.setAngle(-25.0);
    expect(controller.getState().angleDeg).toBe(-6.0);
  });

  it("reveals hidden detail when tilt reaches >= 5.0 degrees", () => {
    const controller = new PaintingController();
    expect(controller.getState().detailFound).toBe(false);

    // Tilt below threshold
    controller.setAngle(4.0);
    expect(controller.getState().detailFound).toBe(false);

    // Tilt reaches 5.0 degrees
    controller.setAngle(5.2);
    expect(controller.getState().detailFound).toBe(true);
  });

  it("returns to neutral (0 degrees) with damped spring within 1.2 seconds", () => {
    const controller = new PaintingController();
    controller.setAngle(6.0);
    expect(controller.getState().angleDeg).toBe(6.0);

    // Simulate 1.2 seconds of frame advances (60 FPS = 0.016s per step)
    const dt = 1 / 60;
    for (let i = 0; i < 75; i++) { // 1.25s
      controller.advance(dt);
    }

    const state = controller.getState();
    expect(state.angleDeg).toBe(0);
    expect(state.isSettled).toBe(true);
  });

  it("ignores secondary multitouch pointers while capturing primary pointer", () => {
    const controller = new PaintingController();

    const down1 = controller.onPointerDown({ pointerId: 10, clientX: 100, clientY: 100 });
    expect(down1).toBe(true);

    // Secondary touch
    const down2 = controller.onPointerDown({ pointerId: 11, clientX: 120, clientY: 120 });
    expect(down2).toBe(false);

    // Secondary move ignored
    const move2 = controller.onPointerMove({ pointerId: 11, clientX: 150, clientY: 150 });
    expect(move2).toBe(false);
  });
});
