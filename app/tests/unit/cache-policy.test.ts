import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../../next.config";
import { frozenModelPaths } from "../../src/security/policy";

const modelsRoot = fileURLToPath(new URL("../../public/models/", import.meta.url));
const assetManifestPath = fileURLToPath(new URL("../../public/asset-manifest.json", import.meta.url));

function publicModelPaths(directory = modelsRoot): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return publicModelPaths(fullPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".glb")
      ? [`/models/${path.relative(modelsRoot, fullPath).split(path.sep).join("/")}`]
      : [];
  }).sort();
}

describe("immutable model cache policy", () => {
  it("assigns immutable caching to every actual public GLB and current manifest URL", async () => {
    const rules = await config.headers?.() ?? [];
    const cacheRules = rules.filter((rule) => rule.headers.some((header) => header.key.toLowerCase() === "cache-control"));
    expect(cacheRules.map((rule) => rule.source)).toEqual(frozenModelPaths);
    expect(frozenModelPaths).toEqual(publicModelPaths());
    expect(new Set(frozenModelPaths).size).toBe(frozenModelPaths.length);
    const manifest = JSON.parse(readFileSync(assetManifestPath, "utf8")) as { groups: Array<{ url: string }> };
    for (const group of manifest.groups) expect(frozenModelPaths).toContain(group.url);
    for (const rule of cacheRules) {
      expect(rule.source).toMatch(/^\/models\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.glb$/);
      expect(rule.headers).toContainEqual({ key: "Cache-Control", value: "public, max-age=31536000, immutable" });
    }
  });

  it("keeps only the manifest-referenced R1 versioned URLs in the public cache inventory", () => {
    const manifest = JSON.parse(readFileSync(assetManifestPath, "utf8")) as {
      revision: string;
      groups: Array<{ url: string }>;
    };
    const prefix = `/models/${manifest.revision}/`;
    const publicVersionedPaths = publicModelPaths().filter((url) => url.startsWith(prefix)).sort();
    const frozenVersionedPaths = frozenModelPaths.filter((url) => url.startsWith(prefix)).sort();
    const manifestVersionedPaths = manifest.groups.map((group) => group.url).filter((url) => url.startsWith(prefix)).sort();

    expect(manifestVersionedPaths).toHaveLength(6);
    expect(publicVersionedPaths).toEqual(manifestVersionedPaths);
    expect(frozenVersionedPaths).toEqual(manifestVersionedPaths);
  });
});
