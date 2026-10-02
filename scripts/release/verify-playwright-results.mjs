#!/usr/bin/env node
import fs from "node:fs";
try {
  const report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const stats = report.stats;
  if (!stats || !(stats.expected > 0) || stats.unexpected !== 0 || stats.skipped !== 0 || stats.flaky !== 0) throw new Error(`Required browser checks were failed/skipped/flaky: ${JSON.stringify(stats)}`);
  console.log(`PASS browser execution: ${stats.expected} expected, zero skipped/flaky/unexpected`);
} catch (error) { console.error(`FAIL browser execution receipt: ${error.message}`); process.exitCode = 1; }
