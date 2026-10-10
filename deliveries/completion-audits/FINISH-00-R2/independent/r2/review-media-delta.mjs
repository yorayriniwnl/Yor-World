// P22 architectural identity fixture. It does not execute A1/SQL/Storage/browser.
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const out=dirname(fileURLToPath(import.meta.url));const root=resolve(out,'../../../../../');
const startUTC=new Date().toISOString();
const doc=readFileSync(resolve(out,'reviewed-contracts/02-platform-schema-recovery.md'),'utf8');
if (!doc.includes('hash `{projects, siteDraftRevision, site, assetManifestRevision, media}`') || !doc.includes('media: ReviewedMedia[]')) throw new Error('Final explicit media-preimage contract not present');
const old=JSON.parse(readFileSync(resolve(root,'deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/review-media-identity-result.json'),'utf8'));
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value)),'utf8').digest('hex');
const oldIdentity=row=>hash({...old.documentedPreimage,projects:old.documentedPreimage.projects.map(p=>({...p,sections:p.sections.map(s=>({...s,blocks:s.blocks.map(b=>b.type==='image'?{...b,mediaId:row.id}:b)}))}))});
const baseMedia={kind:'asset',mediaId:old.beforeMedia.id,objectKey:old.beforeMedia.object_key,sha256:old.beforeMedia.hash,mime:'image/png',bytes:123,dimensions:{width:1,height:1},provenance:{uploadedBy:'explicit-fixture',filename:'diagram.png'},approvalStatus:'approved',createdAt:'2026-10-10T00:00:00.000Z',approvalAudit:{eventId:'00000000-0000-4000-8000-000000000002',createdAt:'2026-10-10T00:01:00.000Z'}};
const preimage={...old.documentedPreimage,media:[baseMedia]};const baselineHash=hash(preimage);
const changes=[['objectKey','images/object-b'],['sha256','b'.repeat(64)],['bytes',124],['mime','image/jpeg'],['dimensions',{width:2,height:1}],['provenance',{uploadedBy:'explicit-fixture',filename:'new-diagram.png'}],['approvalStatus','rejected'],['createdAt','2026-10-10T00:00:01.000Z'],['approvalAudit',{eventId:'00000000-0000-4000-8000-000000000003',createdAt:'2026-10-10T00:01:00.000Z'}],['approvalAudit',{eventId:'00000000-0000-4000-8000-000000000002',createdAt:'2026-10-10T00:01:01.000Z'}]];
const cases=changes.map(([field,value])=>{const altered={...preimage,media:[{...baseMedia,[field]:value}]};return {field,afterHash:hash(altered),identityChanged:hash(altered)!==baselineHash};});
const retarget={...preimage,media:[{...baseMedia,objectKey:old.afterMedia.object_key,sha256:old.afterMedia.hash}]};
const reordered={...preimage,media:[Object.fromEntries(Object.entries(baseMedia).reverse())]};
const result={finding:'PLAT-R2-01',scope:'Contract deterministic-preimage sensitivity fixture; hypothetical rows/bytes/approvals only. No schema-valid full Publication, A1 implementation, SQL transaction, Storage download/approval or browser proof.',oldPreimageHash:oldIdentity(old.beforeMedia),oldRetargetedHash:oldIdentity(old.afterMedia),oldIdentityUnchangedByMedia:oldIdentity(old.beforeMedia)===oldIdentity(old.afterMedia)&&JSON.stringify(old.beforeMedia)!==JSON.stringify(old.afterMedia),baselineHash,validMappingRetargetHash:hash(retarget),validMappingRetargetChangesIdentity:hash(retarget)!==baselineHash,fieldSensitivity:cases,objectKeyOrderStable:hash(reordered)===baselineHash,requiredBehaviorAtDesignBoundary:hash(retarget)!==baselineHash&&cases.every(x=>x.identityChanged)&&hash(reordered)===baselineHash,command:{cwd:root,argv:[process.execPath,fileURLToPath(import.meta.url)],startUTC,endUTC:new Date().toISOString(),node:process.version,exitCode:0}};
writeFileSync(resolve(out,'review-media-delta-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));process.exitCode=result.requiredBehaviorAtDesignBoundary?0:1;
