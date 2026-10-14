const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const base = cp.execFileSync('git', ['show', 'f71d1df028f80637abb3e427040f0e0f5085179c:app/tests/unit/boundaries.test.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
const current = fs.readFileSync('app/tests/unit/boundaries.test.ts', 'utf8').replace(/\r\n/g, '\n');
const pick = (text, re) => text.split('\n').filter(line => re.test(line));
const hashes = text => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const namesRe = /^\s*(?:describe|it|test)\s*\(/;
const expectsRe = /^.*\bexpect\s*\(/;
const baseNames = pick(base, namesRe), currentNames = pick(current, namesRe);
const baseExpects = pick(base, expectsRe), currentExpects = pick(current, expectsRe);
const namesMatch = JSON.stringify(baseNames) === JSON.stringify(currentNames);
const expectsMatch = JSON.stringify(baseExpects) === JSON.stringify(currentExpects);
const out = [
  'baseline=f71d1df028f80637abb3e427040f0e0f5085179c:app/tests/unit/boundaries.test.ts',
  `testDeclarationLines=${baseNames.length}`,
  `testDeclarationLinesMatch=${namesMatch}`,
  `testDeclarationLinesSha256=${hashes(baseNames.join('\n') + '\n')}`,
  `expectLines=${baseExpects.length}`,
  `expectLinesMatch=${expectsMatch}`,
  `expectLinesSha256=${hashes(baseExpects.join('\n') + '\n')}`,
  `baselineExpectCount=${(base.match(/\bexpect\s*\(/g) || []).length}`,
  `currentExpectCount=${(current.match(/\bexpect\s*\(/g) || []).length}`,
].join('\n') + '\n';
fs.writeFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-04/test-surface-parity.txt', out);
console.log(out);
if (!namesMatch || !expectsMatch || (base.match(/\bexpect\s*\(/g) || []).length !== (current.match(/\bexpect\s*\(/g) || []).length) process.exit(2);
