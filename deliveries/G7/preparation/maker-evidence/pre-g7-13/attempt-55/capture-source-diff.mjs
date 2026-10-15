import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidence = "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-55";
const paths = [
  "app/src/features/world/world.module.css",
  "yorayriniwnl.in/src/features/world/world.module.css",
  "yorayriniwnl.in/source-delivery-manifest.json",
];
const diff = execFileSync("git", ["diff", "--binary", "HEAD", "--", ...paths], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
const digest = createHash("sha256").update(diff).digest("hex");
writeFileSync(path.join(root, evidence, "source-diff.patch"), diff);
writeFileSync(path.join(root, evidence, "source-diff.sha256.txt"), `sha256=${digest}\nbytes=${diff.length}\npaths=${paths.join(",")}\n`, "utf8");
process.stdout.write(`sha256=${digest}\nbytes=${diff.length}\npaths=${paths.join(",")}\n`);
