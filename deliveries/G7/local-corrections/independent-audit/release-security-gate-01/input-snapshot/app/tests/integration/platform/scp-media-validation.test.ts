import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { validateUpload, MediaValidationError, MAX_UPLOAD_BYTES, setTestMediaRegistry, getTestMediaRegistry } from "@/server/media/validate-upload";
import { setTestAuthRegistry } from "@/server/auth/require-owner";
import { POST } from "@/app/api/admin/media/route";

const fixture = (name: string) => readFileSync(resolve("tests/fixtures/scp-media", name));
const validate = (buffer: Uint8Array, mime = "image/png") => validateUpload({ buffer, mime, filename: "fixture" });
const valid = [
  ["valid-rgba-16x12.png", "image/png", 16, 12],
  ["valid-rgb-16x12.jpg", "image/jpeg", 16, 12],
  ["valid-progressive-24x18.jpg", "image/jpeg", 24, 18],
  ["valid-lossy-16x12.webp", "image/webp", 16, 12],
  ["valid-lossless-16x12.webp", "image/webp", 16, 12],
  ["valid-alpha-lossy-16x12.webp", "image/webp", 16, 12],
  ["valid-boundary-8192x2.png", "image/png", 8192, 2],
] as const;

describe("SCP-04 full image decoding", () => {
  it.each(valid)("decodes %s with genuine dimensions/hash", async (name, mime, width, height) => {
    const bytes = fixture(name);
    const result = await validate(bytes, mime);
    expect(result.dimensions).toEqual({ width, height });
    expect(result.bytes).toBe(bytes.length);
    expect(result.hash).toBe(createHash("sha256").update(bytes).digest("hex"));
  });
  it.each([
    ["png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["jpeg", [0xff, 0xd8, 0xff]],
    ["webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ] as const)("rejects recorded signature-only %s", async (format, bytes) => {
    await expect(validate(new Uint8Array(bytes), `image/${format}`)).rejects.toBeInstanceOf(MediaValidationError);
  });
  it.each(valid.slice(0, 6))("rejects truncated pixel body %s", async (name, mime) => {
    const bytes = fixture(name);
    await expect(validate(bytes.subarray(0, Math.floor(bytes.length * 0.7)), mime)).rejects.toBeInstanceOf(MediaValidationError);
  });
  it.each(valid.slice(0, 6))("rejects missing final 1/2/12 bytes %s", async (name, mime) => {
    const bytes = fixture(name);
    for (const cut of [1, 2, 12]) {
      await expect(validate(bytes.subarray(0, bytes.length - cut), mime)).rejects.toBeInstanceOf(MediaValidationError);
    }
  });
  it.each([-2, 2])("rejects WebP RIFF declared size delta %s", async (delta) => {
    const bytes = Buffer.from(fixture("valid-lossy-16x12.webp"));
    bytes.writeUInt32LE(bytes.readUInt32LE(4) + delta, 4);
    await expect(validate(bytes, "image/webp")).rejects.toBeInstanceOf(MediaValidationError);
  });
  it("rejects PNG checksum corruption with intact compressed pixels", async () => {
    const bytes = Buffer.from(fixture("valid-rgba-16x12.png"));
    bytes[29] = bytes[29]! ^ 1;
    await expect(validate(bytes)).rejects.toBeInstanceOf(MediaValidationError);
  });
  it.each([
    ["corrupt-idat.png", "image/png"],
    ["corrupt-scan.jpg", "image/jpeg"],
    ["corrupt-vp8.webp", "image/webp"],
    ["invalid-width-8193x1.png", "image/png"],
    ["invalid-pixels-4097x4097.png", "image/png"],
    ["invalid-zero-width.png", "image/png"],
  ])("rejects %s", async (name, mime) => {
    await expect(validate(fixture(name), mime)).rejects.toBeInstanceOf(MediaValidationError);
  });
  it("rejects MIME mismatch and input above 5 MiB", async () => {
    await expect(validate(fixture("valid-rgb-16x12.jpg"), "image/png")).rejects.toBeInstanceOf(MediaValidationError);
    const large = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    large.set(fixture("valid-rgba-16x12.png"));
    await expect(validate(large)).rejects.toThrow(/exceeds maximum/);
  });
});

describe("SCP-04 media POST response/private registration", () => {
  beforeEach(() => {
    setTestMediaRegistry(new Map());
    setTestAuthRegistry(new Map([["owner", {
      user: { id: "11111111-1111-1111-1111-111111111111", email: "owner@example.test", aal: "aal2" },
      adminRecord: { id: "11111111-1111-1111-1111-111111111111", role: "owner", active: true },
    }]]));
  });
  const upload = (buffer: Uint8Array) => POST(new Request("http://localhost/api/admin/media", {
    method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ data: Buffer.from(buffer).toString("base64"), mime: "image/png", filename: "private.png" }),
  }));
  it("returns 422 INVALID_MEDIA and registers nothing for corruption", async () => {
    const response = await upload(fixture("corrupt-idat.png"));
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("INVALID_MEDIA");
    expect(getTestMediaRegistry().size).toBe(0);
  });
  it("awaits decoding before registering a private pending asset", async () => {
    const response = await upload(fixture("valid-rgba-16x12.png"));
    expect(response.status).toBe(201);
    const { asset } = await response.json();
    expect(asset.dimensions).toEqual({ width: 16, height: 12 });
    expect(asset.approvalStatus).toBe("pending");
    expect(asset.objectKey).toMatch(/^private\/drafts\//);
  });
});
