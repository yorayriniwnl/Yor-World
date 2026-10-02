import * as THREE from "three";
import type { ExperienceController } from "../experience/controller";
import { InteractionRegistry } from "../experience/interaction-registry";

/** Canonical frozen production node names. Asset transforms are never rewritten. */
export const PRODUCTION_INTERACTION_NODES: Readonly<Record<string, readonly string[]>> = {
  "entrance-door": ["door-hinge"], "door-inside": ["door-hinge"],
  resident: ["resident"], chair: ["chair-root", "chair-base"],
  "wall-painting": ["painting-pivot"], "hidden-yor-mark": ["hidden-yor-mark"],
  "main-monitor": ["monitor"], keyboard: ["keyboard_body", "keycaps_main"], mouse: ["mouse_body"],
  "helios-pc": ["helios-pc"], "zenith-model": ["zenith-model"],
  "ai-real-camera": ["ai-real-camera"], "talks-microphone": ["talks-microphone"],
  "desk-lamp": ["Light_TaskDownlight", "lightbar_chassis"],
  "window-blinds": ["window_frame", ...Array.from({ length: 12 }, (_, i) => `blind_slat_${i + 1}`)],
  "desk-clock": ["desk_clock_chassis"], "plant-leaves": ["plants"],
  speakers: ["speaker_left_cabinet", "speaker_right_cabinet"],
  "skills-board": ["pegboard_system"], "research-books": ["shelves"],
  "certificate-frame": ["certificate_frame"], "contact-phone": ["contact_phone_body", "contact_phone_screen"],
};

export class WorldInteractionBinding {
  private readonly registry = new InteractionRegistry();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly targets = new Map<THREE.Object3D, string>();
  private readonly hitProxies: THREE.Object3D[] = [];
  private readonly cooldowns = new Map<string, number>();
  private readonly unsubscribers: Array<() => void> = [];
  private down: { id: string; pointerId: number; x: number; y: number } | null = null;
  private readonly painting: THREE.Object3D | undefined;
  private readonly paintingRotation: number;
  private disposed = false;
  private lastActivatedId: string | null = null;

  constructor(private readonly options: {
    canvas: HTMLCanvasElement;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Object3D;
    interactionScene?: THREE.Object3D | null | undefined;
    controller: ExperienceController;
    enabled: () => boolean;
    reducedMotion: () => boolean;
    onToggleSound?: (() => void) | undefined;
  }) {
    for (const [id, names] of Object.entries(PRODUCTION_INTERACTION_NODES)) {
      for (const name of names) {
        const node = options.scene.getObjectByName(name);
        if (node) this.targets.set(node, id);
      }
    }
    // IA supplies its accepted IDs/proxies. Visible art remains the frozen production environment.
    if (options.interactionScene) {
      options.interactionScene.updateMatrixWorld(true);
      options.interactionScene.traverse((node) => {
        node.visible = false;
        if (node.userData["isHitProxy"] === true && typeof node.userData["assetId"] === "string") {
          this.hitProxies.push(node);
        }
      });
    }
    this.painting = options.scene.getObjectByName("painting-pivot");
    this.paintingRotation = this.painting?.rotation.x ?? 0;
    this.unsubscribers.push(options.controller.painting.subscribe((state) => {
      if (this.painting) this.painting.rotation.x = this.paintingRotation + (options.reducedMotion() ? 0 : THREE.MathUtils.degToRad(state.angleDeg));
    }));
    const lamp = options.scene.getObjectByName("Light_TaskDownlight");
    const lamps: Array<{ light: THREE.Light; intensity: number }> = [];
    lamp?.traverse((node) => {
      if ((node as THREE.Light).isLight) lamps.push({ light: node as THREE.Light, intensity: (node as THREE.Light).intensity });
    });
    const blinds = Array.from({ length: 12 }, (_, index) => options.scene.getObjectByName(`blind_slat_${index + 1}`))
      .filter((node): node is THREE.Object3D => Boolean(node)).map((node) => ({ node, rotation: node.rotation.z }));
    this.unsubscribers.push(options.controller.environment.subscribe((state) => {
      for (const entry of lamps) entry.light.intensity = entry.intensity * state.lampIntensity;
      for (const entry of blinds) entry.node.rotation.z = entry.rotation + (1 - state.blindsFactor) * Math.PI / 2;
      const signature = options.scene.getObjectByName("hidden-yor-mark");
      if (signature) signature.visible = state.detailFound;
    }));
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"] as const) {
      options.canvas.addEventListener(type, this.handlePointer);
    }
  }

  private findId(event: PointerEvent): string | null {
    const rect = this.options.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.options.scene.updateMatrixWorld(true);
    this.options.camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointer, this.options.camera);
    // Actual visible production meshes have priority; IA can only broaden a matched object's hit area.
    for (const hit of this.raycaster.intersectObject(this.options.scene, true)) {
      if (!(hit.object as THREE.Mesh).isMesh) continue;
      let node: THREE.Object3D | null = hit.object;
      while (node) {
        if (!node.visible) break;
        const id = this.targets.get(node);
        if (id) return id;
        node = node.parent;
      }
      // The nearest visible solid object occludes targets behind it.
      if (hit.object.visible) break;
    }
    for (const hit of this.raycaster.intersectObjects(this.hitProxies, false)) {
      const id = String(hit.object.userData["assetId"]);
      const production = [...this.targets].find(([, targetId]) => targetId === id)?.[0];
      if (!production) continue;
      const productionBounds = new THREE.Box3().setFromObject(production).expandByScalar(0.12);
      if (productionBounds.containsPoint(hit.point)) return id;
    }
    return null;
  }

  private handlePointer = (event: PointerEvent): void => {
    if (this.disposed) return;
    if (!this.options.enabled()) {
      if (this.down && ["pointerup", "pointercancel", "lostpointercapture"].includes(event.type)) {
        this.options.controller.painting.onPointerCancel({ pointerId: event.pointerId, target: this.options.canvas });
        this.down = null;
      }
      return;
    }
    if (event.type === "pointerdown") {
      if (this.down || event.button !== 0) return;
      const id = this.findId(event);
      if (!id) return;
      this.down = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      if (id === "wall-painting") {
        this.options.controller.painting.onPointerDown({ ...event, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, target: this.options.canvas });
      }
      return;
    }
    if (event.type === "pointermove") {
      this.options.canvas.style.cursor = this.findId(event) ? "pointer" : "";
      if (this.down?.id === "wall-painting" && !this.options.reducedMotion()) {
        this.options.controller.painting.onPointerMove(event);
      }
      return;
    }
    if (!this.down || this.down.pointerId !== event.pointerId) return;
    const down = this.down;
    this.down = null;
    if (event.type !== "pointerup") {
      this.options.controller.painting.onPointerCancel({ pointerId: event.pointerId, target: this.options.canvas });
      return;
    }
    if (down.id === "wall-painting") {
      this.options.controller.painting.onPointerUp({ pointerId: event.pointerId, target: this.options.canvas });
    } else if (Math.hypot(event.clientX - down.x, event.clientY - down.y) < 8 && this.findId(event) === down.id) {
      this.activate(down.id);
    }
  };

  private activate(id: string): void {
    const entry = this.registry.get(id);
    const now = performance.now();
    if (now < (this.cooldowns.get(id) ?? 0)) return;
    this.cooldowns.set(id, now + (entry?.cooldownMs ?? 0));
    this.lastActivatedId = id;
    const controller = this.options.controller;
    const snapshot = controller.getSnapshot();
    if (id === "desk-lamp") void controller.send({ type: "SET_LAMP", enabled: !snapshot.world.lampOn });
    else if (id === "window-blinds") void controller.send({ type: "SET_BLINDS", open: !snapshot.world.blindsOpen });
    else if (id === "desk-clock") void controller.send({ type: "SET_CLOCK_FORMAT", clock24h: !snapshot.preferences.clock24h });
    else if (id === "speakers") this.options.onToggleSound?.();
    else if (id === "hidden-yor-mark") controller.painting.triggerPresetTilt();
    else if (id === "certificate-frame") void controller.send({ type: "NAVIGATE", path: "/resume", source: "room", camera: null });
    else if (entry && id !== "candidatex-launcher") void controller.send(entry.createIntent());
  }

  public getDiagnostics() {
    return { boundProductionTargets: this.targets.size, frozenHitProxyCount: this.hitProxies.length, lastActivatedId: this.lastActivatedId };
  }

  public dispose(): void {
    this.disposed = true;
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"] as const) this.options.canvas.removeEventListener(type, this.handlePointer);
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.options.controller.painting.releaseCapture();
    if (this.painting) this.painting.rotation.x = this.paintingRotation;
    this.options.canvas.style.cursor = "";
    this.targets.clear();
  }
}
