import { describe, it, expect } from "vitest";
import { InteractionRegistry } from "../../src/features/experience/interaction-registry";

describe("InteractionRegistry & Frozen V1 Catalog Mapping (Task C1)", () => {
  const registry = new InteractionRegistry();

  it("contains all required entities from the frozen V1 catalog", () => {
    const requiredIds = [
      "entrance-door",
      "resident",
      "wall-painting",
      "main-monitor",
      "candidatex-launcher",
      "helios-pc",
      "zenith-model",
      "ai-real-camera",
      "talks-microphone",
      "desk-lamp",
      "window-blinds",
      "desk-clock",
      "plant-leaves",
      "keyboard",
      "mouse",
      "chair",
      "door-inside",
      "speakers",
      "skills-board",
      "research-books",
      "contact-phone",
    ];

    for (const id of requiredIds) {
      const entry = registry.get(id);
      expect(entry, `Missing catalog entry for: ${id}`).toBeDefined();
      expect(entry?.label.length).toBeGreaterThan(0);
      expect(entry?.accessibleControlLabel.length).toBeGreaterThan(0);
      expect(entry?.createIntent()).toBeDefined();
    }
  });

  it("ensures every meaningful geometry interaction has an accessible non-geometry equivalent", () => {
    const entries = registry.getAll();
    expect(entries.length).toBeGreaterThanOrEqual(21);

    for (const entry of entries) {
      // Must have an accessible control label
      expect(entry.accessibleControlLabel).toBeTruthy();
      // Must specify an accessible control type (button, switch, or link)
      expect(["button", "switch", "link"]).toContain(entry.accessibleControlType);
      // Must define reduced-motion behavior
      expect(entry.reducedMotionBehavior.length).toBeGreaterThan(0);
    }
  });

  it("provides direct navigation destinations for all 5 verified project objects", () => {
    const projectEntries = [
      { id: "candidatex-launcher", route: "/projects/candidatex" },
      { id: "helios-pc", route: "/projects/helios" },
      { id: "zenith-model", route: "/projects/zenith" },
      { id: "ai-real-camera", route: "/projects/ai-camera" },
      { id: "talks-microphone", route: "/projects/yor-talks" },
    ];

    for (const p of projectEntries) {
      const entry = registry.get(p.id);
      expect(entry?.destinationRoute).toBe(p.route);
      expect(entry?.accessibleControlType).toBe("link");
    }
  });
});
