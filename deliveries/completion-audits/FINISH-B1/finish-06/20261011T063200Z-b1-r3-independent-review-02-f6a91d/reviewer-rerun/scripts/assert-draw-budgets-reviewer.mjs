import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const delivery = path.resolve("C:/Users/yoray/Projects/Yor World/deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/.work/source-root/deliveries/FINISH-B1-R3");
const attributionPath = path.resolve("C:/Users/yoray/Projects/Yor World/deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/reviewer-rerun/validator-logs/draw-call-attribution.json");
const attribution = JSON.parse(fs.readFileSync(attributionPath, 'utf8'));
const expected = new Map([['desktop-home', 120], ['mobile-home', 80]]);
const failures = [];
for (const [key, limit] of expected) {
  const run = attribution.profiles.find(profile => profile.key === key);
  if (!run) {
    failures.push(`${key}: missing profile`);
    continue;
  }
  const draws = run.rendererInfo?.drawCalls;
  if (!Number.isInteger(draws)) failures.push(`${key}: invalid renderer.info drawCalls ${draws}`);
  else if (draws > limit) failures.push(`${key}: ${draws} > frozen limit ${limit}`);
  const matched = run.budgetStatus === (draws <= limit ? 'PASS' : 'FAIL');
  if (!matched) failures.push(`${key}: budgetStatus does not match renderer.info`);
}
for (const [relative, expectedHash] of Object.entries(attribution.assetHashes || {})) {
  const fullPath = path.join(delivery, 'assets', relative);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relative}: asset missing`);
    continue;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
  if (actual !== expectedHash.sha256) failures.push(`${relative}: export hash mismatch`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: desktop <=120, mobile <=80; attribution hashes match current R3 exports.');
}
