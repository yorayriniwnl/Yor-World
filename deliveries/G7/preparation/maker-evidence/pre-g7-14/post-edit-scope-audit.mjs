import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const evidence = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-14");
const baseline = JSON.parse(fs.readFileSync(path.join(evidence, "pre-edit-input-audit.json"), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const assetResults = baseline.glbsTexturesContractsAndCameraHashes.map((item) => {
  const file = path.join(root, item.path);
  const bytes = fs.readFileSync(file);
  return { path: item.path, expectedSha256: item.sha256, actualSha256: sha(bytes), expectedBytes: item.bytes, actualBytes: bytes.length, unchanged: item.sha256 === sha(bytes) && item.bytes === bytes.length };
});
const changed = execFileSync("git", ["diff", "--name-only", "a3459c158af880319269196f85c0c922ee86c5d6", "--", "app", "yorayriniwnl.in"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).sort();
const expectedChanged = [
  "app/src/features/world/EntranceCoordinator.ts",
  "app/tests/unit/entrance-coordinator.test.ts",
  "yorayriniwnl.in/src/features/world/EntranceCoordinator.ts",
  "yorayriniwnl.in/tests/unit/entrance-coordinator.test.ts",
].sort();
const sourceNow = fs.readFileSync(path.join(root, "app/src/features/world/EntranceCoordinator.ts"), "utf8");
const sourceBase = execFileSync("git", ["show", "a3459c158af880319269196f85c0c922ee86c5d6:app/src/features/world/EntranceCoordinator.ts"], { cwd: root, encoding: "utf8" });
const curve = (value) => value.match(/return travel <= 0\.65[\s\S]*?\/ 0\.35\);/)?.[0] ?? null;
let productionCameraStrictAssertionsUnchanged = true;
try {
  execFileSync("git", ["diff", "--quiet", "a3459c158af880319269196f85c0c922ee86c5d6", "--", "app/tests/integration/production-camera.test.ts", "yorayriniwnl.in/tests/integration/production-camera.test.ts"], { cwd: root, stdio: "ignore" });
} catch {
  productionCameraStrictAssertionsUnchanged = false;
}
const productionGlb = assetResults.find((item) => item.path === "app/public/models/production-room-full.glb");
const result = {
  baseCommit: "a3459c158af880319269196f85c0c922ee86c5d6",
  changedSourcePaths: changed,
  changedPathsMatchPacketOwnership: JSON.stringify(changed) === JSON.stringify(expectedChanged),
  productionCameraStrictAssertionsUnchanged,
  intermediateEntranceCurveUnchanged: curve(sourceNow) !== null && curve(sourceNow) === curve(sourceBase),
  exactEndpointBranchesPresent: sourceNow.includes("if (travel === 0) return hallway;") && sourceNow.includes("if (travel === 1) return home;"),
  nonOwnedAssetAndContractCount: assetResults.length,
  nonOwnedAssetAndContractFailures: assetResults.filter((item) => !item.unchanged),
  productionRoomGlb: { bytes: productionGlb.actualBytes, sha256: productionGlb.actualSha256, unchanged: productionGlb.unchanged },
};
fs.writeFileSync(path.join(evidence, "post-edit-scope-audit.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  ...result,
  nonOwnedAssetAndContractFailures: result.nonOwnedAssetAndContractFailures.length,
}));
if (!result.changedPathsMatchPacketOwnership || !result.productionCameraStrictAssertionsUnchanged || !result.intermediateEntranceCurveUnchanged || !result.exactEndpointBranchesPresent || result.nonOwnedAssetAndContractFailures.length) process.exitCode = 1;
