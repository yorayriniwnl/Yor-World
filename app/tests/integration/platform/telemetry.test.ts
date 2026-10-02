import { describe, it, expect, beforeEach } from "vitest";
import {
  recordTelemetryEvent,
  getAggregateEvents,
  clearAggregateEvents,
  ALLOWLISTED_EVENTS,
} from "../../../src/server/telemetry/events";

describe("Milestone A6: Telemetry & Event Ingestion", () => {
  beforeEach(() => {
    clearAggregateEvents();
  });

  it("accepts all 8 allowlisted events with status 202", async () => {
    for (const eventName of ALLOWLISTED_EVENTS) {
      const payload = {
        event: eventName,
        projectId: eventName === "project_opened" ? "helios" : undefined,
        tier: "high",
      };

      const jsonStr = JSON.stringify(payload);
      const res = await recordTelemetryEvent(payload, jsonStr.length);
      expect(res.success).toBe(true);
      expect(res.status).toBe(202);
    }

    const aggregates = getAggregateEvents();
    expect(aggregates.length).toBe(ALLOWLISTED_EVENTS.length);
  });

  it("rejects non-allowlisted event types with 400 Bad Request", async () => {
    const maliciousPayload = {
      event: "track_user_keystroke",
      keystroke: "secretPassword123",
    };

    const res = await recordTelemetryEvent(maliciousPayload, JSON.stringify(maliciousPayload).length);
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain("Invalid telemetry payload");
  });

  it("rejects payloads exceeding the 4096-byte ceiling with 413 Payload Too Large", async () => {
    const largePayload = {
      event: "studio_ready",
      data: "X".repeat(5000),
    };

    const res = await recordTelemetryEvent(largePayload, 5100);
    expect(res.success).toBe(false);
    expect(res.status).toBe(413);
    expect(res.error).toContain("Payload too large");
  });

  it("rejects disallowed project IDs", async () => {
    const payload = {
      event: "project_opened",
      projectId: "unverified-external-site",
    };

    const res = await recordTelemetryEvent(payload, JSON.stringify(payload).length);
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
  });

  it("aggregates counts cleanly without profiling individual visitors", async () => {
    const p1 = { event: "studio_ready", tier: "high" };
    const p2 = { event: "studio_ready", tier: "high" };
    const p3 = { event: "studio_ready", tier: "low" };

    await recordTelemetryEvent(p1, JSON.stringify(p1).length);
    await recordTelemetryEvent(p2, JSON.stringify(p2).length);
    await recordTelemetryEvent(p3, JSON.stringify(p3).length);

    const aggregates = getAggregateEvents();
    const highTier = aggregates.find((a) => a.tier === "high");
    const lowTier = aggregates.find((a) => a.tier === "low");

    expect(highTier?.count).toBe(2);
    expect(lowTier?.count).toBe(1);
  });
});
