import { readdirSync, readFileSync } from "node:fs";
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
  if (/\b(Audio|AudioContext|WebSocket)\s*\(/.test(text)) {
    throw new Error(`${filePath} contains forbidden runtime call (Audio/WebSocket)`);
  }
  if (text.includes("dangerouslySetInnerHTML")) {
    throw new Error(`${filePath} contains dangerouslySetInnerHTML`);
  }
  if (filePath.endsWith(".css")) {
    return;
  }
  const imports = extractModuleSpecifiers(filePath, text);
  const forbiddenPatterns: RegExp[] = [
    /(?:^|\/)(?:tests|fixtures)(?:\/|$)/,
  ];

  // In A3, the public shell (portfolio, public routes, world, contracts) MUST NOT import server or supabase!
  const isServerModule = filePath.includes("src/server/") || filePath.includes("src/app/api/") || filePath.includes("src/app/admin/");
  if (!isServerModule) {
    forbiddenPatterns.push(/\bsupabase\b|@supabase/);
    forbiddenPatterns.push(/(?:^|\/)server(?:\/|$)/);
  }

  // Three.js is permitted ONLY in src/features/world.
  const isWorldFeature = filePath.includes("src/features/world/");
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

it("publishes verified projects and verified owner identity", () => {
  expect(publishedProjects).toHaveLength(4);
  expect(draftIdentity.name).toBe("Ayush Roy");
  expect(draftIdentity.note).toContain("Verified identity grounded in owner repository");
});

it("enforces A3 dependency boundaries: three is isolated to world, public shell is free of server/supabase, dependencies are pinned", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
  expect(Object.keys(packageJson.dependencies).sort()).toEqual([
    "@supabase/ssr",
    "@supabase/supabase-js",
    "next",
    "react",
    "react-dom",
    "three",
    "zod",
  ]);
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

  it("rejects three.js import in public shell features outside world", () => {
    const snippet = `import * as THREE from "three";\nexport const v = new THREE.Vector3();`;
    expect(() => validateProductionModule("src/features/portfolio/navigation.tsx", snippet))
      .toThrowError(/Forbidden import \(import\).*three/);
  });
});
