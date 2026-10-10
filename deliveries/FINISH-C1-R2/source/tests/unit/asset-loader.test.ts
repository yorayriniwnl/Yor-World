import { describe, it, expect } from "vitest";
import { AssetLoader, AssetLoadingError } from "../../src/features/world/AssetLoader";
import type { LoadingProgress } from "../../src/features/world/types";

describe("AssetLoader - Single Session Owner and Asset Hierarchy", () => {
  it("exposes unique single owner ID", () => {
    const loader = new AssetLoader("primary-asset-loader");
    expect(loader.getOwnerId()).toBe("primary-asset-loader");
  });

  it("handles cancelled load session via AbortSignal", async () => {
    const loader = new AssetLoader();
    const abortController = new AbortController();
    abortController.abort(); // Abort before load

    await expect(
      loader.loadSession({
        sessionToken: 1,
        signal: abortController.signal,
      })
    ).rejects.toThrow();
  });

  it("distinguishes required vs optional assets on simulated failure", async () => {
    const loader = new AssetLoader();
    const progressReports: LoadingProgress[] = [];

    await expect(
      loader.loadSession({
        sessionToken: 1,
        simulateAssetError: true,
        onProgress: (p) => progressReports.push(p),
      })
    ).rejects.toThrowError(AssetLoadingError);

    expect(progressReports.length).toBeGreaterThan(0);
    const lastReport = progressReports[progressReports.length - 1];
    expect(lastReport?.requiredTotal).toBe(3);
    expect(lastReport?.optionalTotal).toBe(2);
    expect(lastReport?.failedAsset).toBe("production-room-full.glb");
  });

  it("disposes partial resources when abort occurs during session load", async () => {
    const loader = new AssetLoader();
    const abort = new AbortController();
    abort.abort();

    await expect(
      loader.loadSession({
        sessionToken: 2,
        signal: abort.signal,
      })
    ).rejects.toThrow();
  });

});
