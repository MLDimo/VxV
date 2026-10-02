// Usage: node run.js <addon folder>. Exits non-zero on any syntax or runtime error.
const fs = require('fs');
const path = require('path');
const luaparse = require('luaparse');
const { loadProbe, readTocFiles } = require('./loadProbe');

const addonDir = path.resolve(process.argv[2]);
const tocFiles = readTocFiles(addonDir);
for (const file of tocFiles) {
  luaparse.parse(fs.readFileSync(path.join(addonDir, file), 'utf8'), { luaVersion: '5.1' });
}
console.log(`syntax OK (${tocFiles.length} files)`);

const probe = loadProbe(addonDir);
probe.runChunk(fs.readFileSync(path.join(__dirname, 'scenario.lua'), 'utf8'), 'scenario');
console.log('scenario OK');
