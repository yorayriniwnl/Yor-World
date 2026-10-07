import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { ROOT, assertMutableOutput } from "../release-lib.mjs";

const immutableDirectories = [
  "deliveries/C4", "deliveries/G6/full-stack-integration",
  "deliveries/G6/rc4-candidate", "deliveries/G6/rc5-candidate",
  "deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
  "docs/planning/reviews/2026-10-06-g6-r1",
];
const immutableFiles = [
  "docs/planning/reviews/2026-10-06-g6-r1.md",
  "docs/planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md",
  ...[1, 2, 3, 4, 5].map((revision) => `docs/releases/v1.0.0-rc${revision}.md`),
];
const immutableError = /Accepted RC1-RC5 evidence, audit and G6-R1 are immutable/;

test("canonical accepted output paths reject without performing writes", () => {
  for (const directory of immutableDirectories) {
    assert.throws(() => assertMutableOutput(directory), immutableError);
    assert.throws(() => assertMutableOutput(`${directory}/new/deep/output.json`), immutableError);
  }
  for (const file of immutableFiles) assert.throws(() => assertMutableOutput(file), immutableError);
});

test("Windows case aliases of accepted outputs reject without performing writes", {
  skip: process.platform !== "win32" ? "Requires Windows filesystem casing semantics" : false,
}, () => {
  for (const directory of immutableDirectories) {
    assert.throws(() => assertMutableOutput(`${directory.toUpperCase()}/new/deep/output.json`), immutableError);
  }
  for (const file of immutableFiles) assert.throws(() => assertMutableOutput(file.toUpperCase()), immutableError);
  assert.throws(() => assertMutableOutput("Deliveries/G6/rc5-candidate/release-manifest.json"), immutableError);
  assert.throws(() => assertMutableOutput("Docs/releases/v1.0.0-rc5.md"), immutableError);
});

async function temporaryRepository(t) {
  const tempParent = fs.realpathSync.native(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(tempParent, "yor-release-immutable-"));
  t.after(() => {
    // Verify the actual deletion target before recursively removing the fixture.
    const realFixture = fs.realpathSync.native(fixture);
    const relative = path.relative(tempParent, realFixture);
    assert.ok(relative.startsWith("yor-release-immutable-") && !relative.includes(path.sep));
    assert.equal(realFixture, fixture);
    fs.rmSync(realFixture, { recursive: true, force: true });
  });
  const root = path.join(fixture, "repo");
  const release = path.join(root, "scripts", "release");
  fs.mkdirSync(release, { recursive: true });
  fs.copyFileSync(path.join(ROOT, "scripts", "release", "release-lib.mjs"), path.join(release, "release-lib.mjs"));
  fs.writeFileSync(path.join(release, "rc6-policy.json"), "{}\n");
  for (const directory of immutableDirectories) fs.mkdirSync(path.join(root, directory), { recursive: true });
  for (const file of immutableFiles) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), `isolated immutable fixture: ${file}\n`);
  }
  const accepted = path.join(root, "deliveries", "G6", "rc5-candidate");
  fs.writeFileSync(path.join(accepted, "release-manifest.json"), "isolated accepted fixture\n");
  const mutable = path.join(root, "deliveries", "G7", "rc6-candidate-r3");
  const outside = path.join(fixture, "outside");
  fs.mkdirSync(mutable, { recursive: true });
  fs.mkdirSync(outside);
  const link = (name, target) => fs.symlinkSync(target, path.join(root, name), process.platform === "win32" ? "junction" : "dir");
  link("accepted-alias", accepted);
  for (const [index, directory] of immutableDirectories.entries()) link(`preserved-alias-${index}`, path.join(root, directory));
  link("docs-alias", path.join(root, "docs"));
  link("mutable-alias", mutable);
  link("outside-alias", outside);
  link("dangling-alias", path.join(root, "absent-target"));
  const lib = await import(pathToFileURL(path.join(release, "release-lib.mjs")).href);
  assert.equal(lib.ROOT, root);
  return { root, accepted, mutable, lib };
}

test("resolved output guards with isolated filesystem aliases", async (t) => {
  const { root, accepted, mutable, lib } = await temporaryRepository(t);
  const manifest = path.join(accepted, "release-manifest.json");
  const originalManifest = fs.readFileSync(manifest);
  const originalDossier = fs.readFileSync(path.join(root, "docs/releases/v1.0.0-rc5.md"));

  await t.test("contained directory alias rejects existing accepted output", () => {
    assert.throws(() => lib.assertMutableOutput("accepted-alias/release-manifest.json"), immutableError);
  });
  await t.test("contained directory alias rejects nonexistent descendants", () => {
    assert.throws(() => lib.assertMutableOutput("accepted-alias/new/deep/output.json"), immutableError);
    assert.throws(() => lib.writeJson("accepted-alias/new/deep/output.json", { forbidden: true }), immutableError);
    assert.equal(fs.existsSync(path.join(accepted, "new")), false);
  });
  await t.test("all preserved proof aliases reject writes to new descendants", () => {
    for (const [index, directory] of immutableDirectories.entries()) {
      assert.throws(() => lib.writeJson(`preserved-alias-${index}/new/output.json`, { forbidden: true }), immutableError);
      assert.equal(fs.existsSync(path.join(root, directory, "new")), false);
    }
  });
  await t.test("contained docs alias rejects exact immutable files and review directory", () => {
    for (const file of immutableFiles) {
      assert.throws(() => lib.assertMutableOutput(file.replace(/^docs\//, "docs-alias/")), immutableError);
    }
    assert.throws(() => lib.assertMutableOutput("docs-alias/planning/reviews/2026-10-06-g6-r1/new/output.json"), immutableError);
  });
  await t.test("Windows aliases reject with alternate casing", {
    skip: process.platform !== "win32" ? "Requires Windows filesystem casing semantics" : false,
  }, () => {
    assert.throws(() => lib.assertMutableOutput("ACCEPTED-ALIAS/new/deep/output.json"), immutableError);
    assert.throws(() => lib.assertMutableOutput("DOCS-ALIAS/releases/V1.0.0-RC5.MD"), immutableError);
  });
  await t.test("escaping aliases reject both existing and nonexistent descendants", () => {
    assert.throws(() => lib.assertMutableOutput("outside-alias"), /Symlink escapes repository/);
    assert.throws(() => lib.assertMutableOutput("outside-alias/new/deep/output.json"), /Symlink escapes repository/);
  });
  await t.test("dangling directory aliases fail closed", () => {
    assert.throws(() => lib.assertMutableOutput("dangling-alias/new/output.json"));
    assert.equal(fs.existsSync(path.join(root, "absent-target")), false);
  });
  await t.test("unsafe repository path inputs reject", () => {
    for (const name of ["", null, "../output.json", "./output.json", "foo/../output.json", "/output.json", "C:/output.json", "foo\\output.json", "foo//output.json", "foo/", "foo/\0output.json"]) {
      assert.throws(() => lib.assertMutableOutput(name), /Unsafe repository path/);
    }
  });
  await t.test("mutable successors and similar prefixes remain writable", () => {
    for (const name of ["deliveries/G7/rc6-candidate-r3/new/output.json", "deliveries/G6/rc5-candidate-extra/output.json", "docs/releases/v1.0.0-rc6.md", "docs/planning/reviews/2026-10-06-g6-r1-extra.md"]) {
      assert.equal(lib.assertMutableOutput(name), path.join(root, name));
    }
    lib.writeJson("mutable-alias/new/deep/output.json", { mutable: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(mutable, "new/deep/output.json"), "utf8")), { mutable: true });
  });
  await t.test("rejected guards leave isolated accepted fixtures unchanged", () => {
    assert.deepEqual(fs.readFileSync(manifest), originalManifest);
    assert.deepEqual(fs.readFileSync(path.join(root, "docs/releases/v1.0.0-rc5.md")), originalDossier);
    assert.deepEqual(fs.readdirSync(accepted), ["release-manifest.json"]);
  });
});
