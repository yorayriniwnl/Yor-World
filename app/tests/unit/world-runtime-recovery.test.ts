import { afterEach, describe, expect, it, vi } from "vitest";
import { WorldRuntime } from "../../src/features/world/WorldRuntime";

function canvas() {
  return Object.assign(new EventTarget(), { isConnected: true, dataset: {} }) as unknown as HTMLCanvasElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Production runtime failure retirement", () => {
  it("a failed runtime cannot schedule rendering when visibility resumes", async () => {
    const requestFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = new WorldRuntime({ canvas: canvas(), simulateRendererError: true });
    await Promise.resolve();
    expect(runtime.lifecycleManager.getState()).toBe("FAILURE");
    runtime.pause();
    runtime.resume();
    expect(requestFrame).not.toHaveBeenCalled();
    runtime.dispose();
  });

  it("retired initialization cannot report an obsolete error and repeated disposal does no extra work", async () => {
    const onError = vi.fn();
    const onSamplingPause = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const runtime = new WorldRuntime({ canvas: canvas(), simulateRendererError: true, onError, onSamplingPause });
    runtime.dispose();
    runtime.dispose();
    await Promise.resolve();
    expect(onError).not.toHaveBeenCalled();
    expect(onSamplingPause).toHaveBeenCalledTimes(1);
    expect(runtime.lifecycleManager.getState()).toBe("STATIC");
  });
});
