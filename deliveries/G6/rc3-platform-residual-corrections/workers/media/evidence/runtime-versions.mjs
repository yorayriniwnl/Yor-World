import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = process.argv[2];
const require = createRequire(resolve(app, "package.json"));
const version = (name) => JSON.parse(readFileSync(resolve(app, "node_modules", name, "package.json"), "utf8")).version;
const sharp = require("sharp");
console.log(JSON.stringify({ node: process.version, vitest: version("vitest"), pglite: version("@electric-sql/pglite"),
  sharp: version("sharp"), libvips: sharp.versions.vips }, null, 2));
