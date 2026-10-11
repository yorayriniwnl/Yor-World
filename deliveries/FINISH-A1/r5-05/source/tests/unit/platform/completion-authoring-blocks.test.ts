import { describe, expect, it } from "vitest";
import { approvedPublication } from "@/content/approved-publication";
import { computeReviewHash, PrivateDraftReviewSchema, ReviewIdentitySchema, sameReviewIdentity } from "@/server/content/preview";
import type { PublishedProject } from "@/contracts/content";
import { MAX_UPLOAD_BYTES } from "@/server/media/validate-upload";
import { readPrivateSignedObject } from "@/server/media/manifest";

const project = approvedPublication.projects[0]!;
const at = "2026-10-11T10:00:00.000Z";
const kinds = ["schema", "evidence-records", "https-links", "approved-media", "publication-rules"] as const;
const checksFor = (id: string) => kinds.map((kind) => ({ scope: "project" as const, id, kind, status: "passed" as const, checkedAt: at, reasons: [] as string[] }));
function buildReview(projects: PublishedProject[] = [project]) {
  const drafts = projects.map((item) => ({ projectId: item.id, draftRevision: item.revision, project: item, updatedAt: at, updatedBy: "11111111-1111-1111-1111-111111111111" }));
  return {
    identity: { expectedPublicationRevision: approvedPublication.revision, projects: drafts.filter((draft) => draft.projectId !== "candidatex").map(({ projectId, draftRevision }) => ({ projectId, draftRevision })), siteDraftRevision: null, media: [], candidateSha256: "a".repeat(64) },
    drafts,
    checks: projects.flatMap((item) => checksFor(item.id)) as Array<{ scope: "project"; id: string; kind: typeof kinds[number]; status: "passed" | "failed"; checkedAt: string; reasons: string[] }>,
    canPublish: projects.every((item) => item.id !== "candidatex"),
  };
}
function hashCandidate(projects: PublishedProject[], assetManifestRevision = "manifest-r1", media: Parameters<typeof computeReviewHash>[0]["media"] = []) {
  return computeReviewHash({ projects, siteDraftRevision: null, assetManifestRevision, media });
}
function hash(projects: PublishedProject[]) { return hashCandidate(projects); }
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a < b ? 1 : a > b ? -1 : 0).map(([key, child]) => [key, reverseKeys(child)]));
}

describe("A1 R5 candidate identity and strict DTO", () => {
  it("changes the hash when a project body changes", () => expect(hash([{ ...project, summary: `${project.summary} changed` }])).not.toBe(hash([project])));
  it("preserves section and block array order", () => {
    const reorderedSections = { ...project, sections: [...project.sections].reverse() };
    expect(hash([reorderedSections])).not.toBe(hash([project]));
    const section = project.sections[0]!;
    const withSecondBlock = { ...project, sections: project.sections.map((item, index) => index === 0 ? { ...item, blocks: [...item.blocks, { type: "paragraph" as const, text: "order probe" }] } : item) };
    const reverseFirstBlocks = { ...withSecondBlock, sections: withSecondBlock.sections.map((item, index) => index === 0 ? { ...item, blocks: [...item.blocks].reverse() } : item) };
    expect(section).toBeDefined();
    expect(hash([reverseFirstBlocks])).not.toBe(hash([withSecondBlock]));
  });
  it("sorts publishable project documents by ID while preserving their documents", () => {
    const projects = approvedPublication.projects.slice(0, 2);
    expect(hash(projects)).toBe(hash([...projects].reverse()));
  });
  it("binds the accepted manifest revision and every reviewed media field into the hash", () => {
    const asset = {
      kind: "asset" as const, mediaId: "asset-1", objectKey: "approved/one.png", sha256: "a".repeat(64),
      mime: "image/png" as const, bytes: 128, dimensions: { width: 2, height: 3 }, provenance: { source: "fixture" },
      approvalStatus: "approved" as const, createdAt: at, approvalAudit: null,
    };
    const base = hashCandidate([project], "manifest-r1", [asset]);
    expect(hashCandidate([project], "manifest-r2", [asset])).not.toBe(base);
    const variants = [
      { ...asset, objectKey: "approved/two.png" },
      { ...asset, sha256: "b".repeat(64) },
      { ...asset, mime: "image/jpeg" as const },
      { ...asset, bytes: 129 },
      { ...asset, dimensions: { width: 3, height: 3 } },
      { ...asset, provenance: { source: "other-fixture" } },
      { ...asset, approvalStatus: "rejected" as const },
      { ...asset, createdAt: "2026-10-11T10:01:00.000Z" },
      { ...asset, approvalAudit: { eventId: "event-1", createdAt: at } },
    ];
    for (const changed of variants) expect(hashCandidate([project], "manifest-r1", [changed])).not.toBe(base);
    expect(hashCandidate([project], "manifest-r1", [asset, { kind: "accepted-placeholder", mediaId: "asset-2" }])).not.toBe(base);
  });  it("is deterministic across equivalent object-key insertion order", () => expect(hash([reverseKeys(project) as PublishedProject])).toBe(hash([project])));
  it("accepts a complete coherent review DTO", () => expect(PrivateDraftReviewSchema.safeParse(buildReview()).success).toBe(true));
  it("rejects unknown DTO properties and invalid actor identities", () => {
    const base = buildReview();
    expect(PrivateDraftReviewSchema.safeParse({ ...base, privateSecret: "unexpected" }).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse({ ...base, drafts: [{ ...base.drafts[0]!, updatedBy: "owner-fixture" }] }).success).toBe(false);
  });
  it("compares equivalent identity key order canonically and rejects reordered media vectors", () => {
    const identity = buildReview().identity;
    expect(sameReviewIdentity(reverseKeys(identity), identity)).toBe(true);
    expect(ReviewIdentitySchema.safeParse({ ...identity, media: [{ kind: "accepted-placeholder", mediaId: "z" }, { kind: "accepted-placeholder", mediaId: "a" }] }).success).toBe(false);
  });
  it("rejects duplicate and unsafe identity revisions", () => {
    const identity = buildReview().identity;
    expect(ReviewIdentitySchema.safeParse({ ...identity, projects: [...identity.projects, ...identity.projects] }).success).toBe(false);
    expect(ReviewIdentitySchema.safeParse({ ...identity, projects: [{ projectId: project.id, draftRevision: Number.MAX_SAFE_INTEGER + 1 }] }).success).toBe(false);
  });
  it("rejects mismatched, malformed-time, or unsafe draft records", () => {
    const base = buildReview();
    expect(PrivateDraftReviewSchema.safeParse({ ...base, drafts: [{ ...base.drafts[0]!, projectId: "helios" }] }).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse({ ...base, drafts: [{ ...base.drafts[0]!, updatedAt: "yesterday" }] }).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse({ ...base, drafts: [{ ...base.drafts[0]!, draftRevision: Number.MAX_SAFE_INTEGER + 1 }] }).success).toBe(false);
  });
  it("rejects empty, unknown, and incoherent checks", () => {
    const base = buildReview();
    expect(PrivateDraftReviewSchema.safeParse({ ...base, checks: [] }).success).toBe(false);
    expect(PrivateDraftReviewSchema.safeParse({ ...base, checks: [{ ...base.checks[0]!, id: "not-a-project" }] }).success).toBe(false);
    const failedWithoutReason = { ...base.checks[0]!, status: "failed", reasons: [] };
    expect(PrivateDraftReviewSchema.safeParse({ ...base, checks: [failedWithoutReason, ...base.checks.slice(1)], canPublish: false }).success).toBe(false);
    const failedButPublishable = { ...base.checks[0]!, status: "failed", reasons: ["invalid"] };
    expect(PrivateDraftReviewSchema.safeParse({ ...base, checks: [failedButPublishable, ...base.checks.slice(1)], canPublish: true }).success).toBe(false);
  });
  it("keeps a CandidateX-only private preview nonpublishable", () => {
    const candidate = { ...project, id: "candidatex" as const, slug: "candidatex", revision: 1 };
    const dto = buildReview([candidate]);
    dto.identity.projects = [];
    dto.checks = checksFor(candidate.id).map((check) => check.kind === "publication-rules" ? { ...check, status: "failed" as const, reasons: ["CandidateX remains private."] } : check);
    dto.canPublish = false;
    expect(PrivateDraftReviewSchema.safeParse(dto).success).toBe(true);
  });
});
describe("bounded private Storage object reads", () => {
  const signedUrl = "https://storage.invalid/object?token=secret-test-value";
  const read = (response: Response, options?: { timeoutMs?: number }) => readPrivateSignedObject(
    async () => signedUrl,
    async (url, init) => {
      expect(url).toBe(signedUrl);
      expect(init?.redirect).toBe("error");
      return response;
    },
    { maxBytes: MAX_UPLOAD_BYTES, timeoutMs: options?.timeoutMs ?? 200 },
  );

  it("rejects declared oversize before reading or accumulating bytes", async () => {
    let pulls = 0;
    let cancellations = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { pulls += 1; controller.enqueue(new Uint8Array([1])); },
      cancel() { cancellations += 1; },
    }, { highWaterMark: 0 });
    await expect(read(new Response(body, { headers: { "content-length": String(MAX_UPLOAD_BYTES + 1) } }))).rejects.toThrow(/size|limit|large/i);
    expect(pulls).toBe(0);
    expect(cancellations).toBe(1);
  });

  it("cancels the stream when accumulated bytes cross the cap", async () => {
    let pulls = 0;
    let cancellations = 0;
    const chunks = [new Uint8Array(MAX_UPLOAD_BYTES), new Uint8Array([1])];
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { pulls += 1; const next = chunks.shift(); if (next) controller.enqueue(next); else controller.close(); },
      cancel() { cancellations += 1; },
    }, { highWaterMark: 0 });
    await expect(read(new Response(body))).rejects.toThrow(/size|limit|large/i);
    expect(pulls).toBe(2);
    expect(cancellations).toBe(1);
  });

  it("rejects an EOF content-length mismatch", async () => {
    const response = new Response(new Uint8Array([1, 2]), { headers: { "content-length": "3" } });
    await expect(read(response)).rejects.toThrow(/length|size|mismatch/i);
  });

  it("cancels after a stream read failure without exposing the signed URL", async () => {
    let cancellations = 0;
    const body = { locked: false, getReader: () => ({
      read: async () => { throw new Error("transport failed"); },
      cancel: async () => { cancellations += 1; },
    }) } as unknown as ReadableStream<Uint8Array>;
    let failure: unknown;
    try { await readPrivateSignedObject(async () => signedUrl, async () => ({ ok: true, headers: new Headers(), body } as Response), { maxBytes: MAX_UPLOAD_BYTES, timeoutMs: 200 }); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).not.toContain(signedUrl);
    expect(cancellations).toBe(1);
  });

  it("covers signed-URL creation in the shared deadline", async () => {
    let fetchCalled = false;
    const createSignedUrl = (_signal: AbortSignal) => new Promise<string>((_resolve, reject) => {
      _signal.addEventListener("abort", () => reject(new Error("creation aborted")), { once: true });
    });
    await expect(readPrivateSignedObject(createSignedUrl, async () => {
      fetchCalled = true;
      return new Response(new Uint8Array([1]));
    }, { maxBytes: MAX_UPLOAD_BYTES, timeoutMs: 10 })).rejects.toThrow(/deadline|timed out|aborted/i);
    expect(fetchCalled).toBe(false);
  });

  it("aborts a stalled stream at the shared deadline and cancels its reader", async () => {
    const createSignedUrl = async () => signedUrl;
    let cancellations = 0;
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { pulls += 1; if (pulls === 1) controller.enqueue(new Uint8Array([1])); },
      cancel() { cancellations += 1; },
    }, { highWaterMark: 0 });
    await expect(readPrivateSignedObject(createSignedUrl, async () => new Response(body), { maxBytes: MAX_UPLOAD_BYTES, timeoutMs: 10 })).rejects.toThrow(/deadline|timed out|aborted/i);
    expect(pulls).toBeGreaterThanOrEqual(1);
    expect(cancellations).toBe(1);
  });
});
