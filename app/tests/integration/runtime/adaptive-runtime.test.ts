import { describe, expect, it, vi } from "vitest";
import { AdaptiveQualityController } from "@/features/room/quality-policy";
import { RuntimeQualitySampler } from "@/features/world/RuntimeQualitySampler";

const home = { visible: true, lifecycle: "HOME", phase: "explore", camera: "home-desktop", panel: null };

function frames(sampler: RuntimeQualitySampler, start: number, duration: number, state = home) {
  for (let timestamp = start; timestamp <= start + 6100; timestamp += duration) sampler.recordFrame(duration, timestamp, state);
}

describe("Actual runtime frame sampling bridge to accepted adaptive policy", () => {
  it("drives a downgrade from sustained foreground RAF durations and preserves explicit user quality", () => {
    const changed = vi.fn();
    const quality = new AdaptiveQualityController({ hasWebGL: true, isMobile: false }, { onTierChange: changed });
    const sampler = new RuntimeQualitySampler(quality);
    frames(sampler, 0, 40);
    expect(quality.getTier()).toBe("medium");
    expect(changed).toHaveBeenCalledWith("medium");
    quality.setUserPreference("high");
    frames(sampler, 6200, 40);
    expect(quality.getTier()).toBe("high");
  });

  it("hidden, failed, and disposed runtimes never accumulate samples or change tier", () => {
    const quality = new AdaptiveQualityController({ hasWebGL: true, isMobile: false });
    const sampler = new RuntimeQualitySampler(quality);
    frames(sampler, 0, 100, { ...home, visible: false });
    frames(sampler, 6200, 100, { ...home, lifecycle: "FAILURE" });
    expect(quality.getTier()).toBe("high");
    expect(quality.getConsecutiveSlowWindows()).toBe(0);
    sampler.stop();
    frames(sampler, 12400, 100);
    expect(quality.getTier()).toBe("high");
  });

  it("headroom can upgrade only settled HOME with a home camera and no open panel", () => {
    const quality = new AdaptiveQualityController({ hasWebGL: true, isMobile: true });
    const sampler = new RuntimeQualitySampler(quality);
    for (let timestamp = 0; timestamp <= 25000; timestamp += 10) sampler.recordFrame(10, timestamp, { ...home, camera: "monitor" });
    expect(quality.getTier()).toBe("medium");
    for (let timestamp = 26000; timestamp <= 52000; timestamp += 10) sampler.recordFrame(10, timestamp, home);
    expect(quality.getTier()).toBe("high");
  });
});
