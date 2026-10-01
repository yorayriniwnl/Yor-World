import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CharacterDirector, ActionPriority } from "../../src/features/world/CharacterDirector";
import { CLIP_DURATIONS } from "../../src/features/world/SceneIntegrator";

function createMockMixerAndActions() {
  const avatarScene = new THREE.Group();
  const fixtureScene = new THREE.Group();
  const avatarMixer = new THREE.AnimationMixer(avatarScene);
  const chairMixer = new THREE.AnimationMixer(fixtureScene);

  const avatarActions: Record<string, THREE.AnimationAction> = {};
  const chairActions: Record<string, THREE.AnimationAction> = {};

  for (const [name, dur] of Object.entries(CLIP_DURATIONS)) {
    const track = new THREE.VectorKeyframeTrack(".position", [0, dur], [0, 0, 0, 0, 0, 0]);
    const clip = new THREE.AnimationClip(name, dur, [track]);
    avatarActions[name] = avatarMixer.clipAction(clip);
    chairActions[name] = chairMixer.clipAction(clip);
  }

  const bodyTurn = new THREE.Group();
  const chairRoot = new THREE.Group();

  return {
    avatarMixer,
    chairMixer,
    bodyTurn,
    chairRoot,
    director: new CharacterDirector(
      avatarMixer,
      chairMixer,
      avatarActions,
      chairActions,
      bodyTurn,
      chairRoot,
      "primary-character-director"
    ),
  };
}

describe("CharacterDirector - Production Resident Behavior (Task B4 / B5)", () => {
  it("establishes single full-body action ownership", () => {
    const { director } = createMockMixerAndActions();
    expect(director.getOwnerId()).toBe("primary-character-director");
    expect(director.ownerId).toBe("primary-character-director");
  });

  it("initializes in coding_idle at time 0 with IDLE priority", () => {
    const { director } = createMockMixerAndActions();
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
    expect(director.currentTime).toBe(0);
    expect(director.activePriority).toBe(ActionPriority.IDLE);
  });

  it("supports all 8 clips in the V1 art and interaction specification", () => {
    const expectedClips = [
      "coding_idle",
      "mouse_idle",
      "notice_visitor",
      "turn_to_visitor",
      "greeting_nod",
      "return_to_work",
      "attention_glance",
      "breathing_idle",
    ];
    for (const clip of expectedClips) {
      expect(CLIP_DURATIONS[clip]).toBeDefined();
      expect(CLIP_DURATIONS[clip]).toBeGreaterThan(0);
    }
  });

  it("advances through the full greeting sequence and returns to coding_idle", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();
    expect(director.mode).toBe("sequence");
    expect(director.currentClip).toBe("notice_visitor");

    // Advance through notice_visitor (0.6s)
    director.advance(0.3);
    expect(director.currentClip).toBe("notice_visitor");
    expect(director.currentTime).toBeCloseTo(0.3);

    director.advance(0.4);
    // Should transition to turn_to_visitor
    expect(director.currentClip).toBe("turn_to_visitor");

    // Advance through turn_to_visitor (1.2s)
    director.advance(1.2);
    expect(director.currentClip).toBe("greeting_nod");

    // Advance through greeting_nod (0.9s)
    director.advance(0.9);
    expect(director.currentClip).toBe("return_to_work");

    // Advance through return_to_work (1.3s)
    director.advance(1.3);
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
  });

  it("enforces priority arbitration: ambient request rejected when interaction is running", async () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting(undefined, ActionPriority.INTERACTION);
    expect(director.activePriority).toBe(ActionPriority.INTERACTION);

    // Attempting ambient action should reject
    await expect(
      director.play("mouse_idle", undefined, { priority: ActionPriority.AMBIENT })
    ).rejects.toThrow(/lower priority/);

    expect(director.mode).toBe("sequence");
  });

  it("enforces priority arbitration: entrance overrides lower-priority actions", () => {
    const { director } = createMockMixerAndActions();
    director.play("mouse_idle", undefined, { priority: ActionPriority.AMBIENT });
    expect(director.activePriority).toBe(ActionPriority.AMBIENT);

    // Entrance priority (3) overrides ambient (1)
    director.play("turn_to_visitor", undefined, { priority: ActionPriority.ENTRANCE });
    expect(director.activePriority).toBe(ActionPriority.ENTRANCE);
    expect(director.currentClip).toBe("turn_to_visitor");
  });

  it("fixes W2 velocity discontinuity: cancel() uses 150-250ms smooth transition blending", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();

    // Advance 0.6s notice + 0.6s into turn
    director.advance(1.2);
    expect(director.currentClip).toBe("turn_to_visitor");

    // Cancel with smooth 200ms blend window
    director.cancel({ immediate: false, blendMs: 200 });
    expect(director.mode).toBe("safe-return");

    const diag = director.getDiagnostics();
    expect(diag.isBlending).toBe(true);

    // Advance halfway through blend window (100ms)
    director.advance(0.10);
    expect(director.getDiagnostics().isBlending).toBe(true);

    // Advance past blend window (150ms more)
    director.advance(0.15);
    expect(director.getDiagnostics().isBlending).toBe(false);

    // Complete the return to work
    director.advance(2.0);
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
  });

  it("safe cancellation from notice_visitor smoothly blends back to coding_idle", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();

    // In notice_visitor
    director.advance(0.3);
    expect(director.currentClip).toBe("notice_visitor");

    director.cancel({ blendMs: 200 });
    expect(director.getDiagnostics().isBlending).toBe(true);

    // Complete blend
    director.advance(0.25);
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
  });

  it("playAttentionGlance resolves upon 1.2s finite clip completion", async () => {
    const { director } = createMockMixerAndActions();
    let completed = false;

    const promise = director.playAttentionGlance().then(() => {
      completed = true;
    });

    expect(director.currentClip).toBe("attention_glance");
    director.advance(0.6);
    expect(completed).toBe(false);

    director.advance(0.7);
    await promise;
    expect(completed).toBe(true);
    expect(director.currentClip).toBe("coding_idle");
  });

  it("playMouseIdle resolves upon 2.0s finite clip completion", async () => {
    const { director } = createMockMixerAndActions();
    let completed = false;

    const promise = director.playMouseIdle().then(() => {
      completed = true;
    });

    expect(director.currentClip).toBe("mouse_idle");
    director.advance(1.5);
    expect(completed).toBe(false);

    director.advance(0.6);
    await promise;
    expect(completed).toBe(true);
    expect(director.currentClip).toBe("coding_idle");
  });

  it("immediately settles to coding_idle on settle() within <=50ms (instant skip / escape)", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();
    director.advance(1.5); // Mid-turn
    expect(director.currentClip).toBe("turn_to_visitor");

    // Immediate settle (Skip / Escape)
    const startTime = performance.now();
    director.settle();
    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThanOrEqual(50);
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
    expect(director.currentTime).toBe(0);
  });

  it("alias settleToWork() conforms to canonical B4/B5 interface", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();
    director.advance(1.0);
    director.settleToWork();
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
  });

  it("survives 20 repeated greeting, glance, and cancel cycles without root drift or stuck state", () => {
    const { director, bodyTurn, chairRoot } = createMockMixerAndActions();
    const initialBodyRot = bodyTurn.rotation.clone();
    const initialChairRot = chairRoot.rotation.clone();

    for (let i = 0; i < 20; i++) {
      if (i % 3 === 0) {
        // Full sequence
        director.playGreeting();
        director.advance(4.0);
      } else if (i % 3 === 1) {
        // Interrupted turn
        director.playGreeting();
        director.advance(1.0);
        director.cancel({ blendMs: 200 });
        director.advance(2.0);
      } else {
        // Attention glance
        director.playAttentionGlance();
        director.advance(1.5);
      }
      expect(director.mode).toBe("coding");
      expect(director.currentClip).toBe("coding_idle");
    }

    // Measure root drift
    expect(Math.abs(bodyTurn.rotation.x - initialBodyRot.x)).toBeLessThan(0.001);
    expect(Math.abs(bodyTurn.rotation.y - initialBodyRot.y)).toBeLessThan(0.001);
    expect(Math.abs(bodyTurn.rotation.z - initialBodyRot.z)).toBeLessThan(0.001);
  });

  it("dispose() cleanly halts mixers, actions, and resets state", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();
    director.advance(1.0);
    director.dispose();

    expect(director.getDiagnostics().queueLength).toBe(0);
    expect(director.getDiagnostics().isBlending).toBe(false);
  });
});
