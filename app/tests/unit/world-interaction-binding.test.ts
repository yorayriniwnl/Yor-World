import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { ExperienceController } from "../../src/features/experience/controller";
import { WorldInteractionBinding } from "../../src/features/world/WorldInteractionBinding";

function pointer(type: "pointerdown" | "pointerup", x = 50, y = 50): Event {
  return Object.assign(new Event(type), { button: 0, pointerId: 7, clientX: x, clientY: y });
}

function fixture() {
  const scene = new THREE.Scene();
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.2), new THREE.MeshBasicMaterial());
  monitor.name = "monitor";
  scene.add(monitor);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20);
  camera.position.z = 5;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  const canvas = Object.assign(new EventTarget(), {
    style: { cursor: "" },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  }) as unknown as HTMLCanvasElement;
  const controller = new ExperienceController();
  const binding = new WorldInteractionBinding({
    canvas, camera, scene, controller, enabled: () => true, reducedMotion: () => false,
  });
  return { scene, monitor, camera, canvas, controller, binding };
}

function attachMonitorProxy(binding: WorldInteractionBinding, width = 2.4): void {
  const interactionScene = new THREE.Group();
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(width, 1, 0.2), new THREE.MeshBasicMaterial());
  proxy.userData["isHitProxy"] = true;
  proxy.userData["assetId"] = "main-monitor";
  interactionScene.add(proxy);
  expect(binding.attachInteractionScene(interactionScene)).toBe(true);
}

function click(canvas: HTMLCanvasElement, x = 50, y = 50): void {
  canvas.dispatchEvent(pointer("pointerdown", x, y));
  canvas.dispatchEvent(pointer("pointerup", x, y));
}

describe("WorldInteractionBinding production mesh activation", () => {
  it("opens the launcher from a raycast hit on the named monitor mesh", () => {
    const { monitor, canvas, controller, binding } = fixture();
    click(canvas);

    expect(binding.getDiagnostics().lastActivatedId).toBe("main-monitor");
    expect(controller.getSnapshot().activePanel).toBe("launcher");

    binding.dispose();
    controller.stop();
    monitor.geometry.dispose();
    monitor.material.dispose();
  });

  it("uses a valid optional proxy just outside the visible monitor geometry", () => {
    const { monitor, canvas, controller, binding } = fixture();
    attachMonitorProxy(binding);
    // At this point the visible 2 m monitor misses, while the 2.4 m proxy
    // intersects and remains within the production bounds expanded by 0.12 m.
    click(canvas, 69);

    expect(binding.getDiagnostics().lastActivatedId).toBe("main-monitor");
    expect(controller.getSnapshot().activePanel).toBe("launcher");

    binding.dispose();
    controller.stop();
    monitor.geometry.dispose();
    monitor.material.dispose();
  });

  it("does not let an optional proxy activate a monitor behind a visible solid mesh", () => {
    const { scene, monitor, canvas, controller, binding } = fixture();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.2), new THREE.MeshBasicMaterial());
    wall.name = "opaque-wall";
    wall.position.z = 2;
    scene.add(wall);
    attachMonitorProxy(binding);
    click(canvas);

    expect(binding.getDiagnostics().lastActivatedId).toBeNull();
    expect(controller.getSnapshot().activePanel).toBeNull();

    binding.dispose();
    controller.stop();
    monitor.geometry.dispose();
    (monitor.material as THREE.Material).dispose();
    wall.geometry.dispose();
    (wall.material as THREE.Material).dispose();
  });

  it("does not let an optional proxy activate a hidden production target", () => {
    const { monitor, canvas, controller, binding } = fixture();
    monitor.visible = false;
    attachMonitorProxy(binding);
    click(canvas);

    expect(binding.getDiagnostics().lastActivatedId).toBeNull();
    expect(controller.getSnapshot().activePanel).toBeNull();

    binding.dispose();
    controller.stop();
    monitor.geometry.dispose();
    monitor.material.dispose();
  });
});
