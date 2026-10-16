import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExperienceController } from "../../src/features/experience/controller";
import { WorldInteractionBinding } from "../../src/features/world/WorldInteractionBinding";

function fakeCanvas() {
  return Object.assign(new EventTarget(), {
    style: { cursor: "" },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  }) as unknown as HTMLCanvasElement;
}

describe("WorldInteractionBinding optional hit proxies", () => {
  afterEach(() => vi.restoreAllMocks());

  it("attaches late proxies once, keeps them hidden, and clears them on disposal", () => {
    const canvas = fakeCanvas();
    const binding = new WorldInteractionBinding({
      canvas,
      camera: new THREE.PerspectiveCamera(),
      scene: new THREE.Scene(),
      controller: new ExperienceController(),
      enabled: () => true,
      reducedMotion: () => false,
    });
    const optionalScene = new THREE.Group();
    const hitProxy = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    hitProxy.userData["isHitProxy"] = true;
    hitProxy.userData["assetId"] = "main-monitor";
    optionalScene.add(hitProxy);

    expect(binding.getDiagnostics().frozenHitProxyCount).toBe(0);
    binding.addInteractionScene(optionalScene);
    binding.addInteractionScene(optionalScene);

    expect(hitProxy.visible).toBe(false);
    expect(binding.getDiagnostics().frozenHitProxyCount).toBe(1);
    binding.dispose();
    expect(binding.getDiagnostics().frozenHitProxyCount).toBe(0);
    expect(canvas.style.cursor).toBe("");
  });
});
