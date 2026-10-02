// Usage: node export.js <addon folder> <SavedVariables/VXV_Probe.lua>
// Prints the probe journal saved by the game, formatted by the addon's own Log.Format.
const fs = require('fs');
const path = require('path');
const { loadProbe } = require('./loadProbe');

const [addonDir, savedVariablesFile] = process.argv.slice(2).map((arg) => path.resolve(arg));
const probe = loadProbe(addonDir);
probe.runChunk(fs.readFileSync(savedVariablesFile, 'utf8'), 'SavedVariables');
probe.runChunk(`
  local _, ns = ...
  local lines = {}
  for _, entry in ipairs(VXV_ProbeDB.log or {}) do
    lines[#lines + 1] = ns.Log.Format(entry, false)
  end
  EXPORT = table.concat(lines, "\\n")
`, 'export', true);
console.log(probe.getGlobalString('EXPORT'));
