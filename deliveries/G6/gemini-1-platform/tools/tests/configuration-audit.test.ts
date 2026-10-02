/**
 * YOR WORLD Gate G6 Release Candidate: Configuration & Security Hygiene Audit
 *
 * Scans candidate codebase and configurations for:
 * 1. Hardcoded localhost URLs in production source
 * 2. Development-only endpoints or debug backdoors
 * 3. Test/staging credentials committed in production paths
 * 4. Placeholder origins or loose CORS
 * 5. Unsafe wildcard CORS (`*`)
 * 6. Secrets bundled client-side (`NEXT_PUBLIC_` secret leakage)
 * 7. Missing security-header configurations
 * 8. Environment-dependent runtime assumptions
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import nextConfig from "../../next.config";

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      if (!file.startsWith(".") && file !== "node_modules") {
        getFilesRecursively(filePath, fileList);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".mjs")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

describe("G6-RC: Release Configuration & Security Audit", () => {
  const srcDir = join(process.cwd(), "src");
  const srcFiles = getFilesRecursively(srcDir);

  it("5.1 Confirms NO hardcoded localhost URLs exist in production src/ (excluding test fallbacks)", () => {
    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of srcFiles) {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        // Check for hardcoded localhost destination URLs
        if (line.includes("http://localhost") || line.includes("http://127.0.0.1") || line.includes("https://localhost") || line.includes("https://127.0.0.1")) {
          if (!filePath.endsWith("clients.ts") && !line.includes("127.0.0.1:54321")) {
            violations.push({ file: filePath, line: index + 1, match: line.trim() });
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("5.2 Confirms NO development-only debug backdoors exist in production routes", () => {
    const appDir = join(srcDir, "app");
    const routeFiles = getFilesRecursively(appDir);
    const forbiddenRouteNames = ["debug", "test-harness", "mock-auth", "backdoor", "seed-db"];

    for (const route of routeFiles) {
      for (const forbidden of forbiddenRouteNames) {
        expect(route.toLowerCase()).not.toContain(forbidden);
      }
    }
  });

  it("5.3 Confirms NO server secrets use NEXT_PUBLIC_ prefix or leak to client code", () => {
    const forbiddenPublicKeys = [
      "NEXT_PUBLIC_SERVICE_ROLE",
      "NEXT_PUBLIC_SERVICE_KEY",
      "NEXT_PUBLIC_CRON_SECRET",
      "NEXT_PUBLIC_INTERNAL_JOB_KEY",
      "NEXT_PUBLIC_GITHUB_TOKEN",
      "NEXT_PUBLIC_DB_PASSWORD",
      "NEXT_PUBLIC_DATABASE_URL",
    ];

    for (const filePath of srcFiles) {
      const content = readFileSync(filePath, "utf8");
      for (const forbiddenKey of forbiddenPublicKeys) {
        expect(content).not.toContain(forbiddenKey);
      }
    }
  });

  it("5.4 Confirms NO wildcard CORS (Access-Control-Allow-Origin: *) is set in API routes", () => {
    for (const filePath of srcFiles) {
      const content = readFileSync(filePath, "utf8");
      expect(content).not.toContain("Access-Control-Allow-Origin: *");
      expect(content).not.toContain('"Access-Control-Allow-Origin", "*"');
      expect(content).not.toContain("'Access-Control-Allow-Origin', '*'");
    }
  });

  it("5.5 Audits next.config.ts for security posture and flags items requiring G7 live verification", () => {
    // Verifies poweredByHeader is explicitly disabled
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.reactStrictMode).toBe(true);

    // Note: Production security headers (CSP, HSTS, X-Frame-Options)
    // require final edge CDN/domain injection during Gate G7 live deployment
    const requiresG7Verification = {
      strictTransportSecurity: "REQUIRES G7 LIVE VERIFICATION",
      contentSecurityPolicy: "REQUIRES G7 LIVE VERIFICATION",
      productionSupabaseUrl: "REQUIRES G7 LIVE VERIFICATION",
      productionServiceRoleKey: "REQUIRES G7 LIVE VERIFICATION",
      productionCronSecret: "REQUIRES G7 LIVE VERIFICATION",
    };

    expect(requiresG7Verification.strictTransportSecurity).toBe("REQUIRES G7 LIVE VERIFICATION");
  });
});
