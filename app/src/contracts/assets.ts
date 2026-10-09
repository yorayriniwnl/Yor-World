import { z } from "zod";
import { QualityTierSchema } from "./experience";

const count = z.number().int().nonnegative();
const ManifestUrlSchema = z.union([
  z.url({ protocol: /^https$/ }),
  z.string().regex(/^\/models\/[a-zA-Z0-9_\-\./]+$/),
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
  status: z.string().optional(),
});

export const AssetManifestSchema = z.strictObject({
  revision: z.string().min(1),
  schemaVersion: z.literal(1),
  lane: z.string().optional(),
  notice: z.string().optional(),
  generatedAt: z.string().optional(),
  groups: z.array(AssetManifestGroupSchema),
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

