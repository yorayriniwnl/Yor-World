import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const evidencePrefix =
  "deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime/";
const indexEntries = execFileSync(
  "git",
  ["ls-files", "--stage", "--", evidencePrefix],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .map((line) => {
    const [metadata, path] = line.split("\t");
    return { blob: metadata.split(" ")[1], path };
  })
  .filter(({ path }) => !path.endsWith("SHA256SUMS.txt"));

const checksums = indexEntries.map(({ blob, path }) => {
  const content = execFileSync("git", ["cat-file", "blob", blob]);
  const digest = createHash("sha256").update(content).digest("hex");
  return `${digest}  ${path.slice(evidencePrefix.length)}`;
});

writeFileSync(
  `${evidencePrefix}SHA256SUMS.txt`,
  `${checksums.join("\n")}\n`,
  "ascii",
);
