import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { publishedProjects, draftIdentity } from "../../src/features/portfolio/public-content";

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)]);
}

it("keeps all public projects empty and identity provisional", () => {
  expect(publishedProjects).toEqual([]);
  expect(draftIdentity.note).toContain("await owner confirmation");
  expect(draftIdentity.role).toContain("proposed title");
});

it("does not pull fixture, world, service, or audio dependencies into production", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
  expect(Object.keys(packageJson.dependencies).sort()).toEqual(["next", "react", "react-dom", "zod"]);
  for (const path of files("src")) {
    const text = readFileSync(path, "utf8");
    expect(text, path).not.toMatch(/from\s+["'][^"']*(tests|fixtures|three|supabase|server\/|features\/room)|\b(fetch|Audio|AudioContext|WebSocket)\s*\(/);
    expect(text, path).not.toContain("dangerouslySetInnerHTML");
  }
});

it("keeps shared contracts independent of framework and server imports", () => {
  for (const path of files("src/contracts")) {
    const imports = [...readFileSync(path, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    for (const name of imports) expect(name).toMatch(/^(zod|\.\/)/);
  }
});
