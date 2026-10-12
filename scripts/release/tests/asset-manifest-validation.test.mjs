import assert from "node:assert/strict";
import test from "node:test";
import {
  assetFiles,
  bundleIncluded,
  policy,
  readBoundAssetManifests,
  validateActiveAssetManifest,
  validateVersionedAssetInventory,
} from "../release-lib.mjs";

const clone = (value) => structuredClone(value);
const currentManifests = readBoundAssetManifests();

test("raw public and art revision manifests are pinned and agree on the exact current groups", () => {
  assert.equal(policy.assetManifestBinding.sha256, "1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29");
  assert.equal(policy.artRevisionManifestBinding.sha256, "438026ef73e844f777b5a0aff4237251ce82a82294ce51c53201a82692eb9a3a");
  assert.equal(policy.assetManifestBinding.hashMode, "raw");
  assert.equal(currentManifests.manifest.revision, policy.assetRevision);
  assert.deepEqual(currentManifests.manifest.groups, currentManifests.revisionManifest.groups);
});

test("the manifest binds each ordered logical asset to its exact metadata and approval state", () => {
  assert.equal(validateActiveAssetManifest(currentManifests.manifest, clone(policy)), currentManifests.manifest);
  assert.equal(currentManifests.manifest.groups.length, 9);
  const candidateGroups = currentManifests.manifest.groups.filter((group) => group.approved === false);
  assert.equal(candidateGroups.length, 6);
  assert.ok(candidateGroups.every((group) => group.status === "candidate"));
  assert.ok(candidateGroups.every((group) => group.url.endsWith(`.${group.sha256}.glb`)));
});

test("active manifest rejects shape, inventory, path, metric, and approval drift", () => {
  const mutations = [
    (manifest) => { manifest.unexpected = true; },
    (manifest) => { delete manifest.lane; },
    (manifest) => { manifest.revision = "other-revision"; },
    (manifest) => { manifest.groups[0].unexpected = true; },
    (manifest) => { delete manifest.groups[0].provenanceId; },
    (manifest) => { manifest.groups[0].url = "https://assets.example/model.glb"; },
    (manifest) => { manifest.groups[0].url = "/models//broken.glb"; },
    (manifest) => { manifest.groups[0].url = "/models/../broken.glb"; },
    (manifest) => { manifest.groups[0].url += "?cache=1"; },
    (manifest) => { manifest.groups[0].sha256 = "0".repeat(64); },
    (manifest) => { manifest.groups[0].bytes += 1; },
    (manifest) => { manifest.groups[0].triangles += 1; },
    (manifest) => { manifest.groups[0].materials += 1; },
    (manifest) => { manifest.groups[0].estimatedGpuBytes += 1; },
    (manifest) => { manifest.groups[0].clips.push("unbound_clip"); },
    (manifest) => { manifest.groups[0].approved = true; },
    (manifest) => { manifest.groups[0].status = "approved"; },
    (manifest) => { manifest.groups.push(clone(manifest.groups[0])); },
  ];
  for (const mutate of mutations) {
    const manifest = clone(currentManifests.manifest);
    mutate(manifest);
    assert.throws(() => validateActiveAssetManifest(manifest, clone(policy)));
  }
});

test("raw manifest digest and candidate file-policy changes fail closed", () => {
  const badPublicBinding = clone(policy);
  badPublicBinding.assetManifestBinding.sha256 = "0".repeat(64);
  assert.throws(() => assetFiles(badPublicBinding), /Raw asset manifest hash differs/);

  const badArtBinding = clone(policy);
  badArtBinding.artRevisionManifestBinding.sha256 = "0".repeat(64);
  assert.throws(() => assetFiles(badArtBinding), /Raw asset manifest hash differs/);

  const missingCandidate = clone(policy);
  missingCandidate.candidateAssets[0].filename = missingCandidate.candidateAssets[0].filename.replace("group-a-essential", "missing-group");
  assert.throws(() => validateActiveAssetManifest(currentManifests.manifest, missingCandidate), /Candidate asset/);

  const staleCandidate = clone(policy);
  staleCandidate.candidateAssets[0].sha256 = "0".repeat(64);
  assert.throws(() => assetFiles(staleCandidate), /differs from exact file policy sha256/);
});

test("the public versioned inventory contains only manifest-referenced R1 URLs", () => {
  const files = assetFiles();
  const prefix = `/models/${policy.assetRevision}/`;
  const publicVersionedUrls = files.filter((file) => file.url.startsWith(prefix)).map((file) => file.url).sort();
  const manifestVersionedUrls = currentManifests.manifest.groups
    .map((group) => group.url)
    .filter((url) => url.startsWith(prefix))
    .sort();
  assert.equal(files.length, 15);
  assert.equal(publicVersionedUrls.length, 6);
  assert.deepEqual(publicVersionedUrls, manifestVersionedUrls);
  assert.equal(policy.candidateAssets.length, 6);
  assert.deepEqual(policy.retainedCandidateAssets, []);
  for (const group of currentManifests.manifest.groups) {
    assert.ok(files.some((file) => file.url === group.url && file.sha256 === group.sha256 && file.bytes === group.bytes));
  }
});

test("an unreferenced versioned public GLB is rejected without filesystem mutation", () => {
  const files = assetFiles();
  const orphanHash = "f".repeat(64);
  const orphan = {
    url: `/models/${policy.assetRevision}/orphan.${orphanHash}.glb`,
    sha256: orphanHash,
    bytes: 1,
  };
  assert.throws(
    () => validateVersionedAssetInventory([...files, orphan], clone(policy), currentManifests.manifest),
    /Public versioned GLB inventory differs from candidate and retained policy entries/,
  );
});

test("archived R1 alternatives remain outside the production bundle input set", () => {
  assert.equal(
    bundleIncluded("deliveries/production-environment/revisions/local-corrections-r1/evidence/retained-public-alternates-attempt-10/fixture-production.c7ed9909.glb"),
    false,
  );
});
