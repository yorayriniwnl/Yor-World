import { afterEach, describe, it, expect, vi } from "vitest";
import { AssetLoader, AssetLoadingError } from "../../src/features/world/AssetLoader";
import type { LoadingProgress } from "../../src/features/world/types";

describe("AssetLoader - Single Session Owner and Asset Hierarchy", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

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

  it("caps automatic retries at two and uses the exact 500ms then 1500ms backoffs", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn(async () => new Response(null, { status: 503, statusText: "Unavailable" }));
    vi.stubGlobal("fetch", fetchMock);
    const operation = new AssetLoader().loadSession({ sessionToken: 3, maxRetries: 99 }).then(
      () => new Error("Expected the request to exhaust its retry ceiling"),
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(499);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1499);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    const error = await operation;
    expect(error).toMatchObject({ name: "AssetLoadingError", retryCount: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps retry limits independent across concurrent sessions on one loader", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn(async () => new Response(null, { status: 503, statusText: "Unavailable" }));
    vi.stubGlobal("fetch", fetchMock);
    const loader = new AssetLoader();
    const noRetry = loader.loadSession({ sessionToken: 10, maxRetries: 0 }).catch((error) => error);
    const oneRetry = loader.loadSession({ sessionToken: 11, maxRetries: 1 }).catch((error) => error);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    const errors = await Promise.all([noRetry, oneRetry]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(errors.map((error) => (error as AssetLoadingError).retryCount).sort()).toEqual([1, 2]);
  });

  it("clears the pending retry timer and never retries after abort during backoff", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn(async () => new Response(null, { status: 503, statusText: "Unavailable" }));
    vi.stubGlobal("fetch", fetchMock);
    const abort = new AbortController();
    const operation = new AssetLoader().loadSession({ sessionToken: 12, signal: abort.signal });

    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    abort.abort();
    await expect(operation).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

});
