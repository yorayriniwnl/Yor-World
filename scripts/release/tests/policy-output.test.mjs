import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { ROOT, policy } from "../release-lib.mjs";

const rootName = "deliveries/G7/rc6-candidate-r7";
const oldRoots = [
  "deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2",
  "deliveries/G7/rc6-candidate-r3", "deliveries/G7/rc6-candidate-r4", "deliveries/G7/rc6-candidate-r5",
  "deliveries/G7/rc6-candidate-r6",
  "deliveries/G7/rc6-independent-delta/r6-audit",
  "deliveries/G7/rc6-independent-delta/gate-advice/final-r6",
  "docs/planning/reviews/2026-10-08-rc6-r1",
];
const oldFiles = ["docs/planning/reviews/2026-10-08-rc6-r1.md"];
const source = "a".repeat(40);

async function fixture(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const temporary = fs.mkdtempSync(path.join(parent, "yor-release-policy-"));
  t.after(() => {
    const actual = fs.realpathSync.native(temporary);
    const relative = path.relative(parent, actual);
    assert.equal(actual, temporary);
    assert.ok(relative.startsWith("yor-release-policy-") && !relative.includes(path.sep));
    fs.rmSync(actual, { recursive: true, force: true });
  });
  const root = path.join(temporary, "repo");
  const checkout = path.join(temporary, "checkout");
  const release = path.join(root, "scripts/release");
  fs.mkdirSync(release, { recursive: true });
  for (const name of fs.readdirSync(path.join(ROOT, "scripts/release")).filter((name) => name.endsWith(".mjs"))) {
    fs.copyFileSync(path.join(ROOT, "scripts/release", name), path.join(release, name));
  }
  const driver = path.join(root, "deliveries/G7/preparation/tools/candidate-driver.py");
  fs.mkdirSync(path.dirname(driver), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "deliveries/G7/preparation/tools/candidate-driver.py"), driver);
  const frozen = new Map();
  for (const old of oldRoots) {
    fs.mkdirSync(path.join(root, old), { recursive: true });
    const sentinel = path.join(root, old, "archive-and-receipt.txt");
    fs.writeFileSync(sentinel, `preserved fixture ${old}\n`);
    frozen.set(sentinel, fs.readFileSync(sentinel));
  }
  for (const old of oldFiles) {
    const sentinel = path.join(root, old);
    fs.mkdirSync(path.dirname(sentinel), { recursive: true });
    fs.writeFileSync(sentinel, `isolated preserved file ${old}\n`);
    frozen.set(sentinel, fs.readFileSync(sentinel));
  }
  const setPolicy = (candidate) => fs.writeFileSync(path.join(release, "rc6-policy.json"), JSON.stringify(candidate));
  setPolicy(policy);
  const lib = await import(pathToFileURL(path.join(release, "release-lib.mjs")).href);
  const unchanged = () => {
    for (const [name, bytes] of frozen) assert.deepEqual(fs.readFileSync(name), bytes);
    for (const old of oldRoots) assert.deepEqual(fs.readdirSync(path.join(root, old)), ["archive-and-receipt.txt"]);
  };
  const run = (program, args) => spawnSync(program, args, { cwd: root, encoding: "utf8", windowsHide: true });
  return { root, checkout, driver, setPolicy, lib, unchanged, run };
}

test("committed policy binds the R7 delivery and canonical archive", () => {
  assert.equal(policy.deliveryRoot, rootName);
  assert.equal(policy.bundle.path, `${rootName}/yor-world-${policy.releaseId}.bundle.tar.gz`);
});

test("policy drift fails all writing entry points before creating output", async (t) => {
  const f = await fixture(t);
  const variants = [
    ["old archive under R1", { ...policy, bundle: { ...policy.bundle, path: `${oldRoots[0]}/yor-world-${policy.releaseId}.bundle.tar.gz` } }],
    ["old archive under R2", { ...policy, bundle: { ...policy.bundle, path: `${oldRoots[1]}/yor-world-${policy.releaseId}.bundle.tar.gz` } }],
    ["preserved R3 archive", { ...policy, bundle: { ...policy.bundle, path: `${oldRoots[2]}/yor-world-${policy.releaseId}.bundle.tar.gz` } }],
    ...oldRoots.map((deliveryRoot) => ["preserved root " + deliveryRoot, { ...policy, deliveryRoot, bundle: { ...policy.bundle, path: `${deliveryRoot}/yor-world-${policy.releaseId}.bundle.tar.gz` } }]),
    ["mismatched mutable root", { ...policy, bundle: { ...policy.bundle, path: `deliveries/G7/other/yor-world-${policy.releaseId}.bundle.tar.gz` } }],
    ["outside delivery tree", { ...policy, deliveryRoot: "scratch/export", bundle: { ...policy.bundle, path: `scratch/export/yor-world-${policy.releaseId}.bundle.tar.gz` } }],
    ["nonportable drive archive", { ...policy, bundle: { ...policy.bundle, path: "C:/outside/archive.tar.gz" } }],
    ["backslash archive", { ...policy, bundle: { ...policy.bundle, path: "deliveries\\G7\\archive.tar.gz" } }],
    ["archive alternate stream", { ...policy, bundle: { ...policy.bundle, path: `${rootName}/archive:stream` } }],
    ["traversal root", { ...policy, deliveryRoot: "deliveries/G7/../outside" }],
  ];
  for (const [name, candidate] of variants) await t.test(name, () => {
    f.setPolicy(candidate);
    const commands = [
      ["node", ["scripts/release/build-release-bundle.mjs", "--source-commit", source]],
      ["node", ["scripts/release/validate-release.mjs", "--strict"]],
      ["python", ["-B", f.driver, "--repository", f.root, "--checkout", f.checkout, "--source", source,
        "--client-date", "2026-10-07", "--phase", "prepare"]],
    ];
    for (const [program, args] of commands) {
      const result = f.run(program, args);
      assert.equal(result.status, 1, `${program}: ${result.stdout}${result.stderr}`);
      assert.match(result.stderr, /immutable|preserved|Unsafe|Unsafe repository|policy|deliveryRoot/i);
      assert.doesNotMatch(result.stderr, /not a git repository|cannot find module|ENOENT|Source identity/i);
    }
    assert.equal(fs.existsSync(path.join(f.root, rootName)), false);
    assert.equal(fs.existsSync(f.checkout), false);
    f.unchanged();
  });
});

test("CLI override outputs cannot escape the bound delivery or overwrite inputs", async (t) => {
  const f = await fixture(t);
  for (const [script, args, expected] of [
    ...oldRoots.flatMap((root) => [
      ["build-release-bundle.mjs", ["--receipt", `${root}/new/receipt.json`], /immutable/],
      ["validate-release.mjs", ["--receipt", `${root}/new/receipt.json`], /immutable/],
      ["validate-release.mjs", ["--manifest", `${root}/release-manifest.json`], /immutable/],
    ]),
    ...oldFiles.flatMap((file) => [
      ["build-release-bundle.mjs", ["--receipt", file], /immutable/],
      ["validate-release.mjs", ["--receipt", file], /immutable/],
    ]),
    ["build-release-bundle.mjs", ["--output", "scratch/archive.tar.gz"], /must equal policy.bundle.path/],
    ["build-release-bundle.mjs", ["--receipt", "scratch/receipt.json"], /inside the policy deliveryRoot/],
    ["build-release-bundle.mjs", ["--receipt", policy.bundle.path], /outputs must differ/],
    ["validate-release.mjs", ["--receipt", "scratch/receipt.json"], /inside the policy deliveryRoot/],
    ["validate-release.mjs", ["--manifest", "scratch/manifest.json"], /inside the policy deliveryRoot/],
    ["validate-release.mjs", ["--receipt", `${rootName}/release-manifest.json`], /must not overwrite its inputs/],
    ["validate-release.mjs", ["--receipt", policy.bundle.path], /must not overwrite its inputs/],
  ]) {
    const result = f.run("node", [`scripts/release/${script}`, ...args]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
  }
  assert.equal(fs.existsSync(path.join(f.root, rootName)), false);
  assert.equal(fs.existsSync(path.join(f.root, "scratch")), false);
  const manifest = path.join(f.root, rootName, "release-manifest.json");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, JSON.stringify({ sourceBinding: { path: `${rootName}/source-binding.json` } }));
  const archive = path.join(f.root, policy.bundle.path);
  fs.writeFileSync(archive, "archive fixture");
  const linkedReceipt = path.join(f.root, rootName, "hard-linked-receipt.json");
  fs.linkSync(archive, linkedReceipt);
  const hardLinkResult = f.run("node", ["scripts/release/build-release-bundle.mjs", "--source-commit", source, "--receipt", `${rootName}/hard-linked-receipt.json`]);
  assert.equal(hardLinkResult.status, 1);
  assert.match(hardLinkResult.stderr, /Hard-linked release output|outputs must differ/);
  assert.equal(fs.readFileSync(archive, "utf8"), "archive fixture");
  fs.unlinkSync(linkedReceipt);
  fs.unlinkSync(archive);
  const result = f.run("node", ["scripts/release/validate-release.mjs", "--strict", "--receipt", `${rootName}/source-binding.json`]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not overwrite its inputs/);
  if (process.platform === "win32") {
    const basenameAlias = (name) => path.posix.dirname(name) + "/" + path.posix.basename(name).toUpperCase();
    const archiveBefore = Buffer.from("isolated archive must remain unchanged");
    fs.writeFileSync(archive, archiveBefore);
    const upperArchive = f.run("node", ["scripts/release/build-release-bundle.mjs", "--source-commit", source, "--receipt", basenameAlias(policy.bundle.path)]);
    assert.equal(upperArchive.status, 1);
    assert.match(upperArchive.stderr, /outputs must differ/);
    const manifestBefore = fs.readFileSync(manifest);
    const upperManifest = f.run("node", ["scripts/release/validate-release.mjs", "--strict", "--receipt", basenameAlias(`${rootName}/release-manifest.json`)]);
    assert.equal(upperManifest.status, 1);
    assert.match(upperManifest.stderr, /must not overwrite its inputs/);
    assert.deepEqual(fs.readFileSync(manifest), manifestBefore);
    assert.deepEqual(fs.readFileSync(archive), archiveBefore);
    fs.unlinkSync(archive);
  }
  assert.equal(fs.existsSync(path.join(f.root, rootName, "source-binding.json")), false);
  f.unchanged();
});

test("validator protects every fixed input even when manifest bindings are absent", async (t) => {
  const f = await fixture(t);
  const manifestName = `${rootName}/release-manifest.json`;
  const manifest = path.join(f.root, manifestName);
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  const malformed = Buffer.from(JSON.stringify({ releaseBundlePath: policy.bundle.path, evidenceHashes: [], requiredChecks: [] }));
  fs.writeFileSync(manifest, malformed);
  const suffixes = new Set([
    "source-binding.json", "release-composition.json", "bundle-receipt.json",
    ...policy.requiredEvidencePaths,
    "evidence/e2e/browser-results.json", "evidence/accessibility/browser-results.json",
    "evidence/performance/performance-results.json",
    ...["active-route-frame-pacing.json", "cold-loads-desktop-1440x900.json",
      "cold-loads-mobile-390x844.json", "cold-loads-narrow-320x600.json",
      "enter-exit-stability.json", "public-payloads.json"].map((name) => "evidence/performance/" + name),
  ]);
  for (const suffix of suffixes) await t.test(suffix, () => {
    const inputName = `${rootName}/${suffix}`;
    const input = path.join(f.root, inputName);
    fs.mkdirSync(path.dirname(input), { recursive: true });
    const sentinel = Buffer.from(`isolated mandatory input: ${suffix}\n`);
    fs.writeFileSync(input, sentinel);
    const names = [inputName];
    if (process.platform === "win32") names.push(path.posix.dirname(inputName) + "/" + path.posix.basename(inputName).toUpperCase());
    const before = fs.readdirSync(path.dirname(input)).sort();
    for (const receipt of names) {
      const result = f.run("node", ["scripts/release/validate-release.mjs", "--receipt", receipt]);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Validation receipt must not overwrite its inputs/);
      assert.doesNotMatch(result.stderr, /sourceCommit|Unsafe repository path|ENOENT|not a git repository/);
      assert.deepEqual(fs.readFileSync(input), sentinel);
      assert.deepEqual(fs.readFileSync(manifest), malformed);
      assert.deepEqual(fs.readdirSync(path.dirname(input)).sort(), before);
    }
  });
  await t.test("fixed inventory preflight precedes malformed JSON and wrong-shaped declarations", () => {
    const inputName = `${rootName}/evidence/versions.json`;
    const input = path.join(f.root, inputName);
    const originalInput = fs.readFileSync(input);
    for (const invalid of ["{invalid JSON", JSON.stringify({ evidenceHashes: {}, requiredChecks: {} })]) {
      fs.writeFileSync(manifest, invalid);
      const result = f.run("node", ["scripts/release/validate-release.mjs", "--receipt", inputName]);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Validation receipt must not overwrite its inputs/);
      assert.deepEqual(fs.readFileSync(input), originalInput);
      assert.equal(fs.readFileSync(manifest, "utf8"), invalid);
    }
  });
  f.unchanged();
});

test("validator protects declared inputs and preserves detached receipt semantics", async (t) => {
  const f = await fixture(t);
  const manifest = path.join(f.root, rootName, "release-manifest.json");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  for (const binding of [
    (name) => ({ sourceBinding: { path: name } }),
    (name) => ({ composition: { path: name } }),
    (name) => ({ evidenceHashes: [{ path: name }] }),
    (name) => ({ requiredChecks: [{ id: "unit-tests", evidencePath: name }] }),
  ]) {
    const name = `${rootName}/evidence/custom-input.json`;
    const target = path.join(f.root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const sentinel = Buffer.from('{"isolated":"dynamic input"}\n');
    fs.writeFileSync(target, sentinel);
    const manifestBefore = Buffer.from(JSON.stringify({ releaseBundlePath: policy.bundle.path, ...binding(name) }));
    fs.writeFileSync(manifest, manifestBefore);
    const alias = process.platform === "win32" ? path.posix.dirname(name) + "/" + path.posix.basename(name).toUpperCase() : name;
    const result = f.run("node", ["scripts/release/validate-release.mjs", "--receipt", alias]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Validation receipt must not overwrite its inputs/);
    assert.deepEqual(fs.readFileSync(target), sentinel);
    assert.deepEqual(fs.readFileSync(manifest), manifestBefore);
  }
  const detached = `${rootName}/release-manifest-validation.receipt.json`;
  fs.writeFileSync(manifest, JSON.stringify({ releaseBundlePath: policy.bundle.path, sourceCommit: "invalid-isolated-source",
    requiredChecks: [{ id: "release-manifest-validation", evidencePath: detached }] }));
  // An invalid fixture source stops later verification; both distinct outputs must
  // pass collision preflight without incorrectly reading the self-named receipt.
  for (const receipt of [detached, `${rootName}/primary-release-manifest-validation.receipt.json`]) {
    const result = f.run("node", ["scripts/release/validate-release.mjs", "--receipt", receipt]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sourceCommit must be a full non-placeholder Git SHA/);
    assert.doesNotMatch(result.stderr, /must not overwrite its inputs/);
    assert.equal(fs.existsSync(path.join(f.root, receipt)), false);
  }
  const reader = `${rootName}/evidence/custom-input.json`;
  const readerAlias = path.join(f.root, rootName, "evidence/read-alias.json");
  fs.linkSync(path.join(f.root, reader), readerAlias);
  assert.deepEqual(f.lib.readJson(reader), { isolated: "dynamic input" });
  assert.deepEqual(f.lib.readJson(`${rootName}/evidence/read-alias.json`), { isolated: "dynamic input" });
  f.unchanged();
});

test("direct Python JSON writer rejects hardlinked protected bytes and permits distinct outputs", async (t) => {
  const f = await fixture(t);
  const script = String.raw`
import importlib.util, json
from pathlib import Path
spec = importlib.util.spec_from_file_location("driver", ${JSON.stringify(f.driver)})
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
repo = Path(${JSON.stringify(f.root)})
delivery = repo / ${JSON.stringify(rootName)}
delivery.mkdir(parents=True)
output = delivery / "writer-output.json"
sentinel_names = [root + "/archive-and-receipt.txt" for root in ${JSON.stringify(oldRoots)}] + ${JSON.stringify(oldFiles)}
for name in sentinel_names:
    sentinel = repo / name
    before = sentinel.read_bytes()
    output.hardlink_to(sentinel)
    assert output.stat().st_nlink > 1
    try: module.write_json(output, {"forbidden": True})
    except ValueError as error: assert "Hard-linked release output is forbidden" in str(error), error
    else: raise AssertionError("direct writer truncated a hardlinked output")
    assert sentinel.read_bytes() == before and output.read_bytes() == before
    assert sorted(path.name for path in delivery.iterdir()) == ["writer-output.json"]
    output.unlink()
module.write_json(output, {"allowed": 1})
module.write_json(output, {"allowed": 2})
assert json.loads(output.read_text()) == {"allowed": 2}
fresh = delivery / "new/deep/output.json"
module.write_json(fresh, {"fresh": True})
assert json.loads(fresh.read_text()) == {"fresh": True}
print("PASS direct Python writer hardlink rejection, unchanged sentinels and distinct writes")
`;
  const result = f.run("python", ["-B", "-c", script]);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /PASS direct Python writer/);
  f.unchanged();
});

test("Python output preflight protects every preserved root and filesystem alias", async (t) => {
  const f = await fixture(t);
  for (const [index, old] of oldRoots.entries()) {
    fs.symlinkSync(path.join(f.root, old), path.join(f.root, `alias-${index}`), process.platform === "win32" ? "junction" : "dir");
  }
  fs.symlinkSync(path.join(f.root, "docs"), path.join(f.root, "docs-alias"), process.platform === "win32" ? "junction" : "dir");
  const script = String.raw`
import importlib.util, json, os
from pathlib import Path
spec = importlib.util.spec_from_file_location("driver", ${JSON.stringify(f.driver)})
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
repo = Path(${JSON.stringify(f.root)})
policy = json.loads((repo / "scripts/release/rc6-policy.json").read_text())
def rejects(name):
    try: module.safe_output(repo, name)
    except ValueError as error: assert "Preserved release proof" in str(error), error
    else: raise AssertionError("preserved output accepted: " + name)
for index, root in enumerate(${JSON.stringify(oldRoots)}):
    for name in [root, root + "/new/deep/receipt.json", f"alias-{index}/new/receipt.json"]:
        rejects(name)
        if os.name == "nt": rejects(name.upper())
    candidate = dict(policy, deliveryRoot=f"alias-{index}", bundle=dict(policy["bundle"], path=f"alias-{index}/yor-world-{policy['releaseId']}.bundle.tar.gz"))
    try: module.assert_policy_outputs(repo, candidate)
    except ValueError as error: assert "Preserved release proof" in str(error), error
    else: raise AssertionError("preserved policy alias accepted")
for name in ${JSON.stringify(oldFiles)}:
    for variant in [name, name.replace("docs/", "docs-alias/", 1)]:
        rejects(variant)
        if os.name == "nt": rejects(variant.upper())
module.assert_policy_outputs(repo, policy)
assert not (repo / policy["deliveryRoot"]).exists()
print("PASS Python preserved roots, aliases, casing and no-write preflight")
`;
  const result = f.run("python", ["-B", "-c", script]);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /PASS Python preserved roots/);
  f.unchanged();
});

test("policy roots and nested outputs reject preserved and escaping filesystem aliases", async (t) => {
  const f = await fixture(t);
  for (const [index, target] of oldRoots.entries()) {
    const alias = `deliveries/G7/alias-${index}`;
    fs.symlinkSync(path.join(f.root, target), path.join(f.root, alias), process.platform === "win32" ? "junction" : "dir");
    const candidate = { ...policy, deliveryRoot: alias, bundle: { ...policy.bundle, path: `${alias}/yor-world-${policy.releaseId}.bundle.tar.gz` } };
    assert.throws(() => f.lib.assertPolicyOutputs(candidate), /immutable/);
  }
  const delivery = path.join(f.root, rootName);
  fs.mkdirSync(delivery);
  fs.symlinkSync(path.join(f.root, oldRoots[1]), path.join(delivery, "old"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => f.lib.assertPolicyOutput(`${rootName}/old/new/receipt.json`), /immutable/);
  const outside = path.join(path.dirname(f.root), "outside");
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(delivery, "outside"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => f.lib.assertPolicyOutput(`${rootName}/outside/new/receipt.json`), /escapes repository/);
  fs.mkdirSync(path.join(delivery, "mutable"));
  fs.symlinkSync(path.join(delivery, "mutable"), path.join(delivery, "mutable-alias"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => f.lib.assertPolicyOutput(`${rootName}/mutable-alias/new/receipt.json`), /without filesystem aliases/);
  f.unchanged();
});

test("driver verifies actual exported bundle and every final manifest input", async (t) => {
  const f = await fixture(t);
  const script = String.raw`
import importlib.util, json, hashlib, shutil
from pathlib import Path
from types import SimpleNamespace
spec = importlib.util.spec_from_file_location("driver", ${JSON.stringify(f.driver)})
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
repo = Path(${JSON.stringify(f.root)}); checkout = Path(${JSON.stringify(f.checkout)})
driver = module.Driver(SimpleNamespace(repository=repo, checkout=checkout, policy="scripts/release/rc6-policy.json", source="${source}"))
delivery = driver.delivery_relative.as_posix()
def sha(data): return hashlib.sha256(data).hexdigest()
def write(name, value):
    path = checkout / name; path.parent.mkdir(parents=True, exist_ok=True)
    data = value if isinstance(value, bytes) else json.dumps(value).encode()
    path.write_bytes(data); return {"path":name, "sha256":sha(data)}
archive = b"actual detached archive bytes"
write(driver.policy["bundle"]["path"], archive)
bundle = {"sourceCommit":driver.source, "archivePath":driver.policy["bundle"]["path"], "sha256":sha(archive), "bytes":len(archive)}
supplemental = []
for suffix in driver.policy["requiredEvidencePaths"]:
    supplemental.append(write(f"{delivery}/{suffix}", bundle if suffix == "bundle-receipt.json" else {"fixture":suffix}))
composition = write(f"{delivery}/release-composition.json", {"fixture":"composition"})
binding = next(item for item in supplemental if item["path"].endswith("/source-binding.json"))
checks = []
for check_id in driver.policy["requiredChecks"]:
    name = f"{delivery}/release-manifest-validation.receipt.json" if check_id == "release-manifest-validation" else f"{delivery}/evidence/{check_id}.log"
    item = {"id":check_id, "sourceCommit":driver.source, "status":"pass", "evidencePath":name}
    if check_id != "release-manifest-validation": item["evidenceSha256"] = write(name, b"check passed")["sha256"]
    checks.append(item)
manifest = {"sourceCommit":driver.source, "releaseBundlePath":driver.policy["bundle"]["path"], "releaseBundleSha256":sha(archive), "requiredChecks":checks, "evidenceHashes":supplemental, "composition":composition, "sourceBinding":binding}
manifest_binding = write(f"{delivery}/release-manifest.json", manifest)
write(f"{delivery}/release-manifest-validation.receipt.json", {"sourceCommit":driver.source, "overallStatus":"PASS", "manifestSha256":manifest_binding["sha256"], "releaseBundleSha256":sha(archive)})
driver.export(); driver.verify_exported_inputs()
rejects_primary = lambda: driver.verify_primary_validation()
try: rejects_primary()
except FileNotFoundError: pass
else: raise AssertionError("missing primary receipt was accepted")
primary = repo / delivery / "primary-release-manifest-validation.receipt.json"
primary.write_text(json.dumps({"overallStatus":"PASS", "sourceCommit":driver.source, "manifestPath":f"{delivery}/release-manifest.json", "manifestSha256":manifest_binding["sha256"], "releaseBundleSha256":sha(archive)}))
driver.verify_primary_validation()
def rejects(operation):
    try: operation()
    except (ValueError, RuntimeError, OSError): return
    raise AssertionError("unsafe export was accepted")
archive_path = repo / driver.policy["bundle"]["path"]
archive_path.unlink(); rejects(driver.verify_exported_inputs)
archive_path.write_bytes(b"wrong archive"); rejects(driver.verify_exported_inputs)
primary.write_text(json.dumps({"overallStatus":"FAIL"})); rejects(driver.verify_primary_validation)
driver.export(); driver.verify_exported_inputs()
required = repo / supplemental[0]["path"]
original = required.read_bytes(); required.write_bytes(b"wrong input"); rejects(driver.verify_exported_inputs)
required.write_bytes(original)
missing = checkout / supplemental[-1]["path"]; original = missing.read_bytes(); missing.unlink()
rejects(driver.verify_exported_inputs); missing.write_bytes(original)
manifest["evidenceHashes"].append({"path":"scratch/outside.json", "sha256":"a"*64})
write(f"{delivery}/release-manifest.json", manifest); driver.export()
rejects(driver.verify_exported_inputs)
# Export must preflight all destinations, so no preceding ordinary file is copied on rejection.
old = repo / "deliveries/G7/rc6-candidate-r2"
alias = driver.destination / "alias"
alias.symlink_to(old, target_is_directory=True)
write(f"{delivery}/would-copy.json", b"must stay detached")
rejects(driver.export)
assert not (driver.destination / "would-copy.json").exists()
assert not (old / "would-copy.json").exists()
# A primary policy edit after initialization also stops export before writing.
policy_path = repo / driver.policy_path; original_policy = policy_path.read_bytes()
changed = json.loads(original_policy); changed["bundle"]["path"] = "deliveries/G7/rc6-candidate/forbidden.tar.gz"
policy_path.write_text(json.dumps(changed)); rejects(driver.export); policy_path.write_bytes(original_policy)
# The final validation phase must export/check inputs before strict primary validation.
events = []
driver.require_session = lambda: events.append("session")
driver.record = lambda check, command, cwd, number: events.append((check, command, cwd))
driver.export = lambda: events.append("export")
driver.verify_exported_inputs = lambda: events.append("inputs")
driver.verify_primary_validation = lambda: events.append("primary-receipt")
driver.validate()
primary = next(index for index, event in enumerate(events) if isinstance(event, tuple) and event[0] == "primary-release-manifest-validation")
assert events[primary - 1] == "inputs" and "export" in events[:primary]
assert events[primary][2] == repo and "--strict" in events[primary][1]
assert events[-2:] == ["inputs", "primary-receipt"]
print("PASS driver export completeness, input hashes, alias preflight and primary validation sequence")
`;
  const result = f.run("python", ["-B", "-c", script]);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /PASS driver export completeness/);
  f.unchanged();
});
