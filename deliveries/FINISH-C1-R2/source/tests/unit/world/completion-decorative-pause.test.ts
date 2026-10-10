import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CharacterDirector } from "../../../src/features/world/CharacterDirector";
import { CLIP_DURATIONS } from "../../../src/features/world/SceneIntegrator";

function createMockMixerAndActions() {
  const avatarScene = new THREE.Group();
  const fixtureScene = new THREE.Group();
  const avatarMixer = new THREE.AnimationMixer(avatarScene);
  const chairMixer = new THREE.AnimationMixer(fixtureScene);

  const avatarActions: Record<string, THREE.AnimationAction> = {};
  const chairActions: Record<string, THREE.AnimationAction> = {};

  for (const [name, dur] of Object.entries(CLIP_DURATIONS)) {
    const track = new THREE.VectorKeyframeTrack(".position", [0, dur], [0, 0, 0, 1, 1, 1]);
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

describe("Completion: Ambient vs Finite Action Pause Separation", () => {
  it("freezes ambient idle updates during decorative pause but permits full greeting completion", () => {
    const { director } = createMockMixerAndActions();

    // Verify ambient idle is frozen when decorative pause is enabled
    director.setDecorativePaused(true);
    expect(director.isDecorativePaused).toBe(true);

    director.advance(0.5);
    expect(director.currentTime).toBe(0);
    expect(director.currentClip).toBe("coding_idle");

    // Finite greeting action can be triggered even while decoratively paused
    director.playGreeting();
    expect(director.mode).toBe("sequence");
    expect(director.currentClip).toBe("notice_visitor");

    // Sequences advance normally regardless of decorative pause
    director.advance(0.6);
    expect(director.currentClip).toBe("turn_to_visitor");

    director.advance(1.2);
    expect(director.currentClip).toBe("greeting_nod");

    director.advance(0.9);
    expect(director.currentClip).toBe("return_to_work");

    director.advance(1.3);
    // Sequence returns to coding mode safely
    expect(director.mode).toBe("coding");
    expect(director.currentClip).toBe("coding_idle");

    // And once back in coding mode, it remains decoratively paused
    director.advance(0.5);
    expect(director.currentTime).toBe(0);
  });
});
