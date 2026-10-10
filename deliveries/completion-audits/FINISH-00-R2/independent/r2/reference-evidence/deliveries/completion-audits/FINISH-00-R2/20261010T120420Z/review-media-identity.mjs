// Independent architectural diagnostic, not execution of future A1 production code.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const out = dirname(fileURLToPath(import.meta.url));
const root = resolve(out, '../../../..');
const start = new Date().toISOString();
const doc = readFileSync(resolve(root, 'docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md'), 'utf8');
const schema = readFileSync(resolve(root, 'app/src/contracts/content.ts'), 'utf8');
if (!doc.includes('hash `{projects, siteDraftRevision, site, assetManifestRevision}`') ||
    !schema.includes('z.strictObject({ type: z.literal("image"), mediaId: text, alt: z.string(), caption: z.string() })')) {
  throw new Error('Bound contract/schema changed: this diagnostic needs re-review');
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value)), 'utf8').digest('hex');
// A minimal representable image-block fragment. It is not a complete validated
// Publication/Project fixture, and no schema/runtime pass is claimed for it.
const projectFragment = { projectId: 'helios', sections: [{ id: 'architecture', blocks: [
  { type: 'image', mediaId: '00000000-0000-4000-8000-000000000001', alt: 'Reviewed diagram', caption: '' }
] }] };
const preimage = { projects: [projectFragment], siteDraftRevision: null, site: null, assetManifestRevision: 'unchanged-fixture' };
const beforeMedia = { id: '00000000-0000-4000-8000-000000000001', object_key: 'images/object-a', hash: 'a'.repeat(64), approval_status: 'approved' };
const afterMedia = { ...beforeMedia, object_key: 'images/object-b', hash: 'b'.repeat(64), approval_status: 'approved' };
const beforeHash = hash(preimage);
const afterHash = hash(preimage);
const result = {
  finding: 'PLAT-R2-01', outcome: 'DEFECT REPRODUCED AT DOCUMENTED IDENTITY BOUNDARY',
  scope: 'Exact R2 hash-preimage formula and canonical image-block shape; no A1 implementation, SQL transaction, provider, storage bytes or browser execution',
  documentedPreimage: preimage, beforeMedia, afterMedia, beforeHash, afterHash,
  mediaMappingChanged: JSON.stringify(beforeMedia) !== JSON.stringify(afterMedia),
  identityEqual: beforeHash === afterHash,
  limitation: 'Valid rows/objects are hypothetical fixtures. Canonical SQL permits row updates; this program does not execute those updates or assert object approval.',
  command: { argv: [process.execPath, fileURLToPath(import.meta.url)], cwd: root,
    startUTC: start, endUTC: new Date().toISOString(), node: process.version, exitCode: 0 }
};
writeFileSync(resolve(out, 'review-media-identity-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({finding: result.finding, outcome: result.outcome, beforeHash, afterHash,
  identityEqual: result.identityEqual, mediaMappingChanged: result.mediaMappingChanged}, null, 2));
