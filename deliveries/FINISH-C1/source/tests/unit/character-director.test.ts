import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CharacterDirector } from "../../src/features/world/CharacterDirector";
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
    director: new CharacterDirector(
      avatarMixer,
      chairMixer,
      avatarActions,
      chairActions,
      bodyTurn,
      chairRoot
    ),
  };
}

describe("CharacterDirector", () => {
  it("initializes in coding_idle at time 0", () => {
    const { director } = createMockMixerAndActions();
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
    expect(director.currentTime).toBe(0);
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

  it("safely reverses along authored path on cancel()", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();

    // Advance 0.6s into notice + 0.6s into turn
    director.advance(1.2);
    expect(director.currentClip).toBe("turn_to_visitor");

    // Trigger cancel
    director.cancel();
    expect(director.mode).toBe("safe-return");

    // Advance through reversal back to rest
    director.advance(3.0);
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
  });

  it("immediately settles to coding_idle on settle() within ≤50ms (instant skip)", () => {
    const { director } = createMockMixerAndActions();
    director.playGreeting();
    director.advance(1.5); // Mid-turn
    expect(director.currentClip).toBe("turn_to_visitor");

    // Immediate settle (Skip / Escape)
    director.settle();
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
    expect(director.currentTime).toBe(0);
  });

  it("schedules initial coding_idle AnimationAction immediately on instantiation (CA-07)", () => {
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

    const director = new CharacterDirector(
      avatarMixer, chairMixer, avatarActions, chairActions,
      new THREE.Group(), new THREE.Group()
    );

    expect(avatarActions.coding_idle?.isScheduled()).toBe(true);
    expect(chairActions.coding_idle?.isScheduled()).toBe(true);
    expect(director.currentClip).toBe("coding_idle");
    expect(director.currentTime).toBe(0);
  });

  it("freezes decorative motion when isDecorativePaused is true and preserves pause across greetings (CA-06)", () => {
    const { director } = createMockMixerAndActions();
    director.advance(1.0);
    expect(director.currentTime).toBeCloseTo(1.0);

    // Turn on decorative pause
    director.setDecorativePaused(true);
    expect(director.isDecorativePaused).toBe(true);

    // Advance 2.0s while paused in coding mode -> time should not advance
    director.advance(2.0);
    expect(director.currentTime).toBeCloseTo(1.0);

    // User triggers greeting finite sequence
    director.playGreeting();
    expect(director.mode).toBe("sequence");

    // Finite sequence advances to completion
    director.advance(4.5);
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");
    expect(director.currentTime).toBe(0);

    // Still paused after greeting returns to coding
    expect(director.isDecorativePaused).toBe(true);
    director.advance(1.0);
    expect(director.currentTime).toBe(0);

    // Resume
    director.setDecorativePaused(false);
    director.advance(1.0);
    expect(director.currentTime).toBeCloseTo(1.0);
  });
});
