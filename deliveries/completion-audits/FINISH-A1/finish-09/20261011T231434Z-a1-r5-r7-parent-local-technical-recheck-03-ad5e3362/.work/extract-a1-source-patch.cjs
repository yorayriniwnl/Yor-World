const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const commit = '76d679dcb98064152021830b98f16eb456b3ae19';
const file = 'deliveries/FINISH-A1/r5-07/source.patch';
const oid = execFileSync('git', ['rev-parse', `${commit}:${file}`], { encoding: 'utf8' }).trim();
const bytes = execFileSync('git', ['cat-file', 'blob', oid], { encoding: null });
const target = 'deliveries/completion-audits/FINISH-A1/finish-09/20261011T231434Z-a1-r5-r7-parent-local-technical-recheck-03-ad5e3362/.work/a1-source.patch';
fs.writeFileSync(target, bytes);
process.stdout.write(JSON.stringify({ oid, bytes: bytes.length, target }));