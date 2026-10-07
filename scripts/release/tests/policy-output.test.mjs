import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { ROOT, policy } from "../release-lib.mjs";

const rootName = "deliveries/G7/rc6-candidate-r3";
const oldRoots = ["deliveries/G7/rc6-candidate", "deliveries/G7/rc6-candidate-r2"];
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

test("committed policy binds the R3 delivery and canonical archive", () => {
  assert.equal(policy.deliveryRoot, rootName);
  assert.equal(policy.bundle.path, `${rootName}/yor-world-${policy.releaseId}.bundle.tar.gz`);
});

test("policy drift fails all writing entry points before creating output", async (t) => {
  const f = await fixture(t);
  const variants = [
    ["old archive under R1", { ...policy, bundle: { ...policy.bundle, path: `${oldRoots[0]}/yor-world-${policy.releaseId}.bundle.tar.gz` } }],
    ["old archive under R2", { ...policy, bundle: { ...policy.bundle, path: `${oldRoots[1]}/yor-world-${policy.releaseId}.bundle.tar.gz` } }],
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
  const result = f.run("node", ["scripts/release/validate-release.mjs", "--strict", "--receipt", `${rootName}/source-binding.json`]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not overwrite its inputs/);
  assert.equal(fs.existsSync(path.join(f.root, rootName, "source-binding.json")), false);
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
