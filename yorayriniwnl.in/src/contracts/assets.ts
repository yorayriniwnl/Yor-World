import { z } from "zod";
import { QualityTierSchema } from "./experience";

const count = z.number().int().nonnegative();
export const AssetManifestSchema = z.strictObject({
  revision: z.string().min(1),
  schemaVersion: z.literal(1),
  groups: z.array(z.strictObject({
    id: z.string().min(1), tier: QualityTierSchema,
    url: z.url({ protocol: /^https$/ }), sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: count, triangles: count, materials: count, estimatedGpuBytes: count,
    clips: z.array(z.string().min(1)), provenanceId: z.string().min(1), approved: z.boolean(),
  })),
});
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
