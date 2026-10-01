import { describe, it, expect } from "vitest";
import { IntentArbitrator } from "../../src/features/experience/intent-arbitration";

describe("IntentArbitrator Priority & Cooldown Matrix (Task C1)", () => {
  it("enforces priority hierarchy strictly", () => {
    const arbitrator = new IntentArbitrator();

    // Priority 1
    expect(arbitrator.getIntentPriority({ type: "ESCAPE" })).toBe(1);
    expect(arbitrator.getIntentPriority({ type: "SKIP" })).toBe(1);
    expect(arbitrator.getIntentPriority({ type: "RENDERER_FAILED", code: "FATAL" })).toBe(1);

    // Priority 2
    expect(arbitrator.getIntentPriority({ type: "OPEN_PROJECT", projectId: "candidatex", source: "room" })).toBe(2);

    // Priority 3
    expect(arbitrator.getIntentPriority({ type: "GREET" })).toBe(3);
    expect(arbitrator.getIntentPriority({ type: "OPEN_PANEL", panel: "launcher" })).toBe(3);
    expect(arbitrator.getIntentPriority({ type: "ENTER", replay: false })).toBe(3);

    // Priority 4
    expect(arbitrator.getIntentPriority({ type: "SET_LAMP", enabled: false })).toBe(4);
    expect(arbitrator.getIntentPriority({ type: "SET_BLINDS", open: false })).toBe(4);
    expect(arbitrator.getIntentPriority({ type: "SET_SOUND", enabled: true })).toBe(4);
    expect(arbitrator.getIntentPriority({ type: "SET_QUALITY", quality: "high" })).toBe(4);
    expect(arbitrator.getIntentPriority({ type: "SET_CLOCK_FORMAT", clock24h: false })).toBe(4);
    expect(arbitrator.getIntentPriority({ type: "SET_PAUSED", paused: true })).toBe(4);
  });

  it("permits Priority 1 (Escape) to preempt any active intent", () => {
    const arbitrator = new IntentArbitrator();
    const currentIntent = { type: "OPEN_PROJECT" as const, projectId: "zenith" as const, source: "room" as const };

    const decision = arbitrator.arbitrate({ type: "ESCAPE" }, currentIntent, false);
    expect(decision.accepted).toBe(true);
    expect(decision.preemptsCurrent).toBe(true);
    expect(decision.priority).toBe(1);
  });

  it("permits Priority 2 (Project) to preempt Priority 3 (Greeting)", () => {
    const arbitrator = new IntentArbitrator();
    const currentGreeting = { type: "GREET" as const };

    const decision = arbitrator.arbitrate(
      { type: "OPEN_PROJECT", projectId: "helios", source: "room" },
      currentGreeting,
      true
    );

    expect(decision.accepted).toBe(true);
    expect(decision.preemptsCurrent).toBe(true);
  });

  it("permits Project B to supersede active Project A", () => {
    const arbitrator = new IntentArbitrator();
    const currentProjectA = { type: "OPEN_PROJECT" as const, projectId: "candidatex" as const, source: "room" as const };

    const decision = arbitrator.arbitrate(
      { type: "OPEN_PROJECT", projectId: "zenith", source: "room" },
      currentProjectA,
      false
    );

    expect(decision.accepted).toBe(true);
    expect(decision.preemptsCurrent).toBe(true);
  });

  it("enforces cooldowns for decorative objects (painting, plant, chair)", () => {
    const arbitrator = new IntentArbitrator();
    const now = 100000;

    // Painting coalesce (250ms)
    expect(arbitrator.canTiltPainting(now)).toBe(true);
    expect(arbitrator.canTiltPainting(now + 100)).toBe(false); // < 250ms
    expect(arbitrator.canTiltPainting(now + 300)).toBe(true);  // >= 250ms

    // Plant leaves cooldown (500ms)
    expect(arbitrator.canNudgePlant(now)).toBe(true);
    expect(arbitrator.canNudgePlant(now + 200)).toBe(false); // < 500ms
    expect(arbitrator.canNudgePlant(now + 600)).toBe(true);  // >= 500ms

    // Chair cooldown (5000ms)
    expect(arbitrator.canAdjustChair(now)).toBe(true);
    expect(arbitrator.canAdjustChair(now + 3000)).toBe(false); // < 5000ms
    expect(arbitrator.canAdjustChair(now + 5100)).toBe(true);  // >= 5000ms
  });
});
