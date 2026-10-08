import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseInitialTier } from "../../src/features/room/quality-policy";
import { rasterDprCap, readDeviceCapabilities } from "../../src/features/world/device-capabilities";

interface BrowserOptions {
  width?: number;
  navigator?: Record<string, unknown>;
  renderer?: string;
  maxTextureSize?: number;
  hasWebGL?: boolean;
  debugInfo?: boolean;
  missingContext?: boolean;
  contextThrows?: boolean;
  parameterThrows?: boolean;
}

function installBrowser(options: BrowserOptions = {}) {
  const loseContext = vi.fn();
  const context = {
    MAX_TEXTURE_SIZE: 0x0d33,
    RENDERER: 0x1f01,
    getParameter: vi.fn((parameter: number) => {
      if (options.parameterThrows) throw new Error("Capability query denied");
      return parameter === 0x0d33
        ? (options.maxTextureSize ?? 16384)
        : (options.renderer ?? "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060, D3D11)");
    }),
    getExtension: vi.fn((name: string) => {
      if (name === "WEBGL_lose_context") return { loseContext };
      if (name === "WEBGL_debug_renderer_info" && options.debugInfo !== false) {
        return { UNMASKED_RENDERER_WEBGL: 0x9246 };
      }
      return null;
    }),
  };
  const getContext = vi.fn(() => {
    if (options.contextThrows) throw new Error("WebGL context creation denied");
    return options.missingContext ? null : context;
  });
  const canvas = { getContext };
  const createElement = vi.fn(() => canvas);
  const appendChild = vi.fn();
  const fetch = vi.fn(() => {
    throw new Error("Capability detection must not load assets");
  });
  vi.stubGlobal("navigator", {
    hardwareConcurrency: 8,
    deviceMemory: 8,
    connection: { saveData: false },
    ...options.navigator,
  });
  vi.stubGlobal("window", {
    innerWidth: options.width ?? 1440,
    WebGLRenderingContext: options.hasWebGL === false ? undefined : class {},
    WebGL2RenderingContext: options.hasWebGL === false ? undefined : class {},
  });
  vi.stubGlobal("document", {
    createElement,
    body: { appendChild },
    documentElement: { appendChild },
  });
  vi.stubGlobal("fetch", fetch);
  return { context, getContext, createElement, appendChild, fetch, loseContext };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("safe viewport raster caps", () => {
  it("caps CPU-rendered WebGL across every active quality tier", () => {
    expect(rasterDprCap("low", true)).toBe(0.3);
    expect(rasterDprCap("medium", true)).toBe(0.4);
    expect(rasterDprCap("high", true)).toBe(0.4);
  });

  it("preserves native hardware resolution where actual GPU capacity exists", () => {
    expect(rasterDprCap("low", false)).toBe(1);
    expect(rasterDprCap("medium", false)).toBe(1.25);
    expect(rasterDprCap("high", false)).toBe(1.5);
  });
});

describe("studio entry browser capabilities", () => {
  it.each([
    { name: "capable desktop", width: 1440, cores: 8, memory: 8, saveData: false, tier: "high" },
    { name: "two-core desktop", width: 1440, cores: 2, memory: 8, saveData: false, tier: "low" },
    { name: "low-memory desktop", width: 1440, cores: 8, memory: 2, saveData: false, tier: "low" },
    { name: "data-saving desktop", width: 1440, cores: 8, memory: 8, saveData: true, tier: "low" },
    { name: "capable mobile", width: 390, cores: 8, memory: 8, saveData: false, tier: "medium" },
    { name: "four-core mobile", width: 390, cores: 4, memory: 8, saveData: false, tier: "low" },
  ])("passes $name browser signals to the quality policy", ({ width, cores, memory, saveData, tier }) => {
    installBrowser({
      width,
      navigator: { hardwareConcurrency: cores, deviceMemory: memory, connection: { saveData } },
    });

    const capabilities = readDeviceCapabilities();

    expect(capabilities).toMatchObject({
      hasWebGL: true,
      isMobile: width < 640,
      hardwareConcurrency: cores,
      deviceMemoryGb: memory,
      saveData,
    });
    expect(chooseInitialTier(capabilities)).toBe(tier);
  });

  it("starts SwiftShader conservatively without overriding the owner's explicit quality choice", () => {
    const browser = installBrowser({
      renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
    });

    const capabilities = readDeviceCapabilities();

    expect(capabilities.isSoftwareRenderer).toBe(true);
    expect(chooseInitialTier(capabilities)).toBe("low");
    expect(chooseInitialTier({ ...capabilities, userPreference: "high" })).toBe("high");
    expect(browser.loseContext).toHaveBeenCalledOnce();
  });

  it("keeps actual hardware rendering eligible for high quality and releases its probe", () => {
    const browser = installBrowser();

    const capabilities = readDeviceCapabilities();

    expect(capabilities.isSoftwareRenderer).toBe(false);
    expect(capabilities.maxTextureSize).toBe(16384);
    expect(chooseInitialTier(capabilities)).toBe("high");
    expect(browser.loseContext).toHaveBeenCalledOnce();
  });

  it("uses the standard renderer query when the debug extension is unavailable", () => {
    const browser = installBrowser({ debugInfo: false, renderer: "llvmpipe (LLVM 18.1.8, 256 bits)" });

    const capabilities = readDeviceCapabilities();

    expect(browser.context.getParameter).toHaveBeenCalledWith(browser.context.RENDERER);
    expect(capabilities.isSoftwareRenderer).toBe(true);
    expect(chooseInitialTier(capabilities)).toBe("low");
    expect(browser.loseContext).toHaveBeenCalledOnce();
  });

  it("uses the actual GPU texture limit as a startup constraint", () => {
    const browser = installBrowser({ maxTextureSize: 2048 });

    const capabilities = readDeviceCapabilities();

    expect(capabilities.maxTextureSize).toBe(2048);
    expect(chooseInitialTier(capabilities)).toBe("low");
    expect(browser.loseContext).toHaveBeenCalledOnce();
  });

  it("forces static when browser WebGL support is absent without creating a probe", () => {
    const browser = installBrowser({ hasWebGL: false });

    const capabilities = readDeviceCapabilities();

    expect(capabilities.hasWebGL).toBe(false);
    expect(chooseInitialTier(capabilities)).toBe("static");
    expect(browser.createElement).not.toHaveBeenCalled();
    expect(browser.getContext).not.toHaveBeenCalled();
  });

  it.each([
    { name: "unavailable probe context", options: { missingContext: true } },
    { name: "throwing probe context", options: { contextThrows: true } },
  ])("leaves $name to the real renderer's creation-failure recovery", ({ options }) => {
    installBrowser(options);

    const capabilities = readDeviceCapabilities();

    expect(capabilities.hasWebGL).toBe(true);
    expect(capabilities).not.toHaveProperty("isSoftwareRenderer");
    expect(capabilities).not.toHaveProperty("maxTextureSize");
    expect(chooseInitialTier(capabilities)).toBe("high");
  });

  it("releases an acquired context even if capability queries throw", () => {
    const browser = installBrowser({ parameterThrows: true });

    const capabilities = readDeviceCapabilities();

    expect(capabilities.hasWebGL).toBe(true);
    expect(capabilities).not.toHaveProperty("isSoftwareRenderer");
    expect(browser.loseContext).toHaveBeenCalledOnce();
  });

  it("preserves unknown browser signals as unknown instead of inventing constraints", () => {
    installBrowser({
      navigator: { hardwareConcurrency: Number.NaN, deviceMemory: undefined, connection: undefined },
    });

    const capabilities = readDeviceCapabilities();

    expect(capabilities).not.toHaveProperty("hardwareConcurrency");
    expect(capabilities).not.toHaveProperty("deviceMemoryGb");
    expect(capabilities).not.toHaveProperty("saveData");
    expect(chooseInitialTier(capabilities)).toBe("high");
  });

  it("uses one detached temporary canvas without attaching DOM content or fetching 3D assets", () => {
    const browser = installBrowser();

    readDeviceCapabilities();

    expect(browser.createElement).toHaveBeenCalledOnce();
    expect(browser.createElement).toHaveBeenCalledWith("canvas");
    expect(browser.getContext).toHaveBeenCalledWith("webgl2", { antialias: false });
    expect(browser.appendChild).not.toHaveBeenCalled();
    expect(browser.fetch).not.toHaveBeenCalled();
    expect(browser.loseContext).toHaveBeenCalledOnce();
  });
});
