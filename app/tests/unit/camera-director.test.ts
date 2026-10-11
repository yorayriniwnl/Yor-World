import { afterEach, describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { CameraDirector, CAMERA_PRESETS } from "../../src/features/world/CameraDirector";

afterEach(() => vi.unstubAllGlobals());
function rafHarness() {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => frames.delete(handle));
  return frames;
}

function projectedPixelBounds(
  camera: THREE.PerspectiveCamera,
  points: readonly [number, number, number][],
  width: number,
  height: number,
) {
  camera.updateMatrixWorld(true);
  const pixels = points.map(([x, y, z]) => {
    const point = new THREE.Vector3(x, y, z).project(camera);
    return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 };
  });
  return {
    minX: Math.min(...pixels.map(({ x }) => x)),
    maxX: Math.max(...pixels.map(({ x }) => x)),
    minY: Math.min(...pixels.map(({ y }) => y)),
    maxY: Math.max(...pixels.map(({ y }) => y)),
  };
}

const mobileResidentOutline: readonly [number, number, number][] = [
  [0.0620000064, 0.0249999857, -0.8749999962],
  [0.5466947789, 1.0241590277, -0.3333050438],
  [0.3203431537, 1.3983394465, -0.4192868768],
  [0.1447927777, 0.4747927010, -0.2147927245],
];

const mobileMonitorOutline: readonly [number, number, number][] = [
  [-0.4799999793, 1.2400000095, -1.2932249200],
  [0.4799999814, 1.2400000095, -1.2682249389],
  [0.0299999993, 1.3199999705, -1.3800000232],
  [-0.4799999814, 0.8600000143, -1.2682249389],
];

const mobileDeskObjectOutline: readonly [number, number, number][] = [
  [0.4149999879, 0.7589999904, -0.9910000190],
  [0.4849999882, 0.7609999905, -0.8490000144],
];

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

  it("fits HOME to measured stage aspect across the six required viewports", () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera);
    const viewports = [[1440, 1000], [1920, 1080], [1024, 768], [390, 844], [320, 600], [844, 390]] as const;

    for (const [width, height] of viewports) {
      director.resize(width, height);
      const horizontalFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect));
      expect(camera.aspect).toBeCloseTo(width / height);
      if (width / height < 0.75) {
        expect(horizontalFov).toBeGreaterThanOrEqual(45);
        expect(horizontalFov).toBeLessThanOrEqual(58.1);
        expect(camera.fov).toBeLessThanOrEqual(100);
      } else if (width / height <= 4 / 3) {
        expect(horizontalFov).toBeGreaterThanOrEqual(55);
        expect(horizontalFov).toBeLessThanOrEqual(60);
        expect(camera.fov).toBeLessThanOrEqual(44);
      } else {
        expect(horizontalFov).toBeGreaterThanOrEqual(55);
        expect(horizontalFov).toBeLessThanOrEqual(76);
        expect(camera.fov).toBeLessThanOrEqual(44);
      }
    }

    expect(CAMERA_PRESETS["home-desktop"]).toMatchObject({
      position: [-1.55, 1.42, 1.05],
      target: [0, 1, -1.1],
      fov: 43,
    });
    expect(CAMERA_PRESETS["home-mobile"]).toMatchObject({
      position: [-0.33, 2.05, 0.35],
      target: [0.37, 1.08, -1.25],
      fov: 58,
    });
    expect(CAMERA_PRESETS.monitor.position).toEqual([0.0, 1.08, -0.5]);
    expect(CAMERA_PRESETS["reverse-doorway"].position).toEqual([0.2, 1.25, -1.0]);
  });

  it("keeps the resident, monitor, and desk object inside portrait HOME with room below for controls", () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera, "home-mobile");
    const viewports = [[390, 844], [320, 600]] as const;

    for (const [width, height] of viewports) {
      director.resize(width, height);
      const resident = projectedPixelBounds(camera, mobileResidentOutline, width, height);
      const monitor = projectedPixelBounds(camera, mobileMonitorOutline, width, height);
      const deskObject = projectedPixelBounds(camera, mobileDeskObjectOutline, width, height);

      expect(resident.minX).toBeGreaterThanOrEqual(12);
      expect(resident.maxX).toBeLessThanOrEqual(width - 12);
      expect(resident.minY).toBeGreaterThanOrEqual(20);
      expect(resident.maxY).toBeLessThanOrEqual(height - 56);
      expect(monitor.minX).toBeGreaterThanOrEqual(12);
      expect(monitor.maxX).toBeLessThanOrEqual(width - 12);
      expect(monitor.maxX - monitor.minX).toBeGreaterThanOrEqual(width === 320 ? 140 : 170);
      expect(deskObject.minX).toBeGreaterThanOrEqual(12);
      expect(deskObject.maxX).toBeLessThanOrEqual(width - 12);
      expect(deskObject.maxY).toBeLessThanOrEqual(height - 56);
    }

    expect(camera.fov).toBeCloseTo(92.21, 1);
    director.dispose();
  });

  it("keeps horizontal framing continuous immediately around the 3:4 aspect breakpoint", () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera, "home-desktop");
    const horizontalFovs = [7499, 7500, 7501].map((width) => {
      director.resize(width, 10000);
      return THREE.MathUtils.radToDeg(
        2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect)
      );
    });

    expect(horizontalFovs[1]).toBeCloseTo(58, 8);
    expect(Math.max(...horizontalFovs) - Math.min(...horizontalFovs)).toBeLessThan(0.01);
    director.dispose();
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

  it("settles mid-travel reduced motion immediately and a retained canceled callback cannot move it", async () => {
    const frames = rafHarness();
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 30);
    const director = new CameraDirector(camera);
    const pending = director.transitionTo("monitor", 1.2);
    const stale = [...frames.values()][0]!;
    frames.clear(); // The browser consumes a RAF before executing its callback.
    stale(performance.now() + 100);
    expect(camera.position.z).not.toBe(-0.5);
    director.setReducedMotion(true);
    await pending;
    expect(frames.size).toBe(0);
    expect(camera.position.toArray()).toEqual(CAMERA_PRESETS.monitor.position);
    stale(performance.now() + 1000);
    expect(camera.position.toArray()).toEqual(CAMERA_PRESETS.monitor.position);
  });

  it("resolves superseded and disposed travel promises without requiring another animation frame", async () => {
    const frames = rafHarness(); const camera = new THREE.PerspectiveCamera(); const director = new CameraDirector(camera);
    const old = director.transitionTo("monitor", 1.2); const stale = [...frames.values()][0]!;
    const current = director.transitionTo("pc", 1.2); await old;
    expect(frames.size).toBe(1);
    const position = camera.position.clone(); director.dispose(); await current;
    expect(frames.size).toBe(0); stale(performance.now() + 1500);
    expect(camera.position.equals(position)).toBe(true);
  });

  it("uses measured container width/aspect rather than the browser width and preserves focused destinations on resize", () => {
    vi.stubGlobal("window", { innerWidth: 1920 });
    const camera = new THREE.PerspectiveCamera(60, 16 / 9); const director = new CameraDirector(camera);
    director.resize(390, 620);
    expect(director.getCurrentPreset()).toBe("home-mobile");
    expect(camera.aspect).toBeCloseTo(390 / 620);
    const portraitFov = camera.fov; expect(portraitFov).toBeGreaterThan(CAMERA_PRESETS["home-mobile"].fov);
    director.resize(844, 330);
    expect(director.getCurrentPreset()).toBe("home-desktop");
    director.setPreset("monitor", true); const focused = camera.position.clone(); director.resize(320, 450);
    expect(director.getCurrentPreset()).toBe("monitor"); expect(camera.position.equals(focused)).toBe(true);
    expect(camera.aspect).toBeCloseTo(320 / 450);
  });
});
