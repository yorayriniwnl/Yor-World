import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceRoot, "../../../../..");
const domainRoot = path.join(repositoryRoot, "yorayriniwnl.in");
const preEditEntries = [
  ".accepted-source-stage", ".env.example", ".gitignore", ".next", ".npmrc", "about", "AGENTS.md", "CLAUDE.md",
  "contact", "eslint.config.mjs", "favicon.svg", "index.html", "local-next.stderr.log", "local-next.stdout.log",
  "next-env.d.ts", "next.config.ts", "node_modules", "package.json", "playwright.config.ts", "playwright.performance.config.ts",
  "pnpm-lock.yaml", "projects", "public", "README.md", "resume", "robots.txt", "sitemap.xml", "src", "styles.css",
  "supabase", "test-results", "tests", "tsconfig.json", "tsconfig.tsbuildinfo", "vitest.config.ts", "vitest.integration.config.ts",
];

function countTree(relativePath, shallow = false) {
  const absolutePath = path.join(domainRoot, relativePath);
  const rootEntries = readdirSync(absolutePath, { withFileTypes: true });
  let files = 0;
  let directories = 0;
  const walk = (directory, entries) => {
    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories += 1;
        if (!shallow) walk(path.join(directory, entry.name), readdirSync(path.join(directory, entry.name), { withFileTypes: true }));
      } else if (entry.isFile()) files += 1;
    }
  };
  walk(absolutePath, rootEntries);
  return { files, directories, topLevelEntries: rootEntries.length };
}

function ignoreRule(relativePath) {
  try {
    return execFileSync("git", ["check-ignore", "-v", `yorayriniwnl.in/${relativePath}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

const topLevelNow = readdirSync(domainRoot, { withFileTypes: true })
  .map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" }))
  .sort((a, b) => a.name.localeCompare(b.name));
const preserved = [
  ".accepted-source-stage", "node_modules", ".next", "test-results", "tsconfig.tsbuildinfo",
  ".env.example", "index.html", "styles.css", "favicon.svg", "robots.txt", "sitemap.xml",
  "about", "contact", "projects", "resume", "AGENTS.md", "CLAUDE.md", "local-next.stderr.log", "local-next.stdout.log",
].map((relativePath) => {
  const absolutePath = path.join(domainRoot, relativePath);
  let exists = false;
  let kind = null;
  try {
    const stat = statSync(absolutePath);
    exists = true;
    kind = stat.isDirectory() ? "directory" : "file";
  } catch {}
  return { path: relativePath, exists, kind, ignoredByGit: ignoreRule(relativePath) };
});
const envFiles = readdirSync(domainRoot).filter((name) => name.startsWith(".env")).sort();
const inventory = {
  capturedAt: new Date().toISOString(),
  root: "yorayriniwnl.in/",
  initialCapture: {
    command: "dir /a yorayriniwnl.in",
    capturedBeforePacketEdits: true,
    files: 24,
    directoriesIncludingDotEntries: 14,
    entries: preEditEntries,
  },
  currentTopLevel: topLevelNow,
  preservedTreeCounts: {
    acceptedSourceStage: countTree(".accepted-source-stage"),
    nextBuild: countTree(".next"),
    nodeModules: countTree("node_modules", true),
    testResults: countTree("test-results"),
  },
  environmentFiles: envFiles,
  preservedPaths: preserved,
  packetOwnedRootChanges: ["README.md", "source-delivery-manifest.json"],
  note: "The pre-edit directory listing was captured before any domain-folder mutation. The domain README was then corrected and the generated source-delivery manifest added; other listed paths were left intact.",
};
writeFileSync(path.join(evidenceRoot, "domain-folder-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
