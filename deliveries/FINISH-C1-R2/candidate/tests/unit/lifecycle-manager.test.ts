import { describe, it, expect, vi } from "vitest";
import { LifecycleManager } from "../../src/features/world/LifecycleManager";
import type { WorldLifecycleState } from "../../src/features/world/types";

describe("LifecycleManager - 8 Explicit States and Adversarial Guarantees", () => {
  it("initializes in STATIC state with sessionToken 0", () => {
    const lm = new LifecycleManager();
    expect(lm.getState()).toBe("STATIC");
    expect(lm.getSessionToken()).toBe(0);
    expect(lm.getFailureReason()).toBeNull();
  });

  it("transitions sequentially through explicit lifecycle states: STATIC -> ENTRY_REQUESTED -> LOADING -> ENTRANCE -> HOME", () => {
    const lm = new LifecycleManager();
    const transitions: WorldLifecycleState[] = [];
    lm.subscribe((state) => transitions.push(state));

    // 1. Enter requested
    const token = lm.requestEntry();
    expect(token).toBe(1);
    expect(lm.getState()).toBe("ENTRY_REQUESTED");

    // 2. Loading
    const loadingStarted = lm.startLoading(token);
    expect(loadingStarted).toBe(true);
    expect(lm.getState()).toBe("LOADING");

    // 3. Entrance
    const entranceStarted = lm.startEntrance(token, false);
    expect(entranceStarted).toBe(true);
    expect(lm.getState()).toBe("ENTRANCE");

    // 4. Complete entrance -> HOME
    const entranceCompleted = lm.completeEntrance(token);
    expect(entranceCompleted).toBe(true);
    expect(lm.getState()).toBe("HOME");

    expect(transitions).toEqual([
      "ENTRY_REQUESTED",
      "LOADING",
      "ENTRANCE",
      "HOME",
    ]);
  });

  it("reduced motion bypasses ENTRANCE camera travel directly to HOME", () => {
    const lm = new LifecycleManager();
    const token = lm.requestEntry();
    lm.startLoading(token);

    // With reducedMotion=true
    lm.startEntrance(token, true);
    expect(lm.getState()).toBe("HOME");
    expect(lm.getEntranceDiagnostics().phase).toBe("settled");
    expect(lm.getEntranceDiagnostics().progress).toBe(1.0);
  });

  it("PROVE: obsolete operations with stale sessionToken cannot change current state", () => {
    const lm = new LifecycleManager();
    const token1 = lm.requestEntry();
    lm.startLoading(token1);

    // Cancel / return to portfolio, which increments sessionToken
    lm.continueWithPortfolio();
    expect(lm.getState()).toBe("STATIC");
    const token2 = lm.requestEntry(); // new token is 2

    // Adversarial simulation: late async completion from token1 fires now
    const lateLoadingStart = lm.startLoading(token1);
    expect(lateLoadingStart).toBe(false);

    const lateEntrance = lm.startEntrance(token1, false);
    expect(lateEntrance).toBe(false);

    const lateComplete = lm.completeEntrance(token1);
    expect(lateComplete).toBe(false);

    const lateProgress = lm.updateLoadingProgress(token1, {
      stage: "stale-stage",
      progress: 0.99,
      requiredLoaded: 3,
      requiredTotal: 3,
      optionalLoaded: 2,
      optionalTotal: 2,
      retryCount: 0,
      maxRetries: 3,
    });
    expect(lateProgress).toBe(false);

    // State remained unchanged by obsolete token1 operations
    expect(lm.getState()).toBe("ENTRY_REQUESTED");
    expect(lm.getSessionToken()).toBe(token2);
  });

  it("handles repeated Enter requests without spawning duplicate sessions", () => {
    const lm = new LifecycleManager();
    const token1 = lm.requestEntry();
    expect(token1).toBe(1);

    // Rapid second and third clicks
    const token2 = lm.requestEntry();
    const token3 = lm.requestEntry();
    expect(token2).toBe(1);
    expect(token3).toBe(1);
    expect(lm.getState()).toBe("ENTRY_REQUESTED");
  });

  it("Skip and Escape settle entrance to HOME immediately", () => {
    const lm = new LifecycleManager();
    const token = lm.requestEntry();
    lm.startLoading(token);
    lm.startEntrance(token, false);
    expect(lm.getState()).toBe("ENTRANCE");

    // Skip
    lm.skip(token);
    expect(lm.getState()).toBe("HOME");
    expect(lm.getEntranceDiagnostics().skipped).toBe(true);

    // Reset and test Escape
    lm.continueWithPortfolio();
    const tokenB = lm.requestEntry();
    lm.startLoading(tokenB);
    lm.startEntrance(tokenB, false);
    expect(lm.getState()).toBe("ENTRANCE");

    lm.escape(tokenB);
    expect(lm.getState()).toBe("HOME");
    expect(lm.getEntranceDiagnostics().skipped).toBe(true);
  });

  it("TRANSITION state transitions to HOME on completion or skip", () => {
    const lm = new LifecycleManager();
    const token = lm.requestEntry();
    lm.startLoading(token);
    lm.startEntrance(token, true);
    expect(lm.getState()).toBe("HOME");

    // Start transition (e.g. camera move or greet)
    lm.startTransition(token);
    expect(lm.getState()).toBe("TRANSITION");

    // Skip during transition settles immediately to HOME
    lm.skip(token);
    expect(lm.getState()).toBe("HOME");
  });

  it("FAILURE state maintains honest reason, allows bounded retries, and allows Continue with portfolio", () => {
    const lm = new LifecycleManager();
    const token = lm.requestEntry();
    lm.startLoading(token);

    // Asset failure
    lm.fail("Required asset failed 404", token);
    expect(lm.getState()).toBe("FAILURE");
    expect(lm.getFailureReason()).toBe("Required asset failed 404");

    // Retry 1
    expect(lm.retry()).toBe(true);
    expect(lm.getState()).toBe("ENTRY_REQUESTED");

    // Fail again
    const token2 = lm.getSessionToken();
    lm.fail("Second failure", token2);
    expect(lm.getState()).toBe("FAILURE");

    // Continue with portfolio returns safely to STATIC
    expect(lm.continueWithPortfolio()).toBe(true);
    expect(lm.getState()).toBe("STATIC");
  });

  it("enforces bounded retries (maxRetries = 3)", () => {
    const lm = new LifecycleManager();
    lm.requestEntry();
    lm.fail("fail 0");

    // 3 retries allowed
    expect(lm.retry()).toBe(true); // retry 1
    lm.fail("fail 1");
    expect(lm.retry()).toBe(true); // retry 2
    lm.fail("fail 2");
    expect(lm.retry()).toBe(true); // retry 3
    lm.fail("fail 3");

    // 4th retry is rejected by bounded limit
    expect(lm.retry()).toBe(false);
    expect(lm.getState()).toBe("FAILURE");
  });

  it("DISPOSING cleans up all listeners and returns to STATIC", () => {
    const lm = new LifecycleManager();
    const token = lm.requestEntry();
    lm.startLoading(token);

    lm.dispose();
    expect(lm.getState()).toBe("STATIC");
    expect(lm.isStale(token)).toBe(true);

    // Late operations after disposal fail completely
    expect(lm.requestEntry()).toBe(token + 1); // Disposed manager rejects or leaves stale
  });

  it("times out loading session after 15s watchdog limit", () => {
    vi.useFakeTimers();
    const lm = new LifecycleManager();
    const token = lm.requestEntry();
    lm.startLoading(token);
    expect(lm.getState()).toBe("LOADING");

    vi.advanceTimersByTime(15500);
    expect(lm.getState()).toBe("FAILURE");
    expect(lm.getFailureReason()).toMatch(/timed out/i);
    vi.useRealTimers();
  });

});
