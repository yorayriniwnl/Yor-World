import { z } from "zod";
import { QualityTierSchema } from "./experience";

const count = z.number().int().nonnegative();
const ManifestUrlSchema = z.union([
  z.url({ protocol: /^https$/ }).refine((value) => {
    try {
      const url = new URL(value);
      return !url.username && !url.password;
    } catch {
      return false;
    }
  }),
  z.string().max(1024).regex(/^\/models\/[a-zA-Z0-9_\-\./]+$/)
    .refine((value) => value.slice(1).split("/").every((part) => part && part !== "." && part !== "..")),
]);

export const AssetManifestGroupSchema = z.strictObject({
  id: z.string().min(1),
  tier: QualityTierSchema,
  url: ManifestUrlSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: count,
  triangles: count,
  materials: count,
  estimatedGpuBytes: count,
  clips: z.array(z.string().min(1)),
  provenanceId: z.string().min(1),
  approved: z.boolean(),
  status: z.enum(["candidate", "approved"]).optional(),
});

export const AssetManifestSchema = z.strictObject({
  revision: z.string().min(1),
  schemaVersion: z.literal(1),
  lane: z.string().optional(),
  notice: z.string().optional(),
  generatedAt: z.string().datetime().optional(),
  groups: z.array(AssetManifestGroupSchema).min(1).max(64),
}).superRefine((manifest, context) => {
  if (new Set(manifest.groups.map((group) => group.id)).size !== manifest.groups.length
      || new Set(manifest.groups.map((group) => group.url)).size !== manifest.groups.length)
    context.addIssue({ code: "custom", message: "Asset IDs and URLs must be unique." });
});

export type AssetManifest = {
  revision: string;
  schemaVersion: 1;
  groups: Array<{
    id: string;
    tier: z.infer<typeof QualityTierSchema>;
    url: string;
    sha256: string;
    bytes: number;
    triangles: number;
    materials: number;
    estimatedGpuBytes: number;
    clips: string[];
    provenanceId: string;
    approved: boolean;
  }>;
};

