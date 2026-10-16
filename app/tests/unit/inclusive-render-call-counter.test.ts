import { describe, expect, it } from "vitest";
import { InclusiveRendererCallCounter } from "../../src/features/world/WorldRuntime";

function infoCounter(initialCalls = 0) {
  return {
    render: { calls: initialCalls },
    reset() {
      this.render.calls = 0;
    },
  };
}

describe("inclusive renderer call counter", () => {
  it("separates shadow and main calls at Three's post-shadow reset without changing reset behavior", () => {
    const info = infoCounter(11);
    const originalReset = info.reset;
    const counter = new InclusiveRendererCallCounter(info);

    counter.begin();
    info.render.calls += 7;
    info.reset();
    info.render.calls += 13;
    const sample = counter.finish();

    expect(info.reset).not.toBe(originalReset);
    expect(info.render.calls).toBe(13);
    expect(sample).toEqual({
      inclusiveRenderCalls: 20,
      shadowPassRenderCalls: 7,
      mainPassRenderCalls: 13,
      rendererInfoResetCount: 1,
    });
  });

  it("does not carry prior-frame main calls into the next frame", () => {
    const info = infoCounter(9);
    const counter = new InclusiveRendererCallCounter(info);

    counter.begin();
    info.render.calls += 5;
    info.reset();
    info.render.calls += 6;
    expect(counter.finish().inclusiveRenderCalls).toBe(11);

    counter.begin();
    info.render.calls += 4;
    info.reset();
    info.render.calls += 8;
    expect(counter.finish()).toEqual({
      inclusiveRenderCalls: 12,
      shadowPassRenderCalls: 4,
      mainPassRenderCalls: 8,
      rendererInfoResetCount: 1,
    });
  });

  it("counts all calls if an info implementation does not reset during the frame and marks the split unknown", () => {
    const info = { render: { calls: 4 } };
    const counter = new InclusiveRendererCallCounter(info);

    counter.begin();
    info.render.calls += 17;
    expect(counter.finish()).toEqual({
      inclusiveRenderCalls: 17,
      shadowPassRenderCalls: null,
      mainPassRenderCalls: null,
      rendererInfoResetCount: 0,
    });
  });

  it("restores the exact reset function and becomes inert after disposal", () => {
    const info = infoCounter();
    const originalReset = info.reset;
    const counter = new InclusiveRendererCallCounter(info);
    const wrappedReset = info.reset;

    expect(wrappedReset).not.toBe(originalReset);
    counter.begin();
    info.render.calls += 3;
    counter.dispose();

    expect(info.reset).toBe(originalReset);
    expect(() => counter.finish()).toThrow("Inclusive render-call measurement has been disposed.");
    info.render.calls += 5;
    info.reset();
    expect(info.render.calls).toBe(0);
    counter.dispose();
  });
});
