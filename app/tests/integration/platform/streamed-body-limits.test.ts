import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as contact } from "@/app/api/contact/route";
import { POST as events } from "@/app/api/events/route";
import { MemoryContactDb, setContactDb } from "@/server/contact/db";
import { readBoundedBody } from "@/server/http/read-body";

const encoder = new TextEncoder();
function streamed(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  let pulled = 0;
  let canceled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled < chunks.length) controller.enqueue(chunks[pulled++]!);
      else controller.close();
    },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 });
  const request = new NextRequest("http://localhost/api/fixture", {
    method: "POST", body: stream, headers, duplex: "half",
  } as NonNullable<ConstructorParameters<typeof NextRequest>[1]> & { duplex: "half" });
  return { request, consumed: () => pulled, canceled: () => canceled };
}

describe("Streaming contact/events byte limits (synthetic streams and explicit memory database)", () => {
  let db: MemoryContactDb;
  beforeEach(() => { db = new MemoryContactDb(); setContactDb(db); });
  afterEach(() => setContactDb(null));

  for (const [name, handler, limit] of [["contact", contact, 8192], ["events", events, 4096]] as const) {
    it.each([undefined, "1", "-1", "nonsense", "4096junk"])(`${name} stops and cancels a chunked oversized body with Content-Length %s`, async (length) => {
      const source = streamed(Array.from({ length: 512 }, () => new Uint8Array(4096)), length ? { "content-length": length } : {});
      const result = await handler(source.request);
      expect(result.status).toBe(413);
      expect(source.consumed()).toBe(Math.floor(limit / 4096) + 1);
      expect(source.canceled()).toBe(true);
      expect(db.messages.size).toBe(0);
    });
    it(`${name} rejects a declared oversized body before consuming any chunks`, async () => {
      const source = streamed([encoder.encode("{}")], { "content-length": String(limit + 1) });
      expect((await handler(source.request)).status).toBe(413);
      expect(source.consumed()).toBe(0);
      expect(source.canceled()).toBe(true);
    });
    it(`${name} accepts the exact byte ceiling and rejects one byte more`, async () => {
      const payload = name === "contact"
        ? JSON.stringify({ name: "Fixture Visitor", email: "fixture@example.test", message: "A valid small synthetic inquiry.", idempotencyKey: randomUUID() })
        : JSON.stringify({ event: "studio_ready" });
      const bytes = encoder.encode(payload);
      const exact = encoder.encode(payload + " ".repeat(limit - bytes.byteLength));
      const source = streamed([exact.subarray(0, limit - 1), exact.subarray(limit - 1)]);
      expect((await handler(source.request)).status).toBe(202);
      const overflow = streamed([exact, new Uint8Array([32]), new Uint8Array(1024)]);
      expect((await handler(overflow.request)).status).toBe(413);
      expect(overflow.consumed()).toBe(2);
      expect(overflow.canceled()).toBe(true);
    });
    it(`${name} handles UTF-8 split inside a multibyte codepoint and counts bytes`, async () => {
      const payload = name === "contact"
        ? JSON.stringify({ name: "Fixture Visitor", email: "fixture@example.test", message: "A valid inquiry with café and 🌍.", idempotencyKey: randomUUID() })
        : JSON.stringify({ event: "studio_ready" });
      const bytes = encoder.encode(payload);
      const source = streamed([...bytes].map((byte) => new Uint8Array([byte])));
      expect((await handler(source.request)).status).toBe(202);
      const large = streamed([encoder.encode("🌍".repeat(limit / 4 + 1)), new Uint8Array(1000)]);
      expect((await handler(large.request)).status).toBe(413);
      expect(large.consumed()).toBe(1);
    });
    it(`${name} rejects malformed JSON and interrupted streams`, async () => {
      expect((await handler(streamed([encoder.encode("{invalid")]).request)).status).toBe(400);
      const request = new NextRequest("http://localhost/api/fixture", { method: "POST", duplex: "half", body: new ReadableStream({
        start(controller) { controller.error(new Error("Synthetic interruption")); },
      }) } as NonNullable<ConstructorParameters<typeof NextRequest>[1]> & { duplex: "half" });
      expect((await handler(request)).status).toBe(400);
    });
  }

  it.each(["abcdefghij", "not-a-uuid-at-all", "11111111-1111-1111-1111-11111111111Z"])("rejects non-UUID contact keys: %s", async (key) => {
    const source = streamed([encoder.encode(JSON.stringify({ name: "Fixture Visitor", email: "fixture@example.test", message: "A valid small synthetic inquiry.", idempotencyKey: key }))]);
    expect((await contact(source.request)).status).toBe(400);
    expect(db.messages.size).toBe(0);
  });

  it("aborts a pending read without waiting for a hostile cancel promise", async () => {
    let canceled = false;
    const controller = new AbortController();
    const request = new Request("http://localhost/api/fixture", { method: "POST", duplex: "half", signal: controller.signal,
      body: new ReadableStream({ cancel() { canceled = true; return new Promise(() => {}); } }),
    } as RequestInit);
    const pending = readBoundedBody(request, 8192);
    controller.abort();
    await expect(pending).rejects.toThrow(/aborted/i);
    expect(canceled).toBe(true);
  });
});
