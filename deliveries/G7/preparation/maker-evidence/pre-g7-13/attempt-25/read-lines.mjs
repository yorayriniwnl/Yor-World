import { readFileSync } from "node:fs";
const [file, start, end] = process.argv.slice(2);
const lines = readFileSync(file, "utf8").split(/\r?\n/);
for (let line = Number(start); line <= Number(end) && line <= lines.length; line++) {
  process.stdout.write(`${line}: ${lines[line - 1]}\n`);
}
