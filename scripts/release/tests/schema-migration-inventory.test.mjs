import assert from "node:assert/strict";
import test from "node:test";
import { assertSchemaMigrationInventory, policy } from "../release-lib.mjs";

const validFiles = policy.schemaMigrationInventory.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }));

test("schema-v3 binds the exact ordered four-migration bundle inventory", () => {
  assert.equal(assertSchemaMigrationInventory(validFiles), policy.schemaMigrationInventory);
  for (const invalid of [
    validFiles.slice(0, -1),
    [...validFiles, { ...validFiles[0] }],
    validFiles.map((file, index) => index === 1 ? { ...file, sha256: "f".repeat(64) } : file),
    validFiles.map((file, index) => index === 2 ? { ...file, bytes: file.bytes + 1 } : file),
  ]) {
    assert.throws(() => assertSchemaMigrationInventory(invalid));
  }
});

test("schema-v3 rejects policy drift, duplicate aliases and a nonfinal forward migration", () => {
  for (const candidate of [
    { ...policy, schemaRevision: "other-schema" },
    { ...policy, schemaMigrationInventory: [policy.schemaMigrationInventory[0], ...policy.schemaMigrationInventory.slice(1, 3), policy.schemaMigrationInventory[0]] },
    { ...policy, schemaMigrationInventory: [...policy.schemaMigrationInventory].reverse() },
  ]) {
    assert.throws(() => assertSchemaMigrationInventory(validFiles, candidate));
  }
});
