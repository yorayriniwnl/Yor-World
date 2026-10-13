import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { reserveAttempt } from "../../../deliveries/G7/preparation/tools/reserve-attempt.mjs";

test("reserveAttempt creates exclusive raw directory and prevents collisions", async (t) => {
  const tmp = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), "yor-reserve-test-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const root = tmp;
  const evidenceDir = path.join(root, "deliveries/G7/evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });

  await t.test("reserving a valid new observation path succeeds", () => {
    const res = reserveAttempt(root, "deliveries/G7/evidence/attempt-01.json");
    assert.equal(fs.existsSync(res.artifactDir), true);
    assert.equal(fs.existsSync(res.output), false);
    res.writeArtifact("data.txt", Buffer.from("hello"));
    assert.equal(fs.readFileSync(path.join(res.artifactDir, "data.txt"), "utf8"), "hello");
    res.writeReceipt({ status: "PASS" });
    assert.equal(fs.existsSync(res.output), true);
  });

  await t.test("reserving an existing receipt path fails", () => {
    assert.throws(
      () => reserveAttempt(root, "deliveries/G7/evidence/attempt-01.json"),
      /Existing live receipt must be preserved/
    );
  });

  await t.test("reserving with basename collision (different extension) fails", () => {
    // attempt-01.json already exists in deliveries/G7/evidence
    assert.throws(
      () => reserveAttempt(root, "deliveries/G7/evidence/attempt-01.txt"),
      /Basename collision with existing file/
    );
  });

  await t.test("reserving when raw artifact directory already exists fails", () => {
    // create interrupted attempt directory
    const interruptedRaw = path.join(evidenceDir, "attempt-interrupted-raw");
    fs.mkdirSync(interruptedRaw);
    fs.writeFileSync(path.join(interruptedRaw, "partial.log"), "interrupted run");

    assert.throws(
      () => reserveAttempt(root, "deliveries/G7/evidence/attempt-interrupted.json"),
      /Raw artifact directory already exists; preserve historical attempt/
    );
    // Verifies partial artifacts are preserved
    assert.equal(fs.readFileSync(path.join(interruptedRaw, "partial.log"), "utf8"), "interrupted run");
  });

  await t.test("rejects unsafe traversal or escaping paths", () => {
    assert.throws(
      () => reserveAttempt(root, "deliveries/G7/evidence/../outside.json"),
      /Unsafe output path/
    );
    assert.throws(
      () => reserveAttempt(root, "scratch/test.json"),
      /Output must stay inside deliveries\/G7\/evidence/
    );
  });

  await t.test("rejects symlink or junction ancestors without writing outside the evidence root", () => {
    const outside = path.join(tmp, "outside");
    fs.mkdirSync(outside);
    const sentinel = path.join(outside, "sentinel.txt");
    fs.writeFileSync(sentinel, "preserve this file\n");
    const alias = path.join(evidenceDir, "redirected");
    fs.symlinkSync(outside, alias, process.platform === "win32" ? "junction" : "dir");

    assert.throws(
      () => reserveAttempt(root, "deliveries/G7/evidence/redirected/escaped.json"),
      /symlink|junction|filesystem alias/i
    );
    assert.deepEqual(fs.readFileSync(sentinel), Buffer.from("preserve this file\n"));
    assert.equal(fs.existsSync(path.join(outside, "escaped-raw")), false);
    assert.equal(fs.existsSync(path.join(outside, "escaped.json")), false);
  });

  await t.test("writeArtifact rejects overwriting existing artifacts", () => {
    const res = reserveAttempt(root, "deliveries/G7/evidence/attempt-02.json");
    res.writeArtifact("sample.bin", Buffer.from("original"));
    assert.throws(
      () => res.writeArtifact("sample.bin", Buffer.from("overwrite")),
      /Cannot overwrite existing raw artifact/
    );
    assert.equal(fs.readFileSync(path.join(res.artifactDir, "sample.bin"), "utf8"), "original");
  });

  await t.test("writeArtifact accepts only one safe filename component", () => {
    const res = reserveAttempt(root, "deliveries/G7/evidence/attempt-03.json");
    for (const name of ["../escaped.txt", "folder/escaped.txt", "folder\\escaped.txt", "C:\\escaped.txt", "trailing.", "CON"]) {
      assert.throws(() => res.writeArtifact(name, Buffer.from("must not be written")), /Unsafe output path/);
    }
    assert.equal(fs.existsSync(path.join(tmp, "escaped.txt")), false);
    assert.deepEqual(fs.readdirSync(res.artifactDir), []);
  });

  await t.test("a file in the parent chain fails before creating an attempt", () => {
    const blocked = path.join(evidenceDir, "not-a-directory");
    fs.writeFileSync(blocked, "keep bytes\n");
    assert.throws(() => reserveAttempt(root, "deliveries/G7/evidence/not-a-directory/attempt-04.json"), /non-directory component/);
    assert.deepEqual(fs.readFileSync(blocked), Buffer.from("keep bytes\n"));
  });

  if (process.platform === "win32") {
    await t.test("Windows case aliases reject collision with existing receipt", () => {
      assert.throws(
        () => reserveAttempt(root, "deliveries/G7/evidence/ATTEMPT-01.JSON"),
        /Existing live receipt must be preserved/
      );
    });
  }
});
