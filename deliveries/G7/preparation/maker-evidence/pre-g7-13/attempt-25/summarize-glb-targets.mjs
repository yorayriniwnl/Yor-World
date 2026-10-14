import { readFileSync } from "node:fs";
const data = JSON.parse(readFileSync(process.argv[2], "utf8"));
const targetNames = new Set(["ai-real-camera", "peg_controller_body", "chair-root", "chair-base", "resident"]);
const matches = [];
const visit = (value, path = "$") => {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value) && typeof value.name === "string" && targetNames.has(value.name)) {
    matches.push({ path, value });
  }
  for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
};
visit(data);
process.stdout.write(JSON.stringify({ topLevelKeys: Object.keys(data), matches }, null, 2));
