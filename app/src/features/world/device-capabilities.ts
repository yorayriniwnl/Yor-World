import type { DeviceCapabilities } from "../room/quality-policy";
import type { QualityTier } from "../../contracts/experience";

/**
 * Prevent the full-viewport studio from monopolizing the main thread on CPU
 * WebGL. An explicit quality choice still controls materials, but raster
 * resolution and costly shadows must respect the actual renderer.
 */
export function rasterDprCap(tier: QualityTier, software: boolean): number {
  if (software) return tier === "low" ? 0.3 : 0.4;
  if (tier === "high") return 1.5;
  if (tier === "medium") return 1.25;
  return 1;
}

export function isSoftwareRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render/i.test(renderer);
}

/** Called only after studio entry. Release the temporary capability context. */
export function readDeviceCapabilities(): DeviceCapabilities {
  const browser = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const capabilities: DeviceCapabilities = {
    hasWebGL: !!(window.WebGLRenderingContext || window.WebGL2RenderingContext),
    isMobile: window.innerWidth < 640,
    ...(Number.isFinite(browser.hardwareConcurrency) ? { hardwareConcurrency: browser.hardwareConcurrency } : {}),
    ...(typeof browser.deviceMemory === "number" ? { deviceMemoryGb: browser.deviceMemory } : {}),
    ...(typeof browser.connection?.saveData === "boolean" ? { saveData: browser.connection.saveData } : {}),
  };
  if (!capabilities.hasWebGL) return capabilities;
  const probe = document.createElement("canvas");
  let context: WebGL2RenderingContext | null = null;
  try {
    context = probe.getContext("webgl2", { antialias: false });
    if (!context) return capabilities;
    capabilities.maxTextureSize = context.getParameter(context.MAX_TEXTURE_SIZE) as number;
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER));
    capabilities.isSoftwareRenderer = isSoftwareRenderer(renderer);
  } catch {
    // The real renderer retains its existing honest creation-failure recovery.
  } finally {
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return capabilities;
}
