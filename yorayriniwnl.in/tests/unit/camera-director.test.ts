import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { CameraDirector, CAMERA_PRESETS } from "../../src/features/world/CameraDirector";

describe("CameraDirector - Single Camera Owner and Smooth Transitions", () => {
  it("exposes single owner ID and owns the single camera reference", () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera, "home-desktop", "primary-camera-director");

    expect(director.getOwnerId()).toBe("primary-camera-director");
    expect(director.camera).toBe(camera);

    const diag = director.getDiagnostics();
    expect(diag.ownerId).toBe("primary-camera-director");
    expect(diag.preset).toBe("home-desktop");
  });

  it("keeps accepted framing while placing desktop HOME inside the production room", () => {
    // The frozen production wall spans X=-2.2..-2.1; C3's -2.15 camera was inside it.
    expect(CAMERA_PRESETS["home-desktop"].position).toEqual([-1.9, 1.7, 1.55]);
    expect(CAMERA_PRESETS["home-desktop"].target).toEqual([0.12, 1.25, -1.15]);
    expect(CAMERA_PRESETS["home-desktop"].fov).toBe(60);

    expect(CAMERA_PRESETS["home-mobile"].position).toEqual([-1.25, 1.48, 1.15]);
    expect(CAMERA_PRESETS["home-mobile"].target).toEqual([0.16, 1.08, -0.95]);
    expect(CAMERA_PRESETS["home-mobile"].fov).toBe(52);

    expect(CAMERA_PRESETS["monitor"].position).toEqual([0.0, 1.08, -0.5]);
    expect(CAMERA_PRESETS["reverse-doorway"].position).toEqual([0.2, 1.25, -1.0]);
  });

  it("reduced motion makes transitions instantaneous (bypasses camera travel)", async () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera, "home-desktop");
    director.setReducedMotion(true);

    await director.transitionTo("monitor", undefined, 600);

    expect(director.currentPreset).toBe("monitor");
    expect(camera.position.x).toBeCloseTo(0.0);
    expect(camera.position.y).toBeCloseTo(1.08);
    expect(camera.position.z).toBeCloseTo(-0.5);
  });

  it("settleHome immediately resets camera to home framing", () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera, "monitor");

    director.settleHome(false);
    expect(director.currentPreset).toBe("home-desktop");

    director.settleHome(true);
    expect(director.currentPreset).toBe("home-mobile");
  });

  it("disposed director cleans up abort controllers", () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera);

    director.dispose();
    expect(() => director.setPreset("monitor")).not.toThrow();
  });
});
