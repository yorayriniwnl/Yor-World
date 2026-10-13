#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export function verifyBrowserReport(report, expectedPerProject) {
  const stats = report.stats;
  if (!stats || !(stats.expected > 0) || stats.unexpected !== 0 || stats.skipped !== 0 || stats.flaky !== 0
    || !Array.isArray(report.errors) || report.errors.length !== 0) {
    throw new Error(`Required browser checks were failed/skipped/flaky or had runner errors: ${JSON.stringify(stats)}`);
  }
  if (expectedPerProject !== undefined) {
    if (!Number.isInteger(expectedPerProject) || expectedPerProject <= 0) throw new Error("Expected browser count must be a positive integer per project");
    const projects = report.config?.projects;
    if (!Array.isArray(projects) || projects.length === 0) throw new Error("Browser report must identify executed projects");
    const projectCounts = new Map(projects.map((project) => [project.id, 0]));
    if (projectCounts.size !== projects.length) throw new Error("Browser report contains duplicate project IDs");
    function count(suite) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          if (!projectCounts.has(test.projectId) || test.status !== "expected" || test.expectedStatus !== "passed"
            || test.results?.length !== 1 || test.results[0].status !== "passed") {
            throw new Error(`Browser test was missing, retried, failed or expected to fail: ${spec.title}`);
          }
          projectCounts.set(test.projectId, projectCounts.get(test.projectId) + 1);
        }
      }
      for (const child of suite.suites || []) count(child);
    }
    for (const suite of report.suites || []) count(suite);
    for (const [project, total] of projectCounts) {
      if (total !== expectedPerProject) throw new Error(`${project} executed ${total} browser checks; required ${expectedPerProject}`);
    }
    if (stats.expected !== expectedPerProject * projects.length) throw new Error("Browser execution stats do not match the complete per-project inventory");
  }
  return stats.expected;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: { expected: { type: "string" } } });
    if (positionals.length !== 1) throw new Error("Usage: verify-playwright-results.mjs <report.json> [--expected <tests per project>]");
    const report = JSON.parse(fs.readFileSync(positionals[0], "utf8"));
    const total = verifyBrowserReport(report, values.expected === undefined ? undefined : Number(values.expected));
    console.log(`PASS browser execution: ${total} expected, zero skipped/flaky/unexpected`);
  } catch (error) { console.error(`FAIL browser execution receipt: ${error.message}`); process.exitCode = 1; }
}
