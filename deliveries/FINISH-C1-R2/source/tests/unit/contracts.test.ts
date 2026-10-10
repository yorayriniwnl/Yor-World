import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ContentSectionSchema, EvidenceRefSchema, EvidenceStatusSchema,
  ProjectIdSchema, PublicationSchema, PublishedProjectSchema,
} from "../../src/contracts/content";
import { AssetManifestSchema } from "../../src/contracts/assets";
import {
  CameraIdSchema, CharacterActionSchema, defaultPreferences, ExperienceIntentSchema,
  PreferencesSchema, PublicRouteSchema, QualityTierSchema, WorldSnapshotSchema,
} from "../../src/contracts/experience";

// Entirely synthetic boundary samples. Nothing in src imports tests or these claims.
const evidence = { id: "test-document", kind: "document", url: null,
  checkedAt: null, status: "unknown", note: "Synthetic test only" };
const section = { id: "test-section", heading: "Test only", blocks: [
  { type: "paragraph", text: "Synthetic text" },
  { type: "image", mediaId: "test-image", alt: "", caption: "" },
  { type: "list", items: ["Synthetic list"] },
  { type: "code", language: "typescript", text: "const testOnly = true;" },
] };
const project = { id: "candidatex", slug: "test-only", title: "Synthetic test",
  summary: "Not a public claim", contribution: "Synthetic contribution", sections: [section],
  links: [{ label: "Test", url: "https://example.invalid/test", checkedAt: "2026-09-30T00:00:00Z" }],
  evidence: [evidence], revision: 1 };
const publication = { revision: 1, publishedAt: "2026-09-30T00:00:00Z",
  projects: [project], assetManifestRevision: "test-only" };
const manifest = { revision: "test-only", schemaVersion: 1, groups: [{
  id: "test-room", tier: "static", url: "https://example.invalid/room.glb",
  sha256: "a".repeat(64), bytes: 0, triangles: 0, materials: 0, estimatedGpuBytes: 0,
  clips: ["coding_idle"], provenanceId: "test-only", approved: false,
}] };

describe("engineering section 4 boundaries", () => {
  it.each([
    [ProjectIdSchema, ["candidatex", "helios", "zenith", "ai-vs-real", "talks"]],
    [QualityTierSchema, ["high", "medium", "low", "static"]],
    [PublicRouteSchema, ["/", "/projects", "/about", "/about#research", "/about#skills", "/contact", "/resume"]],
    [CharacterActionSchema, ["coding_idle", "mouse_idle", "notice_visitor", "turn_to_visitor", "greeting_nod", "return_to_work", "attention_glance", "breathing_idle"]],
    [CameraIdSchema, ["hallway", "entry", "reveal", "greeting", "home-desktop", "home-mobile", "monitor", "pc", "energy", "scanner", "microphone", "about", "contact"]],
    [EvidenceStatusSchema, ["verified", "unknown", "not-measured", "not-applicable"]],
  ] as const)("retains the exact allowed enum values", (schema, values) => {
    expect(schema.options).toEqual(values);
    for (const value of values) expect(schema.parse(value)).toBe(value);
    expect(schema.safeParse("not-in-contract").success).toBe(false);
  });

  it.each([
    ["evidence", EvidenceRefSchema, evidence], ["section", ContentSectionSchema, section],
    ["project", PublishedProjectSchema, project], ["publication", PublicationSchema, publication],
    ["manifest", AssetManifestSchema, manifest], ["preferences", PreferencesSchema, defaultPreferences],
    ["snapshot", WorldSnapshotSchema, { version: 1, lampOn: false, blindsOpen: true, detailFound: false }],
  ] satisfies Array<[string, z.ZodType, object]>)("validates %s without dropping unknown fields silently", (_, schema, value) => {
    expect(schema.parse(value)).toEqual(value);
    expect(schema.safeParse({ ...value, executable: "alert(1)" }).success).toBe(false);
    for (const key of Object.keys(value)) {
      const incomplete = { ...value } as Record<string, unknown>;
      delete incomplete[key];
      expect(schema.safeParse(incomplete).success, `missing ${key}`).toBe(false);
    }
  });

  it("allows nullable unknown evidence without inventing verification", () => {
    expect(EvidenceRefSchema.parse(evidence).status).toBe("unknown");
    expect(EvidenceRefSchema.safeParse({ ...evidence, checkedAt: "yesterday" }).success).toBe(false);
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "http://example.invalid", "/relative"])("rejects unsafe or non-HTTPS URLs: %s", (url) => {
    expect(EvidenceRefSchema.safeParse({ ...evidence, url }).success).toBe(false);
    expect(PublishedProjectSchema.safeParse({ ...project, links: [{ ...project.links[0], url }] }).success).toBe(false);
    expect(AssetManifestSchema.safeParse({ ...manifest, groups: [{ ...manifest.groups[0], url }] }).success).toBe(false);
  });

  it.each(["html", "mdx", "script"])("does not accept executable %s blocks", (type) => {
    expect(ContentSectionSchema.safeParse({ ...section, blocks: [{ type, text: "<script />" }] }).success).toBe(false);
  });

  it("requires media references instead of arbitrary inline image URLs", () => {
    expect(ContentSectionSchema.safeParse({ ...section, blocks: [{ type: "image", url: "https://example.invalid/x", alt: "x", caption: "" }] }).success).toBe(false);
  });

  it.each([-1, 0.5, Number.POSITIVE_INFINITY, "10"])("rejects invalid asset counts: %s", (bytes) => {
    expect(AssetManifestSchema.safeParse({ ...manifest, groups: [{ ...manifest.groups[0], bytes }] }).success).toBe(false);
  });

  it("rejects malformed hashes, unsupported schema versions, and invalid revisions", () => {
    expect(AssetManifestSchema.safeParse({ ...manifest, groups: [{ ...manifest.groups[0], sha256: "bad" }] }).success).toBe(false);
    expect(AssetManifestSchema.safeParse({ ...manifest, schemaVersion: 2 }).success).toBe(false);
    expect(PublicationSchema.safeParse({ ...publication, revision: 0 }).success).toBe(false);
    expect(PreferencesSchema.safeParse({ ...defaultPreferences, version: 2 }).success).toBe(false);
    expect(PreferencesSchema.safeParse({ ...defaultPreferences, soundEnabled: "false" }).success).toBe(false);
  });

  const intents = [
    { type: "ENTER", replay: false }, { type: "SKIP" }, { type: "GREET" },
    { type: "OPEN_PROJECT", projectId: "helios", source: "dom" },
    { type: "NAVIGATE", path: "/about#research", source: "room", camera: null },
    { type: "OPEN_PANEL", panel: "room-controls" }, { type: "SET_LAMP", enabled: true },
    { type: "SET_BLINDS", open: false }, { type: "SET_SOUND", enabled: false },
    { type: "SET_QUALITY", quality: "auto" }, { type: "SET_CLOCK_FORMAT", clock24h: true },
    { type: "SET_PAUSED", paused: true }, { type: "ESCAPE" }, { type: "HIDE" },
    { type: "SHOW" }, { type: "RENDERER_FAILED", code: "test-only" },
  ];
  it.each(intents)("validates $type intent and rejects extra fields", (intent) => {
    expect(ExperienceIntentSchema.parse(intent)).toEqual(intent);
    expect(ExperienceIntentSchema.safeParse({ ...intent, script: "x" }).success).toBe(false);
    for (const key of Object.keys(intent)) {
      const incomplete = { ...intent } as Record<string, unknown>;
      delete incomplete[key];
      expect(ExperienceIntentSchema.safeParse(incomplete).success).toBe(false);
    }
  });

  it.each([
    { type: "OPEN_PROJECT", projectId: "invented", source: "dom" },
    { type: "NAVIGATE", path: "/admin", source: "dom", camera: null },
    { type: "NAVIGATE", path: "/about", source: "dom", camera: "unknown" },
    { type: "OPEN_PANEL", panel: "admin" }, { type: "SET_QUALITY", quality: "ultra" },
    { type: "SET_SOUND", enabled: 1 }, { type: "EVAL", code: "x" },
  ])("rejects unsupported intent %#", (intent) => {
    expect(ExperienceIntentSchema.safeParse(intent).success).toBe(false);
  });
  it("starts with sound off and no completed intro", () => {
    expect(defaultPreferences).toMatchObject({ soundEnabled: false, introCompleted: false, quality: "auto" });
    expect(Object.isFrozen(defaultPreferences)).toBe(true);
  });

  it("validates preferences with paused field and rejects invalid types", () => {
    expect(PreferencesSchema.parse({ ...defaultPreferences, paused: true }).paused).toBe(true);
    expect(PreferencesSchema.safeParse({ ...defaultPreferences, paused: "true" }).success).toBe(false);
  });

});
