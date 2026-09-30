const fs = require('node:fs');
const path = require('node:path');
const root = process.env.W2_DEPENDENCY_ROOT || fs.readFileSync(path.join(__dirname, '../evidence/r2/dependency-temp-path.txt'), 'utf8').trim();
module.exports = name => require(path.join(root, 'node_modules', name));
