import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { publishedProjects, draftIdentity } from "../../src/features/portfolio/public-content";

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)]
  );
}

export interface DiscoveredImport {
  specifier: string;
  kind: "import" | "side-effect-import" | "export-from" | "dynamic-import" | "require" | "import-type";
  line: number;
  resolvedPath: string;
}

export function extractModuleSpecifiers(filePath: string, text: string): DiscoveredImport[] {
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const results: DiscoveredImport[] = [];

  function record(specifier: string, kind: DiscoveredImport["kind"], node: ts.Node) {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    let resolved = specifier;
    if (specifier.startsWith("@/")) {
      resolved = normalize(join("src", specifier.slice(2))).replace(/\\/g, "/");
    } else if (specifier.startsWith(".")) {
      resolved = normalize(join(dirname(filePath), specifier)).replace(/\\/g, "/");
    }
    results.push({ specifier, kind, line, resolvedPath: resolved });
  }

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        record(node.moduleSpecifier.text, node.importClause ? "import" : "side-effect-import", node);
      }
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        record(node.moduleSpecifier.text, "export-from", node);
      }
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          record(arg.text, "dynamic-import", node);
        }
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          record(arg.text, "require", node);
        }
      }
    } else if (ts.isImportTypeNode(node)) {
      if (ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        record(node.argument.literal.text, "import-type", node);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

export function validateProductionModule(filePath: string, text: string) {
  
  if (text.includes("dangerouslySetInnerHTML")) {
    throw new Error(`${filePath} contains dangerouslySetInnerHTML`);
  }
  if (filePath.endsWith(".css")) {
    return;
  }
  const imports = extractModuleSpecifiers(filePath, text);
  const forbiddenPatterns = [
    /(?:^|\/)(?:tests|fixtures)(?:\/|$)/,

  ];

  const isServerModule = filePath.startsWith("src/server/") ||
    filePath.startsWith("src/app/api/") || filePath.startsWith("src/app/admin/") ||
    filePath === "src/content/server-publication.ts" || filePath.startsWith("src/app/(public)/");
  if (!isServerModule) {
    forbiddenPatterns.push(/(?:^|\/)server(?:\/|$)/, /^sharp(?:\/|$)/);
    if (!filePath.startsWith("src/features/admin/")) forbiddenPatterns.push(/\bsupabase\b|@supabase/);
  }
  // Three.js stays isolated from the public HTML shell.
  // The public shell (portfolio, public routes, contracts) MUST NOT import Three.js!
  const isWorldFeature = /src\/features\/(world|experience|room)\//.test(filePath);
  if (!isWorldFeature) {
    forbiddenPatterns.push(/\bthree\b|@react-three/);
  }

  for (const imp of imports) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(imp.specifier) || pattern.test(imp.resolvedPath)) {
        throw new Error(
          `Forbidden import (${imp.kind}) in ${filePath}:${imp.line}: specifier "${imp.specifier}" resolves to "${imp.resolvedPath}" matching ${pattern}`
        );
      }
    }
  }
}

export function validateContractModule(filePath: string, text: string) {
  const imports = extractModuleSpecifiers(filePath, text);
  for (const imp of imports) {
    if (!/^(zod|\.\/)/.test(imp.specifier)) {
      throw new Error(
        `Contract module ${filePath}:${imp.line} has invalid non-contract import "${imp.specifier}" (${imp.kind})`
      );
    }
  }
}

it("validates published projects are structurally sound and identity is verified", () => {
  expect(publishedProjects.length).toBe(4);
  for (const p of publishedProjects) {
    expect(p.id).toBeTruthy();
    expect(p.slug).toBeTruthy();
    expect(p.title).toBeTruthy();
    expect(p.revision).toBeGreaterThanOrEqual(1);
    expect(p.sections.length).toBeGreaterThan(0);
    expect(p.evidence.length).toBeGreaterThan(0);
  }
  expect(draftIdentity.note).toContain("Verified identity");
  expect(draftIdentity.role).toContain("Developer");
});

it("enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
  expect(Object.keys(packageJson.dependencies).sort()).toEqual([
    "@supabase/ssr", "@supabase/supabase-js", "next", "pg", "react", "react-dom", "server-only", "sharp", "three", "zod"
  ]);
  for (const version of Object.values(packageJson.dependencies)) expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  for (const path of files("src")) {
    const text = readFileSync(path, "utf8");
    validateProductionModule(path.replace(/\\/g, "/"), text);
  }
});

it("keeps shared contracts independent of framework and server imports", () => {
  for (const path of files("src/contracts")) {
    const text = readFileSync(path, "utf8");
    validateContractModule(path.replace(/\\/g, "/"), text);
  }
});

describe("regression: syntax-level import boundary detection", () => {
  it("rejects dynamic import of test fixture in production module", () => {
    const snippet = `
      export async function loadData() {
        const fixture = await import("../../../tests/fixtures/reviewer-fixture");
        return fixture.unverifiedName;
      }
    `;
    expect(() => validateProductionModule("src/features/portfolio/public-content.ts", snippet))
      .toThrowError(/Forbidden import \(dynamic-import\)/);
  });

  it("rejects side-effect import of test fixture in production module", () => {
    const snippet = `import "../../../tests/fixtures/reviewer-fixture";\nexport const x = 1;`;
    expect(() => validateProductionModule("src/features/portfolio/public-content.ts", snippet))
      .toThrowError(/Forbidden import \(side-effect-import\)/);
  });

  it("rejects export-from of test fixture in production module", () => {
    const snippet = `export * from "../../../tests/fixtures/reviewer-fixture";`;
    expect(() => validateProductionModule("src/features/portfolio/public-content.ts", snippet))
      .toThrowError(/Forbidden import \(export-from\)/);
  });

  it("rejects aliased import of test fixture in production module", () => {
    const snippet = `import { unverifiedName } from "@/fixtures/reviewer-fixture";`;
    expect(() => validateProductionModule("src/features/portfolio/public-content.ts", snippet))
      .toThrowError(/Forbidden import \(import\)/);
  });

  it("rejects framework or dynamic imports in contracts", () => {
    const snippet1 = `import { useState } from "react";\nexport const a = 1;`;
    expect(() => validateContractModule("src/contracts/content.ts", snippet1))
      .toThrowError(/Contract module .* has invalid non-contract import/);

    const snippet2 = `export async function getMore() { return await import("./assets"); }`;
    expect(() => validateContractModule("src/contracts/content.ts", snippet2)).not.toThrow();

    const snippet3 = `export async function getMore() { return await import("next"); }`;
    expect(() => validateContractModule("src/contracts/content.ts", snippet3))
      .toThrowError(/Contract module .* has invalid non-contract import/);
  });

  it.each([
    ['import sharp from "sharp";', "import"],
    ['import "sharp";', "side-effect-import"],
    ['export async function decode() { return import("sharp"); }', "dynamic-import"],
    ['import decoder from "sharp/lib/index";', "import"],
  ])("rejects browser decoder import %s", (snippet, kind) => {
    expect(() => validateProductionModule("src/features/portfolio/image.ts", snippet))
      .toThrowError(new RegExp(`Forbidden import [(]${kind}[)].*sharp`));
  });

  it("permits the actual decoder import in its server media module", () => {
    const modulePath = "src/server/media/validate-upload.ts";
    const source = readFileSync(modulePath, "utf8");
    expect(extractModuleSpecifiers(modulePath, source).some((entry) => entry.specifier === "sharp")).toBe(true);
    expect(() => validateProductionModule(modulePath, source)).not.toThrow();
  });

  it("rejects three.js import in public shell features outside world", () => {
    const snippet = `import * as THREE from "three";\nexport const v = new THREE.Vector3();`;
    expect(() => validateProductionModule("src/features/portfolio/navigation.tsx", snippet))
      .toThrowError(/Forbidden import \(import\).*three/);
  });
});


it("keeps privileged server modules and secrets out of every transitive client import", () => {
  const all = files("src").filter((file) => /\.[cm]?[jt]sx?$/.test(file));
  const clients = all.filter((file) => /^\s*["']use client["']/.test(readFileSync(file, "utf8")));
  expect(clients.length).toBeGreaterThan(0);
  for (const client of clients) {
    const pending = [client];
    const visited = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const normalized = current.replace(/\\/g, "/");
      expect(normalized, `client ${client} reaches ${current}`).not.toMatch(/src\/server\/|src\/content\/server-publication/);
      const content = readFileSync(current, "utf8");
      expect(content, `privileged secret reachable from ${client}`).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY|DATABASE_URL|CONTACT_HASH_SECRET|RESEND_API_KEY|INTERNAL_JOB_KEY|CRON_SECRET/);
      for (const imported of extractModuleSpecifiers(normalized, content)) {
        expect(imported.specifier, `native decoder reachable from client ${client} through ${current}`).not.toMatch(/^sharp(?:\/|$)/);
        if (!imported.specifier.startsWith(".") && !imported.specifier.startsWith("@/")) continue;
        const target = imported.resolvedPath;
        const resolved = [target, `${target}.ts`, `${target}.tsx`, join(target, "index.ts"), join(target, "index.tsx")]
          .find((candidate) => existsSync(candidate) && /\.[cm]?[jt]sx?$/.test(candidate));
        if (resolved) pending.push(resolved);
      }
    }
  }
});
