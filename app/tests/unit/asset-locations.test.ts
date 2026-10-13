import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ASSET_LOCATIONS } from "../../src/features/world/asset-locations";

interface ManifestGroup { id: string; url: string }

const manifest = JSON.parse(readFileSync(new URL("../../public/asset-manifest.json", import.meta.url), "utf8")) as {
  revision: string;
  groups: ManifestGroup[];
};
const urlById = new Map(manifest.groups.map(({ id, url }) => [id, url]));

describe("runtime art URL mapping", () => {
  it("consumes the exact versioned URLs in the current public art manifest", () => {
    expect(manifest.revision).toBe("world-art-local-corrections-20261009-r1");
    expect(ASSET_LOCATIONS.roomFull).toBe(urlById.get("production-room-full"));
    expect(ASSET_LOCATIONS.roomMobile).toBe(urlById.get("mobile-room-lod"));
    expect(ASSET_LOCATIONS.fixture).toBe(urlById.get("fixture-chair-production"));
    expect(ASSET_LOCATIONS.groupAEssential).toBe(urlById.get("group-a-essential"));
    expect(ASSET_LOCATIONS.groupBProps).toBe(urlById.get("group-b-props"));
    expect(ASSET_LOCATIONS.onDemandProjects).toBe(urlById.get("on-demand-projects"));
  });
});
