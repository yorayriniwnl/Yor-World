import { z } from "zod";

const text = z.string().min(1);
const httpsUrl = z.url({ protocol: /^https$/ });
const timestamp = z.iso.datetime({ offset: true });

export const ProjectIdSchema = z.enum(["candidatex", "helios", "zenith", "ai-vs-real", "talks"]);
export type ProjectId = z.infer<typeof ProjectIdSchema>;

export const EvidenceStatusSchema = z.enum(["verified", "unknown", "not-measured", "not-applicable"]);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

export const EvidenceRefSchema = z.strictObject({
  id: text,
  kind: z.enum(["repository", "deployment", "measurement", "document"]),
  url: httpsUrl.nullable(),
  checkedAt: timestamp.nullable(),
  status: EvidenceStatusSchema,
  note: z.string(),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const ContentSectionSchema = z.strictObject({
  id: text,
  heading: text,
  blocks: z.array(z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("paragraph"), text }),
    z.strictObject({ type: z.literal("image"), mediaId: text, alt: z.string(), caption: z.string() }),
    z.strictObject({ type: z.literal("list"), items: z.array(text) }),
    z.strictObject({ type: z.literal("code"), language: text, text }),
  ])),
});
export type ContentSection = z.infer<typeof ContentSectionSchema>;

export const PublishedProjectSchema = z.strictObject({
  id: ProjectIdSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text,
  summary: text,
  contribution: text,
  sections: z.array(ContentSectionSchema),
  links: z.array(z.strictObject({ label: text, url: httpsUrl, checkedAt: timestamp })),
  evidence: z.array(EvidenceRefSchema),
  revision: z.number().int().positive(),
});
export type PublishedProject = z.infer<typeof PublishedProjectSchema>;

export const PublicationSchema = z.strictObject({
  revision: z.number().int().positive(),
  publishedAt: timestamp,
  projects: z.array(PublishedProjectSchema),
  assetManifestRevision: text,
});
export type Publication = z.infer<typeof PublicationSchema>;

export const MediaReviewItemSchema = z.strictObject({
  mediaId: text,
  hash: z.string(),
  approvalStatus: z.string(),
});
export type MediaReviewItem = z.infer<typeof MediaReviewItemSchema>;

export const ProjectReviewItemSchema = z.strictObject({
  projectId: ProjectIdSchema,
  draftRevision: z.number().int().positive(),
});
export type ProjectReviewItem = z.infer<typeof ProjectReviewItemSchema>;

export const ReviewIdentitySchema = z.strictObject({
  expectedPublicationRevision: z.number().int().positive(),
  projects: z.array(ProjectReviewItemSchema),
  media: z.array(MediaReviewItemSchema),
  candidateSha256: text,
});
export type ReviewIdentity = z.infer<typeof ReviewIdentitySchema>;

export const PreflightCheckResultSchema = z.strictObject({
  key: text,
  name: text,
  status: z.enum(["pass", "fail", "warn"]),
  message: z.string(),
});
export type PreflightCheckResult = z.infer<typeof PreflightCheckResultSchema>;

// These are structural boundary schemas. A2/A4 must additionally verify evidence,
// approved media, unique IDs/slugs, and owner authorization before publication.
